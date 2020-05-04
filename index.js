const { Octokit } = require("@octokit/rest");
const core = require("@actions/core");
const github = require("@actions/github");

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

function getFirstResponseTime(octokit, repoOwner, repoName, issueNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        // const userToken  = core.getInput('repo-token');
        // var newOctokit = new github.GitHub(userToken);
        // console.log(typeof(issueID));
        const {data: comments} = yield octokit.issues.listComments({
            owner: repoOwner,
            repo: repoName,
            issue_number: issueNumber
        });

        // return immediately if issue has no comments
        if(comments.length == 0) {
            console.log('no comments at all');
            return 0;
        } else {
            var commentCreationTime;
            var earliestCreationTime = new Date(comments[0].created_at);
            for (var i = 0; i < comments.length; i++) {
                commentCreationTime = new Date(comments[i].created_at);
                console.log('commentCreationTime: ' + commentCreationTime);
                // console.log('difference: ' + (commentCreationTime - earliestCreationTime));
                if(commentCreationTime.getTime() < earliestCreationTime.getTime()) {
                    console.log('diff > 0');
                    earliestCreationTime = commentCreationTime;
                }
            }
            return earliestCreationTime;
        }
    });
}

// assume timeB later than timeA
function getDifference(timeA, timeB) {
    console.log('timeA/issueCreationTime: ' + timeA);
    console.log('timeB/firstResponseTime: ' + timeB);
    var difference = timeB - timeA;
    console.log('difference: ' + difference);
    // 1000 milliseconds in 1 second, 60 seconds in 1 minute
    var differenceInMinutes = Math.floor((difference/1000)/60);
    console.log('differenceInMinutes: ' + differenceInMinutes);
    return differenceInMinutes;
}

function getAverage(times) {
    var sum = 0;
    for (var i = 0; i < times.length; i++) {
        sum += times[i];
    }
    return sum/times.length;
}

function run () {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userToken  = core.getInput('repo-token');
            const repoName = core.getInput('repo-name');
            const repoOwner = 'jadelyyy';

            var octokit = new github.GitHub(userToken);
            // var octokit = new Octokit({
            //     auth: userToken
            // });
            // const octokit = new Octokit({
            //     auth: userToken,
            //     userAgent: 'jadelyyy',
            //     log: {
            //         debug: () => {},
            //         info: () => {},
            //         warn: console.warn,
            //         error: console.error
            //     },
            //     request: {
            //         agent: undefined,
            //         fetch: undefined,
            //         timeout: 0
            //     }
            // });
            
            const {data: issues} = yield octokit.issues.listForRepo({
                owner: repoOwner,
                repo: repoName,
            });

            console.log('num issues: ' + issues.length);

            var firstResponseTimes = [];
            var firstResponseTime;
            var issue, issueNumber, issueCreationTime;
            var numComments;
            for (var i = 0; i < issues.length; i++) {
                issue = issues[i];
                issueNumber = issue.number;
                issueCreationTime = new Date(issue.created_at);
                console.log('\ncurrent issueID: ' + issueNumber);
                console.log('issue created at: ' + issueCreationTime);
                firstResponseTime = yield getFirstResponseTime(octokit, repoOwner, repoName, issueNumber);
                console.log('firstResponseTime: ' + firstResponseTime);
                firstResponseTimes.push(yield getDifference(issueCreationTime, firstResponseTime));
            }
            var averageResponseTime = getAverage(firstResponseTimes);
            console.log('\naverageReponseTime: ' + averageResponseTime);
        } catch(err) {
            console.log(err);
        }
    });
}

run();