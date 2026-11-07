import { test, expect } from "../fixtures/lab.js";
import { checkResponse } from "../support/api.js";

const details = { name: "Morgan Tester", email: "morgan@example.test", password: "FreshDemo!2026" };

test("signup requires admin approval, preserves the guest cart and supports later login", async ({ request, lab, playwright }, testInfo) => {
  await request.post("/api/cart/items", { data: { product_id: 2 } });
  const pending = await checkResponse(await request.post("/api/auth/signup", {
    data: { ...details, email: " MORGAN@example.test ", role: "admin", opening_balance_cents: 9999999 }
  }), 202, testInfo, "signup-pending");
  expect(pending).toMatchObject({ name: details.name, email: details.email });
  expect(pending).not.toHaveProperty("password_hash");
  expect(pending).not.toHaveProperty("user");
  expect(lab.sql.prepare("SELECT id FROM users WHERE email=?").get(details.email)).toBeUndefined();
  expect((await request.get("/api/auth/me")).status()).toBe(401);
  await checkResponse(await request.post("/api/auth/login", { data: details }), 403, testInfo, "pending-login");
  expect(lab.sql.prepare("SELECT COUNT(*) AS n FROM sessions").get().n).toBe(0);
  await checkResponse(await request.post("/api/auth/signup", { data: details }), 409, testInfo, "duplicate-pending");
  const admin = await playwright.request.newContext({ baseURL: lab.baseURL });
  let first;
  try {
    await checkResponse(await admin.post("/api/auth/login", {
      data: { email: "admin@example.test", password: "DemoShop!2026" }
    }), 200, testInfo, "admin-login");
    const requests = await (await admin.get("/api/admin/signup-requests")).json();
    const id = requests.requests[0].id;
    expect(requests.requests[0]).not.toHaveProperty("password_hash");
    await checkResponse(await request.post(`/api/admin/signup-requests/${id}/approve`, { data: {} }), 401, testInfo, "anonymous-approval");
    await checkResponse(await admin.post(`/api/admin/signup-requests/${id}/approve`, { data: {} }), 200, testInfo, "approve-signup");
    await checkResponse(await admin.post(`/api/admin/signup-requests/${id}/approve`, { data: {} }), 404, testInfo, "duplicate-approval");
    first = lab.sql.prepare("SELECT * FROM users WHERE email=?").get(details.email);
    expect(first).toMatchObject({ role: "customer", opening_balance_cents: 100000 });
    expect(first.password_hash).toMatch(/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
    // Approval creates no customer session in either browser.
    expect((await request.get("/api/auth/me")).status()).toBe(401);
    await checkResponse(await request.post("/api/auth/login", { data: details }), 200, testInfo, "approved-login");
    const me = await (await request.get("/api/auth/me")).json();
    expect(me).toMatchObject({ user: { email: details.email, role: "customer" }, balance_cents: 100000 });
    expect(me.user).not.toHaveProperty("password_hash");
  } finally { await admin.dispose(); }
  expect((await (await request.get("/api/cart")).json()).cart.items).toHaveLength(1);
  await checkResponse(await request.post("/api/cart/checkout", { data: {} }), 201, testInfo, "registered-checkout");
  expect((await (await request.get("/api/auth/me")).json()).balance_cents).toBe(95500);
  await request.post("/api/auth/logout");
  expect((await request.get("/api/auth/me")).status()).toBe(401);
  await checkResponse(await request.post("/api/auth/login", { data: details }), 200, testInfo, "new-account-login");
  expect((await (await request.get("/api/orders")).json()).orders).toHaveLength(1);
  await request.post("/api/auth/logout");
  await checkResponse(await request.post("/api/auth/signup", {
    data: { ...details, email: "another@example.test" }
  }), 202, testInfo, "second-signup");
  expect(lab.sql.prepare("SELECT password_hash FROM signup_requests WHERE email=?").get("another@example.test").password_hash).not.toBe(first.password_hash);
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
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain("Request received");
  expect(html).toContain('/login?next=%2Fproducts');
  expect(html).not.toContain("untrusted.example");
  expect((await request.get("/api/auth/me")).status()).toBe(401);
});
