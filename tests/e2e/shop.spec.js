import { test, expect } from "../fixtures/lab.js";
import { LoginPage, ProductsPage, CheckoutPage, ReceiptPage } from "../pages/shop.js";

test("customer signs in through a role shortcut and signs out", async ({ page }) => {
  await new LoginPage(page).signInAs();
  const products = new ProductsPage(page);
  await expect(products.cards).toHaveCount(4);
  await expect(page.locator(".role-badge")).toHaveText("Customer");
  await products.signOut();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/orders");
  await expect(page).toHaveURL(/\/login$/);
});

test("invalid credentials show an error without logging in @auth", async ({ page }) => {
  const login = new LoginPage(page);
  await login.open();
  await login.submit("customer@example.test", "incorrect-password");
  await expect(login.error).toHaveText("Email or password is incorrect.");
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
  await testInfo.attach("completed-order", { body: await page.screenshot(), contentType: "image/png" });
  await products.navigate("Orders");
  await expect(page.getByRole("row").filter({ hasText: "$45.00" })).toHaveCount(1);
});

test("a weekend offer can be claimed once through the UI @limit", async ({ page }) => {
  await new LoginPage(page).signInAs();
  const products = new ProductsPage(page);
  await products.navigate("Offers");
  await page.getByRole("link", { name: "Claim offer" }).click();
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
  await expect(page.getByRole("link", { name: "Claim offer" })).toHaveCount(0);
});

test("a checkout opened on Sunday is refused after Monday begins @weekend", async ({ page, clock }) => {
  clock.setTime("2026-10-25T23:59:59.000Z");
  await new LoginPage(page).signInAs();
  await new ProductsPage(page).navigate("Offers");
  await page.getByRole("link", { name: "Claim offer" }).click();
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
  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeInViewport();
  await new ProductsPage(page).signOut();
  await expect(page).toHaveURL(/\/login$/);
});

test("an administrator can inspect the store overview", async ({ page }) => {
  await new LoginPage(page).signInAs("Admin");
  await expect(page.locator(".role-badge")).toHaveText("Admin");
  await new ProductsPage(page).navigate("Admin");
  await expect(page.getByRole("heading", { name: "All orders", exact: true })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "#FW-1001" })).toContainText("Alex Morgan");
});
