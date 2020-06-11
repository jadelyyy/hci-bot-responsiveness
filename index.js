const { Octokit } = require("@octokit/rest");
const core = require("@actions/core");
const github = require("@actions/github");
const infoRepoOwner = 'jadelyyy';
const infoRepoName = 'responsiveness-info';

const {badge_color_map, badge_name_map} = require("./badgeData.js");
var month_map = {0: 31, 1: 28, 2: 31, 3: 30, 4: 31, 5: 30, 6: 31, 7: 31, 8: 30, 9: 31, 10: 30, 11:31};

var month_name_map = {
    0: 'January',
    1: 'February',
    2: 'March',
    3: 'April',
    4: 'May',
    5: 'June',
    6: 'July',
    7: 'August',
    8: 'September',
    9: 'October',
    10: 'November',
    11: 'December'
}

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

// assume timeB later than timeA
function getDifference(dateA, dateB) {
    var difference = dateB - dateA;
    // 1000 milliseconds in 1 second, 60 seconds in 1 minute
    var differenceInMinutes = Math.floor((difference/1000)/60);
    return differenceInMinutes;
}

function getAverageTime(times) {
    if(times.length == 0) {
        return null;
    }
    var sum = 0;
    for (var i = 0; i < times.length; i++) {
        sum += times[i];
    }
    var averageTimeInMinutes = sum/times.length;
    var hours = Math.floor(averageTimeInMinutes/60);
    var minutes = Math.floor(averageTimeInMinutes % 60);
    return [hours, minutes]
}

function getAverageNumComments(comments) {
    if(comments.length == 0) {
        return null;
    }
    var sum = 0;
    for (var i = 0; i < comments.length; i++) {
        sum += comments[i];
    }
    return Math.floor(sum/comments.length);
}

function getOverallChange(changes) {
    var change = 0;
    for (var i = 0; i < changes.length; i++) {
        change += changes[i];
    }
    console.log('calcuated change: ' + change);
    return change;
}

function createBadge(badgeName, message, style='flat') {
    var color;
    console.log('badgeName: ' + badgeName);
    console.log('message: ' + message);
    if(message == 'no issues') {
        message = 'no issues last month';
        color = 'blue';
    } else if(message == 'same') {
        color = 'yellow';
    } else {
        color = badge_color_map[badgeName][message];
    }
    var label = badge_name_map[badgeName];
    message = message.replace(/ /g,"%20");
    if(style == 'flat') {        
        return `<img src="https://img.shields.io/static/v1?label=${label}&message=${message}&color=${color}">`;
    } else {
        return `<img src="https://img.shields.io/static/v1?label=${label}&message=${message}&color=${color}&style=${style}">`
    }
}

function createBadgeWithData(badgeName, status, data) {
    console.log('status: ' + status);
    var color;
    if(status == 'no issues') {
        color = 'blue';
    } else if(status == 'same') {
        color = 'yellow';
    } else {
        color = badge_color_map[badgeName][status];
    }
    data = data.replace(/ /g,"%20");
    var label = badge_name_map[badgeName];
    return `<img src="https://img.shields.io/static/v1?label=${label}&message=${data}&color=${color}">`;
}

function getTimeString(time) {
    var timeString;
    if(time[1] == 0) {
        if(time[0] == 1) {
            timeString = `${time[1]} hr`;
        } else {
            timeString = `${time[1]} hrs`;
        }
    } else {
        if(time[0] == 0) {
            timeString = `${time[1]} mins`;
        } else  {
            timeString = `${time[0]} hr ${time[1]} mins`
        }
    }
    return timeString;
}

function getCommentsString(numComments) {
    var commentsString;
    if(numComments == 1) {
        commentsString = `${numComments} comment`;
    } else {
        commentsString = `${numComments} comments`;
    }
    return commentsString;
}

function getResponseTimeStatus(timeDifference, changes) {
    var responseTimeStatus;
    if(timeDifference > 0) {
        changes.push(-1);
        timeStatus = 'slower';
    }
    // response stayed the same
    if(timeDifference == 0) {
        changes.push(0);
        timeStatus = 'same';
    }
    // response time increased
    if(timeDifference < 0) {
        changes.push(1);
        timeStatus = 'faster';
    }
    return responseTimeStatus;
}

