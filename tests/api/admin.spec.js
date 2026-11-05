import { test, expect } from "../fixtures/lab.js";
import { checkResponse, signIn } from "../support/api.js";
import { request as apiRequest } from "@playwright/test";

const product = { name: "Morning journal", category: "Stationery", description: "A fresh page.", artwork: "journal", price_cents: 3200, active: true };

test("admin management rejects anonymous and customer mutations on every route", async ({ request, lab }, testInfo) => {
  for (const role of [null, "customer"]) {
    if (role) await signIn(request, testInfo, role);
    const status = role ? 403 : 401;
    for (const path of ["/admin", "/admin/products", "/admin/orders", "/admin/customers", "/admin/orders/1001"]) {
      expect((await request.get(path, { maxRedirects: 0 })).status()).toBe(role ? 403 : 302);
    }
    await checkResponse(await request.get("/api/admin"), status, testInfo, "admin-access");
    await checkResponse(await request.post("/api/admin/products", { data: product }), status, testInfo, "create-permission");
    await checkResponse(await request.patch("/api/admin/products/1", { data: product }), status, testInfo, "edit-permission");
    await checkResponse(await request.post("/api/admin/products/1", { data: product }), status, testInfo, "post-edit-permission");
    await checkResponse(await request.patch("/api/admin/orders/1001/status", { data: { status: "shipped" } }), status, testInfo, "status-permission");
    expect((await request.post("/admin/products/1", { form: { name: "Tampered" }, maxRedirects: 0 })).status()).toBe(role ? 403 : 302);
    expect((await request.post("/admin/orders/1001/status", { form: { status: "shipped" }, maxRedirects: 0 })).status()).toBe(role ? 403 : 302);
  }
  await request.post("/api/auth/logout");
  const entrance = await request.get("/admin", { maxRedirects: 0 });
  expect(entrance.headers().location).toBe("/admin/login");
  const loginPage = await (await request.get("/admin/login")).text();
  expect(loginPage).toContain('action="/admin/login"');
  expect(loginPage).toContain("Admin sign in");
  expect(loginPage).not.toContain('href="/signup');
  expect(loginPage).not.toContain('data-demo-role="customer"');
  const sessions = lab.sql.prepare("SELECT COUNT(*) AS count FROM sessions").get().count;
  for (const [path, email, password] of [
    ["/admin/login", "customer@example.test", "DemoShop!2026"],
    ["/ADMIN/LOGIN/", "customer@example.test", "DemoShop!2026"],
    ["/admin/login", "admin@example.test", "wrong-password"],
    ["/login", "admin@example.test", "DemoShop!2026"],
    ["/api/auth/login", "admin@example.test", "wrong-password"]
  ]) {
    expect((await request.post(path, { form: { email, password }, maxRedirects: 0 })).status()).toBe(401);
    expect((await request.get("/api/auth/me")).status()).toBe(401);
  }
  expect(lab.sql.prepare("SELECT COUNT(*) AS count FROM sessions").get().count).toBe(sessions);
  const credentials = { email: "admin@example.test", password: "DemoShop!2026" };
  const accepted = await request.post("/admin/login", { form: { ...credentials, next: "https://example.test/admin" }, maxRedirects: 0 });
  expect(accepted.status()).toBe(303); expect(accepted.headers().location).toBe("/admin");
  expect((await (await request.get("/api/auth/me")).json()).user.role).toBe("admin");
  expect((await request.get("/admin/login?next=/admin/products", { maxRedirects: 0 })).headers().location).toBe("/admin/products");
  expect((await request.post("/logout", { maxRedirects: 0 })).headers().location).toBe("/admin/login");
  const deepLink = await request.get("/admin/orders?status=processing", { maxRedirects: 0 });
  expect(deepLink.headers().location).toBe("/admin/login?next=%2Fadmin%2Forders%3Fstatus%3Dprocessing");
  const returned = await request.post("/admin/login", { form: { ...credentials, next: "/admin/orders?status=processing" }, maxRedirects: 0 });
  expect(returned.headers().location).toBe("/admin/orders?status=processing");
  expect(lab.sql.prepare("SELECT name FROM products WHERE id=1").get().name).toBe("Everyday journal");
  expect(lab.sql.prepare("SELECT status FROM orders WHERE id=1001").get().status).toBe("processing");
});

test("admin price and availability changes affect checkout while preserving paid history", async ({ request, lab }, testInfo) => {
  const buyer = await apiRequest.newContext({ baseURL: lab.baseURL });
  try {
  await signIn(buyer, testInfo);
  await buyer.post("/api/cart/items", { data: { product_id: 1 } });
  await signIn(request, testInfo, "admin");
  await checkResponse(await request.patch("/api/admin/products/1", { data: product }), 200, testInfo, "price-change");
  const quote = await checkResponse(await buyer.post("/api/checkout", { data: { product_id: 1 } }), 200, testInfo, "updated-price");
  expect(quote.quote.total_cents).toBe(3200);
  expect(lab.sql.prepare("SELECT total_cents FROM orders WHERE id=1001").get().total_cents).toBe(7300);
  expect(lab.sql.prepare("SELECT product_name,unit_price_cents FROM order_items WHERE id=1").get()).toEqual({ product_name: "Everyday journal", unit_price_cents: 2800 });
  await checkResponse(await request.patch("/api/admin/products/1", { data: { ...product, active: false } }), 200, testInfo, "hide-product");
  expect((await (await buyer.get("/api/products")).json()).products.some(item => item.id === 1)).toBe(false);
  expect((await (await buyer.get("/api/offers")).json()).offers).toEqual([]);
  expect((await buyer.get("/products/1")).status()).toBe(404);
  await checkResponse(await buyer.post("/api/cart/checkout", { data: {} }), 409, testInfo, "hidden-cart-item");
  await checkResponse(await buyer.post("/api/orders", { data: { product_id: 1 } }), 409, testInfo, "hidden-direct-purchase");
  expect(lab.sql.prepare("SELECT COUNT(*) AS total FROM orders").get().total).toBe(1);
  await checkResponse(await request.patch("/api/admin/products/1", { data: product }), 200, testInfo, "restore-product");
  expect((await (await buyer.get("/api/products")).json()).products.some(item => item.id === 1)).toBe(true);
  } finally { await buyer.dispose(); }
});

