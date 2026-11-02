import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFECTS, detectedBug, detectionProgress, isAssertionFailure } from "../../src/defects.js";

const bugs = { BUG_AUTH_BYPASS: true, BUG_WEEKEND_OFFER: false, BUG_NO_LIMIT: false, BUG_TOTAL_MISMATCH: false };
const check = (identity, overrides = {}) => {
  const [project, title] = identity.split("::");
  return { project, title, status: "failed", assertionFailure: true, ...overrides };
};

test("only an actual assertion failure is a detector signal", () => {
  assert.equal(isAssertionFailure({ status: "failed", errors: [{ message: "Error: HTTP evidence\n\u001b[2mexpect(received).toBe(expected)" }] }), true);
  for (const result of [
    { status: "timedOut", errors: [{ message: "expect(locator).toBeVisible()" }] },
    { status: "failed", errors: [{ message: "page.goto: browser crashed" }] },
    { status: "failed", errors: [{ message: "Unexpected token" }] },
    { status: "failed", errors: [{ message: "expect(value).toBe(1)" }, { message: "fixture teardown failed" }] },
    { status: "failed", retry: 1, errors: [{ message: "expect(value).toBe(1)" }] },
    { status: "passed", errors: [] }
  ]) assert.equal(isAssertionFailure(result), false);
});

test("off switches, unrelated checks, and execution problems cannot be called caught bugs", () => {
  assert.equal(detectedBug(check(DEFECTS[1].failures[0]), bugs), null);
  assert.equal(detectedBug(check("api::an unrelated failed check"), bugs), null);
  assert.equal(detectedBug(check(DEFECTS[0].failures[0], { assertionFailure: false }), bugs), null);
  assert.equal(detectedBug(check(DEFECTS[0].failures[0], { status: "timedOut" }), bugs), null);
  assert.equal(detectedBug(check(DEFECTS[0].failures[0]), bugs).id, "auth");
});

test("live signals are provisional and deduplicated by project plus test title", () => {
  const signal = check(DEFECTS[0].failures[0]);
  const progress = detectionProgress(bugs, [signal, signal], { status: "running", matched: null });
  assert.equal(progress.length, 1);
  assert.equal(progress[0].observed, 1);
  assert.equal(progress[0].expected, 5);
  assert.equal(progress[0].state, "observed");
  assert.equal(detectionProgress(bugs, [], { status: "running" })[0].state, "pending");
});

test("only the complete, matched run verifies a bug; interrupted and mismatched runs stay unverified", () => {
  const checks = DEFECTS[0].failures.map(identity => check(identity));
  assert.equal(detectionProgress(bugs, checks, { status: "completed", matched: true })[0].state, "verified");
  for (const status of ["cancelled", "error", "completed"]) {
    assert.equal(detectionProgress(bugs, checks, { status, matched: false })[0].state, "review");
  }
  assert.notEqual(detectionProgress(bugs, checks.slice(1), { status: "completed", matched: true })[0].state, "verified");
  assert.deepEqual(detectionProgress({}, checks, { status: "completed", matched: true }), []);
});
