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

function getFirstResponseDate(octokit, repoOwner, repoName, issueNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        const {data: comments} = yield octokit.issues.listComments({
            owner: repoOwner,
            repo: repoName,
            issue_number: issueNumber
        });

        // return immediately if issue has no comments
        if(comments.length == 0) {
            console.log('no comments at all');
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
            return earliestCreationDate;
        }
    });
}

// assume timeB later than timeA
function getDifference(dateA, dateB) {
    var difference = dateB - dateA;
    console.log('difference: ' + difference);
    // 1000 milliseconds in 1 second, 60 seconds in 1 minute
    var differenceInMinutes = Math.floor((difference/1000)/60);
    console.log('differenceInMinutes: ' + differenceInMinutes);
    return differenceInMinutes;
}

function getAverageTimeInHours(times) {
    var sum = 0;
    for (var i = 0; i < times.length; i++) {
        sum += times[i];
    }
    var averageTimeInMinutes = sum/times.length;
    var hours = Math.floor(averageTimeInMinutes/60);
    var minutes = averageTimeInMinutes % 60;
    if (minutes > 30) {
        return hours + 1;
    } else {
        return hours;
    }
}

function createIssue(octokit, repoOwner, repoName, averageResponseTime) {
    return __awaiter(this, void 0, void 0, function* () {
        var issueBody = `Great job! This month, your repository's average response time has decreased 5% since last month!` + 
                        `At an average of ${averageResponseTime} hours, your response time was better than 70% of the communities on Github!`;
        const {data: issue} = yield octokit.issues.create({
            owner: repoOwner,
            repo: repoName,
            title: 'Monthly Responsiveness Update',
            body: issueBody
        })
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
        if (baseDate.getMonth() == creationDate.getMonth() && creationDate.getYear() == baseDate.getYear()) {
            withinMonth = true;
        }
        else if (creationDate.getYear() != baseDate.getYear()) {
            prevMonth = (creationDate.getYear() == baseDate.getYear()-1) && baseDate.getMonth() == 0 && creationDate.getMonth() == 11; 
            
        } else { // year is the same, month is diff 
            prevMonth = (baseDate.getMonth() - creationDate.getMonth()) <= 1; // check if created_at is less than 1 month from current moment 
        }
        var dateMinimum = Math.max(month_map[creationDate.getMonth()] - (31 - baseDate.getDate()) +1, 1);
        if (!withinMonth) {
            withinMonth = prevMonth && creationDate.getDate() >= dateMinimum;
        }
        
        // console.log("within month:", withinMonth, " , creation date:", creationDate, ", base date: ", baseDate, ", prev month: ", prevMonth, " , date min:", dateMinimum);
        // console.log("creation month: ", creationDate.getMonth(), ", month map value:", month_map[creationDate.getMonth()], ", base day:", baseDate.getDate());
        
        console.log('withinMonth: ' + withinMonth);
        return withinMonth;

    } catch (err){
        console.log(err);
    }
}

function getResponseTimes(octokit, repoOwner, repoName, issues, baseDate) {
    return __awaiter(this, void 0, void 0, function* () {
        var firstResponseTimes = [];
        var firstResponseDate;
        var issue, issueNumber, issueCreationDate;
        for (var i = 0; i < issues.length; i++) {
            issue = issues[i];
            issueNumber = issue.number;
            issueCreationDate = new Date(issue.created_at);
            console.log('\ncurrent issueID: ' + issueNumber);
            console.log('issue created at: ' + issueCreationDate);
            if(!isWithinMonth(issueCreationDate, baseDate)) {
                continue;
            }
            firstResponseDate = yield getFirstResponseDate(octokit, repoOwner, repoName, issueNumber);
            console.log('firstResponseDate: ' + firstResponseDate);
            if(!firstResponseDate) {
                console.log('adding...');
                firstResponseTimes.push(yield getDifference(issueCreationDate, firstResponseDate));
            }
        }
        return firstResponseTimes;
    });
}

function run () {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userToken  = core.getInput('repo-token');
            const repoName = core.getInput('repo-name');
            const repoOwner = 'jadelyyy';

            var octokit = new github.GitHub(userToken);
            
            const {data: issues} = yield octokit.issues.listForRepo({
                owner: repoOwner,
                repo: repoName,
            });

            console.log('num issues: ' + issues.length);

            var baseDate = new Date();
            var currMonthResponseTimes = getResponseTimes(octokit, repoOwner, repoName, issues, baseDate);
        
            var currMonthAveResponseTime = getAverageTimeInHours(currMonthResponseTimes);
            console.log('currMonthAveResponeTimes: ' + currMonthAveResponseTime);
            console.log('number of times: ' + currMonthAveResponseTimes.length);
            console.log('\naverageReponseTime: ' + currMonthAveResponseTime);
            yield createIssue(octokit, repoOwner, repoName, currMonthAveResponseTime);

        } catch(err) {
            console.log(err);
        }
    });
}

run();