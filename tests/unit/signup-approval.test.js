import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdirSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { request } from "@playwright/test";
import { createApp } from "../../src/app.js";
import { requestSignup, approveSignup } from "../../src/auth.js";
import { openDatabase, seedDatabase, verifyPassword } from "../../src/database.js";

const details = { name: "Approval Tester", email: "approval@example.test", password: "Approval!2026" };

test("approval routes coexist with signup and enforce admin review without leaking credentials", async () => {
  const runtime = createApp({ databasePath: ":memory:", now: () => new Date("2026-10-24T12:00:00Z") });
  const server = runtime.app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const baseURL = "http://127.0.0.1:" + server.address().port;
  const buyer = await request.newContext({ baseURL }), admin = await request.newContext({ baseURL });
  try {
    assert.equal((await buyer.get("/api/admin/signup-requests")).status(), 401);
    const portal = await buyer.get("/admin/signup-requests", { maxRedirects: 0 });
    assert.equal(portal.headers().location, "/admin/login?next=%2Fadmin%2Fsignup-requests");
    assert.match(await (await buyer.get("/request-access")).text(), /action="\/request-access"/);
    for (const change of [{ name: " " }, { email: "invalid" }, { password: "short" }]) {
      assert.equal((await buyer.post("/api/auth/signup-requests", { data: { ...details, ...change } })).status(), 400);
    }
    assert.equal((await buyer.post("/api/auth/signup-requests", {
      data: details, headers: { Origin: "https://untrusted.example" }
    })).status(), 403);
    const before = (await (await buyer.get("/api/store/state")).json()).revision;
    const pending = await buyer.post("/api/auth/signup-requests", { data: { ...details, email: " APPROVAL@example.test " } });
    assert.equal(pending.status(), 202);
    assert.equal((await pending.json()).email, details.email);
    assert.ok((await (await buyer.get("/api/store/state")).json()).revision > before);
    assert.equal((await buyer.get("/api/auth/me")).status(), 401);
    assert.equal((await buyer.post("/api/auth/login", { data: details })).status(), 401);
    assert.equal((await buyer.post("/api/auth/signup-requests", { data: details })).status(), 409);
    assert.equal((await admin.post("/api/auth/login", {
      data: { email: "admin@example.test", password: "DemoShop!2026" }
    })).status(), 200);
    const listed = await (await admin.get("/api/admin/signup-requests")).json();
    const id = listed.requests[0].id;
    assert.equal(listed.requests[0].password_hash, undefined);
    assert.equal((await buyer.post(`/api/admin/signup-requests/${id}/approve`, { data: {} })).status(), 401);
    assert.equal((await admin.post("/api/admin/signup-requests/invalid/approve", { data: {} })).status(), 400);
    assert.equal((await admin.post(`/api/admin/signup-requests/${id}/approve`, { data: {} })).status(), 200);
    assert.equal((await admin.post(`/api/admin/signup-requests/${id}/approve`, { data: {} })).status(), 404);
    assert.equal((await admin.post(`/api/admin/signup-requests/${id}/reject`, { data: {} })).status(), 404);
    assert.equal((await buyer.post("/api/auth/login", { data: details })).status(), 200);
    assert.equal((await (await buyer.get("/api/auth/me")).json()).balance_cents, 100000);
    assert.equal((await buyer.post(`/api/admin/signup-requests/${id}/reject`, { data: {} })).status(), 403);
    assert.equal((await buyer.post("/api/cart/items", { data: { product_id: 1 } })).status(), 200);
    assert.equal((await buyer.post("/api/cart/checkout", { data: {} })).status(), 201);
    const rejected = { ...details, email: "rejected@example.test" };
    assert.equal((await buyer.post("/api/auth/signup-requests", { data: rejected })).status(), 202);
    const next = (await (await admin.get("/api/admin/signup-requests")).json()).requests[0].id;
    assert.equal((await admin.post(`/admin/signup-requests/${next}/reject`, { form: {}, maxRedirects: 0 })).status(), 303);
    assert.equal((await buyer.post("/api/auth/login", { data: rejected })).status(), 401);
    assert.equal((await buyer.post("/api/auth/signup-requests", { data: rejected })).status(), 202);
    assert.equal((await buyer.post("/api/auth/signup", { data: { ...details, email: "immediate@example.test" } })).status(), 201);
    seedDatabase(runtime.db, { reset: true, includeSampleOrder: false });
    assert.equal(runtime.db.prepare("SELECT COUNT(*) AS n FROM signup_requests").get().n, 0);
    assert.equal((await buyer.get("/api/auth/me")).status(), 401);
  } finally {
    await buyer.dispose(); await admin.dispose();
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    runtime.close();
  }
});

test("signup requests survive reopening and both branches' password formats remain valid", () => {
  mkdirSync("test-results/unit", { recursive: true });
  const path = join(mkdtempSync("test-results/unit/approval-"), "shop.sqlite");
  let db = openDatabase(path);
  try {
    seedDatabase(db);
    requestSignup(db, details.name, details.email, details.password, new Date());
    const row = db.prepare("SELECT * FROM signup_requests").get();
    assert.match(row.password_hash, /^scrypt\$/);
    assert.equal(verifyPassword(details.password, row), true);
    const legacy = row.password_hash.replaceAll("$", ":");
    db.prepare("UPDATE signup_requests SET password_hash=? WHERE id=?").run(legacy, row.id);
    db.close(); db = openDatabase(path);
    approveSignup(db, row.id, new Date());
    const user = db.prepare("SELECT * FROM users WHERE email=?").get(details.email);
    assert.equal(verifyPassword(details.password, user), true);
    assert.equal(verifyPassword("wrong", user), false);
    assert.equal(verifyPassword("DemoShop!2026", db.prepare("SELECT * FROM users WHERE id=1").get()), true);
    const count = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
    assert.throws(() => approveSignup(db, row.id, new Date()), /already reviewed/);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM users").get().n, count);
  } finally { db.close(); }
});
