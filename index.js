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

function getIssueComments(octokit, repoOwner, repoName, issueID) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('getting comments...\n');
        // const userToken  = core.getInput('repo-token');
        // var newOctokit = new github.GitHub(userToken);
        console.log('typeof', issueID);
        const {data: comments} = yield octokit.issues.listComments({
            owner: repoOwner,
            repo: repoName,
            issue_number: parseInt(issueID)
        });

        // const {data: issue} = yield octokit.issues.get({
        //     repoOwner,
        //     repoName,
        //     issueID
        // });

        console.log('in function numComments: ' + comments);
        return comments.length;
    });
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

            var issue;
            var issueID;
            var numComments;
            for (var i = 0; i < issues.length; i++) {
                issue = issues[i];
                issueID = issue.id;
                console.log('current issueID: ' + issueID);
                numComments = yield getIssueComments(octokit, repoOwner, repoName, issueID);
                console.log('numComments: ' + numComments);
            }

        } catch(err) {
            console.log(err);
        }
    });
}

run();