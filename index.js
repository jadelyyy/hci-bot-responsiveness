const { Octokit } = require("@octokit/rest");
const core = require("@actions/core");
const github = require("@actions/github");
const infoRepoOwner = 'jadelyyy';
const infoRepoName = 'responsiveness-info';

const {month_map, month_name_map} = require("./constants/monthData.js");

const {createBadge, createBadgeWithData} = require("./util/badge.js");

const {getDifference, getAverageTime, getTimeString} = require("./util/time.js");

// for asychronous Github api calls
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

function getOverallChange(changes) {
    var change = 0;
    for (var i = 0; i < changes.length; i++) {
        change += changes[i];
    }
    return change;
}

function getResponseTimeStatus(timeDifference, changes) {
    var responseTimeStatus;
    if(timeDifference > 0) {
        changes.push(-1);
        responseTimeStatus = 'slower';
    }
    // response stayed the same
    if(timeDifference == 0) {
        changes.push(0);
        responseTimeStatus = 'same';
    }
    // response time increased
    if(timeDifference < 0) {
        changes.push(1);
        responseTimeStatus = 'faster';
    }
    return responseTimeStatus;
}

// calculating time differences
// input in the format of [hours, minutes]
function calculateTimeDifference(currTime, prevTime) {
    return (currTime[0] * 60 + currTime[1]) - (prevTime[0] * 60 + prevTime[1]);
}

