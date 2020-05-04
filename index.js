const { Octokit } = require("@octokit/rest");
const core = require("@actions/core");
const github = require("@actions/github");

function run () {
    const userToken  = core.getInput('repo-token');
    const repoName = core.getInput('repo-name');
    const repoOwner = 'jadelyyy';

    var octokit = new github.GitHub(userToken);

    const {status, data: issues} = octokit.issues.listForRepo({
        repoOwner,
        repoName,
    });

    if (status !== 200) {
        throw new Error(`Received unexpected API status code ${status}`);
    }

    console.log('num issues: ' + issues.length);
}

run();