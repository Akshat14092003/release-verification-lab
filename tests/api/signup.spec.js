import { test, expect } from "../fixtures/lab.js";
import { checkResponse } from "../support/api.js";

const details = { name: "Morgan Tester", email: "morgan@example.test", password: "FreshDemo!2026" };

test("signup creates a customer with credit, preserves the guest cart and supports later login", async ({ request, lab }, testInfo) => {
  await request.post("/api/cart/items", { data: { product_id: 2 } });
  const created = await checkResponse(await request.post("/api/auth/signup", {
    data: { ...details, email: " MORGAN@example.test ", role: "admin", opening_balance_cents: 9999999 }
  }), 201, testInfo, "signup");
  expect(created).toMatchObject({ user: { name: details.name, email: details.email, role: "customer" }, balance_cents: 100000 });
  expect(created.user).not.toHaveProperty("password_hash");
  const first = lab.sql.prepare("SELECT * FROM users WHERE id=?").get(created.user.id);
  expect(first.password_hash).toMatch(/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
  expect((await request.get("/api/cart")).ok()).toBe(true);
  expect((await (await request.get("/api/cart")).json()).cart.items).toHaveLength(1);
  await checkResponse(await request.post("/api/cart/checkout", { data: {} }), 201, testInfo, "registered-checkout");
  expect((await (await request.get("/api/auth/me")).json()).balance_cents).toBe(95500);
  await request.post("/api/auth/logout");
  expect((await request.get("/api/auth/me")).status()).toBe(401);
  await checkResponse(await request.post("/api/auth/login", { data: details }), 200, testInfo, "new-account-login");
  expect((await (await request.get("/api/orders")).json()).orders).toHaveLength(1);
  await request.post("/api/auth/logout");
  const second = await checkResponse(await request.post("/api/auth/signup", {
    data: { ...details, email: "another@example.test" }
  }), 201, testInfo, "second-signup");
  expect(lab.sql.prepare("SELECT password_hash FROM users WHERE id=?").get(second.user.id).password_hash).not.toBe(first.password_hash);
});

test("invalid and duplicate signup cannot create accounts or sessions", async ({ request, lab }, testInfo) => {
  const before = lab.sql.prepare("SELECT COUNT(*) AS total FROM users").get().total;
  for (const change of [{ name: " " }, { email: "invalid" }, { email: [details.email] }, { password: "short" }, { password: "a".repeat(257) }]) {
    await checkResponse(await request.post("/api/auth/signup", { data: { ...details, ...change } }), 400, testInfo, "invalid-signup");
  }
  await checkResponse(await request.post("/api/auth/signup", {
    data: { ...details, email: "CUSTOMER@example.test" }
  }), 409, testInfo, "duplicate-signup");
  expect(lab.sql.prepare("SELECT COUNT(*) AS total FROM users").get().total).toBe(before);
  expect(lab.sql.prepare("SELECT COUNT(*) AS total FROM sessions").get().total).toBe(0);
  expect((await request.get("/api/auth/me")).status()).toBe(401);
});

test("signup rejects cross-origin submissions and unsafe redirect destinations", async ({ request }, testInfo) => {
  await checkResponse(await request.post("/api/auth/signup", {
    data: details, headers: { Origin: "https://untrusted.example" }
  }), 403, testInfo, "cross-origin-signup");
  const response = await request.post("/signup", {
    form: { ...details, password_confirmation: details.password, next: "https://untrusted.example" }, maxRedirects: 0
  });
  expect(response.status()).toBe(303);
  expect(response.headers().location).toBe("/products");
});
