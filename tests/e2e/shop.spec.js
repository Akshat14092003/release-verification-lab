import { test, expect } from "../fixtures/lab.js";
import { LoginPage, ProductsPage, CheckoutPage, ReceiptPage } from "../pages/shop.js";

test("customer signs in through a role shortcut and signs out", async ({ page }) => {
  await new LoginPage(page).signInAs();
  const products = new ProductsPage(page);
  await expect(products.cards).toHaveCount(4);
  await expect(page.locator(".role-badge")).toHaveText("Customer");
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await expect(page.getByRole("link", { name: "My orders", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".profile-menu")).not.toHaveAttribute("open");
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/orders");
  await expect(page).toHaveURL(/\/login$/);
});

test("invalid credentials show an error without logging in @auth", async ({ page }) => {
  const login = new LoginPage(page);
  await login.open();
  await login.submit("customer@example.test", "incorrect-password");
  expect((await page.request.get("/api/auth/me")).status(), "A wrong password must not create an authenticated session").toBe(401);
  await expect(login.error, "A wrong password must show a rejection on Login. Actual page: " + page.url())
    .toHaveText("Email or password is incorrect.");
  await expect(page).toHaveURL(/\/login$/);
});

test("a product purchase produces a receipt and order history", async ({ page }, testInfo) => {
  await new LoginPage(page).signInAs();
  const products = new ProductsPage(page);
  await products.buy("Studio headphones");
  const checkout = new CheckoutPage(page);
  await expect(checkout.total).toHaveText("$45.00");
  await checkout.placeOrder();
  await expect(page).toHaveURL(/\/orders\/\d+$/);
  const receipt = new ReceiptPage(page);
  await expect(receipt.total).toHaveText("$45.00");
  await expect(receipt.recordedTotal).toHaveText("$45.00");
  await testInfo.attach("completed-order", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  await products.navigate("Orders");
  await expect(page.getByRole("row").filter({ hasText: "$45.00" })).toHaveCount(1);
});

test("a weekend offer can be claimed once through the UI @limit", async ({ page }) => {
  await new LoginPage(page).signInAs();
  const products = new ProductsPage(page);
  await products.navigate("Offers");
  await page.getByRole("button", { name: "Add offer to cart" }).click();
  await expect(page.locator("#cart-toast-text")).toContainText("added to your cart");
  await page.goto("/cart");
  await page.getByRole("link", { name: "Proceed to checkout" }).click();
  const checkout = new CheckoutPage(page);
  await expect(checkout.total).toHaveText("$19.00");
  await checkout.placeOrder();
  await expect(new ReceiptPage(page).total).toHaveText("$19.00");
  await products.navigate("Offers");
  await expect(page.getByText("You have already claimed this offer.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Offer unavailable" })).toBeDisabled();
});

test("the Monday offer is unavailable in the UI @weekend", async ({ page, clock }) => {
  clock.setTime("2026-10-26T00:00:00.000Z");
  await new LoginPage(page).signInAs();
  await new ProductsPage(page).navigate("Offers");
  await expect(page.getByText("Available Saturday and Sunday, UTC.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Offer unavailable" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Add offer to cart" })).toHaveCount(0);
});

test("a checkout opened on Sunday is refused after Monday begins @weekend", async ({ page, clock }) => {
  clock.setTime("2026-10-25T23:59:59.000Z");
  await new LoginPage(page).signInAs();
  await new ProductsPage(page).navigate("Offers");
  await page.getByRole("button", { name: "Add offer to cart" }).click();
  await expect(page.locator("#cart-toast-text")).toContainText("added to your cart");
  await page.goto("/cart");
  await page.getByRole("link", { name: "Proceed to checkout" }).click();
  await expect(new CheckoutPage(page).total).toHaveText("$19.00");
  clock.setTime("2026-10-26T00:00:00.000Z");
  await new CheckoutPage(page).placeOrder();
  await expect(page.getByRole("heading", { name: "Available Saturday and Sunday, UTC.", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/checkout$/);
});

test("mobile catalogue fits the screen and keeps sign-out accessible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await new LoginPage(page).signInAs();
  await expect(new ProductsPage(page).cards).toHaveCount(4);
  const width = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth, viewport: window.innerWidth
  }));
  expect(width.content).toBeLessThanOrEqual(width.viewport);
  const menu = page.getByRole("button", { name: "Open menu", exact: true });
  await expect(page.locator("#mobile-navigation")).not.toBeVisible();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  const drawer = page.getByRole("dialog", { name: "Navigation and account" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Switch to dark mode" })).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Open profile menu" })).toBeVisible();
  await expect(drawer.getByRole("navigation").getByRole("link", { name: "Cart", exact: true })).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Sign out", exact: true })).toBeInViewport();
  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeVisible();
  await expect(menu).toBeFocused();
  await new ProductsPage(page).signOut();
  await expect(page).toHaveURL(/\/login$/);
});

