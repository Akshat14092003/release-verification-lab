import { test, expect } from "../fixtures/lab.js";
import { checkResponse, signIn } from "../support/api.js";

test("a valid login creates a session and logout revokes it", async ({ request }, testInfo) => {
  await signIn(request, testInfo);
  const me = await checkResponse(await request.get("/api/auth/me"), 200, testInfo, "current-user");
  expect(me.user.email).toBe("customer@example.test");
  expect(me.user).not.toHaveProperty("password_hash");
  expect(me.balance_cents).toBe(92700);
  await checkResponse(await request.post("/api/auth/logout"), 204, testInfo, "logout");
  await checkResponse(await request.get("/api/auth/me"), 401, testInfo, "revoked-session");
});

for (const credentials of [
  { label: "wrong password", email: "customer@example.test", password: "incorrect-password" },
  { label: "unknown account", email: "stranger@example.test", password: "arbitrary-password" }
]) {
  test("invalid credentials are rejected: " + credentials.label + " @auth", async ({ request }, testInfo) => {
    const response = await request.post("/api/auth/login", { data: credentials });
    const body = await checkResponse(response, 401, testInfo, "invalid-login");
    expect(body.error).toMatch(/email or password is incorrect/i);
    await checkResponse(await request.get("/api/auth/me"), 401, testInfo, "no-session-created");
  });
}

test("an unauthenticated request cannot create an order", async ({ request }, testInfo) => {
  await checkResponse(await request.post("/api/orders", {
    data: { product_id: 1 }
  }), 401, testInfo, "unauthenticated-checkout");
});
