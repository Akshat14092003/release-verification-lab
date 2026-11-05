import express from "express";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { createApp } from "./app.js";
import { BUG_FLAGS, projectRoot, readBugFlags } from "./config.js";
import { DEMO_PASSWORD, seedDatabase } from "./database.js";
import { findSession, login } from "./auth.js";
import * as view from "./views.js";
import { ShopError } from "./shop.js";
import { createTestRunner } from "./test-runner.js";

const CLOCKS = {
  saturday: "2026-10-24T12:00:00.000Z",
  sunday: "2026-10-25T23:59:59.000Z",
  monday: "2026-10-26T00:00:00.000Z"
};
const COOKIE = "lab_visitor";

export function createDemoApp({ directory = join(projectRoot, ".data", "demo"), allowRuns = true, maxVisitors = 50, sessionMs = 2 * 60 * 60 * 1000, trustProxy = false, testWorkers = 2 } = {}) {
  const app = express();
  const visitors = new Map();
  const buyerLinks = new Map();
  const runner = allowRuns ? createTestRunner({ directory: join(directory, "runs"), workers: testWorkers }) : null;
  app.disable("x-powered-by");
  app.set("trust proxy", trustProxy ? 1 : false);
  app.use(express.static(join(projectRoot, "public"), { index: false }));
  app.use(express.json({ limit: "8kb" }));
  app.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const origin = req.get("origin");
      if (req.get("sec-fetch-site") === "cross-site" || (origin && origin !== req.protocol + "://" + req.get("host"))) {
        return res.status(403).json({ error: "Use the controls from this website." });
      }
    }
    next();
  });
  app.get("/health", (req, res) => res.json({ status: "ok", application: "release-verification-lab", mode: "interactive" }));
  app.get("/buyer/:token", (req, res) => {
    res.set("Referrer-Policy", "no-referrer");
    const grant = buyerLinks.get(req.params.token);
    buyerLinks.delete(req.params.token);
    const visitor = grant && visitors.get(grant.visitorId);
    if (!visitor || grant.expiresAt <= Date.now() || Date.now() - visitor.lastUsed > sessionMs) {
      return res.status(410).send(view.document("Buyer link expired", '<main class="admin-login-main"><section class="login-card"><h1>Buyer link expired</h1><p>Create a fresh link from Admin Products. Buyer links work once and expire after five minutes.</p><a class="text-link" href="/admin/products">Open admin products</a></section></main>'));
    }
    const previous = String(req.get("cookie") || "").split(";").map(part => part.trim()).find(part => part.startsWith(COOKIE + "="));
    if (previous?.slice(COOKIE.length + 1) !== visitor.id) res.clearCookie("fieldwork_cart", { path: "/" });
    visitor.lastUsed = Date.now();
    res.cookie(COOKIE, visitor.id, { httpOnly: true, sameSite: "lax", secure: req.secure, path: "/", maxAge: sessionMs });
    login(visitor.runtime.db, "customer@example.test", DEMO_PASSWORD, visitor.now(), res, {}, { role: "customer" });
    return res.redirect(303, "/products?connected=1");
  });
  app.use((req, res, next) => {
    const time = Date.now();
    for (const [id, visitor] of visitors) {
      if (time - visitor.lastUsed > sessionMs) {
        visitor.runtime.close();
        visitors.delete(id);
      }
    }
    const pair = String(req.get("cookie") || "").split(";").map(part => part.trim()).find(part => part.startsWith(COOKIE + "="));
    let visitor = visitors.get(pair?.slice(COOKIE.length + 1));
    if (!visitor) {
      if (visitors.size >= maxVisitors) return res.status(503).send("The demo is busy. Please try again later.");
      const id = randomUUID();
      visitor = { id, bugs: readBugFlags({}), clock: "saturday", lastUsed: time, lastRun: null };
      visitor.now = () => visitor.clock === "real" ? new Date() : new Date(CLOCKS[visitor.clock]);
      visitor.runtime = createApp({ databasePath: ":memory:", now: visitor.now, bugs: visitor.bugs, labControls: true, trustProxy });
      visitors.set(id, visitor);
    }
    visitor.lastUsed = time;
    res.cookie(COOKIE, visitor.id, { httpOnly: true, sameSite: "lax", secure: req.secure, path: "/", maxAge: sessionMs });
    req.visitor = visitor;
    next();
  });
  const snapshot = visitor => ({
    bugs: visitor.bugs, clock: visitor.clock, now: visitor.now().toISOString(),
    lastRun: visitor.lastRun, runsAvailable: allowRuns
  });
  const jsonOnly = (req, res, next) => {
    if (!req.is("application/json")) throw new ShopError("Send settings as JSON.", 415);
    next();
  };
  app.get("/lab", (req, res) => res.redirect("/products"));
  app.get("/api/lab/state", (req, res) => res.json(snapshot(req.visitor)));
  app.post("/api/lab/buyer-window", jsonOnly, (req, res) => {
    const visitor = req.visitor;
    if (!findSession(visitor.runtime.db, req.get("cookie"), visitor.now(), { role: "admin" })) {
      throw new ShopError("Sign in as an administrator to connect a buyer window.", 403);
    }
    for (const [token, grant] of buyerLinks) if (grant.expiresAt <= Date.now() || !visitors.has(grant.visitorId)) buyerLinks.delete(token);
    const existing = [...buyerLinks].filter(([, grant]) => grant.visitorId === visitor.id);
    for (const [token] of existing.slice(0, Math.max(0, existing.length - 4))) buyerLinks.delete(token);
    const token = randomUUID();
    buyerLinks.set(token, { visitorId: visitor.id, expiresAt: Date.now() + 5 * 60 * 1000 });
    res.status(201).json({ url: "/buyer/" + token });
  });
  app.post("/api/lab/settings", jsonOnly, (req, res) => {
    const { bugs, clock } = req.body || {};
    if (!bugs || Array.isArray(bugs) || typeof bugs !== "object" ||
        Object.keys(bugs).some(key => !BUG_FLAGS.includes(key) || typeof bugs[key] !== "boolean") ||
        BUG_FLAGS.some(flag => typeof bugs[flag] !== "boolean") ||
        !["real", ...Object.keys(CLOCKS)].includes(clock)) {
      throw new ShopError("Choose the four bug switches and a valid demo day.");
    }
    Object.assign(req.visitor.bugs, bugs);
    req.visitor.clock = clock;
    res.json(snapshot(req.visitor));
  });
  app.post("/api/lab/reset", jsonOnly, (req, res) => {
    seedDatabase(req.visitor.runtime.db, { reset: true, includeSampleOrder: false });
    req.visitor.runtime.touchStore();
    for (const [token, grant] of buyerLinks) if (grant.visitorId === req.visitor.id) buyerLinks.delete(token);
    res.clearCookie("fieldwork_session", { path: "/" });
    res.clearCookie("fieldwork_admin_session", { path: "/" });
    res.json({ ...snapshot(req.visitor), message: "Your shop is reset: $1,000 per customer, no purchases. Sign in again." });
  });
  app.post("/api/lab/repeat-offer", jsonOnly, async (req, res, next) => {
    // The shop API still enforces the rule. This is only a visible client for the same request
    // a visitor would otherwise enter in their browser console.
    const offer = req.visitor.runtime.db.prepare("SELECT id, product_id FROM offers ORDER BY id LIMIT 1").get();
    if (!offer) throw new ShopError("No offer is available.", 404);
    req.url = "/api/orders";
    req.body = { items: [{ product_id: offer.product_id, offer_id: offer.id, quantity: 1 }] };
    req.visitor.runtime.app(req, res, next);
  });
  app.post("/api/lab/runs", jsonOnly, (req, res) => {
    if (!runner) throw new ShopError("Test runs are disabled in this test instance.", 503);
    const run = runner.start(req.visitor.id, req.body?.mode, req.visitor.bugs);
    req.visitor.lastRun = run.id;
    res.status(202).json(run);
  });
  app.get("/api/lab/runs/:id", (req, res) => {
    if (!runner) throw new ShopError("Run not found.", 404);
    res.json(runner.get(req.params.id, req.visitor.id));
  });
  app.post("/api/lab/runs/:id/cancel", jsonOnly, (req, res) => {
    if (!runner) throw new ShopError("Run not found.", 404);
    res.json(runner.cancel(req.params.id, req.visitor.id));
  });
  app.use("/lab-reports/:id", (req, res, next) => {
    if (!runner) throw new ShopError("Report not found.", 404);
    const folder = runner.reportDirectory(req.params.id, req.visitor.id);
    express.static(folder, { index: "index.html", fallthrough: false })(req, res, next);
  });
  app.use("/api/lab", (req, res) => res.status(404).json({ error: "Control not found." }));
  app.use((req, res, next) => req.visitor.runtime.app(req, res, next));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error instanceof ShopError ? error.status : error.status === 413 ? 413 : error.status === 400 ? 400 : 500;
    res.status(status).json({ error: error instanceof ShopError ? error.message : status === 500 ? "The demo could not complete this request." : "Invalid request body." });
  });
  return {
    app,
    close() {
      runner?.close();
      for (const visitor of visitors.values()) visitor.runtime.close();
      visitors.clear();
      buyerLinks.clear();
    }
  };
}
