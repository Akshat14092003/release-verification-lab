// Repeats the green baseline and the red defect demonstration several times and
// records what actually happened. Measurement only: it never edits the suites.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { hrtime } from "node:process";
import os from "node:os";

const args = process.argv.slice(2);
let runs = 10;
let expectedChecks = 34;
for (const arg of args) {
  const runsArg = /^--runs=(\d+)$/.exec(arg);
  const expectArg = /^--expect=(\d+)$/.exec(arg);
  if (runsArg) runs = Number(runsArg[1]);
  else if (expectArg) expectedChecks = Number(expectArg[1]);
  else throw new Error("Usage: node scripts/measure-repeatability.js [--runs=N] [--expect=CHECKS]");
}
if (runs < 1 || runs > 50) throw new Error("--runs must be between 1 and 50.");
if (expectedChecks < 1) throw new Error("--expect must be at least 1.");

const root = process.cwd();
const out = "test-results/repeatability.json";

function seconds(start) {
  return Number((Number(hrtime.bigint() - start) / 1e9).toFixed(3));
}

function collect(suites, failures = []) {
  for (const suite of suites || []) {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const bad = (test.results || []).some(result => result.status !== "passed");
        if (bad) failures.push(`${test.projectName}::${spec.title}`);
      }
    }
    collect(suite.suites, failures);
  }
  return failures;
}

function green(index) {
  const startedAt = Date.now();
  const start = hrtime.bigint();
  const result = spawnSync(process.execPath, ["scripts/test.js"], { cwd: root, stdio: "inherit" });
  const wall = seconds(start);
  const report = JSON.parse(readFileSync("test-results/results.json", "utf8"));
  const stats = report.stats || {};
  // A report left over from an earlier run must never be counted as this run's evidence.
  const reportedAt = Date.parse(stats.startTime);
  const fresh = Number.isFinite(reportedAt) && reportedAt >= startedAt - 2000;
  return {
    fresh,
    run: index,
    exitCode: result.status,
    checks: (stats.expected || 0) + (stats.unexpected || 0) + (stats.flaky || 0),
    passed: stats.expected || 0,
    unexpected: stats.unexpected || 0,
    flaky: stats.flaky || 0,
    skipped: stats.skipped || 0,
    failures: collect(report.suites).sort(),
    suiteSeconds: Number(((stats.duration || 0) / 1000).toFixed(3)),
    wallSeconds: wall
  };
}

function red(index) {
  const startedAt = Date.now();
  const start = hrtime.bigint();
  const result = spawnSync(process.execPath, ["scripts/verify-defects.js", "--red-only"], { cwd: root, stdio: "inherit" });
  const wall = seconds(start);
  const summary = JSON.parse(readFileSync("test-results/defects/red-summary.json", "utf8"));
  const scenario = (summary.scenarios || [])[0] || {};
  const recordedAt = Date.parse(summary.recordedAt);
  return {
    fresh: Number.isFinite(recordedAt) && recordedAt >= startedAt - 2000,
    run: index,
    exitCode: result.status,
    verified: Boolean(summary.complete && scenario.verified && result.status === 0),
    passed: scenario.passed || 0,
    intendedFailures: (scenario.expectedFailures || []).length,
    failures: [...(scenario.expectedFailures || [])].sort(),
    suiteSeconds: Number(((scenario.durationMs || 0) / 1000).toFixed(3)),
    wallSeconds: wall
  };
}

function spread(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((total, value) => total + value, 0);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: Number((sum / sorted.length).toFixed(3)),
    median: Number((sorted.length % 2
      ? sorted[(sorted.length - 1) / 2]
      : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2).toFixed(3))
  };
}

function identical(sets) {
  const first = JSON.stringify(sets[0]);
  return sets.every(set => JSON.stringify(set) === first);
}

const greenRuns = [];
const redRuns = [];
for (let index = 1; index <= runs; index += 1) {
  console.log(`\n=== green run ${index}/${runs} ===`);
  greenRuns.push(green(index));
  console.log(`\n=== red run ${index}/${runs} ===`);
  redRuns.push(red(index));
}

const record = {
  recordedAt: new Date().toISOString(),
  runs,
  environment: {
    node: process.version,
    platform: `${os.platform()} ${os.release()}`,
    cpus: os.cpus().length,
    ci: Boolean(process.env.CI),
    workers: process.env.CI ? 2 : 3
  },
  expectedChecks,
  green: {
    runs: greenRuns,
    // A clean run must have executed the whole suite: the right number of checks, all passing,
    // nothing skipped or flaky, and a report written by this run rather than an earlier one.
    cleanRuns: greenRuns.filter(run => run.exitCode === 0 && run.unexpected === 0 && run.flaky === 0
      && run.skipped === 0 && run.checks === expectedChecks && run.passed === expectedChecks && run.fresh).length,
    checksStable: identical(greenRuns.map(run => run.checks)),
    distinctFailures: [...new Set(greenRuns.flatMap(run => run.failures))].sort(),
    suiteSeconds: spread(greenRuns.map(run => run.suiteSeconds)),
    wallSeconds: spread(greenRuns.map(run => run.wallSeconds))
  },
  red: {
    runs: redRuns,
    verifiedRuns: redRuns.filter(run => run.exitCode === 0 && run.verified && run.fresh
      && run.intendedFailures > 0 && run.passed > 0).length,
    failureSetStable: identical(redRuns.map(run => run.failures)),
    passCountStable: identical(redRuns.map(run => run.passed)),
    suiteSeconds: spread(redRuns.map(run => run.suiteSeconds)),
    wallSeconds: spread(redRuns.map(run => run.wallSeconds))
  }
};

mkdirSync("test-results", { recursive: true });
writeFileSync(out, JSON.stringify(record, null, 2) + "\n");

console.log("\n=== repeatability ===");
console.log(`green: ${record.green.cleanRuns}/${runs} clean, suite ${record.green.suiteSeconds.min}-${record.green.suiteSeconds.max}s`);
console.log(`red:   ${record.red.verifiedRuns}/${runs} verified, suite ${record.red.suiteSeconds.min}-${record.red.suiteSeconds.max}s`);
console.log(`written: ${out}`);

const stable = record.green.cleanRuns === runs && record.red.verifiedRuns === runs
  && record.green.checksStable && record.red.failureSetStable && record.red.passCountStable;
if (!stable) {
  console.log("Not every run met the acceptance conditions. See " + out + " for the per-run records.");
  process.exitCode = 1;
}