test("an administrator can inspect the store overview", async ({ page }) => {
  await new LoginPage(page).signInAs("Admin");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator(".role-badge")).toHaveText("Admin");
  const navigation = page.getByRole("navigation", { name: "Main navigation", exact: true });
  await expect(navigation.getByRole("link")).toHaveText(["Overview", "Products", "Orders", "Customers"]);
  await expect(page.locator(".header-cart,.account-bar .credit")).toHaveCount(0);
  await page.goto("/");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Store overview", exact: true })).toBeVisible();
  await expect(page.locator(".home-hero,#manage-products")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Recent orders", exact: true })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "#FW-1001" })).toContainText("Alex Morgan");
  await navigation.getByRole("link", { name: "Products", exact: true }).click();
  const product = page.locator("details.admin-product").filter({ has: page.locator("summary", { hasText: "Everyday journal" }) });
  await product.locator("summary").click();
  await page.evaluate(() => { window.adminPageStayed = true; });
  await product.getByLabel("Price ($)", { exact: true }).fill("29.50");
  await product.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(product.locator("[data-admin-feedback]")).toContainText("Saved.");
  await expect(product).toHaveAttribute("open", "");
  expect(await page.evaluate(() => window.adminPageStayed)).toBe(true);
  await expect(product.locator("summary")).toContainText("$29.50");
  await navigation.getByRole("link", { name: "Orders", exact: true }).click();
  await page.getByLabel("Status for order FW-1001", { exact: true }).selectOption("shipped");
  await page.getByRole("button", { name: "Update order FW-1001", exact: true }).click();
  await expect(page.getByLabel("Status for order FW-1001", { exact: true })).toHaveValue("shipped");
  await page.getByRole("link", { name: "View order", exact: true }).click();
  await expect(navigation.getByRole("link", { name: "Orders", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".admin-order-customer")).toContainText("Alex Morgan");
  await expect(page.getByTestId("order-status")).toHaveText("Shipped");
  await expect(page.getByTestId("ledger-total")).toHaveText("$73.00");
  await page.getByRole("link", { name: "Back to orders", exact: true }).click();
  await navigation.getByRole("link", { name: "Customers", exact: true }).click();
  await page.getByRole("row").filter({ hasText: "Alex Morgan" }).getByRole("link", { name: "View orders", exact: true }).click();
  await expect(page.getByLabel("Customer", { exact: true })).toHaveValue("1");
  await page.getByLabel("Order status", { exact: true }).selectOption("processing");
  await page.getByRole("button", { name: "Filter orders", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No orders match these filters", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Show all orders", exact: true }).click();
  await page.setViewportSize({ width: 320, height: 568 });
  // The media-query listener moves navigation into its drawer after resize.
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await expect(navigation.getByRole("link")).toHaveText(["Overview", "Products", "Orders", "Customers"]);
  await navigation.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Store overview", exact: true })).toBeVisible();
});

test("a visitor signs up from checkout, gets admin approval and keeps their cart", async ({ page, browser, lab }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/products/2");
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  await page.goto("/cart");
  await page.getByRole("link", { name: "Proceed to checkout", exact: true }).click();
  await page.getByRole("link", { name: "Create account", exact: true }).click();
  await page.getByLabel("Display name", { exact: true }).fill("Riley Tester");
  await page.getByLabel("Email address", { exact: true }).fill("riley@example.test");
  await page.locator("#password").fill("FreshDemo!2026");
  await page.getByLabel("Confirm password", { exact: true }).fill("Different!2026");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Passwords do not match" })).toBeVisible();
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue("Riley Tester");
  await page.locator("#password").fill("FreshDemo!2026");
  await page.getByLabel("Confirm password", { exact: true }).fill("FreshDemo!2026");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Request received", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to sign in", exact: true }).first().click();
  await new LoginPage(page).submit("riley@example.test", "FreshDemo!2026");
  await expect(page.getByRole("alert")).toContainText("awaiting administrator approval");
  const adminContext = await browser.newContext({ baseURL: lab.baseURL, reducedMotion: "reduce" });
  await adminContext.route("https://fonts.googleapis.com/**", route => route.abort());
  try {
    const adminPage = await adminContext.newPage();
    await new LoginPage(adminPage).signInAs("Admin");
    await adminPage.getByRole("link", { name: "Manage signup requests" }).click();
    await adminPage.getByRole("row").filter({ hasText: "riley@example.test" }).getByRole("button", { name: "Approve", exact: true }).click();
    await expect(adminPage.getByRole("row").filter({ hasText: "riley@example.test" })).toContainText("Approved");
  } finally { await adminContext.close(); }
  await new LoginPage(page).submit("riley@example.test", "FreshDemo!2026");
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.locator(".role-badge")).toHaveText("Customer");
  await expect(page.getByTestId("checkout-total")).toHaveText("$45.00");
  await page.getByRole("button", { name: "Place demo order", exact: true }).click();
  await expect(page.getByTestId("order-total")).toHaveText("$45.00");
  await new ProductsPage(page).signOut();
  await expect(page.getByRole("button", { name: "Store Owner", exact: true })).toHaveCount(0);
  await new LoginPage(page).submit("riley@example.test", "FreshDemo!2026");
  await expect(page).toHaveURL(/\/products$/);
  await page.goto("/orders");
  await expect(page.getByRole("row").filter({ hasText: "$45.00" })).toHaveCount(1);
});

