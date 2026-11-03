import { test as base, expect, request as apiRequest } from "@playwright/test";
import { once } from "node:events";
import { createDemoApp } from "../../src/demo.js";
import { readBugFlags } from "../../src/config.js";
import { DEFECTS } from "../../src/defects.js";

const test = base.extend({
  demo: async ({}, use, testInfo) => {
    // No nested test launches: the real button-to-report flow is verified separately.
    const runtime = createDemoApp({ directory: testInfo.outputPath("demo"), allowRuns: false });
    const server = runtime.app.listen(0, "127.0.0.1");
    await once(server, "listening");
    try { await use("http://127.0.0.1:" + server.address().port); }
    finally {
      await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
      runtime.close();
    }
  },
  baseURL: async ({ demo }, use) => use(demo),
  page: async ({ page, demo }, use) => {
    await page.route("**/*", route => new URL(route.request().url()).origin === demo ? route.continue() : route.abort());
    await use(page);
  }
});

test("website switches and demo day change a new visitor's actual shop", async ({ page }) => {
  await page.goto("/lab");
  await expect(page.getByRole("heading", { name: "Choose what goes wrong." })).toBeVisible();
  await expect(page.locator("#bug-help-auth")).toContainText("wrong password");
  await expect(page.locator("#bug-help-weekend")).toContainText("weekday");
  await expect(page.locator("#clock-value")).toContainText("2026-10-24");
  await page.getByRole("switch", { name: /Show the wrong receipt total/ }).check();
  await expect(page.locator("#lab-message")).toContainText("Settings applied");
  await expect(page.locator("#bug-expectation")).toContainText("1 failed check and 46 passing checks");
  await page.locator(".lab-day summary").click();
  await page.getByLabel("Demo day (UTC)").selectOption("monday");
  let releaseRefresh;
  const refreshGate = new Promise(resolve => { releaseRefresh = resolve; });
  let refreshStarted;
  const refreshPending = new Promise(resolve => { refreshStarted = resolve; });
  await page.route("**/products", async route => {
    if (route.request().resourceType() === "fetch") {
      refreshStarted();
      await refreshGate;
    }
    await route.continue();
  });
  await page.getByRole("button", { name: "Apply day", exact: true }).click();
  await refreshPending;
  await expect(page.locator("#clock-label")).toHaveText("Saturday");
  releaseRefresh();
  await expect(page.locator("#clock-label")).toHaveText("Monday");
  await page.unroute("**/products");
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: "Customer", exact: true }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByRole("status", { name: "Intentional demo defects" })).toContainText("Order Total Mismatch Active");
  await expect(page.locator(".page-footer")).toContainText("2026-10-26");
  await page.getByRole("button", { name: "Add Everyday journal to cart", exact: true }).click();
  await expect(page.locator("#cart-toast-text")).toContainText("Everyday journal added");
  await page.getByRole("button", { name: "Add Studio headphones to cart", exact: true }).click();
  await expect(page.locator("#cart-toast-text")).toContainText("Studio headphones added");
  await page.goto("/cart");
  await page.getByRole("link", { name: "Proceed to checkout" }).click();
  await expect(page.getByTestId("checkout-total")).toHaveText("$73.00");
  await page.getByRole("button", { name: "Place demo order" }).click();
  await expect(page.getByTestId("order-total")).toHaveText("$28.00");
  await expect(page.getByTestId("ledger-total")).toHaveText("$73.00");
});