function calculateTimeDifference(currTime, prevTime) {
    console.log('in calculatetime difference: \n\n');
    console.log('currTime: ' + currTime);
    console.log('prevTime: ' + prevTime);
    return (currTime[0] * 60 + currTime[1]) - (prevTime[0] * 60 + prevTime[1]);
}

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

        console.log('\n\n\n\n');
        console.log("in create issue function:");
        console.log('currTime:' + currTime);
        console.log('currCollabTime:' + currCollabTime);
        console.log('currContribTime:' + currContribTime);
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

        console.log('prevCollabTime before if statement: ' + prevCollabTime);
        
        if (currData.total == 0) {
            issueBody = `There were no issues created this month.`;
        } else if (prevData.total == 0) {

            const additionalIssueData = {
                'currData': currData
            }
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

            console.log('responseTimeBadge: ' + responseTimeBadge);
            console.log('\nnumUnrespondedBadge: ' + numUnrespondedBadge);

            issueBody = `<p align="center">${overallBadge}\n</p>` + 
                        `<p align="center">${collabResponseTimeBadge}&nbsp;&nbsp;&nbsp;&nbsp;${contribResponseTimeBadge}${responseTimeBadge}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${numUnrespondedBadge}\n</p>` + 
                        `<h2>Thanks for using the responsiveness bot! Since it's your first time using it, there is no data on your repository's progress yet. Be sure to check again next month!</h>`;
        } else {
            console.log('currTime: ' + currTime);
            console.log('prevTime: ' + prevTime);
            var changes = [];
            var timeDifference  = calculateTimeDifference(currTime, prevTime);
            console.log('calculating time difference for: \n\n');
            console.log('currCollabTime: ' + currCollabTime);
            console.log('prevCOlalbTime: ' + prevCollabTime);
            var collabTimeDifference = calculateTimeDifference(currCollabTime, prevCollabTime);
            var contribTimeDifference = calculateTimeDifference(currContribTime, prevContribTime);
            var unrespondedDifference = (Math.floor(currData.unresponded/currData.total * 100)) - (Math.floor(prevData.unresponded/prevData.total * 100));
            var overallChange, initMessage;
            var overallChangeString;

            console.log("\n\n\n\n");
            console.log('timeDifference: ' + timeDifference);
            console.log('unrespondedDifference: ' + unrespondedDifference);

            responseTimeStatus = getResponseTimeStatus(timeDifference, changes);
            collabResponseTimeStatus= getResponseTimeStatus(collabTimeDifference, changes);
            contribResponseTimeBadge = getResponseTimeStatus(contribTimeDifference, changes);
            // // response time decreased
            // if(timeDifference > 0) {
            //     changes.push(-1);
            //     responseTimeStatus = 'slower';
            // }
            // // response stayed the same
            // if(timeDifference == 0) {
            //     changes.push(0);
            //     responseTimeStatus = 'same';
            // }
            // // response time increased
            // if(timeDifference < 0) {
            //     changes.push(1);
            //     responseTimeStatus = 'faster';
            // }
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
    
            yield updateAdditionalIssue(newOctokit, repoName, additionalIssueData);
            
            var additionalInfoIssue = yield getExistingIssue(newOctokit, repoName);
            console.log('issue URL: ' + additionalInfoIssue.html_url);
            console.log('overallBadge: ' + overallBadge);
            console.log('responseTimeBadge: ' + responseTimeBadge);
            console.log('numUnrespondedBadge: ' + numUnrespondedBadge);
            var issueBody = `<p align="center">${overallBadge}\n</p>` + 
                            `<p align="center">${collabResponseTimeBadge}&nbsp;&nbsp;&nbsp;&nbsp;${contribResponseTimeBadge}&nbsp;&nbsp;&nbsp;&nbsp;${responseTimeBadge}&nbsp;&nbsp;&nbsp;&nbsp;${numUnrespondedBadge}\n</p>` + 
                            `<h2>${initMessage} Your repository's overall responsiveness to issues ${overallChangeString} since last month.\n</h2>` + 
                            `<p>For more information on your repository's progress, visit <a href="${additionalInfoIssue.html_url}">${repoName}'s Additional Responsiveness Info</a></p>`
        }
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
            console.log('issue title .... ' + currIssue.title);
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

        console.log('owner: ' + infoRepoOwner);
        console.log('repo name: ' + infoRepoName);
        const {data: issue} = yield newOctokit.issues.create({
            owner: infoRepoOwner,
            repo: infoRepoName,
            title: repoName,
            body: issueBody
        });
    });
}

