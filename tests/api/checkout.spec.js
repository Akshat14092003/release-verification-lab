import { test, expect } from "../fixtures/lab.js";
import { checkResponse, signIn } from "../support/api.js";

test("catalogue search returns the matching product", async ({ request }, testInfo) => {
  await signIn(request, testInfo);
  const body = await checkResponse(await request.get("/api/products", {
    params: { q: "headphones" }
  }), 200, testInfo, "catalogue-search");
  expect(body.products).toHaveLength(1);
  expect(body.products[0]).toMatchObject({ id: 2, name: "Studio headphones", price_cents: 4500 });
});

test("checkout owns the price and customer identity", async ({ request }, testInfo) => {
  await signIn(request, testInfo);
  const purchase = await checkResponse(await request.post("/api/orders", {
    data: { product_id: 2, total_cents: 1, user_id: 2 }
  }), 201, testInfo, "tampered-purchase");
  expect(purchase.order.total_cents).toBe(4500);
  const receipt = await checkResponse(await request.get("/api/orders/" + purchase.order.id), 200, testInfo, "receipt");
  expect(receipt.order.user_id).toBe(1);
  expect(receipt.order.items).toMatchObject([{ unit_price_cents: 4500, quantity: 1 }]);
  const me = await checkResponse(await request.get("/api/auth/me"), 200, testInfo, "remaining-credit");
  expect(me.balance_cents).toBe(88200);
});

test("a direct second purchase of the same offer is refused @limit", async ({ request }, testInfo) => {
  await signIn(request, testInfo);
  const data = { product_id: 1, offer_id: 1 };
  await checkResponse(await request.post("/api/orders", { data }), 201, testInfo, "first-offer-purchase");
  const second = await checkResponse(await request.post("/api/orders", { data }), 409, testInfo, "repeat-offer-purchase");
  expect(second.error).toMatch(/already claimed/i);
  const history = await checkResponse(await request.get("/api/orders"), 200, testInfo, "purchase-history");
  expect(history.orders.filter(order => order.offer_id === 1)).toHaveLength(1);
});

test("another account cannot read the customer's order", async ({ request }, testInfo) => {
  await signIn(request, testInfo, "owner");
  await checkResponse(await request.get("/api/orders/1001"), 404, testInfo, "cross-account-receipt");
  const history = await checkResponse(await request.get("/api/orders"), 200, testInfo, "own-history");
  expect(history.orders).toEqual([]);
});

for (const role of ["customer", "owner", "admin"]) {
  test("admin overview permission for " + role, async ({ request }, testInfo) => {
    await signIn(request, testInfo, role);
    const status = role === "admin" ? 200 : 403;
    const html = await checkResponse(await request.get("/admin"), status, testInfo, "admin-permission");
    expect(html).toContain(role === "admin" ? "All orders" : "This page is for administrators.");
  });
}
