import { test, expect } from "../fixtures/lab.js";
import { checkResponse, signIn } from "../support/api.js";
import { request as apiRequest } from "@playwright/test";

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
  const data = { items: [{ product_id: 1, offer_id: 1 }, { product_id: 2 }] };
  await checkResponse(await request.post("/api/orders", { data }), 201, testInfo, "first-offer-purchase");
  const second = await checkResponse(await request.post("/api/orders", { data }), 409, testInfo, "repeat-offer-purchase");
  expect(second.error).toMatch(/already claimed/i);
  const history = await checkResponse(await request.get("/api/orders"), 200, testInfo, "purchase-history");
  expect(history.orders.filter(order => order.offer_id === 1)).toHaveLength(1);
});

test("another account cannot read the customer's order", async ({ request }, testInfo) => {
  await signIn(request, testInfo, "other");
  await checkResponse(await request.get("/api/orders/1001"), 404, testInfo, "cross-account-receipt");
  const history = await checkResponse(await request.get("/api/orders"), 200, testInfo, "own-history");
  expect(history.orders).toEqual([]);
});

test("multi-item checkout prices quantities on the server and records every line", async ({ request }, testInfo) => {
  await signIn(request, testInfo);
  const data = {
    items: [{ product_id: 1, quantity: 2, unit_price_cents: 1 }, { product_id: 2, quantity: 1 }],
    total_cents: 1, user_id: 2
  };
  const quote = await checkResponse(await request.post("/api/checkout", { data }), 200, testInfo, "basket-quote");
  expect(quote.quote.total_cents).toBe(10100);
  const purchase = await checkResponse(await request.post("/api/orders", { data }), 201, testInfo, "basket-purchase");
  expect(purchase.order.total_cents).toBe(10100);
  const receipt = await checkResponse(await request.get("/api/orders/" + purchase.order.id), 200, testInfo, "basket-receipt");
  expect(receipt.order.user_id).toBe(1);
  expect(receipt.order.items).toMatchObject([
    { product_id: 1, unit_price_cents: 2800, quantity: 2 },
    { product_id: 2, unit_price_cents: 4500, quantity: 1 }
  ]);
  expect(receipt.order.ledger.map(entry => entry.amount_cents)).toEqual([-5600, -4500]);
  const me = await checkResponse(await request.get("/api/auth/me"), 200, testInfo, "basket-balance");
  expect(me.balance_cents).toBe(82600);
});

test("invalid baskets cannot create partial purchases", async ({ request, lab }, testInfo) => {
  await signIn(request, testInfo);
  const invalid = [
    [[], 400], [null, 400], [{}, 400], [[null], 400],
    [[{ product_id: 1, quantity: 0 }], 400],
    [[{ product_id: 1, quantity: -1 }], 400],
    [[{ product_id: 1, quantity: 1.5 }], 400],
    [[{ product_id: 1, quantity: 100 }], 400],
    [[{ product_id: 1, quantity: [] }], 400],
    [[{ product_id: [1] }], 400],
    [[{ product_id: 1 }, { product_id: 1 }], 400],
    [[{ product_id: 1, offer_id: 1, quantity: 2 }], 400],
    [[{ product_id: 2 }, { product_id: 999 }], 404]
  ];
  for (const [items, status] of invalid) {
    await checkResponse(await request.post("/api/orders", { data: { items } }), status, testInfo, "invalid-basket");
  }
  expect(lab.sql.prepare("SELECT COUNT(*) AS count FROM orders").get().count).toBe(1);
  expect(lab.sql.prepare("SELECT COUNT(*) AS count FROM order_items").get().count).toBe(2);
  expect(lab.sql.prepare("SELECT COUNT(*) AS count FROM ledger").get().count).toBe(2);
});

test("insufficient combined credit rejects the entire basket", async ({ request, lab }, testInfo) => {
  await signIn(request, testInfo);
  const response = await checkResponse(await request.post("/api/orders", {
    data: { items: [{ product_id: 1, quantity: 20 }, { product_id: 2, quantity: 10 }] }
  }), 409, testInfo, "over-budget-basket");
  expect(response.error).toMatch(/not enough demo credit/i);
  expect(lab.sql.prepare("SELECT COUNT(*) AS count FROM orders").get().count).toBe(1);
  expect(lab.sql.prepare("SELECT COUNT(*) AS count FROM order_items").get().count).toBe(2);
  expect(lab.sql.prepare("SELECT COUNT(*) AS count FROM ledger").get().count).toBe(2);
  const me = await checkResponse(await request.get("/api/auth/me"), 200, testInfo, "unchanged-basket-balance");
  expect(me.balance_cents).toBe(92700);
});

