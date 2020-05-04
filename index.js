const { Octokit } = require("@octokit/rest");
const core = require("@actions/core");
const github = require("@actions/github");

function run () {
    const userToken  = core.getInput('repo-token');
    const repoName = core.getInput('repo-name');

    var octokit = new github.GitHub(userToken);

    const {data: issues} = octokit.issues.listForRepo({
        owner,
        repo,
    });

    console.log('num issues: ' + issues.length);
}

run();