test("visitor switches, purchases and reset are isolated", async ({ page, demo }) => {
  await page.goto("/lab");
  const other = await apiRequest.newContext({ baseURL: demo });
  try {
    await other.get("/api/lab/state");
    const bugs = { ...readBugFlags({}), BUG_AUTH_BYPASS: true };
    expect((await page.request.post("/api/lab/settings", { data: { bugs, clock: "saturday" } })).status()).toBe(200);
    const badLogin = { email: "customer@example.test", password: "wrong-password" };
    expect((await page.request.post("/api/auth/login", { data: badLogin })).status()).toBe(200);
    expect((await other.post("/api/auth/login", { data: badLogin })).status()).toBe(401);
    await page.request.post("/api/lab/reset", { data: {} });
    const credentials = { email: "customer@example.test", password: "DemoShop!2026" };
    await page.request.post("/api/auth/login", { data: credentials });
    await other.post("/api/auth/login", { data: credentials });
    expect((await other.post("/api/orders", { data: { product_id: 2 } })).status()).toBe(201);
    expect((await (await page.request.get("/api/orders")).json()).orders).toEqual([]);
    expect((await (await page.request.get("/api/auth/me")).json()).balance_cents).toBe(100000);
    expect((await (await other.get("/api/auth/me")).json()).balance_cents).toBe(95500);
    expect((await page.request.post("/api/orders", { data: { product_id: 1, offer_id: 1 } })).status()).toBe(201);
    expect((await page.request.post("/api/lab/repeat-offer", { data: {} })).status()).toBe(409);
    await page.request.post("/api/lab/settings", { data: { bugs: { ...bugs, BUG_NO_LIMIT: true }, clock: "saturday" } });
    expect((await page.request.post("/api/lab/repeat-offer", { data: {} })).status()).toBe(201);
    const invalid = await page.request.post("/api/lab/settings", { data: { bugs: { unknown: true }, clock: "saturday" } });
    expect(invalid.status()).toBe(400);
    const crossOrigin = await page.request.post("/api/lab/reset", { data: {}, headers: { Origin: "https://example.test" } });
    expect(crossOrigin.status()).toBe(403);
    const ordersBefore = (await (await page.request.get("/api/orders")).json()).orders;
    await page.goto("/products");
    if (await page.locator("#lab-settings").isHidden()) await page.getByRole("button", { name: "QA playground" }).click();
    await page.locator(".lab-day summary").click();
    await page.getByRole("button", { name: "Reset my purchases" }).click();
    const confirmation = page.getByRole("dialog", { name: "Reset your demo shop?" });
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toContainText("This cannot be undone");
    await page.getByRole("button", { name: "Keep shopping" }).click();
    expect((await (await page.request.get("/api/orders")).json()).orders).toEqual(ordersBefore);
    await page.getByRole("button", { name: "Reset my purchases" }).click();
    await page.getByRole("button", { name: "Reset purchases", exact: true }).click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
    expect((await page.request.get("/api/auth/me")).status()).toBe(401);
    await page.request.post("/api/auth/login", { data: credentials });
    expect((await (await page.request.get("/api/orders")).json()).orders).toEqual([]);
    expect((await (await other.get("/api/auth/me")).json()).balance_cents).toBe(95500);
  } finally { await other.dispose(); }
});

