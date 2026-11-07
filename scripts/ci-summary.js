import { appendFileSync, existsSync, readFileSync } from "node:fs";

const mode = process.argv[2];
if (!["green", "red"].includes(mode)) throw new Error("Usage: node scripts/ci-summary.js green|red");

const file = mode === "green" ? "test-results/results.json" : "test-results/defects/red-summary.json";
const lines = ["## Release verification: " + mode, ""];

if (!existsSync(file)) {
  lines.push("No test results were produced. Check dependency, browser, or test setup logs.");
} else {
  const report = JSON.parse(readFileSync(file, "utf8"));
  if (mode === "green") {
    const { expected, unexpected, skipped, duration } = report.stats;
    lines.push(
      "- Passed: " + expected,
      "- Unexpected failures: " + unexpected,
      "- Skipped: " + skipped,
      "- Duration: " + (duration / 1000).toFixed(1) + "s"
    );
  } else {
    const result = report.scenarios.find(s => s.name === "red");
    lines.push(
      "- Exact defect pattern verified: " + Boolean(report.complete && result?.verified),
      "- Passing controls: " + (result?.passed ?? "not available"),
      "- Intended assertion failures: " + (result?.expectedFailures?.length ?? "not available")
    );
  }
}

lines.push("", "Download this job's evidence artifact for HTML, JSON/JUnit, screenshots, traces, and request/SQL evidence.");
const markdown = lines.join("\n") + "\n";
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
else console.log(markdown);
