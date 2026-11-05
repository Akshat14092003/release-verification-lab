import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdirSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { request } from "@playwright/test";
import { createDemoApp } from "../../src/demo.js";
import { loadConfig, projectRoot } from "../../src/config.js";

test("local shared shop survives restart while browser credentials and carts remain independent", async () => {
  assert.equal(loadConfig({}).sharedShop, true);
  assert.equal(loadConfig({ HOST: "0.0.0.0" }).sharedShop, false);
  assert.equal(loadConfig({ LAB_SHARED_SHOP: "0" }).sharedShop, false);
  assert.throws(() => loadConfig({ LAB_SHARED_SHOP: "yes" }), /LAB_SHARED_SHOP/);
  const root = join(projectRoot, "test-results", "unit");
  mkdirSync(root, { recursive: true });
  const directory = mkdtempSync(join(root, "shared-shop-"));
  let runtime, server;
  const start = async () => {
    runtime = createDemoApp({ directory, sharedShop: true, allowRuns: false, sessionMs: 1 });
    server = runtime.app.listen(0, "127.0.0.1");
    await once(server, "listening");
    return "http://127.0.0.1:" + server.address().port;
  };
  const stop = async () => {
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    runtime.close();
  };
  const credentials = { email: "admin@example.test", password: "DemoShop!2026" };
  const admin = await request.newContext(), buyer = await request.newContext(), guest = await request.newContext();
  try {
    let url = await start();
    await admin.post(url + "/api/auth/login", { data: credentials });
    const saved = await admin.post(url + "/api/admin/products/1", { data: { name: "Everyday journal", category: "Stationery", description: "Shared journal", artwork: "journal", price_cents: 5000, active: true } });
    assert.equal(saved.status(), 200, await saved.text());
    assert.equal((await buyer.get(url + "/api/admin")).status(), 401);
    await buyer.post(url + "/api/auth/login", { data: { email: "customer@example.test", password: credentials.password } });
    assert.equal((await (await buyer.get(url + "/api/products")).json()).products[0].price_cents, 5000);
    assert.equal((await buyer.post(url + "/api/cart/items", { data: { product_id: 1 } })).status(), 200);
    assert.equal((await admin.get(url + "/api/cart")).status(), 403);
    assert.equal((await (await guest.get(url + "/api/cart")).json()).cart.count, 0);
    const before = await (await buyer.get(url + "/api/store/state")).json();
    await stop();
    url = await start();
    assert.equal((await (await buyer.get(url + "/api/products")).json()).products[0].price_cents, 5000);
    assert.equal((await (await buyer.get(url + "/api/cart")).json()).cart.count, 1);
    assert.equal((await admin.get(url + "/api/admin")).status(), 200);
    assert.notEqual((await (await buyer.get(url + "/api/store/state")).json()).storeId, before.storeId);
    assert.equal((await buyer.post(url + "/api/lab/reset", { data: {} })).status(), 200);
    assert.equal((await admin.get(url + "/api/admin")).status(), 401);
    assert.equal((await buyer.get(url + "/api/auth/me")).status(), 401);
    assert.equal((await (await buyer.get(url + "/api/cart")).json()).cart.count, 0);
    await admin.post(url + "/api/auth/login", { data: credentials });
    assert.equal((await (await admin.get(url + "/api/products")).json()).products[0].price_cents, 2800);
  } finally { await admin.dispose(); await buyer.dispose(); await guest.dispose(); if (server?.listening) await stop(); }
});
