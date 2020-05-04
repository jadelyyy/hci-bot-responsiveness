const { Octokit } = require("@octokit/rest");
const core = require("@actions/core");
const github = require("@actions/github");

function run () {
    const userToken  = core.getInput('repo-token');
    const repoName = core.getInput('repo-name');
    const repoOwner = 'jadelyyy';

    var octokit = new github.GitHub(userToken);

    const {data: issues} = octokit.issues.listForRepo({
        repoOwner,
        repoName,
    });

    console.log('num issues: ' + issues.length);
}

run();