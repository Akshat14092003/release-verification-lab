import { appendFileSync, existsSync, readFileSync } from "node:fs";

const mode = process.argv[2];
if (!["green", "red"].includes(mode)) throw new Error("Usage: node scripts/ci-summary.js green|red");
const lines = ["## Release verification: " + mode, ""];
const file = mode === "green" ? "test-results/results.json" : "test-results/defects/red-summary.json";
if (!existsSync(file)) {
  lines.push("No test results were produced. Check dependency, browser, or test setup logs.");
} else {
  const report = JSON.parse(readFileSync(file, "utf8"));
  if (mode === "green") {
    lines.push(
      "- Passed: " + report.stats.expected,
      "- Unexpected failures: " + report.stats.unexpected,
      "- Skipped: " + report.stats.skipped,
      "- Duration: " + (report.stats.duration / 1000).toFixed(1) + "s"
    );
  } else {
    const result = report.scenarios.find(scenario => scenario.name === "red");
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
