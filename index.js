import core from "@actions/core";
import { markdownTable } from "markdown-table";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

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

    const examples = getExamples(result.results);
    const mdTable = getTable(examples);

    core.setOutput("testDetails", mdTable);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