test("administrators cannot use customer shopping routes or create purchases", async ({ request, lab }, testInfo) => {
  await signIn(request, testInfo, "admin");
  const before = lab.sql.prepare("SELECT COUNT(*) AS orders FROM orders").get().orders;
  const ledgerBefore = lab.sql.prepare("SELECT SUM(amount_cents) AS amount FROM ledger").get().amount;
  for (const path of ["/api/cart", "/api/checkout?product_id=1", "/api/orders", "/api/offers"]) {
    await checkResponse(await request.get(path), 403, testInfo, "buyer-only-read");
  }
  for (const path of ["/api/orders", "/API/ORDERS/", "/api/checkout", "/api/cart/items", "/api/cart/items/1", "/api/cart/checkout"]) {
    await checkResponse(await request.post(path, { data: { product_id: 1, quantity: 1 } }), 403, testInfo, "buyer-only-write");
  }
  await checkResponse(await request.delete("/api/cart/items/1"), 403, testInfo, "buyer-only-delete");
  for (const path of ["/cart/items", "/cart/items/1", "/cart/remove/1", "/checkout"]) {
    expect((await request.post(path, { form: { product_id: "1", quantity: "1" }, maxRedirects: 0 })).status()).toBe(403);
  }
  for (const path of ["/", "/products", "/products/1", "/offers", "/cart", "/checkout", "/orders"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(302); expect(response.headers().location).toBe("/admin");
  }
  expect((await (await request.get("/api/auth/me")).json())).not.toHaveProperty("balance_cents");
  const overview = await (await request.get("/admin")).text();
  expect(overview).toContain("Store overview");
  expect(overview).not.toContain("Small finds.");
  expect(overview).not.toContain('id="manage-products"');
  for (const [path, text] of [["products", "Manage products"], ["orders", "All orders"], ["customers", "Customer accounts"]]) {
    const response = await request.get("/admin/" + path);
    expect(response.status()).toBe(200); expect(await response.text()).toContain(text);
  }
  const filtered = await (await request.get("/admin/orders?status=processing&customer=1")).text();
  expect(filtered).toContain("#FW-1001");
  for (const query of ["status=shipped", "customer=2"]) {
    const html = await (await request.get("/admin/orders?" + query)).text();
    expect(html).toContain("No orders match these filters"); expect(html).not.toContain("#FW-1001");
  }
  expect((await request.get("/admin/orders?status=invalid")).status()).toBe(400);
  expect((await request.get("/admin/orders?customer=1&customer=2")).status()).toBe(400);
  expect((await request.get("/admin/orders?customer=3")).status()).toBe(404);
  await checkResponse(await request.get("/admin/orders/1001"), 200, testInfo, "management-receipt");
  expect(lab.sql.prepare("SELECT COUNT(*) AS orders FROM orders").get().orders).toBe(before);
  expect(lab.sql.prepare("SELECT SUM(amount_cents) AS amount FROM ledger").get().amount).toBe(ledgerBefore);
  expect(lab.sql.prepare("SELECT COUNT(*) AS items FROM cart_items").get().items).toBe(0);
});

test("admin creates validated products and updates fulfilment without changing money", async ({ request, lab }, testInfo) => {
  await signIn(request, testInfo, "admin");
  const invalidForm = await request.post("/admin/products", { form: {} });
  expect(invalidForm.status()).toBe(400);
  const invalidHtml = await invalidForm.text();
  expect(invalidHtml).toContain("Product name must be");
  expect(invalidHtml).toContain('id="manage-products"');
  for (const change of [{ price_cents: 0 }, { price_cents: 1.5 }, { price_cents: 1000000 }, { active: "true" }, { artwork: "../private" }]) {
    await checkResponse(await request.post("/api/admin/products", { data: { ...product, ...change } }), 400, testInfo, "invalid-product");
  }
  const created = await checkResponse(await request.post("/api/admin/products", { data: product }), 201, testInfo, "new-product");
  expect(created.product).toMatchObject({ name: product.name, price_cents: 3200, active: 1 });
  expect(lab.sql.prepare("SELECT COUNT(*) AS total FROM products").get().total).toBe(5);
  await checkResponse(await request.patch("/api/admin/orders/1001/status", { data: { status: "refunded" } }), 400, testInfo, "invalid-fulfilment");
  await checkResponse(await request.patch("/api/admin/orders/99999/status", { data: { status: "shipped" } }), 404, testInfo, "missing-order");
  await checkResponse(await request.patch("/api/admin/orders/1001/status", { data: { status: "shipped" } }), 200, testInfo, "ship-order");
  const update = await request.post("/admin/orders/1001/status", { form: { status: "shipped", filter_status: "processing", filter_customer: "1" }, maxRedirects: 0 });
  expect(update.status()).toBe(303);
  expect(update.headers().location).toBe("/admin/orders?saved=order&status=processing&customer=1");
  const afterUpdate = await (await request.get(update.headers().location)).text();
  expect(afterUpdate).toContain("No orders match these filters");
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
