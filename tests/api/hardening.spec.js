import { test, expect } from "../fixtures/lab.js";
import { checkResponse, signIn } from "../support/api.js";
import { request as apiRequest } from "@playwright/test";
import { accounts, PASSWORD } from "../support/accounts.js";

test("responses carry hardening headers", async ({ request }, testInfo) => {
  const response = await request.get("/products");
  await checkResponse(response, 200, testInfo, "headers-response");
  const headers = response.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("same-origin");
  expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["content-security-policy"]).toContain("script-src 'self'");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("repeated bad sign-ins are throttled", async ({ request }, testInfo) => {
  const attempt = () => request.post("/api/auth/login", {
    data: { email: "throttle@example.test", password: "wrong-password" }
  });
  if (process.env.BUG_AUTH_BYPASS === "1") {
    // With the auth-bypass defect on, unknown emails are provisioned and accepted,
    // so there are no failed attempts to throttle. The bypass is covered by @auth tests.
    const accepted = await attempt();
    expect([200, 201]).toContain(accepted.status());
    return;
  }
  let last;
  for (let i = 0; i < 10; i++) last = await attempt();
  expect(last.status(), "tenth bad attempt is still a normal rejection").toBe(401);
  const blocked = await checkResponse(await attempt(), 429, testInfo, "throttled-login");
  expect(blocked.error).toMatch(/too many/i);
});

test("signing out clears the shopping cart", async ({ request }, testInfo) => {
  await signIn(request, testInfo);
  await checkResponse(await request.post("/api/cart/items", {
    data: { product_id: 3, quantity: 1 }
  }), 200, testInfo, "cart-add");
  const before = await checkResponse(await request.get("/api/cart"), 200, testInfo, "cart-before-logout");
  expect(before.cart.count).toBe(1);
  await request.post("/api/auth/logout");
  const after = await checkResponse(await request.get("/api/cart"), 200, testInfo, "cart-after-logout");
  expect(after.cart.count).toBe(0);
});

test("a deactivated product is flagged in the cart", async ({ request, baseURL }, testInfo) => {
  await signIn(request, testInfo);
  await checkResponse(await request.post("/api/cart/items", {
    data: { product_id: 4, quantity: 1 }
  }), 200, testInfo, "cart-add-active");
  const admin = await apiRequest.newContext({ baseURL });
  try {
    await admin.post("/api/auth/login", { data: { email: accounts.admin.email, password: PASSWORD } });
    const saved = await admin.patch("/api/admin/products/4", {
      data: { name: "Arc desk lamp", category: "Lighting", description: "Good light for whatever comes next.", artwork: "lamp", price_cents: 3900, active: false }
    });
    expect(saved.status(), await saved.text()).toBe(200);
  } finally {
    await admin.dispose();
  }
  const cart = await checkResponse(await request.get("/api/cart"), 200, testInfo, "cart-after-deactivate");
  const line = cart.cart.items.find(item => item.product.id === 4);
  expect(line?.available).toBe(false);
});
