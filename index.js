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

function createIssue(octokit, repoOwner, repoName, currData, prevData) {
    return __awaiter(this, void 0, void 0, function* () {
        const additionalToken  = core.getInput('additional-token');
        var newOctokit = new Octokit({
            auth: additionalToken
        });
        var issueBody;
        var responseTimeBadge, numUnrespondedBadge, aveNumCommentsBadge, overallBadge;
        var responseTimeStatus, numUnrespondedStatus, aveNumCommentsStatus, overallStatus;
        var badgeData;
        var currTime = currData.aveResponseTime;
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
        
        if (currData.total == 0) {
            issueBody = `There were no issues created this month.`;
        } else if (prevData.total == 0) {

            const additionalIssueData = {
                'currData': currData
            }
            yield createAdditionalIssue(newOctokit, repoName, additionalIssueData);
            
            badgeData = getTimeString(currTime);
            responseTimeBadge = createBadgeWithData('response_time', 'no issues', badgeData);

            badgeData = `${currData.unresponded}/${currData.total} issues`;
            numUnrespondedBadge = createBadgeWithData('unresponded', 'no issues', badgeData);

            badgeData = getCommentsString(currData.aveNumComments);
            aveNumCommentsBadge = createBadgeWithData('ave_comments', 'no issues', badgeData);

            overallBadge = createBadge('overall', 'no issues', 'for-the-badge');

            console.log('responseTimeBadge: ' + responseTimeBadge);
            console.log('\nnumUnrespondedBadge: ' + numUnrespondedBadge);
            console.log('\naveNumCommentsBadge: ' + aveNumCommentsBadge);

            issueBody = `<p align="center">${overallBadge}\n</p>` + 
                        `<p align="center">${responseTimeBadge}&nbsp;&nbsp;&nbsp;&nbsp;${numUnrespondedBadge}&nbsp;&nbsp;&nbsp;&nbsp;${aveNumCommentsBadge}\n</p>` + 
                        `<h2>Thanks for using the responsiveness bot! Since it's your first time using it, there is no data on your repository's progress yet. Be sure to check again next month!</h>`;
        } else {
            var changes = [];
            var timeDifference  = (currTime[0] * 60 + currTime[1]) - (prevTime[0] * 60 + prevTime[1]);
            var unrespondedDifference = (Math.floor(currData.unresponded/currData.total * 100)) - (Math.floor(prevData.unresponded/prevData.total * 100));
            var numCommentsDifference = currData.aveNumComments - prevData.aveNumComments;
            var overallChange, initMessage;
            var overallChangeString;

            console.log("\n\n\n\n");
            console.log('timeDifference: ' + timeDifference);
            console.log('unrespondedDifference: ' + unrespondedDifference);
            console.log('numCommentsDifference: ' + numCommentsDifference);

            // response time decreased
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
            // more comments this month
            if(numCommentsDifference > 0) {
                changes.push(1);
                aveNumCommentsStatus = 'increased';
            }
            // same comments
            if(numCommentsDifference == 0) {
                changes.push(0);
                aveNumCommentsStatus = 'same';
            }
            // less comments this month
            if(numCommentsDifference < 0) {
                changes.push(-1);
                aveNumCommentsStatus = 'decreased';
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

            badgeData = `${currData.unresponded}/${currData.total} issues`;
            numUnrespondedBadge = createBadgeWithData('unresponded', numUnrespondedStatus, badgeData);

            badgeData = getCommentsString(currData.aveNumComments);
            aveNumCommentsBadge = createBadgeWithData('ave_comments', aveNumCommentsStatus, badgeData);

            overallBadge = createBadge('overall', overallStatus, 'for-the-badge');

            const additionalIssueData = {
                'responseTimeStatus': responseTimeStatus,
                'aveNumCommentsStatus': aveNumCommentsStatus,
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
            console.log('aveNumCommentsBadge: ' + aveNumCommentsBadge);
            var issueBody = `<p align="center">${overallBadge}\n</p>` + 
                            `<p align="center">${responseTimeBadge}&nbsp;&nbsp;&nbsp;&nbsp;${numUnrespondedBadge}&nbsp;&nbsp;&nbsp;&nbsp;${aveNumCommentsBadge}\n</p>` + 
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
        var aveNumCommentsStatus = additionalIssueData.aveNumCommentsStatus;
        var numUnrespondedStatus = additionalIssueData.numUnrespondedStatus;
        var currData = additionalIssueData.currData;
        var currTime = currData.aveResponseTime;
        var commentBody = `\n<h2>${month_name_map[issueMonth]}\n</h2>` + 
                            `<h3>\nResponded Issues: </h3>` + 
                            `<p>\nAverage response time <b>(${responseTimeStatus.toUpperCase()})</b>: ${currTime[0]} hours and ${currTime[1]} minutes</p>` + 
                            `<p>\nAverage number of comments per issue <b>(${aveNumCommentsStatus.toUpperCase()})</b>: ${currData.aveNumComments}</p>` + 
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
                        `<p>\n    Average number of comments per issue: ${currData.aveNumComments}</p>` + 
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

function createIssue2(octokit, repoOwner, repoName, currData, prevData) {
    return __awaiter(this, void 0, void 0, function* () {
        var issueBody;
        var responseTimeBadge, numUnrespondedBadge, aveNumCommentsBadge;
        var currTime = currData.aveResponseTime;
        var prevTime = [5, 47]; 

        if (currTime == null) {
            issueBody = `There were no issues created this month.`;
        } else if (prevTime == null) {
            responseTimeBadge = createBadge('response_time', 'no_issues');
            numUnrespondedBadge = createBadge('unresponded', 'no_issues');
            aveNumCommentsBadge = createBadge('comments', 'no_issues');
            issueBody = `${responseTimeBadge}${numUnrespondedBadge}${aveNumCommentsBadge}\nGreat job! At an average of ${currTime[0]} hours and ${currTime[1]} minutes this month, ` + 
                        `your repository's response time was better than 70% of the communities on Github!`;
        } else {
            var difference  = (currTime[0] * 60 + currTime[1]) - (prevTime[0] * 60 + prevTime[1]);
            var percentDifference = (Math.floor(Math.abs(difference)/(prevTime[0] * 60 + prevTime[1]) * 100)).toString() + '%';
            var change, initMessage;
            // response time decreased
            if(difference > 0) {
                change = 'increased';
                initMessage = '';
            }
            if(difference == 0) {
                change = 'been maintained the same';
                initMessage = 'Not bad! ';
                percentDifference = '';
            }
            if(difference < 0) {
                change = 'decreased';
                initMessage = 'Great job! '
            }
            responseTimeBadge = createBadge('response time', 'no_issues');
            numUnrespondedBadge = createBadge('unresponded', 'no_issues');
            aveNumCommentsBadge = createBadge('comments', 'no_issues');
            var issueBody = `${badgeImage}\n${initMessage}This month, your repository's average response time has ${change} ${percentDifference} since last month. ` + 
                            // `At an average of ${currTime[0]} hours and ${currTime[1]} minutes, your response time was better than 70% of the communities on Github!`;
                            `This month, your repository's metrics are: \n` +
                            `\n    Average response time: ${currTime[0]} hours and ${currTime[1]} minutes` + 
                            `\n    Number of unresponded issues: ${currData.unresponded}/${currData.total}` + 
                            `\n    Average number of comments per issue: ${currData.aveNumComments}`;
        }
        // issueBody = `Great job! At an average of ${currTime} hours this month, ` + 
        //             `your repository's response time was better than 70% of the communities on Github!`;
        const {data: issue} = yield octokit.issues.create({
            owner: repoOwner,
            repo: repoName,
            title: 'Monthly Responsiveness Update',
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

function getCommentsData(octokit, repoOwner, repoName, issueNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        const {data: comments} = yield octokit.issues.listComments({
            owner: repoOwner,
            repo: repoName,
            issue_number: issueNumber
        });

        // return immediately if issue has no comments
        if(comments.length == 0) {
            return null;
        } else {
            var commentCreationDate;
            var earliestCreationDate = new Date(comments[0].created_at);
            for (var i = 0; i < comments.length; i++) {
                commentCreationDate = new Date(comments[i].created_at);
                if(commentCreationDate.getTime() < earliestCreationDate.getTime()) {
                    earliestCreationDate = commentCreationDate;
                }
            }
            // return earliestCreationDate;
            return {
                firstResponseDate: earliestCreationDate,
                totalComments: comments.length
            }
        }
    });
}

function getData(octokit, repoOwner, repoName, issues, baseMonth, baseYear) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            var firstResponseTimes = [];
            var numComments = []
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
                commentsData = yield getCommentsData(octokit, repoOwner, repoName, issueNumber);
                if(commentsData) {
                    firstResponseTimes.push(getDifference(issueCreationDate, commentsData.firstResponseDate));
                    numComments.push(commentsData.totalComments);
                } else {
                    unresponded += 1;
                }
            }
            return {
                firstResponseTimes: firstResponseTimes,
                total: total,
                unresponded: unresponded,
                numComments: numComments
            }
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
            allIssues.push(...issues);
            return yield getAllIssues(octokit, repoOwner, repoName, allIssues, pageNum + 1);
        } else {
            return allIssues;
        }
    });
}

function extractPulls(octokit, repoOwner, repoName, allIssues) {
    return __awaiter(this, void 0, void 0, function* () {
        var issue;
        var issues = [];
        // var pulls = [];
        // for (var i = 0; i < allIssues.length; i++) {
        //     issue = allIssues[i];
        //     if (issue.pull_request) {
        //         console.log('pull request does exist');
        //         const {data: pull} = octokit.pulls.get({
        //             owner: repoOwner,
        //             repo: repoName,
        //             pull_number: issue.number
        //         });
        //         console.log('pull: ' + pull);
        //         const {data: pull2} = octokit.pulls.get({
        //             owner: repoOwner,
        //             repo: repoName,
        //             pull_number: issue.number
        //         });
        //         console.log('pull: ' + pull2);
        //         pulls.push(pull2);
        //     } else {
        //         issues.push(issue);
        //     }
        // }
        // return {
        //     pull: pulls,
        //     issues: issues
        // }
        const {data: pulls} = yield octokit.pulls.list({
            owner: repoOwner,
            repo: repoName
        });
        console.log('after pulling...');
        console.log('returned pulls: ' + pulls);
        console.log('Total Number of Pulls: ' + pulls.length);
        console.log('pull number: ' + pulls[0].number);
        console.log('created_at: ' + pulls[0].created_at);
        console.log('merged_at: ' + pulls[0].merged_at);
        console.log('comments: ' + pulls[0].comments);
        console.log('review_comments: ' + pulls[0].review_comments);
    });
}

function run () {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userToken  = core.getInput('repo-token');
            const repoName = core.getInput('repo-name');
            const repoOwner = 'jadelyyy';

            var octokit = new github.GitHub(userToken);

            var allIssues = yield getAllIssues(octokit, repoOwner, repoName, [], 1);

            console.log('Total Number of Issues: ' + allIssues.length);

            var {pulls, issues} = yield extractPulls(octokit, repoOwner, repoName, allIssues);

            console.log('Total Number of Pulls: ' + pulls.length);

            console.log('created_at: ' + pulls[0].created_at);
            console.log('merged_at: ' + pulls[0].merged_at);
            console.log('comments: ' + pulls[0].comments);
            console.log('review_comments: ' + pulls[0].review_comments);

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
            console.log("baseMonth: " + baseMonth);
            console.log("baseYear: " + baseYear);
            var currMonthIssuesData = yield getData(octokit, repoOwner, repoName, issues, baseMonth, baseYear);
            var currMonthAveResponseTime = getAverageTime(currMonthIssuesData.firstResponseTimes);
            console.log('currMonthResponseTimes Array: ' + currMonthIssuesData.firstResponseTimes);
            console.log('number of currMonthResponseTimes: ' + currMonthIssuesData.firstResponseTimes.length);
            console.log('currMonthAveResponseTimes: ' + currMonthAveResponseTime);
            console.log(`${currMonthIssuesData.unresponded}/${currMonthIssuesData.total} unresponded`);
            console.log('numComments: ' + currMonthIssuesData.numComments);

            currMonthIssuesData.aveResponseTime = currMonthAveResponseTime;
            currMonthIssuesData.aveNumComments = getAverageNumComments(currMonthIssuesData.numComments);

            // get prev month duration
            baseMonth -= 1;
            if(baseMonth < 0) {
                baseMonth = 11;
                baseYear -= 1;
            }
            console.log("new baseMonth: " + baseMonth);
            console.log("new baseYear: " + baseYear);

            var prevMonthIssuesData = yield getData(octokit, repoOwner, repoName, issues, baseMonth, baseYear);
            var prevMonthAveResponseTime = getAverageTime(prevMonthIssuesData.firstResponseTimes);
            console.log('prevMonthResponseTimes Array: ' + prevMonthIssuesData.firstResponseTimes);
            console.log('number of prevMonthResponseTimes: ' + prevMonthIssuesData.firstResponseTimes.length);
            console.log('prevMonthAveResponseTimes: ' + prevMonthAveResponseTime);
            console.log(`${prevMonthIssuesData.unresponded}/${prevMonthIssuesData.total} unresponded`);
            console.log('numComments: ' + prevMonthIssuesData.numComments);

            prevMonthIssuesData.aveResponseTime = prevMonthAveResponseTime;
            prevMonthIssuesData.aveNumComments = getAverageNumComments(prevMonthIssuesData.numComments);

            yield createIssue(octokit, repoOwner, repoName, currMonthIssuesData, prevMonthIssuesData);

        } catch(err) {
            console.log(err);
        }
    });
}

run();