for (const role of ["customer", "admin"]) {
  test("admin overview permission for " + role, async ({ request }, testInfo) => {
    await signIn(request, testInfo, role);
    const status = role === "admin" ? 200 : 403;
    const html = await checkResponse(await request.get("/admin"), status, testInfo, "admin-permission");
    expect(html).toContain(role === "admin" ? "All orders" : "This page is for administrators.");
  });
}

test("cart merges quantities and checkout uses server prices then clears the cart", async ({ request, lab }, testInfo) => {
  await signIn(request, testInfo);
  await checkResponse(await request.post("/api/cart/items", { data: { product_id: 1, quantity: 2, unit_price_cents: 1 } }), 200, testInfo, "cart-journals");
  await checkResponse(await request.post("/api/cart/items", { data: { product_id: 2 } }), 200, testInfo, "cart-headphones");
  const merged = await checkResponse(await request.post("/api/cart/items", { data: { product_id: 1 } }), 200, testInfo, "cart-merge");
  expect(merged.cart.count).toBe(4);
  expect(merged.cart.total_cents).toBe(12900);
  const purchase = await checkResponse(await request.post("/api/cart/checkout", {
    data: { total_cents: 1, user_id: 2, items: [{ product_id: 999 }] }
  }), 201, testInfo, "cart-checkout");
  expect(purchase.order.total_cents).toBe(12900);
  const receipt = await checkResponse(await request.get("/api/orders/" + purchase.order.id), 200, testInfo, "cart-receipt");
  expect(receipt.order.user_id).toBe(1);
  expect(receipt.order.items).toMatchObject([{ product_id: 1, quantity: 3 }, { product_id: 2, quantity: 1 }]);
  expect(receipt.order.ledger.map(entry => entry.amount_cents)).toEqual([-8400, -4500]);
  const empty = await checkResponse(await request.get("/api/cart"), 200, testInfo, "empty-cart");
  expect(empty.cart.items).toEqual([]);
  expect(lab.sql.prepare("SELECT COUNT(*) AS count FROM cart_items").get().count).toBe(0);
});

test("invalid cart changes and rejected checkout preserve the basket", async ({ request, lab }, testInfo) => {
  await signIn(request, testInfo);
  await checkResponse(await request.post("/api/cart/items", { data: { product_id: 1 } }), 200, testInfo, "cart-item");
  for (const quantity of [0, -1, 1.5, 100, []]) {
    await checkResponse(await request.post("/api/cart/items/1", { data: { quantity } }), 400, testInfo, "invalid-cart-quantity");
  }
  await checkResponse(await request.post("/api/cart/items", { data: { product_id: 2, offer_id: 1 } }), 404, testInfo, "wrong-offer-product");
  await checkResponse(await request.post("/api/cart/items", { data: { product_id: 2, quantity: 20 } }), 200, testInfo, "over-budget-cart");
  await checkResponse(await request.post("/api/cart/checkout", { data: {} }), 409, testInfo, "rejected-cart-checkout");
  const cart = await checkResponse(await request.get("/api/cart"), 200, testInfo, "retained-cart");
  expect(cart.cart.total_cents).toBe(92800);
  expect(cart.cart.items).toHaveLength(2);
  expect(lab.sql.prepare("SELECT COUNT(*) AS count FROM orders").get().count).toBe(1);
  await checkResponse(await request.delete("/api/cart/items/2"), 200, testInfo, "removed-line");
  const changed = await checkResponse(await request.post("/api/cart/items/1", { data: { quantity: 2 } }), 200, testInfo, "updated-line");
  expect(changed.cart.total_cents).toBe(5600);
});

test("guest carts survive sign-in and remain isolated by browser cookie", async ({ request, lab }, testInfo) => {
  const other = await apiRequest.newContext({ baseURL: lab.baseURL });
  try {
    await checkResponse(await request.post("/api/cart/items", { data: { product_id: 1 } }), 200, testInfo, "guest-cart");
    await other.post("/api/cart/items", { data: { product_id: 3 } });
    await checkResponse(await request.post("/api/cart/checkout", { data: {} }), 401, testInfo, "guest-checkout-denied");
    await signIn(request, testInfo);
    const retained = await checkResponse(await request.get("/api/cart"), 200, testInfo, "cart-after-sign-in");
    expect(retained.cart.items[0].product.id).toBe(1);
    await checkResponse(await request.post("/api/cart/checkout", { data: {} }), 201, testInfo, "signed-in-cart-checkout");
    const otherCart = await (await other.get("/api/cart")).json();
    expect(otherCart.cart.items[0].product.id).toBe(3);
    expect(otherCart.cart.count).toBe(1);
  } finally { await other.dispose(); }
});
