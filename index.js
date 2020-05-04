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

function run () {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userToken  = core.getInput('repo-token');
            const repoName = core.getInput('repo-name');
            const repoOwner = 'jadelyyy';

            var octokit = new github.GitHub(userToken);

            const {data: issues} = await octokit.issues.listForRepo({
                owner: repoOwner,
                repo: repoName,
            });

            console.log('num issues: ' + issues.length);

            var issue;
            var numComments;
            for (var i = 0; i < issues.length; i++) {
                issue = issues[i];
                numComments = getIssueComments()
            }

        } catch(err) {
            console.log(err);
        }
    });
}

run();