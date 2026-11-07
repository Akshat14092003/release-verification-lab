// Repeats the green baseline and the red defect demonstration several times and
// records what actually happened. Measurement only: it never edits the suites.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { hrtime } from "node:process";
import os from "node:os";
import { BASELINE_CHECKS } from "../src/defects.js";

const cliArgs = process.argv.slice(2);
let runs = 10;
let expectedChecks = BASELINE_CHECKS;
for (const arg of cliArgs) {
  const runsMatch  = /^--runs=(\d+)$/.exec(arg);
  const checkMatch = /^--expect=(\d+)$/.exec(arg);
  if (runsMatch)       runs = Number(runsMatch[1]);
  else if (checkMatch) expectedChecks = Number(checkMatch[1]);
  else throw new Error("Usage: node scripts/measure-repeatability.js [--runs=N] [--expect=CHECKS]");
}
if (runs < 1 || runs > 50) throw new Error("--runs must be between 1 and 50.");
if (expectedChecks < 1)    throw new Error("--expect must be at least 1.");

const root = process.cwd();
const out  = "test-results/repeatability.json";

function elapsedSeconds(start) {
  return Number((Number(hrtime.bigint() - start) / 1e9).toFixed(3));
}

function collectFailures(suites, failures = []) {
  for (const suite of suites || []) {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        if ((test.results || []).some(r => r.status !== "passed"))
          failures.push(`${test.projectName}::${spec.title}`);
      }
    }
    collectFailures(suite.suites, failures);
  }
  return failures;
}

/** Run a child script, return elapsed wall seconds and its spawnSync result. */
function runScript(scriptArgs) {
  const startedAt = Date.now();
  const start     = hrtime.bigint();
  const result    = spawnSync(process.execPath, scriptArgs, { cwd: root, stdio: "inherit" });
  return { result, startedAt, wall: elapsedSeconds(start) };
}

function green(index) {
  const { result, startedAt, wall } = runScript(["scripts/test.js"]);
  const report  = JSON.parse(readFileSync("test-results/results.json", "utf8"));
  const stats   = report.stats || {};
  const reportedAt = Date.parse(stats.startTime);
  return {
    run: index,
    fresh:     Number.isFinite(reportedAt) && reportedAt >= startedAt - 2000,
    exitCode:  result.status,
    checks:    (stats.expected || 0) + (stats.unexpected || 0) + (stats.flaky || 0),
    passed:    stats.expected   || 0,
    unexpected: stats.unexpected || 0,
    flaky:     stats.flaky      || 0,
    skipped:   stats.skipped    || 0,
    failures:  collectFailures(report.suites).sort(),
    suiteSeconds: Number(((stats.duration || 0) / 1000).toFixed(3)),
    wallSeconds:  wall
  };
}

function red(index) {
  const { result, startedAt, wall } = runScript(["scripts/verify-defects.js", "--red-only"]);
  const summary  = JSON.parse(readFileSync("test-results/defects/red-summary.json", "utf8"));
  const scenario = (summary.scenarios || [])[0] || {};
  const recordedAt = Date.parse(summary.recordedAt);
  return {
    run: index,
    fresh:            Number.isFinite(recordedAt) && recordedAt >= startedAt - 2000,
    exitCode:         result.status,
    verified:         Boolean(summary.complete && scenario.verified && result.status === 0),
    passed:           scenario.passed || 0,
    intendedFailures: (scenario.expectedFailures || []).length,
    failures:         [...(scenario.expectedFailures || [])].sort(),
    suiteSeconds:     Number(((scenario.durationMs || 0) / 1000).toFixed(3)),
    wallSeconds:      wall
  };
}

function spread(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n    = sorted.length;
  const sum  = sorted.reduce((t, v) => t + v, 0);
  const mid  = (n - 1) / 2;
  const median = n % 2
    ? sorted[Math.floor(mid)]
    : (sorted[mid - 0.5] + sorted[mid + 0.5]) / 2;
  return {
    min:    sorted[0],
    max:    sorted[n - 1],
    mean:   Number((sum / n).toFixed(3)),
    median: Number(median.toFixed(3))
  };
}

function identical(sets) {
  const first = JSON.stringify(sets[0]);
  return sets.every(s => JSON.stringify(s) === first);
}

const greenRuns = [];
const redRuns   = [];
for (let i = 1; i <= runs; i++) {
  console.log(`\n=== green run ${i}/${runs} ===`);
  greenRuns.push(green(i));
  console.log(`\n=== red run ${i}/${runs} ===`);
  redRuns.push(red(i));
}

const record = {
  recordedAt: new Date().toISOString(),
  runs,
  environment: {
    node:    process.version,
    platform: `${os.platform()} ${os.release()}`,
    cpus:    os.cpus().length,
    ci:      Boolean(process.env.CI),
    workers: process.env.CI ? 2 : 3
  },
  expectedChecks,
  green: {
    runs: greenRuns,
    // A clean run must have executed the whole suite: the right number of checks, all passing,
    // nothing skipped or flaky, and a report written by this run rather than an earlier one.
    cleanRuns: greenRuns.filter(r =>
      r.exitCode === 0 && r.unexpected === 0 && r.flaky === 0 &&
      r.skipped === 0 && r.checks === expectedChecks && r.passed === expectedChecks && r.fresh
    ).length,
    checksStable:     identical(greenRuns.map(r => r.checks)),
    distinctFailures: [...new Set(greenRuns.flatMap(r => r.failures))].sort(),
    suiteSeconds:     spread(greenRuns.map(r => r.suiteSeconds)),
    wallSeconds:      spread(greenRuns.map(r => r.wallSeconds))
  },
  red: {
    runs: redRuns,
    verifiedRuns: redRuns.filter(r =>
      r.exitCode === 0 && r.verified && r.fresh && r.intendedFailures > 0 && r.passed > 0
    ).length,
    failureSetStable: identical(redRuns.map(r => r.failures)),
    passCountStable:  identical(redRuns.map(r => r.passed)),
    suiteSeconds:     spread(redRuns.map(r => r.suiteSeconds)),
    wallSeconds:      spread(redRuns.map(r => r.wallSeconds))
  }
};

mkdirSync("test-results", { recursive: true });
writeFileSync(out, JSON.stringify(record, null, 2) + "\n");

console.log("\n=== repeatability ===");
console.log(`green: ${record.green.cleanRuns}/${runs} clean, suite ${record.green.suiteSeconds.min}-${record.green.suiteSeconds.max}s`);
console.log(`red:   ${record.red.verifiedRuns}/${runs} verified, suite ${record.red.suiteSeconds.min}-${record.red.suiteSeconds.max}s`);
console.log(`written: ${out}`);

const stable =
  record.green.cleanRuns === runs && record.red.verifiedRuns === runs &&
  record.green.checksStable && record.red.failureSetStable && record.red.passCountStable;
if (!stable) {
  console.log("Not every run met the acceptance conditions. See " + out + " for the per-run records.");
  process.exitCode = 1;
}
