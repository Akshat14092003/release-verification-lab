export class LoginPage {
  constructor(page) {
    this.page = page;
    this.email = page.getByLabel("Email address");
    this.password = page.getByLabel("Password", { exact: true });
    this.submitButton = page.getByRole("button", { name: "Sign in", exact: true });
    this.error = page.getByRole("alert");
  }

  async open() {
    await this.page.goto("/login");
  }

  async signInAs(role = "Customer") {
    await this.open();
    await this.page.getByRole("button", { name: role, exact: true }).click();
    await this.submitButton.click();
    await this.page.waitForURL("**/products");
  }

  async submit(email, password) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submitButton.click();
  }
}

export class ProductsPage {
  constructor(page) {
    this.page = page;
    this.cards = page.locator(".product-card");
    this.search = page.getByRole("searchbox", { name: "Search products" });
  }

  async buy(name) {
    await this.page.getByRole("link", { name: "Buy " + name, exact: true }).click();
  }

  async navigate(name) {
    await this.page.getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: new RegExp("^" + name + "(?:\\s*\\d+)?$") }).click();
  }

  async signOut() {
    await this.page.getByRole("button", { name: "Sign out", exact: true }).click();
  }
}

export class CheckoutPage {
  constructor(page) {
    this.page = page;
    this.total = page.getByTestId("checkout-total");
    this.placeButton = page.getByRole("button", { name: "Place demo order" });
  }

  async placeOrder() {
    await this.placeButton.click();
  }
}

export class ReceiptPage {
  constructor(page) {
    this.page = page;
    this.total = page.getByTestId("order-total");
    this.recordedTotal = page.getByTestId("ledger-total");
  }
}
