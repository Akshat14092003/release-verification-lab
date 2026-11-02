import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createTestRunner } from "../../src/test-runner.js";
import { projectRoot } from "../../src/config.js";

function fixture(options = {}) {
  const parent = resolve(projectRoot, "test-results");
  mkdirSync(parent, { recursive: true });
  const directory = mkdtempSync(join(parent, "runner-unit-"));
  const children = [];
  const runner = createTestRunner({ directory, browserAvailable: () => true, cooldownMs: 0,
    spawnProcess: () => {
      const child = new EventEmitter();
      child.stdout = new PassThrough(); child.stderr = new PassThrough();
      children.push(child);
      return child;
    }, ...options });
  return { runner, children, close() {
    runner.close(); children.forEach(child => child.emit("exit", null));
    assert.equal(dirname(directory), parent);
    rmSync(directory, { recursive: true, force: true });
  } };
}

test("cancelled processes keep the run lock until exit and reports remain owner-only", () => {
  const f = fixture();
  try {
    const run = f.runner.start("visitor-a", "baseline", {});
    assert.throws(() => f.runner.get(run.id, "visitor-b"), error => error.status === 404);
    assert.equal(f.runner.cancel(run.id, "visitor-a").status, "cancelled");
    assert.throws(() => f.runner.start("visitor-b", "baseline", {}), error => error.status === 409);
    f.children[0].emit("exit", 1);
    assert.equal(f.runner.start("visitor-b", "baseline", {}).status, "running");
    assert.throws(() => f.runner.reportDirectory(run.id, "visitor-a"), error => error.status === 404);
  } finally { f.close(); }
});

test("launch and incomplete-report failures release the lock without verifying a result", () => {
  const f = fixture();
  try {
    const launched = f.runner.start("visitor", "baseline", {});
    f.children[0].emit("error", new Error("Synthetic process launch failure"));
    assert.equal(f.runner.get(launched.id, "visitor").status, "error");
    const missing = f.runner.start("visitor", "baseline", {});
    f.children[1].emit("exit", 0);
    const result = f.runner.get(missing.id, "visitor");
    assert.equal(result.status, "error");
    assert.equal(result.matched, null); assert.equal(result.reportUrl, null);
    assert.equal(f.runner.start("visitor", "baseline", {}).status, "running");
  } finally { f.close(); }
});

test("execution timeouts never become completed or verified runs", async () => {
  const f = fixture({ timeoutMs: 20 });
  try {
    const run = f.runner.start("visitor", "baseline", {});
    const deadline = Date.now() + 2000;
    while (f.runner.get(run.id, "visitor").status === "running" && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    const result = f.runner.get(run.id, "visitor");
    assert.equal(result.status, "error"); assert.equal(result.matched, null); assert.equal(result.reportUrl, null);
    assert.throws(() => f.runner.start("other", "baseline", {}), error => error.status === 409);
    f.children[0].emit("exit", 1);
    assert.equal(f.runner.start("other", "baseline", {}).status, "running");
  } finally { f.close(); }
});