test("light and dark mode persist across the lab and shop", async ({ page }) => {
  await page.goto("/lab");
  await page.evaluate(() => {
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = (...args) => (window.shopThemeTransition = start(...args));
  });
  const lightSidebar = await page.locator('.sidebar').evaluate(element => getComputedStyle(element).backgroundColor);
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => Boolean(window.shopThemeTransition))).toBe(true);
  await page.evaluate(() => window.shopThemeTransition.finished);
  expect(await page.locator('.sidebar').evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(lightSidebar);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator('.login-card')).toBeVisible();
  expect(await page.locator('.login-card').evaluate(element => getComputedStyle(element).backdropFilter)).toContain('blur');
  await expect(page.locator("#lab-settings")).toBeHidden();
  const loginFit = await page.locator(".login-card").evaluate(card => {
    const bounds = card.getBoundingClientRect();
    const layout = document.querySelector(".login-layout").getBoundingClientRect();
    return { top: bounds.top, bottom: bounds.bottom, layoutTop: layout.top, layoutBottom: layout.bottom,
      pageHeight: document.documentElement.scrollHeight, viewport: innerHeight };
  });
  expect(loginFit.top).toBeGreaterThanOrEqual(loginFit.layoutTop);
  expect(loginFit.bottom).toBeLessThanOrEqual(loginFit.layoutBottom + 1);
  expect(loginFit.pageHeight).toBeLessThanOrEqual(loginFit.viewport + 1);
  await page.getByRole("button", { name: "Customer", exact: true }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/products$/);
  // Hold the transition update to reproduce navigation before its callback runs.
  await page.evaluate(() => {
    document.startViewTransition = () => ({ finished: new Promise(() => {}) });
  });
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  expect(await page.evaluate(() => localStorage.getItem("lab-theme"))).toBe("light");
  await page.goto("/lab");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("mobile visitor guide and run errors remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/lab");
  await expect(page.getByRole("complementary", { name: "Shopping guide" })).toBeVisible();
  await expect(page.locator("#guide-step")).toContainText("1 OF 5");
  const width = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(width.content).toBeLessThanOrEqual(width.viewport);
  await expect(page.locator("#clock-value")).toContainText("2026-10-24");
  await page.getByRole("button", { name: "Try the QA lab" }).click();
  await expect(page.getByRole("dialog", { name: "Navigation and account" })).toBeVisible();
  await expect(page.locator("#lab-settings")).toBeVisible();
  await page.getByRole("button", { name: "Run checks", exact: true }).click();
  await page.getByRole("button", { name: "Run tests", exact: true }).click();
  await expect(page.locator("#lab-message")).toContainText("disabled in this test instance");
  await expect(page.locator("#runner-message")).toBeVisible();
  await expect(page.locator("#runner-message")).toContainText("disabled in this test instance");
  await expect(page.getByRole("button", { name: "Run tests", exact: true })).toBeEnabled();
  await expect(page.locator("#report-section")).toBeHidden();
  expect((await page.request.get("/lab-reports/unknown/index.html")).status()).toBe(404);
  // Layout-only fixture; this test instance deliberately never starts nested Playwright runs.
  let fixtureRun = {
    id: "layout", status: "completed", phase: "finished", mode: "baseline", bugs: readBugFlags({}),
    startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), total: 47,
    completed: 47, passed: 47, failed: 0, skipped: 0, checks: [], activeTests: [], logs: [],
    expectedFailures: 0, matched: true, reportUrl: "/lab-reports/layout/index.html"
  };
  await page.route("**/api/lab/runs", route => route.fulfill({ json: fixtureRun }));
  const fixtureRuns = new Map([[fixtureRun.id, fixtureRun]]);
  const fixturePolls = [];
  await page.route("**/api/lab/runs/*", route => {
    const id = new URL(route.request().url()).pathname.split("/").at(-1);
    fixturePolls.push(id);
    const run = fixtureRuns.get(id);
    return run ? route.fulfill({ json: run }) : route.continue();
  });
  await page.route("**/lab-reports/layout/index.html", route => route.fulfill({ contentType: "text/html", body: "<!doctype html><html><head><style>:root{--color-canvas-default:#fff}.dark-mode{--color-canvas-default:#0d1117;color:#c9d1d9}</style><script>document.documentElement.className=localStorage.getItem('theme')||'light-mode'</script></head><body><h1>Report layout fixture</h1><div style='height:2000px'></div></body></html>" }));
  await page.getByRole("button", { name: "Run tests", exact: true }).click();
  await expect(page.locator("#test-drawer")).toHaveClass(/is-report-view/);
  await expect(page.locator("#check-loading")).toBeHidden();
  await expect(page.frameLocator("#report-frame").getByRole("heading", { name: "Report layout fixture" })).toBeVisible();
  const layout = await page.locator(".drawer-body").evaluate(body => ({ scroll: body.scrollHeight, height: body.clientHeight }));
  expect(layout.scroll).toBeLessThanOrEqual(layout.height + 1);
  expect((await page.locator("#report-frame").boundingBox()).height).toBeGreaterThan(400);
  await page.getByRole("button", { name: "Run details", exact: true }).click();
  await expect(page.getByRole("button", { name: "Run tests", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Read report", exact: true }).click();
  await expect(page.locator("#report-frame")).toBeVisible();
  await page.getByRole("button", { name: "Close test panel" }).click();
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator("#open-tests").click();
  await expect(page.frameLocator("#report-frame").locator("html")).toHaveClass("dark-mode");
  await expect(page.frameLocator("#report-frame").locator("body")).toHaveCSS("background-color", "rgb(13, 17, 23)");
  await expect(page.locator("#report-frame")).toHaveCSS("background-color", "rgb(13, 17, 23)");
  await page.getByRole("button", { name: "Close test panel" }).click();
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  // A root snapshot must not capture the interactive navigation dialog.
  await page.addStyleTag({ content: 'html.theme-changing::view-transition-new(root){animation-duration:30s}' });
  await page.evaluate(() => {
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = (...args) => (window.testThemeTransition = start(...args));
  });
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => Boolean(window.testThemeTransition))).toBe(false);
  await page.locator("#open-tests").click();
  await expect(page.frameLocator("#report-frame").locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator("#bug-caught-alert")).toBeHidden();
  await expect(page.locator("#catch-popup")).toBeHidden();
  await page.getByRole("button", { name: "Run details", exact: true }).click();
  await expect(page.locator("#test-drawer")).not.toHaveClass(/is-report-view/);
  const detectorChecks = [
    { id: "signal", project: "api", title: DEFECTS[0].failures[0].split("::")[1], status: "failed", detectedBug: { id: "auth", label: DEFECTS[0].label } },
    { id: "unexpected", project: "api", title: "An unrelated failure", status: "failed", detectedBug: null }
  ];
  fixtureRun = { ...fixtureRun, id: "caught-layout", status: "running", reportUrl: null, matched: null,
    bugs: { ...readBugFlags({}), BUG_AUTH_BYPASS: true }, expectedFailures: 5, completed: 0, passed: 0, failed: 0,
    checks: [], detections: [{ id: "auth", label: DEFECTS[0].label, expected: 5, observed: 0, state: "pending" }]
  };
  fixtureRuns.set(fixtureRun.id, fixtureRun);
  await page.getByRole("button", { name: "Run tests", exact: true }).click();
  await expect(page.locator("#check-loading")).toBeVisible();
  await expect(page.locator("#check-loading .check-skeleton")).toHaveCount(3);
  await expect(page.locator("#run-checks>li")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.locator("#check-loading").evaluate(element => getComputedStyle(element, "::after").animationName)).toBe("none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  fixtureRun = { ...fixtureRun, completed: 2, failed: 2, checks: detectorChecks,
    detections: [{ ...fixtureRun.detections[0], observed: 1, state: "observed" }] };
  fixtureRuns.set(fixtureRun.id, fixtureRun);
  await expect(page.locator("#bug-caught-title")).toHaveText("We spotted a bug you enabled");
  await expect(page.locator("#check-loading")).toBeHidden();
  await expect(page.locator("#bug-caught-copy")).toContainText("verification is still running");
  await expect(page.locator(".run-checks .is-expected-failure")).toHaveCount(1);
  await expect(page.locator("#catch-popup")).toBeVisible();
  await expect(page.locator("#catch-popup-title")).toHaveText("BUG SPOTTED!");
  await expect(page.locator("#catch-popup-name")).toHaveText(DEFECTS[0].label);
  await expect(page.locator("#catch-popup-score")).toHaveText("1 / 1 enabled bugs spotted");
  await expect(page.locator("#catch-popup-title")).toHaveCSS("color", "rgb(180, 35, 45)");
  const popup = await page.locator(".catch-popup-card").boundingBox();
  expect(popup.x).toBeGreaterThanOrEqual(0);
  expect(popup.x + popup.width).toBeLessThanOrEqual(390);
  expect(popup.y).toBeGreaterThanOrEqual(0);
  expect(popup.y + popup.height).toBeLessThanOrEqual(844);
  await page.keyboard.press("Escape");
  await expect(page.locator("#catch-popup")).toBeHidden();
  await expect(page.locator("#test-drawer")).toBeVisible();
  // The next real polling response must not replay the same detection.
  await page.waitForResponse(response => response.url().endsWith("/api/lab/runs/caught-layout"));
  await expect(page.locator("#catch-popup")).toBeHidden();
  fixtureRun = { ...fixtureRun, status: "completed", matched: false, reportUrl: "/lab-reports/layout/index.html",
    detections: [{ ...fixtureRun.detections[0], state: "review" }] };
  fixtureRuns.set(fixtureRun.id, fixtureRun);
  await expect(page.locator("#bug-caught-title")).toContainText("this run needs review");
  await expect(page.locator("#bug-caught-copy")).toContainText("not a verified result");
  await expect(page.locator("#catch-popup")).toBeHidden();
  await page.getByRole("button", { name: "Run details", exact: true }).click();
  fixtureRun = { ...fixtureRun, id: "verified-layout", completed: 47, passed: 42, failed: 5, matched: true,
    detections: [{ ...fixtureRun.detections[0], observed: 5, state: "verified" }] };
  fixtureRuns.set(fixtureRun.id, fixtureRun);
  await page.clock.install();
  await page.getByRole("button", { name: "Run tests", exact: true }).click();
  await expect(page.locator("#bug-caught-title")).toHaveText("You enabled it. We caught it.");
  await expect(page.locator("#bug-caught-copy")).toContainText("Accept invalid logins");
  await expect(page.locator("#run-detections")).toContainText("Caught and verified");
  await expect(page.locator("#catch-popup-title")).toHaveText("BUG CAUGHT!");
  await expect(page.locator("#catch-popup-score")).toHaveText("1 / 1 enabled bugs verified");
  // Cross the old 500ms polling boundary while keeping the popup timer deterministic.
  await page.clock.runFor(600);
  expect(fixturePolls).not.toContain("verified-layout");
  await expect(page.locator("#catch-popup")).toBeVisible();
  await expect(page.locator("#run-badge")).toHaveText("Finished");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".catch-popup-card")).toHaveCSS("animation-name", "none");
  await page.getByRole("button", { name: "See the evidence" }).click();
  await expect(page.locator("#catch-popup")).toBeHidden();
  await expect(page.locator("#test-drawer")).toHaveClass(/is-report-view/);
});


