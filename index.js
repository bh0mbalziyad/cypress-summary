const core = require("@actions/core");
const github = require("@actions/github");
const markdownTable = require("markdown-table");
const fs = require("fs");
const path = require("path");

function getExamples(results) {
  return getChildren(results, []);
}

function getChildren(input, output, filepath) {
  Object.values(input).forEach(({ tests, suites, file }) => {
    if (file) {
      filepath = file;
    }

    if (tests) {
      tests.forEach(
        ({ fail, pending, skipped, fullTitle, err: { message } }) => {
          if (fail || pending || skipped) {
            output.push({
              title: fullTitle,
              filepath,
              message: message ? message.replace(/\n+/g, " ") : null,
              state: fail ? "fail" : skipped ? "skipped" : "pending",
            });
          }
        }
      );
    }

    if (suites) {
      output = [...getChildren(suites, output, filepath)];
    }
  });

  return output;
}

function getTable(examples) {
  return markdownTable([
    ["State", "Description"],
    ...examples.map(({ state, filepath, title, message }) => [
      state,
      `**Filepath**: ${filepath}<br>**Title**: ${title}<br>**Error**: ${message}`,
    ]),
  ]);
}

function getSummary(stats) {
  return (
    `Passes: ${stats.passes},` +
    ` failures: ${stats.failures},` +
    ` pending: ${stats.pending},` +
    ` skipped: ${stats.skipped},` +
    ` other: ${stats.other}.`
  );
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

    core.setOutput(
      "commentBody",
      `${core.getInput("title", { required: true })}
    <details>
    <summary>${getSummary(result.stats)}</summary>

    ${getTable(getExamples(result.results))}

    </details>`
    );
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
