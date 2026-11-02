import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { chromium } from "@playwright/test";
import { BUG_FLAGS, projectRoot } from "./config.js";
import { BASELINE_CHECKS, detectedBug, detectionProgress, expectedFailures, isAssertionFailure } from "./defects.js";
import { ShopError } from "./shop.js";

const require = createRequire(import.meta.url);
const cli = require.resolve("@playwright/test/cli");

function results(suites) {
  return (suites || []).flatMap(suite => [
    ...(suite.specs || []).flatMap(spec => (spec.tests || []).map(test => ({
      id: spec.id, project: test.projectName, title: spec.title,
      key: test.projectName + "::" + spec.title, status: test.status, attempts: test.results || []
    }))),
    ...results(suite.suites)
  ]);
}

export function createTestRunner({ directory, timeoutMs = 300_000, reportTimeoutMs = 120_000, cooldownMs = 15_000, maxRuns = 8,
  workers = 2, spawnProcess = spawn, browserAvailable = () => existsSync(chromium.executablePath()) } = {}) {
  if (![1, 2].includes(workers)) throw new Error("Test workers must be 1 or 2.");
  const root = resolve(directory);
  mkdirSync(root, { recursive: true });
  const runs = new Map();
  const lastStarted = new Map();
  let active = null;

  function owned(id, owner) {
    const run = runs.get(id);
    if (!run || run.owner !== owner) throw new ShopError("Run not found.", 404);
    return run;
  }
  function publicRun(run) {
    const checks = [...run.checks.values()];
    return {
      id: run.id, status: run.status, mode: run.mode, bugs: run.bugs,
      startedAt: run.startedAt, finishedAt: run.finishedAt, total: run.total,
      completed: run.completed, passed: run.passed, failed: run.failed, skipped: run.skipped,
      phase: run.phase, checks: checks.map(check => {
        const defect = detectedBug(check, run.bugs);
        return { ...check, detectedBug: defect ? { id: defect.id, label: defect.label } : null };
      }),
      detections: detectionProgress(run.bugs, checks, run),
      activeTests: [...run.activeTests.values()], logs: run.logs.slice(-80),
      expectedFailures: run.expectedFailures.length, matched: run.matched,
      error: run.error, reportUrl: run.reportUrl
    };
  }
  function kill(run) {
    if (!run.child?.pid) return;
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(run.child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    } else {
      try { process.kill(-run.child.pid, "SIGKILL"); } catch { /* Already exited. */ }
    }
  }
  function fail(run, message, status = "error") {
    if (run.status !== "running") return;
    run.status = status;
    run.error = message;
    run.finishedAt = new Date().toISOString();
    run.activeTests.clear();
    clearTimeout(run.timer);
    kill(run);
    // The lock is released on child exit, after its workers stop.
  }
  function finish(run, code) {
    clearTimeout(run.timer);
    if (active === run) active = null;
    if (run.status !== "running") return;
    run.finishedAt = new Date().toISOString();
    run.activeTests.clear();
    try {
      const report = JSON.parse(readFileSync(join(run.directory, "results.json"), "utf8"));
      const tests = results(report.suites);
      if (report.config?.metadata?.runId === run.id && existsSync(join(run.directory, "html", "index.html"))) {
        run.reportUrl = "/lab-reports/" + run.id + "/index.html";
      }
      const stats = report.stats;
      const failed = tests.filter(test => test.status !== "expected");
      const identities = failed.map(test => test.key).sort();
      const setupError = failed.some(test => test.attempts.length !== 1 || !isAssertionFailure(test.attempts[0]));
      // Reconcile live events with the saved report, including final stdout still draining at exit.
      run.checks = new Map(tests.map(test => [test.id || test.key, {
        id: test.id || test.key, project: test.project, title: test.title,
        status: test.attempts.at(-1)?.status || "interrupted",
        assertionFailure: test.attempts.length === 1 && isAssertionFailure(test.attempts[0])
      }]));
      if (report.config?.metadata?.runId !== run.id || tests.length !== BASELINE_CHECKS ||
          (report.errors || []).length || stats.skipped || stats.flaky || setupError ||
          ![0, 1].includes(code) || !existsSync(join(run.directory, "html", "index.html"))) {
        throw new Error("The run had a setup or execution problem. Inspect the report before rerunning; this result is not verified.");
      }
      run.total = tests.length;
      run.completed = tests.length;
      run.passed = stats.expected;
      run.failed = stats.unexpected;
      run.skipped = stats.skipped;
      run.matched = JSON.stringify(identities) === JSON.stringify(run.expectedFailures) && code === (identities.length ? 1 : 0);
      run.status = "completed";
      run.phase = "finished";
      run.reportUrl = "/lab-reports/" + run.id + "/index.html";
    } catch (error) {
      run.status = "error";
      run.error = error.message.startsWith("The run had") ? error.message : "The test process did not produce a complete report. Please rerun the checks.";
    }
  }
  function start(owner, mode, selectedBugs) {
    if (!["current", "baseline", "all"].includes(mode)) throw new ShopError("Unknown test mode.");
    if (active) throw new ShopError("A verification is already running. Try again when it finishes.", 409);
    if (Date.now() - (lastStarted.get(owner) || 0) < cooldownMs) {
      throw new ShopError("Please wait a few seconds before starting another run.", 429);
    }
    if (!browserAvailable()) {
      throw new ShopError("Chromium is not installed on this host. Install the project's Playwright browser before running tests.", 503);
    }
    for (const [visitor, started] of lastStarted) {
      if (Date.now() - started > cooldownMs) lastStarted.delete(visitor);
    }
    const saved = readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory() &&
      /^[a-f0-9-]{36}$/.test(entry.name)).map(entry => ({ id: entry.name, directory: join(root, entry.name) }))
      .sort((a, b) => statSync(a.directory).mtimeMs - statSync(b.directory).mtimeMs);
    while (saved.length >= maxRuns) {
      const oldest = saved.shift();
      // Explicitly verify recursive cleanup stays inside this dedicated run root.
      if (dirname(oldest.directory) !== root) throw new Error("Invalid run cleanup path.");
      rmSync(oldest.directory, { recursive: true, force: true });
      runs.delete(oldest.id);
    }
    const bugs = Object.fromEntries(BUG_FLAGS.map(flag => [flag, mode === "all" || (mode === "current" && Boolean(selectedBugs[flag]))]));
    const id = randomUUID();
    const run = {
      id, owner, mode, bugs, directory: join(root, id), status: "running",
      startedAt: new Date().toISOString(), finishedAt: null, total: 0, completed: 0,
      passed: 0, failed: 0, skipped: 0, phase: "starting", checks: new Map(), activeTests: new Map(), logs: [], matched: null,
      expectedFailures: expectedFailures(bugs), error: null, reportUrl: null
    };
    mkdirSync(run.directory);
    runs.set(id, run);
    lastStarted.set(owner, Date.now());
    active = run;
    const env = {
      ...process.env, CI: "true", FORCE_COLOR: "0", PLAYWRIGHT_HTML_OPEN: "never",
      LAB_SCENARIO: "demo", LAB_RUN_ID: id, LAB_RUN_DIRECTORY: run.directory,
      ...Object.fromEntries(BUG_FLAGS.map(flag => [flag, bugs[flag] ? "1" : "0"]))
    };
    const child = spawnProcess(process.execPath, [cli, "test", "--workers=" + workers], {
      cwd: projectRoot, env, windowsHide: true, detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"]
    });
    run.child = child;
    let pending = "";
    const log = text => {
      run.logs.push(text.slice(0, 1000));
      if (run.logs.length > 200) run.logs.shift();
    };
    child.stdout.on("data", chunk => {
      pending += chunk.toString();
      const lines = pending.split(/\r?\n/);
      pending = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("@@LAB_EVENT ")) { if (line.trim()) log(line); continue; }
        try {
          const event = JSON.parse(line.slice(12));
          if (run.status !== "running") continue;
          if (event.type === "begin") { run.total = event.total; run.phase = "testing"; }
          if (event.type === "test-start") {
            run.activeTests.set(event.id, event.title);
            run.checks.set(event.id, { id: event.id, title: event.title, project: event.project, status: "running" });
          }
          if (event.type === "test-end") {
            run.activeTests.delete(event.id);
            run.checks.set(event.id, { id: event.id, title: event.title, project: event.project, status: event.status,
              assertionFailure: event.assertionFailure === true });
            run.completed += 1;
            if (event.status === "passed") run.passed += 1;
            else if (event.status === "skipped") run.skipped += 1;
            else run.failed += 1;
            log(event.status.toUpperCase() + "  " + event.title);
          }
          if (event.type === "tests-finished") {
            run.phase = "reporting";
            clearTimeout(run.timer);
            run.timer = setTimeout(() => fail(run, "The checks finished, but report generation took too long. Please rerun the verification."), reportTimeoutMs);
          }
        } catch { log("Could not read a progress event."); }
      }
    });
    child.stderr.on("data", chunk => log(chunk.toString()));
    child.once("error", () => {
      fail(run, "The host could not launch the test process.");
      if (active === run) active = null;
    });
    // Inherited output pipes may outlive the CLI on Windows. Exit is the process result.
    child.once("exit", code => finish(run, code));
    run.timer = setTimeout(() => fail(run, "The checks did not finish within five minutes. Their processes were stopped; please retry."), timeoutMs);
    return publicRun(run);
  }
  return {
    start,
    get: (id, owner) => publicRun(owned(id, owner)),
    reportDirectory: (id, owner) => {
      const run = owned(id, owner);
      if (!run.reportUrl) throw new ShopError("This run has no completed report.", 404);
      return join(run.directory, "html");
    },
    cancel: (id, owner) => { const run = owned(id, owner); fail(run, "Verification stopped by the visitor.", "cancelled"); return publicRun(run); },
    close: () => { if (active) fail(active, "Demo server stopped.", "cancelled"); }
  };
}
