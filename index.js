const { Octokit } = require("@octokit/rest");
const core = require("@actions/core");
const github = require("@actions/github");

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

function createIssue(octokit, repoOwner, repoName, currData, prevData) {
    return __awaiter(this, void 0, void 0, function* () {
        var badgeImage = '<img src="https://img.shields.io/badge/responsetime-1hr-green"></img>';
        var issueBody;
        var currTime = currData.aveResponseTime;
        var prevTime = [5, 47]; 
        console.log('currTime: ' + currTime);
        console.log('prevTime: ' + prevTime);
        if (currTime == null) {
            issueBody = `${badgeImage}\nThere were no issues created this month.`;
        } else if (prevTime == null) {
            issueBody = `${badgeImage}\nGreat job! At an average of ${currTime[0]} hours and ${currTime[1]} minutes this month, ` + 
                        `your repository's response time was better than 70% of the communities on Github!`;
        } else {
            // var difference = currTime - prevTime;
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
            // return firstResponseTimes;
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