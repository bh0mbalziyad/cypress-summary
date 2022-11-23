const core = require("@actions/core");
const github = require("@actions/github");
const fs = require("fs");
const path = require("path");

function getSummary(stats) {
  return {
    passed: stats.passes,
    failures: stats.failures,
    pending: stats.pending,
    skipped: stats.skipped,
    duration: stats.duration,
  };
}

async function run() {
  try {
    const pathname = core.getInput("pathname", { required: true });

    const fullPathname = path.resolve(process.env.GITHUB_WORKSPACE, pathname);

    try {
      fs.accessSync(fullPathname, fs.constants.R_OK);
    } catch (err) {
      core.warning(`${fullPathname}: access error!`);
      return;
    }

    const result = require(fullPathname);

    const data = getSummary(result.stats);

    const commentBody = [];
    const title = `# :evergreen_tree: ${core.getInput("title", {
      required: true,
    })}`;
    const table_headers = `| Passed ✅ | Failed ❌ | Pending ✋🏻 | Skipped ↩️ | Duration ⏱️ |`;
    const table_separator = `|---|---|---|---|---|`;
    const table_content = `| ${data.passed} | ${data.failures} | ${data.pending} | ${data.skipped} | ${data.duration} |`;

    commentBody.push(title, table_headers, table_separator, table_content);
    core.setOutput("commentBody", commentBody.join("\n"));
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
