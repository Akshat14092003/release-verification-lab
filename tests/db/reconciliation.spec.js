import { test, expect } from "../fixtures/lab.js";
import { checkResponse, signIn } from "../support/api.js";

function displayedCents(text) {
  const amount = text.trim();
  expect(amount).toMatch(/^\$(?:\d{1,3}(?:,\d{3})*|\d+)\.\d{2}$/);
  return Number(amount.replace(/[$,.]/g, ""));
}

async function compareReceipt(page, lab, orderId, expectedCents, testInfo) {
  // Independent read-only SQL, not the API response or the application's total helper.
  const query = [
    "SELECT o.id, o.total_cents,",
    " (SELECT -SUM(l.amount_cents) FROM ledger l WHERE l.order_id=o.id) AS ledger_cents,",
    " (SELECT SUM(i.unit_price_cents*i.quantity) FROM order_items i WHERE i.order_id=o.id) AS item_cents",
    "FROM orders o WHERE o.id=?"
  ].join(" ");
  const row = lab.sql.prepare(query).get(orderId);
  await page.goto("/orders/" + orderId);
  const displayed = {
    order: await page.getByTestId("order-total").innerText(),
    ledger: await page.getByTestId("ledger-total").innerText()
  };
  await testInfo.attach("sql-reconciliation", {
    contentType: "application/json",
    body: Buffer.from(JSON.stringify({ query, parameters: [orderId], row, displayed }, null, 2))
  });
  await testInfo.attach("receipt-evidence", { body: await page.screenshot(), contentType: "image/png" });
  expect(row.total_cents).toBe(expectedCents);
  expect(row.ledger_cents).toBe(row.total_cents);
  expect(row.item_cents).toBe(row.total_cents);
  expect(displayedCents(displayed.order)).toBe(row.ledger_cents);
  expect(displayedCents(displayed.ledger)).toBe(row.ledger_cents);
}

test("the two-item seed receipt matches independent ledger and item sums @total", async ({ page, lab }, testInfo) => {
  await signIn(page.request, testInfo);
  await compareReceipt(page, lab, 1001, 7300, testInfo);
});

test("a new purchase matches the displayed total, ledger, and remaining balance @total", async ({ page, lab }, testInfo) => {
  await signIn(page.request, testInfo);
  const purchase = await checkResponse(await page.request.post("/api/orders", {
    data: { product_id: 1, offer_id: 1 }
  }), 201, testInfo, "new-offer-purchase");
  await compareReceipt(page, lab, purchase.order.id, 1900, testInfo);
  const balanceQuery = "SELECT u.opening_balance_cents + COALESCE(SUM(l.amount_cents),0) AS cents " +
    "FROM users u LEFT JOIN ledger l ON l.user_id=u.id WHERE u.id=1 GROUP BY u.id";
  const balance = lab.sql.prepare(balanceQuery).get();
  const account = await checkResponse(await page.request.get("/api/auth/me"), 200, testInfo, "balance-response");
  expect(balance.cents).toBe(90800);
  expect(account.balance_cents).toBe(balance.cents);
});

test("a rejected weekday purchase leaves orders, items, and ledger unchanged @weekend", async ({ request, lab, clock }, testInfo) => {
  clock.setTime("2026-10-26T12:00:00.000Z");
  await signIn(request, testInfo);
  const query = "SELECT (SELECT COUNT(*) FROM orders) AS orders," +
    " (SELECT COUNT(*) FROM order_items) AS items, (SELECT COUNT(*) FROM ledger) AS ledger";
  const before = lab.sql.prepare(query).get();
  await checkResponse(await request.post("/api/orders", {
    data: { product_id: 1, offer_id: 1 }
  }), 409, testInfo, "rejected-purchase");
  const after = lab.sql.prepare(query).get();
  await testInfo.attach("unchanged-database", {
    contentType: "application/json",
    body: Buffer.from(JSON.stringify({ query, before, after }, null, 2))
  });
  expect(after).toEqual(before);
});
