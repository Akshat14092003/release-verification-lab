import { test, expect } from "../fixtures/lab.js";
import { checkResponse, signIn } from "../support/api.js";

const product = { name: "Morning journal", category: "Stationery", description: "A fresh page.", artwork: "journal", price_cents: 3200, active: true };

test("admin management rejects anonymous and customer mutations on every route", async ({ request, lab }, testInfo) => {
  for (const role of [null, "customer"]) {
    if (role) await signIn(request, testInfo, role);
    const status = role ? 403 : 401;
    await checkResponse(await request.get("/api/admin"), status, testInfo, "admin-access");
    await checkResponse(await request.post("/api/admin/products", { data: product }), status, testInfo, "create-permission");
    await checkResponse(await request.patch("/api/admin/products/1", { data: product }), status, testInfo, "edit-permission");
    await checkResponse(await request.post("/api/admin/products/1", { data: product }), status, testInfo, "post-edit-permission");
    await checkResponse(await request.patch("/api/admin/orders/1001/status", { data: { status: "shipped" } }), status, testInfo, "status-permission");
    expect((await request.post("/admin/products/1", { form: { name: "Tampered" }, maxRedirects: 0 })).status()).toBe(role ? 403 : 302);
    expect((await request.post("/admin/orders/1001/status", { form: { status: "shipped" }, maxRedirects: 0 })).status()).toBe(role ? 403 : 302);
  }
  expect(lab.sql.prepare("SELECT name FROM products WHERE id=1").get().name).toBe("Everyday journal");
  expect(lab.sql.prepare("SELECT status FROM orders WHERE id=1001").get().status).toBe("processing");
});

test("admin price and availability changes affect checkout while preserving paid history", async ({ request, lab }, testInfo) => {
  await signIn(request, testInfo);
  await request.post("/api/cart/items", { data: { product_id: 1 } });
  await request.post("/api/auth/logout");
  await signIn(request, testInfo, "admin");
  await checkResponse(await request.patch("/api/admin/products/1", { data: product }), 200, testInfo, "price-change");
  const quote = await checkResponse(await request.post("/api/checkout", { data: { product_id: 1 } }), 200, testInfo, "updated-price");
  expect(quote.quote.total_cents).toBe(3200);
  expect(lab.sql.prepare("SELECT total_cents FROM orders WHERE id=1001").get().total_cents).toBe(7300);
  expect(lab.sql.prepare("SELECT product_name,unit_price_cents FROM order_items WHERE id=1").get()).toEqual({ product_name: "Everyday journal", unit_price_cents: 2800 });
  await checkResponse(await request.patch("/api/admin/products/1", { data: { ...product, active: false } }), 200, testInfo, "hide-product");
  expect((await (await request.get("/api/products")).json()).products.some(item => item.id === 1)).toBe(false);
  expect((await (await request.get("/api/offers")).json()).offers).toEqual([]);
  expect((await request.get("/products/1")).status()).toBe(404);
  await checkResponse(await request.post("/api/cart/checkout", { data: {} }), 409, testInfo, "hidden-cart-item");
  await checkResponse(await request.post("/api/orders", { data: { product_id: 1 } }), 409, testInfo, "hidden-direct-purchase");
  expect(lab.sql.prepare("SELECT COUNT(*) AS total FROM orders").get().total).toBe(1);
  await checkResponse(await request.patch("/api/admin/products/1", { data: product }), 200, testInfo, "restore-product");
  expect((await (await request.get("/api/products")).json()).products.some(item => item.id === 1)).toBe(true);
});

test("admin creates validated products and updates fulfilment without changing money", async ({ request, lab }, testInfo) => {
  await signIn(request, testInfo, "admin");
  const invalidForm = await request.post("/admin/products", { form: {} });
  expect(invalidForm.status()).toBe(400);
  expect(await invalidForm.text()).toContain("Product name must be");
  for (const change of [{ price_cents: 0 }, { price_cents: 1.5 }, { price_cents: 1000000 }, { active: "true" }, { artwork: "../private" }]) {
    await checkResponse(await request.post("/api/admin/products", { data: { ...product, ...change } }), 400, testInfo, "invalid-product");
  }
  const created = await checkResponse(await request.post("/api/admin/products", { data: product }), 201, testInfo, "new-product");
  expect(created.product).toMatchObject({ name: product.name, price_cents: 3200, active: 1 });
  expect(lab.sql.prepare("SELECT COUNT(*) AS total FROM products").get().total).toBe(5);
  await checkResponse(await request.patch("/api/admin/orders/1001/status", { data: { status: "refunded" } }), 400, testInfo, "invalid-fulfilment");
  await checkResponse(await request.patch("/api/admin/orders/99999/status", { data: { status: "shipped" } }), 404, testInfo, "missing-order");
  await checkResponse(await request.patch("/api/admin/orders/1001/status", { data: { status: "shipped" } }), 200, testInfo, "ship-order");
  await request.post("/api/auth/logout"); await signIn(request, testInfo);
  const receipt = await checkResponse(await request.get("/api/orders/1001"), 200, testInfo, "customer-status");
  expect(receipt.order).toMatchObject({ status: "shipped", total_cents: 7300 });
  expect(receipt.order.ledger.map(line => line.amount_cents)).toEqual([-2800, -4500]);
  await request.post("/api/auth/logout"); await signIn(request, testInfo, "admin");
  const overview = await checkResponse(await request.get("/api/admin"), 200, testInfo, "admin-customers");
  expect(overview.customers.find(customer => customer.id === 1)).toMatchObject({ orders: 1, balance_cents: 92700 });
  expect(JSON.stringify(overview)).not.toContain("password_hash");
  expect(overview.customers.every(customer => !Object.hasOwn(customer, "password"))).toBe(true);
});