// TODO: add additional pull data, need to fix/create functions dealing with pull data
function createIssue(octokit, repoOwner, repoName, currData, prevData, currPullsData, prevPullsData) {
    return __awaiter(this, void 0, void 0, function* () {
        const additionalToken  = core.getInput('additional-token');
        var newOctokit = new Octokit({
            auth: additionalToken
        });

        var issueBody;
        var responseTimeBadge, collabResponseTimeBadge, contribResponseTimeBadge, numUnrespondedBadge, overallBadge;
        var responseTimeStatus, collabResponseTimeStatus, contribResponseTimeStatus, numUnrespondedStatus, overallStatus;
        var badgeData;

        var currTime = currData.aveResponseTime;
        var currCollabTime = currData.collabAveReponseTime;
        var currContribTime = currData.contribAveResponseTime;

        // *** pull response data
        // var currPullTime = currPullsData.aveResponseTime;
        // var currPullCollabTime = currPullsData.collabAveReponseTime;
        // var currPullContribTime = currPullsData.contribAveResponseTime;

        // altering api response data for testing purposes
        // prevData = {
        //     firstResponseTimes: [0],
        //     total: 40,
        //     unresponded: 40,
        //     numComments: [2, 2],
        //     aveResponseTime: [5, 47],
        //     aveNumComments: 2
        // }
        // prevData.total = 0;

        var prevTime = prevData.aveResponseTime;
        var prevCollabTime = prevData.collabAveResponseTime;
        var prevContribTime = prevData.contribAveResponseTime;

        // *** pull response data
        // var prevPullTime = prevPullsData.aveResponseTime;
        // var prevPullCollabTime = prevPullsData.collabAveResponseTime;
        // var prevPullContribTime = prevPullsData.contribAveResponseTime;
        
        // if no issues were created during the month
        if (currData.total == 0) {
            issueBody = `There were no issues created this month.`;
        // if no issues were created during the prev month
        } else if (prevData.total == 0) {

            const additionalIssueData = {
                'currData': currData
            }

            // create issue if repository has never used the bot before
            yield createAdditionalIssue(newOctokit, repoName, additionalIssueData);
            
            badgeData = getTimeString(currTime);
            responseTimeBadge = createBadgeWithData('response_time', 'no issues', badgeData);

            badgeData = getTimeString(currCollabTime);
            collabResponseTimeBadge = createBadgeWithData('collab_response_time', 'no issues', badgeData);

            badgeData = getTimeString(currContribTime);
            contribResponseTimeBadge = createBadgeWithData('contrib_response_time', 'no issues', badgeData);

            badgeData = getTimeString(currTime);
            responseTimeBadge = createBadgeWithData('response_time', 'no issues', badgeData);

            badgeData = `${currData.unresponded}/${currData.total} issues`;
            numUnrespondedBadge = createBadgeWithData('unresponded', 'no issues', badgeData);

            overallBadge = createBadge('overall', 'no issues', 'for-the-badge');

            issueBody = `<p align="center">${overallBadge}\n</p>` + 
                        `<p align="center">${collabResponseTimeBadge}&nbsp;&nbsp;&nbsp;&nbsp;${contribResponseTimeBadge}${responseTimeBadge}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${numUnrespondedBadge}\n</p>` + 
                        `<h2>Thanks for using the responsiveness bot! Since it's your first time using it, there is no data on your repository's progress yet. Be sure to check again next month!</h>`;
        } else {
            // array to keep track of each metric
            var changes = [];
            var timeDifference  = calculateTimeDifference(currTime, prevTime);
            var collabTimeDifference = calculateTimeDifference(currCollabTime, prevCollabTime);
            var contribTimeDifference = calculateTimeDifference(currContribTime, prevContribTime);
            var unrespondedDifference = (Math.floor(currData.unresponded/currData.total * 100)) - (Math.floor(prevData.unresponded/prevData.total * 100));
            var overallChange, initMessage;
            var overallChangeString;

            responseTimeStatus = getResponseTimeStatus(timeDifference, changes);
            console.log('responseTimeStatus: ' + responseTimeStatus);
            collabResponseTimeStatus= getResponseTimeStatus(collabTimeDifference, changes);
            console.log('collabResponseTimeStatus: ' + collabResponseTimeStatus);
            contribResponseTimeStatus = getResponseTimeStatus(contribTimeDifference, changes);
            console.log('contribResponseTimeStatus: ' + contribResponseTimeStatus);
          
            // more responded previous month
            if(unrespondedDifference > 0) {
                changes.push(-1)
                numUnrespondedStatus = 'increased';
            }
            // number of responses stayed the same
            if(unrespondedDifference == 0) {
                changes.push(0)
                numUnrespondedStatus = 'same';
            }
            // more responded this month
            if(unrespondedDifference < 0) {
                changes.push(1)
                numUnrespondedStatus = 'decreased';
            }

            // calculate summary of improvement vs. disimprovement
            overallChange = getOverallChange(changes);
            if(overallChange > 0) {
                overallChangeString = 'has improved';
                initMessage = 'Great job!';
                overallStatus = 'improved';
            }
            if(overallChange == 0) {
                overallChangeString = 'stayed the same';
                initMessage = 'Not bad!';
                overallStatus = 'same';
            }
            if(overallChange < 0) {
                overallChangeString = 'has not improved';
                initMessage = '';
                overallStatus = 'did not improve';
            }

            badgeData = getTimeString(currTime);
            responseTimeBadge = createBadgeWithData('response_time', responseTimeStatus, badgeData);

            badgeData = getTimeString(currCollabTime);
            collabResponseTimeBadge = createBadgeWithData('collab_response_time', collabResponseTimeStatus, badgeData);

            badgeData = getTimeString(currContribTime);
            contribResponseTimeBadge = createBadgeWithData('contrib_response_time', contribResponseTimeStatus, badgeData);

            badgeData = `${currData.unresponded}/${currData.total} issues`;
            numUnrespondedBadge = createBadgeWithData('unresponded', numUnrespondedStatus, badgeData);

            overallBadge = createBadge('overall', overallStatus, 'for-the-badge');

            const additionalIssueData = {
                'responseTimeStatus': responseTimeStatus,
                'collabResponseTimeStatus': collabResponseTimeStatus,
                'contribResponseTimeStatus': contribResponseTimeStatus,
                'numUnrespondedStatus': numUnrespondedStatus,
                'currData': currData,
                'prevData': prevData
            }
    
            // add comment to existing issue since repo has used bot before
            yield updateAdditionalIssue(newOctokit, repoName, additionalIssueData);
            
            var additionalInfoIssue = yield getExistingIssue(newOctokit, repoName);
            var issueBody = `<p align="center">${overallBadge}\n</p>` + 
                            `<p align="center">${collabResponseTimeBadge}&nbsp;&nbsp;&nbsp;&nbsp;${contribResponseTimeBadge}&nbsp;&nbsp;&nbsp;&nbsp;${responseTimeBadge}&nbsp;&nbsp;&nbsp;&nbsp;${numUnrespondedBadge}\n</p>` + 
                            `<h2>${initMessage} Your repository's overall responsiveness to issues ${overallChangeString} since last month.\n</h2>` + 
                            `<p>For more information on your repository's progress, visit <a href="${additionalInfoIssue.html_url}">${repoName}'s Additional Responsiveness Info</a></p>`
        }

        // create issue in respository 
        const {data: issue} = yield octokit.issues.create({
            owner: repoOwner,
            repo: repoName,
            title: 'Monthly Responsiveness Update',
            body: issueBody
        });

    });
}

