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
    if(times.length == 0) {
        return null;
    }
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

function createIssue(octokit, repoOwner, repoName, currTime, prevTime) {
    return __awaiter(this, void 0, void 0, function* () {
        var issueBody;
        if (currTime == null) {
            issueBody = `There were no issues created this month.`;
        } else if (prevTime == null) {
            issueBody = `Great job! At an average of ${currTime} hours this month, ` + 
                        `your repository's response time was better than 70% of the communities on Github!`;
        } else {
            var difference = currTime - prevTime;
            var percentDifference = Math.floor(Math.abs(difference)/prevTime * 100)

            var change, initMessage;
            // response time decreased
            if(difference > 0) {
                var change = 'increased';
                var initMessage = '';
            }
            if(difference == 0){
                var change = 'increased';
                var initMessage = 'Not bad! ';
            }
            else {
                var initMessage = 'Great job! '
                var change = 'decreased';
            }
            var issueBody = `${initMessage}This month, your repository's average response time has ${change} ${percentDifference}% since last month.` + 
                            `At an average of ${currTime} hours, your response time was better than 70% of the communities on Github!`;
        }
        issueBody = `Great job! At an average of ${currTime} hours this month, ` + 
                    `your repository's response time was better than 70% of the communities on Github!`;
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
            console.log("Month is same and year is same");
            withinMonth = true;
        }
        else if (creationDate.getYear() != baseDate.getYear()) {
            // console.log("Creation year is 1 less than base year and base month is january and creation month is december")
            console.log("creation month is december and base month is january");
            prevMonth = (creationDate.getYear() == baseDate.getYear()-1) && baseDate.getMonth() == 0 && creationDate.getMonth() == 11; 
            
        } else { // year is the same, month is diff 
            console.log("Creation month is 1 month before base month");
            prevMonth =  (baseDate.getMonth() - creationDate.getMonth()) == 1; // check if created_at is less than 1 month from current moment 
        }
        var dateMinimum = Math.max(month_map[creationDate.getMonth()] - (31 - baseDate.getDate()) + 1, 1);
        if (!withinMonth) {
            console.log('creation month is within 1 month');
            console.log('dateMinimum: ' + dateMinimum);
            withinMonth = prevMonth && creationDate.getDate() >= dateMinimum;
        }
        
        // console.log("within month:", withinMonth, " , creation date:", creationDate, ", base date: ", baseDate, ", prev month: ", prevMonth, " , date min:", dateMinimum);
        // console.log("creation month: ", creationDate.getMonth(), ", month map value:", month_map[creationDate.getMonth()], ", base day:", baseDate.getDate());
        
        // console.log('testing: ' + creationDate);
        // console.log('withinMonth: ' + withinMonth);
        return withinMonth;

    } catch (err){
        console.log(err);
    }
}

function getResponseTimes(octokit, repoOwner, repoName, issues, baseDate) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            var firstResponseTimes = [];
            var firstResponseDate;
            var issue, issueNumber, issueCreationDate;
            for (var i = 0; i < issues.length; i++) {
                issue = issues[i];
                issueNumber = issue.number;
                issueCreationDate = new Date(issue.created_at);
                // console.log('\ncurrent issueID: ' + issueNumber);
                // console.log('issue created at: ' + issueCreationDate);
                if(!isWithinMonth(issueCreationDate, baseDate)) {
                    console.log('NOT WITHIN MONTH: ' + issueCreationDate);
                    continue;
                }
                console.log('WITHIN MONTH: ' + issueCreationDate);
                firstResponseDate = yield getFirstResponseDate(octokit, repoOwner, repoName, issueNumber);
                // console.log('firstResponseDate: ' + firstResponseDate);
                if(firstResponseDate) {
                    console.log('WITHIN MONTH AND First Response Exists: ' + firstResponseDate);
                    firstResponseTimes.push(getDifference(issueCreationDate, firstResponseDate));
                }
            }
            return firstResponseTimes;
        } catch(err) {
            console.log(err);
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
            
            const {data: issues} = yield octokit.issues.listForRepo({
                owner: repoOwner,
                repo: repoName,
            });

            console.log('Total Number of Issues: ' + issues.length);

            var baseDate = new Date();
            console.log('\noriginal baseDate: ' + baseDate);
            var currMonthResponseTimes = yield getResponseTimes(octokit, repoOwner, repoName, issues, baseDate);
            console.log('currMonthResponseTimes Array: ' + currMonthResponseTimes);
            console.log('number of currMonthResponseTimes: ' + currMonthResponseTimes.length);
        
            var currMonthAveResponseTime = getAverageTimeInHours(currMonthResponseTimes);
            console.log('currMonthAveResponseTimes: ' + currMonthAveResponseTime);

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

            var prevMonthResponseTimes = yield getResponseTimes(octokit, repoOwner, repoName, issues, baseDate);
            var prevMonthAveResponseTime = getAverageTimeInHours(prevMonthResponseTimes);
            console.log('prevMonthResponseTimes Array: ' + currMonthResponseTimes);
            console.log('number of prevMonthResponseTimes: ' + currMonthResponseTimes.length);

            yield createIssue(octokit, repoOwner, repoName, currMonthAveResponseTime, prevMonthAveResponseTime);

        } catch(err) {
            console.log(err);
        }
    });
}

run();