test("checkout supports quantities on a mobile screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await new LoginPage(page).signInAs();
  await page.goto("/products/3");
  await page.getByLabel("Quantity", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  await expect(page.locator("#cart-toast-text")).toContainText("Ceramic mug added");
  await page.goto("/cart");
  await page.getByRole("link", { name: "Proceed to checkout" }).click();
  await expect(page.getByTestId("checkout-total")).toHaveText("$36.00");
  const width = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(width.content).toBeLessThanOrEqual(width.viewport);
  await new CheckoutPage(page).placeOrder();
  await expect(new ReceiptPage(page).total).toHaveText("$36.00");
  await expect(page.getByText("Ceramic mug × 2")).toBeVisible();
});

test("product pages, cart updates and guest sign-in form a complete shopping journey", async ({ page }) => {
  await page.goto("/products");
  await page.getByRole("link", { name: "View Everyday journal", exact: true }).click();
  await expect(page).toHaveURL(/\/products\/1$/);
  await expect(page.getByRole("heading", { name: "Everyday journal", exact: true })).toBeVisible();
  await page.getByLabel("Quantity", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  await expect(page.locator("#cart-toast-text")).toContainText("Everyday journal added");
  await page.getByRole("link", { name: "Open cart", exact: true }).click();
  await expect(page.getByTestId("cart-total")).toHaveText("$56.00");
  await page.evaluate(() => { window.cartPageStayed = true; });
  await page.getByRole("button", { name: "Increase Everyday journal quantity", exact: true }).click();
  await expect(page.getByTestId("cart-total")).toHaveText("$84.00");
  expect(await page.evaluate(() => window.cartPageStayed)).toBe(true);
  await expect(page.getByRole("button", { name: "Increase Everyday journal quantity", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Remove Everyday journal", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your cart is waiting." })).toBeVisible();
  await page.goto("/products");
  await page.getByRole("link", { name: "View Studio headphones", exact: true }).click();
  await expect(page).toHaveURL(/\/products\/2$/);
  await expect(page.getByRole("heading", { name: "Studio headphones", exact: true })).toBeVisible();
  await page.getByLabel("Quantity", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  await expect(page.locator("#cart-toast-text")).toContainText("Studio headphones added");
  await page.goto("/cart");
  await page.getByRole("link", { name: "Proceed to checkout" }).click();
  await expect(page).toHaveURL(/\/login\?next=\/checkout$/);
  await page.getByRole("button", { name: "Customer", exact: true }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByTestId("checkout-total")).toHaveText("$90.00");
  await new CheckoutPage(page).placeOrder();
  await expect(new ReceiptPage(page).total).toHaveText("$90.00");
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Your cart is waiting." })).toBeVisible();
});
