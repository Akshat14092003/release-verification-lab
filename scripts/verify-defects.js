import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { BUG_FLAGS } from "../src/config.js";
import { randomUUID } from "node:crypto";
import { BASELINE_CHECKS, DEFECTS } from "../src/defects.js";

const testKey = (project, title) => project + "::" + title;
const expected = Object.fromEntries(DEFECTS.map(({ id, failures }) => [id, failures]));
const scenarios = [
  { name: "baseline", flags: [],        failures: [],                          count: BASELINE_CHECKS },
  { name: "auth",     flags: ["BUG_AUTH_BYPASS"],    failures: expected.auth,     count: 5 },
  { name: "weekend",  flags: ["BUG_WEEKEND_OFFER"],  failures: expected.weekend,  count: 7 },
  { name: "limit",    flags: ["BUG_NO_LIMIT"],        failures: expected.limit,    count: 2 },
  { name: "total",    flags: ["BUG_TOTAL_MISMATCH"],  failures: expected.total,    count: 2 },
  { name: "all",      flags: BUG_FLAGS,               failures: Object.values(expected).flat(), count: BASELINE_CHECKS }
];

const cliArgs = process.argv.slice(2);
if (cliArgs.length > 1 || cliArgs.some(arg => arg !== "--red-only")) {
  throw new Error("Usage: node scripts/verify-defects.js [--red-only]");
}
const redOnly = cliArgs.includes("--red-only");
const selectedScenarios = redOnly
  ? [{ ...scenarios.find(s => s.name === "all"), name: "red" }]
  : scenarios;
const summaryPath = redOnly ? "test-results/defects/red-summary.json" : "test-results/defects/summary.json";

mkdirSync("test-results/defects", { recursive: true });
const summary = { complete: false, mode: redOnly ? "red-only" : "matrix", recordedAt: new Date().toISOString(), scenarios: [] };
const save = () => writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n");
save();

function resultsFrom(suites) {
  return (suites || []).flatMap(suite => [
    ...(suite.specs || []).flatMap(spec =>
      (spec.tests || []).map(test => ({
        key: testKey(test.projectName, spec.title),
        status: test.status,
        attempts: test.results || []
      }))
    ),
    ...resultsFrom(suite.suites)
  ]);
}

try {
  for (const scenario of selectedScenarios) {
    console.log("Running " + scenario.name + "...");
    const runId = randomUUID();

    // All flags off by default; turn on only this scenario's flags.
    const flagEnv = Object.fromEntries([
      ...BUG_FLAGS.map(flag => [flag, "0"]),
      ...scenario.flags.map(flag => [flag, "1"])
    ]);
    const env = { ...process.env, ...flagEnv, LAB_SCENARIO: scenario.name, LAB_RUN_ID: runId };

    const spawnArgs = ["scripts/test.js"];
    if (!["baseline", "all", "red"].includes(scenario.name)) spawnArgs.push("--grep", "@" + scenario.name);

    const execution = spawnSync(process.execPath, spawnArgs, { env, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
    const folder = join("test-results", "defects", scenario.name);
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, "execution.log"), (execution.stdout || "") + (execution.stderr || ""));
    if (execution.error) throw execution.error;

    const resultFile = scenario.name === "baseline"
      ? "test-results/results.json"
      : join(folder, "results.json");
    const report = JSON.parse(readFileSync(resultFile, "utf8"));
    const tests = resultsFrom(report.suites);
    const failed = tests.filter(t => t.status !== "expected");
    const actual = failed.map(t => t.key).sort();
    const wanted = [...scenario.failures].sort();

    const setupError = report.config?.metadata?.runId !== runId
      || (report.errors || []).length > 0
      || failed.some(t =>
          t.attempts.length !== 1 ||
          t.attempts[0].status !== "failed" ||
          !/expect/i.test(t.attempts[0].error?.message || "")
        );
    const matched = JSON.stringify(actual) === JSON.stringify(wanted);
    const expectedExit = wanted.length ? 1 : 0;

    if (execution.status !== expectedExit || setupError || !matched ||
        tests.length !== scenario.count || report.stats.skipped || report.stats.flaky) {
      summary.scenarios.push({
        name: scenario.name, verified: false, exitCode: execution.status,
        expectedFailures: wanted, actualFailures: actual, setupError, stats: report.stats
      });
      save();
      throw new Error("Unexpected outcome for " + scenario.name +
        ". Inspect " + folder + "/execution.log and " + resultFile);
    }

    const row = {
      name: scenario.name, verified: true, flags: scenario.flags,
      passed: report.stats.expected, expectedFailures: actual,
      durationMs: report.stats.duration,
      results: resultFile,
      html: scenario.name === "baseline"
        ? "playwright-report/index.html"
        : "defect-reports/" + scenario.name + "/index.html"
    };
    summary.scenarios.push(row);
    save();
    console.log("VERIFIED " + scenario.name + ": " + row.passed + " passed, " +
      actual.length + " intended failures (" + (row.durationMs / 1000).toFixed(1) + "s).");
  }

  summary.complete = true;
  save();
  console.log(redOnly
    ? "Verified all intended red-job failures."
    : "Verified correct behaviour, all four individual defects, and all defects together.");
  console.log("Summary: " + summaryPath);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