test("shopping hints and sidebar follow the storefront without a separate guide page", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.locator("#guide-step")).toContainText("1 OF 5");
  const animation = await page.locator(".hero-photo").evaluate(element => getComputedStyle(element).animationName);
  expect(animation).toBe("none");
  await page.getByRole("button", { name: "View an item", exact: true }).click();
  await expect(page).toHaveURL(/\/products\/1$/);
  await expect(page.locator("#guide-step")).toContainText("2 OF 5");
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  await expect(page.locator("#guide-title")).toHaveText("Added. Your cart is taking shape.");
  await page.getByRole("link", { name: "Open cart", exact: true }).click();
  await expect(page.locator("#guide-title")).toHaveText("Your picks, all together.");
  await page.getByRole("button", { name: "Dismiss guide" }).click();
  await expect(page.locator("#guide-coach")).toBeHidden();
  await page.getByRole("button", { name: "Guide", exact: true }).click();
  await expect(page.locator("#guide-coach")).toBeVisible();
  await expect(page).toHaveURL(/\/cart$/);
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-sidebar", "collapsed");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-sidebar", "collapsed");
  await page.getByRole("button", { name: "Expand sidebar" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-sidebar", "expanded");
  await page.request.delete("/api/cart/items/1");
  await page.goto("/login?next=/checkout");
  await page.getByRole("button", { name: "Customer", exact: true }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.locator("#guide-title")).toHaveText("Add something before checkout.");
  await page.goto("/products?q=no-such-product");
  await expect(page.getByRole("button", { name: "Show all products", exact: true })).toBeVisible();
});