function getExistingIssue(newOctokit, repoName) {
    return __awaiter(this, void 0, void 0, function* () {
        var issues = yield getAllIssues(newOctokit, infoRepoOwner, infoRepoName, [], 1);
        var issue;
        for (var i = 0; i < issues.length; i++) {
            issue = issues[i];
            if(issue.title == repoName) {
                return issue;
            }
        }
        return null;
    });
}

function updateAdditionalIssue(newOctokit, repoName, additionalIssueData) {
    return __awaiter(this, void 0, void 0, function* () {

        const currDate = new Date();
        var currMonth = currDate.getMonth();
        var issueMonth = currMonth - 1;
        if(issueMonth < 0) {
            issueMonth = 11;
        }

        var responseTimeStatus = additionalIssueData.responseTimeStatus;
        var collabResponseTimeStatus = additionalIssueData.collabResponseTimeStatus;
        var contribResponseTimeStatus = additionalIssueData.contribResponseTimeStatus;
        var numUnrespondedStatus = additionalIssueData.numUnrespondedStatus;
        var currData = additionalIssueData.currData;
        var currTime = currData.aveResponseTime;
        var currCollabTime = currData.collabAveReponseTime;
        var currContribTime = currData.contribAveResponseTime;

        var commentBody = `\n<h2>${month_name_map[issueMonth]}\n</h2>` + 
                            `<h3>\nResponded Issues: </h3>` + 
                            `<p>\nCollaborators Average Response Time <b>(${collabResponseTimeStatus.toUpperCase()})</b>: ${currCollabTime[0]} hours and ${currCollabTime[1]} minutes</p>` + 
                            `<p>\nContributors Average Response Time <b>(${contribResponseTimeStatus.toUpperCase()})</b>: ${currContribTime[0]} hours and ${currContribTime[1]} minutes</p>` + 
                            `<p>\nGeneral Average Response Time <b>(${responseTimeStatus.toUpperCase()})</b>: ${currTime[0]} hours and ${currTime[1]} minutes</p>` + 
                            `<h3>\nUnresponded Issues:</h3>` + 
                            `<p>\nNumber of unresponded issues <b>(${numUnrespondedStatus.toUpperCase()})</b>: ${currData.unresponded}/${currData.total}</p>`;

        var currIssue = yield getExistingIssue(newOctokit, repoName);

        if(currIssue) {
            var issueNumber = currIssue.number;
            newOctokit.issues.createComment({
                owner: infoRepoOwner,
                repo: infoRepoName,
                issue_number: issueNumber,
                body: commentBody
            })
        }
    });
}

function createAdditionalIssue(newOctokit, repoName, additionalIssueData) {
    return __awaiter(this, void 0, void 0, function* () {

        const currDate = new Date();
        var currMonth = currDate.getMonth();
        var issueMonth = currMonth - 1;
        if(issueMonth < 0) {
            issueMonth = 11;
        }

        const currData = additionalIssueData.currData;
        const currTime = currData.aveResponseTime;
        var issueBody = `<h1>Additional Info For Monthly Responsiveness For ${repoName}\n</h1>` + 
                        `<h2>${month_name_map[issueMonth]}\n</h2>` + 
                        `<h3>\nResponded Issues: </h3>` + 
                        `<p>\n    Average response time: ${currTime[0]} hours and ${currTime[1]} minutes</p>` + 
                        `<h3>\nUnresponded Issues:</h3>` + 
                        `<p>\n    Number of unresponded issues: ${currData.unresponded}/${currData.total}</p>`;

        const {data: issue} = yield newOctokit.issues.create({
            owner: infoRepoOwner,
            repo: infoRepoName,
            title: repoName,
            body: issueBody
        });
    });
}

