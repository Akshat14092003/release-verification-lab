import { test as base, expect } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { once } from "node:events";
import { createApp } from "../../src/app.js";
import { readBugFlags } from "../../src/config.js";

export const test = base.extend({
  labTime: ["2026-10-24T12:00:00.000Z", { option: true }],

  clock: async ({ labTime }, use) => {
    let instant = new Date(labTime);
    if (!Number.isFinite(instant.getTime())) throw new Error("Invalid fixture date.");
    await use({
      now: () => new Date(instant),
      setTime(value) {
        const next = new Date(value);
        if (!Number.isFinite(next.getTime())) throw new Error("Invalid fixture date.");
        instant = next;
      }
    });
  },

  lab: async ({ clock }, use, testInfo) => {
    // Each test gets its own real SQLite file and loopback server, even in parallel.
    // Never connect to the interactive demo database or reset a shared instance.
    const databasePath = testInfo.outputPath("lab.sqlite");
    mkdirSync(dirname(databasePath), { recursive: true });
    const runtime = createApp({ databasePath, now: clock.now, bugs: readBugFlags(process.env) });
    const server = runtime.app.listen(0, "127.0.0.1");
    let sql;
    try {
      await once(server, "listening");
      sql = new DatabaseSync(databasePath, { readOnly: true });
      await use({
        baseURL: "http://127.0.0.1:" + server.address().port,
        databasePath,
        sql
      });
    } finally {
      try {
        if (sql && testInfo.status !== testInfo.expectedStatus) {
          await testInfo.attach("database-evidence", {
            contentType: "application/json",
            body: Buffer.from(JSON.stringify({
              at: clock.now().toISOString(),
              orders: sql.prepare("SELECT * FROM orders ORDER BY id").all(),
              items: sql.prepare("SELECT * FROM order_items ORDER BY id").all(),
              ledger: sql.prepare("SELECT * FROM ledger ORDER BY id").all()
            }, null, 2))
          });
        }
      } finally {
        sql?.close();
        await new Promise((resolve, reject) => {
          server.close(error => error ? reject(error) : resolve());
          server.closeAllConnections();
        });
        runtime.close();
      }
    }
  },

  baseURL: async ({ lab }, use) => {
    await use(lab.baseURL);
  },

  page: async ({ page, lab }, use) => {
    // Exercise the actual local app. Only optional third-party assets are blocked.
    // A CDN or font outage must not masquerade as a checkout regression.
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      return url.origin === lab.baseURL ? route.continue() : route.abort("blockedbyclient");
    });
    await use(page);
  }
});

export { expect };