function isWithinMonth2(creationDate, baseDate) {
    try {
        if (baseDate.getYear() % 4 == 0) {
            month_map[1] = 29; 
        }

        var withinMonth = false; 
        var prevMonth = false; 
        //  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse
        if (baseDate.getMonth() == creationDate.getMonth() && creationDate.getYear() == baseDate.getYear() &&
            baseDate.getDate() >= creationDate.getDate()) {
            withinMonth = true;
        }
        else if (creationDate.getYear() != baseDate.getYear()) {
            prevMonth = (creationDate.getYear() == baseDate.getYear()-1) && baseDate.getMonth() == 0 && creationDate.getMonth() == 11; 
            
        } else { // year is the same, month is diff 
            prevMonth =  (baseDate.getMonth() - creationDate.getMonth()) == 1; // check if created_at is less than 1 month from current moment 
        }
        var dateMinimum = Math.max(month_map[creationDate.getMonth()] - (31 - baseDate.getDate()) + 1, 1);
        if (!withinMonth) {
            withinMonth = prevMonth && creationDate.getDate() >= dateMinimum;
        }
        
        // console.log("within month:", withinMonth, " , creation date:", creationDate, ", base date: ", baseDate, ", prev month: ", prevMonth, " , date min:", dateMinimum);
        // console.log("creation month: ", creationDate.getMonth(), ", month map value:", month_map[creationDate.getMonth()], ", base day:", baseDate.getDate());
        
        return withinMonth;

    } catch (err){
        console.log(err);
    }
}