// check if issue date is within base month/year
function isWithinMonth(creationDate, baseMonth, baseYear) {
    var creationMonth = creationDate.getMonth();
    var creationYear = creationDate.getYear();
    if(creationMonth == baseMonth && creationYear == baseYear) {
        return true;
    } else {
        return false;
    }
}

// get comments on either pull requests or issues
function listComments(octokit, repoOwner, repoName, number, isPull) {
    return __awaiter(this, void 0, void 0, function* () {
        if (isPull) {
            const {data: listedComments} = yield octokit.pulls.listComments({
                owner: repoOwner,
                repo: repoName,
                pull_number: number
            });
            return listedComments;
        } else {
            const {data: listedComments} = yield octokit.issues.listComments({
                owner: repoOwner,
                repo: repoName,
                issue_number: number
            });
            return listedComments;
        }
    });
}

function getCommentsData(octokit, repoOwner, repoName, userData, number, isPull) {
    return __awaiter(this, void 0, void 0, function* () {

        var collaborators = userData.collaborators;
        var contributors = userData.contributors;
        var comments = yield listComments(octokit, repoOwner, repoName, number, isPull);
        if(isPull) {
            console.log('\n insde of getCommentsData...');
            console.log('collaborators: ' + userData.collaborators.size);
            console.log('contributors: ' + userData.contributors.size);
        }
        
        // return immediately if issue has no comments
        if(comments.length == 0) {
            return null;
        } else {
            var comment, commentCreationDate, commentCreator;;
            var earliestCreationDate = new Date(comments[0].created_at);
            var collabEarliestCreationDate, contribEarliestCreationDate;
            for (var i = 0; i < comments.length; i++) {
                comment = comments[i];
                commentCreationDate = new Date(comment.created_at);
                commentCreator = comment.user.login;
                // collaborators
                if(userData.collaborators.has(commentCreator)) {
                    if(!collabEarliestCreationDate) {
                        collabEarliestCreationDate = commentCreationDate;
                    }
                    if(commentCreationDate.getTime() < collabEarliestCreationDate.getTime()) {
                        collabEarliestCreationDate = commentCreationDate;
                    }
                }
                // collaborators and contributors
                if(userData.contributors.has(commentCreator)) {
                    if(!contribEarliestCreationDate) {
                        contribEarliestCreationDate = commentCreationDate;
                    }
                    if(commentCreationDate.getTime() < contribEarliestCreationDate.getTime()) {
                        contribEarliestCreationDate = commentCreationDate;
                    }
                }
                // anyone
                if(commentCreationDate.getTime() < earliestCreationDate.getTime()) {
                    earliestCreationDate = commentCreationDate;
                }
            }
            return {
                firstContribResponseDate: contribEarliestCreationDate,
                firstCollabResponseDate: collabEarliestCreationDate,
                firstResponseDate: earliestCreationDate,
                totalComments: comments.length
            }
        }
    });
}

// returns set of repository collaborators and contributors
function getUserData(octokit, repoOwner, repoName) {
    return __awaiter(this, void 0, void 0, function* () {
        const {data: collaborators} = yield octokit.repos.listCollaborators({
            owner: repoOwner,
            repo: repoName,
        });
        const {data: contributors} = yield octokit.repos.listContributors({
            owner: repoOwner,
            repo: repoName
        });
        var collaboratorsSet = new Set();
        for (var i = 0; i < collaborators.length; i ++){
            collaboratorsSet.add(collaborators[i].login);
        }
        var contributorsSet = new Set();
        for (var i = 0; i < contributors.length; i ++){
            contributorsSet.add(contributors[i].login);
        }
        return {
            collaborators: collaboratorsSet,
            contributors: contributorsSet
        }
    });
}


