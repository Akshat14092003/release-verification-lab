import { DatabaseSync } from "node:sqlite";
import { test, expect } from "../fixtures/lab.js";
import { checkResponse, signIn } from "../support/api.js";

const marker = "window.__xssExecuted=true";
const scriptPayload = "<script>" + marker + "</script>";
const imagePayload = '<img src="/missing-xss-image" onerror="' + marker + '">';

async function watchForExecution(page) {
  await page.addInitScript(() => { window.__xssExecuted = false; });
}

async function expectNoExecution(page, testInfo, label) {
  const executed = await page.evaluate(() => window.__xssExecuted);
  const injectedElements = await page.locator('img[src="/missing-xss-image"]').count();
  await testInfo.attach(label, {
    contentType: "application/json",
    body: Buffer.from(JSON.stringify({ url: page.url(), executed, injectedElements }, null, 2))
  });
  expect(executed).toBe(false);
  expect(injectedElements).toBe(0);
}

function setSyntheticValue(lab, statement, value) {
  // Setup only: write untrusted values into this test's disposable database.
  // The assertions still use real HTTP/browser output; no app route is mocked.
  const setup = new DatabaseSync(lab.databasePath);
  try {
    expect(setup.prepare(statement).run(value).changes).toBe(1);
  } finally {
    setup.close();
  }
}

test("SQL-like email cannot authenticate @auth", async ({ request }, testInfo) => {
  await checkResponse(await request.post("/api/auth/login", {
    data: { email: "' OR 1=1 --", password: "not-a-password" }
  }), 401, testInfo, "sql-email-login");
  await checkResponse(await request.get("/api/auth/me"), 401, testInfo, "no-session");
});

test("SQL-like password cannot authenticate @auth", async ({ request }, testInfo) => {
  await checkResponse(await request.post("/api/auth/login", {
    data: { email: "customer@example.test", password: "' OR '1'='1' --" }
  }), 401, testInfo, "sql-password-login");
  await checkResponse(await request.get("/api/auth/me"), 401, testInfo, "no-session");
});

test("SQL-like search text does not broaden catalogue results", async ({ request }, testInfo) => {
  await signIn(request, testInfo);
  for (const payload of ["' OR 1=1 --", "' UNION SELECT 1,2,3 --"]) {
    const body = await checkResponse(await request.get("/api/products", {
      params: { q: payload }
    }), 200, testInfo, "literal-search");
    expect(body.products).toEqual([]);
  }
  const control = await checkResponse(await request.get("/api/products"), 200, testInfo, "catalogue-control");
  expect(control.products).toHaveLength(4);
});

test("a SQL-like product identifier cannot create an order", async ({ request }, testInfo) => {
  await signIn(request, testInfo);
  await checkResponse(await request.post("/api/orders", {
    data: { product_id: "1 OR 1=1" }
  }), 400, testInfo, "invalid-identifier");
  const history = await checkResponse(await request.get("/api/orders"), 200, testInfo, "unchanged-orders");
  expect(history.orders).toHaveLength(1);
});

test("reflected search text cannot break out of its input attribute", async ({ page }, testInfo) => {
  await watchForExecution(page);
  await signIn(page.request, testInfo);
  const payload = '">' + imagePayload;
  await page.goto("/products?q=" + encodeURIComponent(payload));
  await expect(page.getByRole("searchbox", { name: "Search products" })).toHaveValue(payload);
  await expect(page.getByRole("heading", { name: "No matching products" })).toBeVisible();
  await expectNoExecution(page, testInfo, "reflected-xss");
});

test("a stored product name is rendered as text rather than script", async ({ page, lab }, testInfo) => {
  await watchForExecution(page);
  await signIn(page.request, testInfo);
  setSyntheticValue(lab, "UPDATE products SET name=? WHERE id=1", scriptPayload);
  await page.goto("/products");
  await expect(page.getByRole("heading", { name: scriptPayload, exact: true })).toBeVisible();
  expect(await page.locator(".product-card script").count()).toBe(0);
  await expectNoExecution(page, testInfo, "stored-product-xss");
});

test("an untrusted product name stays escaped on its order receipt", async ({ page, lab }, testInfo) => {
  await watchForExecution(page);
  await signIn(page.request, testInfo);
  setSyntheticValue(lab, "UPDATE products SET name=? WHERE id=1", imagePayload);
  const purchase = await checkResponse(await page.request.post("/api/orders", {
    data: { product_id: 1 }
  }), 201, testInfo, "untrusted-product-purchase");
  await page.goto("/orders/" + purchase.order.id);
  await expect(page.getByText(imagePayload, { exact: true }).first()).toBeVisible();
  await expectNoExecution(page, testInfo, "receipt-xss");
});

test("an untrusted display name stays escaped in the account header", async ({ page, lab }, testInfo) => {
  await watchForExecution(page);
  await signIn(page.request, testInfo);
  setSyntheticValue(lab, "UPDATE users SET name=? WHERE id=1", scriptPayload);
  await page.goto("/products");
  await expect(page.locator(".avatar")).toHaveAttribute("title", scriptPayload);
  expect(await page.locator(".account-bar script").count()).toBe(0);
  await expectNoExecution(page, testInfo, "display-name-xss");
});
