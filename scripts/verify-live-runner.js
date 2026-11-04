// Runs outside the release suite so its real Playwright subprocess cannot recurse.
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { request } from "@playwright/test";
import { createDemoApp } from "../src/demo.js";
import { BASELINE_CHECKS } from "../src/defects.js";

const directory = resolve("test-results/live-smoke", randomUUID());
mkdirSync(directory, { recursive: true });
const runtime = createDemoApp({ directory, testWorkers: Number(process.env.LAB_TEST_WORKERS || 2) });
const server = runtime.app.listen(0, "127.0.0.1");
await once(server, "listening");
const baseURL = "http://127.0.0.1:" + server.address().port;
const owner = await request.newContext({ baseURL });
const other = await request.newContext({ baseURL });
const evidence = { complete: false, workers: Number(process.env.LAB_TEST_WORKERS || 2) };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  assert.equal((await owner.get("/health")).status(), 200);
  assert.equal((await owner.post("/api/auth/login", { data: { email: "customer@example.test", password: "DemoShop!2026" } })).status(), 200);
  await owner.post("/api/cart/items", { data: { product_id: 1, quantity: 2 } });
  const before = await (await owner.get("/api/cart")).json();
  const launch = await owner.post("/api/lab/runs", { data: { mode: "baseline" } });
  assert.equal(launch.status(), 202);
  const run = await launch.json();
  assert.equal((await other.get("/api/lab/runs/" + run.id)).status(), 404);
  assert.equal((await other.post("/api/lab/runs", { data: { mode: "baseline" } })).status(), 409);
  let result, sawProgress = false;
  const deadline = Date.now() + 330_000;
  do {
    result = await (await owner.get("/api/lab/runs/" + run.id)).json();
    sawProgress ||= result.completed > 0 && result.completed < BASELINE_CHECKS;
    if (result.status !== "running") break;
    await sleep(1000);
  } while (Date.now() < deadline);
  evidence.run = { id: run.id, status: result.status, passed: result.passed, failed: result.failed,
    matched: result.matched, reportUrl: result.reportUrl, error: result.error, sawProgress };
  assert.equal(result.status, "completed", JSON.stringify(result));
  assert.equal(result.matched, true); assert.equal(result.passed, BASELINE_CHECKS); assert.equal(result.failed, 0);
  assert.equal(sawProgress, true);
  assert.equal((await owner.get(result.reportUrl)).status(), 200);
  assert.equal((await other.get(result.reportUrl)).status(), 404);
  assert.deepEqual(await (await owner.get("/api/cart")).json(), before);
  assert.equal((await (await owner.get("/api/auth/me")).json()).balance_cents, 100000);
  // Let the documented start cooldown elapse if a fast host finished within it.
  await sleep(Math.max(0, 15_100 - (Date.now() - Date.parse(run.startedAt))));
  const next = await owner.post("/api/lab/runs", { data: { mode: "baseline" } });
  assert.equal(next.status(), 202);
  const pending = await next.json();
  const stopped = await owner.post("/api/lab/runs/" + pending.id + "/cancel", { data: {} });
  assert.equal(stopped.status(), 200);
  const cancelled = await stopped.json();
  assert.equal(cancelled.status, "cancelled"); assert.equal(cancelled.matched, null); assert.equal(cancelled.reportUrl, null);
  evidence.cancelled = true; evidence.ownerOnly = true; evidence.cartAndCreditPreserved = true; evidence.complete = true;
  console.log("Verified real runner: " + BASELINE_CHECKS + " passes, streamed progress, owner-only report, preserved cart/credit, cancellation.");
} finally {
  writeFileSync(join(directory, "summary.json"), JSON.stringify(evidence, null, 2) + "\n");
  await owner.dispose(); await other.dispose();
  await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  runtime.close();
}