function getData(octokit, repoOwner, repoName, issues, baseMonth, baseYear, isPull) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            var userData = yield getUserData(octokit, repoOwner, repoName);
            var firstResponseTimes = [], firstContribResponseTimes = [], firstCollabResponseTimes = [];
            var numComments = [];
            var numReviewComments = [];
            var commentsData;
            var issue, issueNumber, issueCreationDate;
            var total = 0;
            var unresponded = 0;
            for (var i = 0; i < issues.length; i++) {
                issue = issues[i];
                issueNumber = issue.number;
                issueCreationDate = new Date(issue.created_at);
                if(!isWithinMonth(issueCreationDate, baseMonth, baseYear)) {
                    if(isPull) {
                        console.log('issueCreationDate: ' + issueCreationDate);
                        console.log("NOT WITHIN MONTH: ");
                    }
                    continue;
                }
                total += 1;
                commentsData = yield getCommentsData(octokit, repoOwner, repoName, userData, issueNumber, isPull);
                if(commentsData) {
                    if(commentsData.firstCollabResponseDate) {
                        firstCollabResponseTimes.push(getDifference(issueCreationDate, commentsData.firstCollabResponseDate));
                    }
                    if(commentsData.firstContribResponseDate) {
                        firstContribResponseTimes.push(getDifference(issueCreationDate, commentsData.firstContribResponseDate));
                    }
                    firstResponseTimes.push(getDifference(issueCreationDate, commentsData.firstResponseDate));
                    numComments.push(commentsData.totalComments);
                } else {
                    unresponded += 1;
                }
                if(isPull) {
                    numReviewComments.push(issue.review_comments);
                }
            }
            var allData = {
                firstCollabResponseTimes: firstCollabResponseTimes,
                firstContribResponseTimes: firstContribResponseTimes,
                firstResponseTimes: firstResponseTimes,
                total: total,
                unresponded: unresponded,
                numComments: numComments
            }
            if(isPull) {
                allData.numReviewComments = numReviewComments;
            }
            return allData;
        } catch(err) {
            console.log(err);
        }
    });
}

function getAllIssues (octokit, repoOwner, repoName, allIssues, pageNum = 1) {
    return __awaiter(this, void 0, void 0, function* () {
        const {data: issues} = yield octokit.issues.listForRepo({
            owner: repoOwner,
            repo: repoName,
            per_page: 100,
            page: pageNum
        });
        var issuesLeft = true;
        if(issues.length == 0) {
            issuesLeft = false;
        }
        if(issuesLeft) {
            var issue;
            for(var i = 0; i < issues.length; i++) {
                issue = issues[i];
                if(!issue.pull_request) {
                    allIssues.push(issue);
                } else {
                    console.log('not adding pull request with number: ' + issue.number);
                }
            }
            return yield getAllIssues(octokit, repoOwner, repoName, allIssues, pageNum + 1);
        } else {
            return allIssues;
        }
    });
}

function getAllPulls(octokit, repoOwner, repoName, allPulls, pageNum = 1) {
    return __awaiter(this, void 0, void 0, function* () {
        const {data: pulls} = yield octokit.pulls.list({
            owner: repoOwner,
            repo: repoName,
            per_page: 100,
            page: pageNum
        });
        var pullsLeft = true;
        if(pulls.length == 0) {
            pullsLeft = false;
        }
        if(pullsLeft) {
            for (var i = 0; i < pulls.length; i++) {
                const {data: pull} = yield octokit.pulls.get({
                    owner: repoOwner,
                    repo: repoName,
                    pull_number: pulls[i].number
                })
                allPulls.push(pull);
            }
            return yield getAllPulls(octokit, repoOwner, repoName, allPulls, pageNum + 1);
        } else {
            return allPulls;
        }
    });
}