function isWithinMonth(creationDate, baseMonth, baseYear) {
    var creationMonth = creationDate.getMonth();
    var creationYear = creationDate.getYear();
    if(creationMonth == baseMonth && creationYear == baseYear) {
        return true;
    } else {
        return false;
    }
}

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
                console.log('commentCreator: ' + commentCreator);
                // collaborators
                if(userData.collaborators.has(commentCreator)) {
                    console.log('is a collaborator');
                    if(!collabEarliestCreationDate) {
                        collabEarliestCreationDate = commentCreationDate;
                    }
                    if(commentCreationDate.getTime() < collabEarliestCreationDate.getTime()) {
                        collabEarliestCreationDate = commentCreationDate;
                    }
                }
                // collaborators and contributors
                if(userData.contributors.has(commentCreator)) {
                    console.log('is a contributor');
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
            // return earliestCreationDate;
            return {
                firstContribResponseDate: contribEarliestCreationDate,
                firstCollabResponseDate: collabEarliestCreationDate,
                firstResponseDate: earliestCreationDate,
                totalComments: comments.length
            }
        }
    });
}

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
        console.log('collaboratorsSet: ' + collaboratorsSet.size);
        var contributorsSet = new Set();
        for (var i = 0; i < contributors.length; i ++){
            contributorsSet.add(contributors[i].login);
        }
        console.log('contributorsSet: ' + contributorsSet.size);
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
            var firstResponseTimes = [];
            var firstContribResponseTimes = [];
            var firstCollabResponseTimes = [];
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
                    continue;
                }
                total += 1;
                commentsData = yield getCommentsData(octokit, repoOwner, repoName, userData, issueNumber, isPull);
                if(commentsData) {
                    if(commentsData.firstCollabResponseDate) {
                        console.log('pushing a collab date...');
                        firstCollabResponseTimes.push(getDifference(issueCreationDate, commentsData.firstCollabResponseDate));
                    }
                    if(commentsData.firstContribResponseDate) {
                        console.log('pushing a contrib date...');
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

            console.log('Total Number of Issues: ' + issues.length);

            var pulls = yield getAllPulls(octokit, repoOwner, repoName, [], 1);

            // get month duration
            var currDate = new Date();
            var currMonth = currDate.getMonth();
            var baseMonth = currMonth - 1;
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
            console.log('currMonthResponseTimes Array: ' + currMonthIssuesData.firstResponseTimes);
            console.log('number of currMonthResponseTimes: ' + currMonthIssuesData.firstResponseTimes.length);
            console.log('currMonthAveResponseTime: ' + currMonthAveResponseTime);
            console.log('');
            console.log('number of currMonthCollabResponseTimes: ' + currMonthIssuesData.firstCollabResponseTimes.length);
            console.log('currMonthCollabAveResponseTime: ' + currMonthCollabAveResponseTime);
            console.log('');
            console.log('number of currMonthContribResponseTimes: ' + currMonthIssuesData.firstContribResponseTimes.length);
            console.log('currMonthContribAveResponseTime: ' + currMonthContribAveResponseTime);
            console.log(`${currMonthIssuesData.unresponded}/${currMonthIssuesData.total} unresponded`);

            currMonthIssuesData.aveResponseTime = currMonthAveResponseTime;
            currMonthIssuesData.collabAveReponseTime = currMonthCollabAveResponseTime;
            currMonthIssuesData.contribAveReponseTime = currMonthContribAveResponseTime;


            var currMonthPullsData = yield getData(octokit, repoOwner, repoName, pulls, baseMonth, baseYear, true);
            var currMonthPullsAveResponseTime = getAverageTime(currMonthPullsData.firstResponseTimes);
            console.log('currMonthPullsResponseTimes Array: ' + currMonthPullsData.firstResponseTimes);
            console.log('number of currMonthPullsResponseTimes: ' + currMonthPullsData.firstResponseTimes.length);
            console.log(`${currMonthPullsData.unresponded}/${currMonthPullsData.total} unresponded`);
            console.log('numReviewComments: ' + currMonthPullsData.numReviewComments);

            currMonthPullsData.aveResponseTime = currMonthPullsAveResponseTime;


            // get prev month duration
            baseMonth -= 1;
            if(baseMonth < 0) {
                baseMonth = 11;
                baseYear -= 1;
            }
            console.log("new baseMonth: " + baseMonth);
            console.log("new baseYear: " + baseYear);

            var prevMonthIssuesData = yield getData(octokit, repoOwner, repoName, issues, baseMonth, baseYear, false);
            var prevMonthAveResponseTime = getAverageTime(prevMonthIssuesData.firstResponseTimes);
            var prevMonthCollabAveResponseTime = getAverageTime(prevMonthIssuesData.firstCollabResponseTimes);
            var prevMonthContribAveResponseTime = getAverageTime(prevMonthIssuesData.firstContribResponseTimes);
            console.log('prevMonthResponseTimes Array: ' + prevMonthIssuesData.firstResponseTimes);
            console.log('number of prevMonthResponseTimes: ' + prevMonthIssuesData.firstResponseTimes.length);
            console.log('prevMonthAveResponseTimes: ' + prevMonthAveResponseTime);
            console.log('');
            console.log('number of prevMonthCollabResponeTimes: ' + prevMonthIssuesData.firstCollabResponseTimes.length);
            console.log('prevMonthCollabAveResponseTime: ' + prevMonthCollabAveResponseTime);
            console.log('number of prevMonthContribResponeTimes: ' + prevMonthIssuesData.firstContribResponseTimes.length);
            console.log('prevMonthContribAveResponseTime: ' + prevMonthContribAveResponseTime);
            console.log(`${prevMonthIssuesData.unresponded}/${prevMonthIssuesData.total} unresponded`);
            console.log('numComments: ' + prevMonthIssuesData.numComments);

            prevMonthIssuesData.aveResponseTime = prevMonthAveResponseTime;
            prevMonthIssuesData.collabAveResponseTime = prevMonthCollabAveResponseTime;
            prevMonthIssuesData.contribAveResponseTime = prevMonthContribAveResponseTime;

            var prevMonthPullsData = yield getData(octokit, repoOwner, repoName, pulls, baseMonth, baseYear, true);
            var prevMonthPullsAveResponseTime = getAverageTime(prevMonthPullsData.firstResponseTimes);
            console.log('prevMonthPullsResponseTimes Array: ' + prevMonthPullsData.firstResponseTimes);
            console.log('number of prevMonthPullsResponseTimes: ' + prevMonthPullsData.firstResponseTimes.length);
            console.log(`${prevMonthPullsData.unresponded}/${prevMonthPullsData.total} unresponded`);
            console.log('numComments: ' + prevMonthPullsData.numComments);
            console.log('numReviewComments: ' + prevMonthPullsData.numReviewComments);

            prevMonthPullsData.aveResponseTime = prevMonthPullsAveResponseTime;

            yield createIssue(octokit, repoOwner, repoName, currMonthIssuesData, prevMonthIssuesData, currMonthPullsData, prevMonthPullsData);

        } catch(err) {
            console.log(err);
        }
    });
}

run();