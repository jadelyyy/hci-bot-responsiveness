const { Octokit } = require("@octokit/rest");
const core = require("@actions/core");
const github = require("@actions/github");

const {badge_color_map, badge_name_map} = require("./badgeData.js");
console.log('IMPORTED....\n');
console.log('badge_color_map: ' + badge_color_map);
console.log('badge_name_map: ' + badge_name_map);


var month_map = {0: 31, 1: 28, 2: 31, 3: 30, 4: 31, 5: 30, 6: 31, 7: 31, 8: 30, 9: 31, 10: 30, 11:31};

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
        var issueBody;
        var responseTimeBadge, numUnrespondedBadge, aveNumCommentsBadge, overallBadge;
        var responseTimeStatus, numUnrespondedStatus, aveNumCommentsStatus, overallStatus;
        var badgeData;
        var currTime = currData.aveResponseTime;
        prevData = {
            firstResponseTimes: [0],
            total: 40,
            unresponded: 32,
            numComments: [2, 2],
            aveResponseTime: [5, 47],
            aveNumComments: 2
        }
        var prevTime = prevData.aveResponseTime;
        
        if (currData.total == 0) {
            issueBody = `There were no issues created this month.`;
        } else if (prevData.total == 0) {
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
                        `<h2>Great job this month! There were no issues created in the previous month, but you can check your progress again next month!</h>` + 
                        `<h3>\nResponded Issues: </h3>` + 
                        `<p>\n    Average response time: ${currTime[0]} hours and ${currTime[1]} minutes</p>` + 
                        `<p>\n    Average number of comments per issue: ${currData.aveNumComments}</p>` + 
                        `<h3>\nUnresponded Issues:</h3>` + 
                        `<p>\n    Number of unresponded issues: ${currData.unresponded}/${currData.total}</p>`;
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
            
            console.log('overallBadge: ' + overallBadge);
            console.log('responseTimeBadge: ' + responseTimeBadge);
            console.log('numUnrespondedBadge: ' + numUnrespondedBadge);
            console.log('aveNumCommentsBadge: ' + aveNumCommentsBadge);
            var issueBody = `<p align="center">${overallBadge}\n</p>` + 
                            `<p align="center">${responseTimeBadge}&nbsp;&nbsp;&nbsp;&nbsp;${numUnrespondedBadge}&nbsp;&nbsp;&nbsp;&nbsp;${aveNumCommentsBadge}\n</p>` + 
                            `<h2>${initMessage} Your repository's overall responsiveness to issues ${overallChangeString} since last month.</h2>` + 
                            `<h3>\nResponded Issues: </h3>` + 
                            `<p>\nAverage response time: ${currTime[0]} hours and ${currTime[1]} minutes <b style="text-align:right">${responseTimeStatus.toUpperCase()}</b></p>` + 
                            `<p>\nAverage number of comments per issue: ${currData.aveNumComments} <b style="text-align:right">${aveNumCommentsStatus.toUpperCase()}</b></p>` + 
                            `<h3>\nUnresponded Issues:</h3>` + 
                            `<p>\nNumber of unresponded issues: ${currData.unresponded}/${currData.total} <b style="text-align:right">${numUnrespondedStatus.toUpperCase()}</b></p>`;
        }
        const {data: issue} = yield octokit.issues.create({
            owner: repoOwner,
            repo: repoName,
            title: 'Monthly Responsiveness Update',
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

function isWithinMonth(creationDate, baseDate) {
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

function getIssuesData(octokit, repoOwner, repoName, issues, baseDate) {
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
                if(!isWithinMonth(issueCreationDate, baseDate)) {
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

function run () {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userToken  = core.getInput('repo-token');
            const repoName = core.getInput('repo-name');
            const repoOwner = 'jadelyyy';

            var octokit = new github.GitHub(userToken);

            var issues = yield getAllIssues(octokit, repoOwner, repoName, [], 1);

            console.log('Total Number of Issues: ' + issues.length);

            var baseDate = new Date();
            console.log('\noriginal baseDate: ' + baseDate);
            // var currMonthResponseTimes = yield getIssuesData(octokit, repoOwner, repoName, issues, baseDate);
            var currMonthIssuesData = yield getIssuesData(octokit, repoOwner, repoName, issues, baseDate);
            var currMonthAveResponseTime = getAverageTime(currMonthIssuesData.firstResponseTimes);
            console.log('currMonthResponseTimes Array: ' + currMonthIssuesData.firstResponseTimes);
            console.log('number of currMonthResponseTimes: ' + currMonthIssuesData.firstResponseTimes.length);
            console.log('currMonthAveResponseTimes: ' + currMonthAveResponseTime);
            console.log(`${currMonthIssuesData.unresponded}/${currMonthIssuesData.total} unresponded`);
            console.log('numComments: ' + currMonthIssuesData.numComments);

            currMonthIssuesData.aveResponseTime = currMonthAveResponseTime;
            currMonthIssuesData.aveNumComments = getAverageNumComments(currMonthIssuesData.numComments);

            if (baseDate.getMonth() == 1) {
                var prevMonth = 11;
            } else {
                var prevMonth = baseDate.getMonth() - 1;
            }
            var prevDay = Math.max(month_map[prevMonth] - (31 - baseDate.getDate()) + 1, 1);
            if(prevMonth == 11) {
                baseDate.setYear(baseDate.getYear() - 1)
            }

            baseDate.setDate(prevDay);
            baseDate.setMonth(prevMonth);
            console.log('\nnew BaseDate: ' + baseDate);

            // var prevMonthResponseTimes = yield getIssuesData(octokit, repoOwner, repoName, issues, baseDate);
            var prevMonthIssuesData = yield getIssuesData(octokit, repoOwner, repoName, issues, baseDate);
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