function run () {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userToken  = core.getInput('repo-token');
            const repoName = core.getInput('repo-name');
            const repoOwner = 'jadelyyy';

            var octokit = new github.GitHub(userToken);

            var issues = yield getAllIssues(octokit, repoOwner, repoName, [], 1);

            var pulls = yield getAllPulls(octokit, repoOwner, repoName, [], 1);

            // get month duration
            var currDate = new Date();
            var currMonth = currDate.getMonth();
            // var baseMonth = currMonth - 1;
            var baseMonth = currMonth;
            var baseYear = currDate.getYear();
            if(baseMonth < 0) {
                baseMonth = 11;
                baseYear -= 1;
            }
            // get issue data
            var currMonthIssuesData = yield getData(octokit, repoOwner, repoName, issues, baseMonth, baseYear, false);
            var currMonthCollabAveResponseTime = getAverageTime(currMonthIssuesData.firstCollabResponseTimes);
            var currMonthContribAveResponseTime = getAverageTime(currMonthIssuesData.firstContribResponseTimes);
            var currMonthAveResponseTime = getAverageTime(currMonthIssuesData.firstResponseTimes);

            currMonthIssuesData.aveResponseTime = currMonthAveResponseTime;
            currMonthIssuesData.collabAveReponseTime = currMonthCollabAveResponseTime;
            currMonthIssuesData.contribAveResponseTime = currMonthContribAveResponseTime;

            // pull data not calculated correctly yet
            var currMonthPullsData = yield getData(octokit, repoOwner, repoName, pulls, baseMonth, baseYear, true);
            // var currMonthPullsCollabAveResponseTime = getAverageTime(currMonthPullsData.firstCollabResponseTimes);
            // var currMonthPullsContribAveResponseTime = getAverageTime(currMonthPullsData.firstContribResponseTimes);
            // var currMonthPullsAveResponseTime = getAverageTime(currMonthPullsData.firstResponseTimes);

            // currMonthPullsData.aveResponseTime = currMonthPullsAveResponseTime;
            // currMonthPullsData.collabAveReponseTime = currMonthPullsCollabAveResponseTime;
            // currMonthPullsData.contribAveResponseTime = currMonthPullsContribAveResponseTime;

            // get prev month duration
            baseMonth -= 1;
            if(baseMonth < 0) {
                baseMonth = 11;
                baseYear -= 1;
            }
       
            var prevMonthIssuesData = yield getData(octokit, repoOwner, repoName, issues, baseMonth, baseYear, false);
            var prevMonthAveResponseTime = getAverageTime(prevMonthIssuesData.firstResponseTimes);
            var prevMonthCollabAveResponseTime = getAverageTime(prevMonthIssuesData.firstCollabResponseTimes);
            var prevMonthContribAveResponseTime = getAverageTime(prevMonthIssuesData.firstContribResponseTimes);

            prevMonthIssuesData.aveResponseTime = prevMonthAveResponseTime;
            prevMonthIssuesData.collabAveResponseTime = prevMonthCollabAveResponseTime;
            prevMonthIssuesData.contribAveResponseTime = prevMonthContribAveResponseTime;

            // pull data not calculated correctly yet
            var prevMonthPullsData = yield getData(octokit, repoOwner, repoName, pulls, baseMonth, baseYear, true);
            // var prevMonthPullsAveResponseTime = getAverageTime(prevMonthPullsData.firstResponseTimes);
            // var prevMonthPullsCollabAveResponseTime = getAverageTime(prevMonthPullsData.firstCollabResponseTimes);
            // var prevMonthPullsContribAveResponseTime = getAverageTime(prevMonthPullsData.firstContribResponseTimes);

            // prevMonthPullsData.aveResponseTime = prevMonthPullsAveResponseTime;
            // prevMonthPullsData.collabAveReponseTime = prevMonthPullsCollabAveResponseTime;
            // prevMonthPullsData.contribAveResponseTime = prevMonthPullsContribAveResponseTime;

            yield createIssue(octokit, repoOwner, repoName, currMonthIssuesData, prevMonthIssuesData, currMonthPullsData, prevMonthPullsData);

        } catch(err) {
            console.log(err);
        }
    });
}

run();