import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { request } from "@playwright/test";
import { createDemoApp } from "../../src/demo.js";
import { loadConfig } from "../../src/config.js";

test("public origin requires an explicit canonical HTTPS origin", () => {
  assert.equal(loadConfig({}).publicOrigin, null);
  assert.equal(loadConfig({ PUBLIC_ORIGIN: "https://lab.example.test" }).publicOrigin, "https://lab.example.test");
  for (const value of ["*", "https://*.vercel.app", "http://lab.example.test", "https://lab.example.test/", "https://lab.example.test/path", "https://user:pass@lab.example.test"]) {
    assert.throws(() => loadConfig({ PUBLIC_ORIGIN: value }), /PUBLIC_ORIGIN/);
  }
});

for (const publicOrigin of [null, "https://lab.example.test"]) {
  test("proxy origin validation across demo and shop routes: " + publicOrigin, async () => {
    const runtime = createDemoApp({ allowRuns: false, publicOrigin });
    const server = runtime.app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const baseURL = "http://127.0.0.1:" + server.address().port;
    const client = await request.newContext({ baseURL });
    const bugs = { BUG_AUTH_BYPASS: false, BUG_WEEKEND_OFFER: false, BUG_NO_LIMIT: false, BUG_TOTAL_MISMATCH: false };
    try {
      for (const [path, data] of [["/api/cart/items", { product_id: 1, quantity: 1 }], ["/api/lab/settings", { bugs, clock: "saturday" }]]) {
        assert.equal((await client.post(path, { data, headers: { Origin: baseURL } })).status(), 200);
        assert.equal((await client.post(path, { data, headers: { Origin: "https://lab.example.test", "Sec-Fetch-Site": "same-origin" } })).status(), publicOrigin ? 200 : 403);
        assert.equal((await client.post(path, { data, headers: { Origin: "https://evil.example", "X-Forwarded-Host": "evil.example" } })).status(), 403);
        assert.equal((await client.post(path, { data, headers: { Origin: "https://lab.example.test.evil.example" } })).status(), 403);
        assert.equal((await client.post(path, { data, headers: { Origin: "https://lab.example.test", "Sec-Fetch-Site": "cross-site" } })).status(), 403);
      }
    } finally {
      await client.dispose();
      await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
      runtime.close();
    }
  });
}
