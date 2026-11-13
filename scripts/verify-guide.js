// UI state fixtures keep this walkthrough check outside the release suite and avoid nested test launches.
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import { createDemoApp } from "../src/demo.js";
import { BASELINE_CHECKS, DEFECTS } from "../src/defects.js";

const output = resolve("test-results/guide");
mkdirSync(output, { recursive: true });
const runtime = createDemoApp({ directory: output, allowRuns: false });
const server = runtime.app.listen(0, "127.0.0.1");
await once(server, "listening");
const baseURL = "http://127.0.0.1:" + server.address().port;
let browser;
try {
  browser = await chromium.launch({ channel: "chromium", headless: true });
  for (const viewport of [{ width: 1917, height: 862 }, { width: 1440, height: 900 }, { width: 1440, height: 696 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
    const { width, height } = viewport;
    for (const theme of ["light", "dark"]) {
      const motion = width === 1917 ? "no-preference" : "reduce";
      const context = await browser.newContext({ baseURL, viewport, reducedMotion: "reduce" });
      await context.addInitScript(theme => localStorage.setItem("lab-theme", theme), theme);
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.route("**/*", route => new URL(route.request().url()).origin === baseURL ? route.continue() : route.abort());
      const coach = page.locator("#guide-coach"), next = page.locator("#guide-action");
      async function assertTarget() {
        await expect(coach).toBeVisible();
        await expect(page.locator(".guide-next")).toHaveCount(1);
        const overlap = await page.locator(".guide-next").evaluate(element => {
          const target = element.getBoundingClientRect(), guide = document.getElementById("guide-coach").getBoundingClientRect();
          return target.left < guide.right && target.right > guide.left && target.top < guide.bottom && target.bottom > guide.top;
        });
        assert.equal(overlap, false, "Guide must not cover its next action");
        const bounds = await coach.boundingBox();
        assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= width && bounds.y + bounds.height <= height, "Guide stays within viewport");
        if (width > 850 && !await page.locator("dialog[open]").count()) {
          const edge = await page.locator("#main-content").evaluate(main => main.getBoundingClientRect().left + parseFloat(getComputedStyle(main).paddingLeft));
          assert.ok(Math.abs(bounds.x - edge) < 2, "Desktop guide aligns with the page content edge");
        }
        if (await page.locator("#test-drawer").evaluate(drawer => drawer.open)) {
          const covered = await page.locator(".drawer-body").evaluate(body => {
            const content = body.getBoundingClientRect(), guide = document.getElementById("guide-coach").getBoundingClientRect();
            return content.bottom > guide.top + 1;
          });
          assert.equal(covered, false, "Guide footer must not cover the report or test results");
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "No horizontal overflow");
      }
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.locator("#guide-step")).toHaveText("Step 1 of 12");
      await assertTarget();
      await page.screenshot({ path: resolve(output, width + "x" + height + "-" + theme + "-start.png") });
      await next.click();
      await expect(page).toHaveURL(/\/products$/);
      await assertTarget();
      await next.click();
      await expect(page).toHaveURL(/\/products\/1$/);
      await assertTarget();
      await page.screenshot({ path: resolve(output, width + "x" + height + "-" + theme + "-product.png") });
      // Exercise guide motion on a real in-page step independently of native cross-document snapshots.
      await page.emulateMedia({ reducedMotion: motion });
      await page.evaluate(() => document.addEventListener("fieldwork:cart", () => requestAnimationFrame(() => {
        window.guideStepAnimations = document.querySelector("#guide-coach .guide-copy").getAnimations().length;
      }), { once: true }));
      await page.getByRole("button", { name: "Add to cart", exact: true }).click();
      await expect(next).toHaveText("Review cart");
      await expect.poll(() => page.evaluate(() => window.guideStepAnimations)).toBe(motion === "reduce" ? 0 : 1);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await next.click();
      await expect(page).toHaveURL(/\/cart$/);
      await assertTarget();
      await page.screenshot({ path: resolve(output, width + "x" + height + "-" + theme + "-cart.png") });
      await page.reload();
      await expect(page.locator("#guide-step")).toHaveText("Step 4 of 12");
      await next.click();
      await expect(page).toHaveURL(/\/login\?next=/);
      await assertTarget();
      await next.click();
      await expect(next).toHaveText("Show sign in");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page).toHaveURL(/\/checkout$/);
      await assertTarget();
      await page.getByRole("button", { name: "Place demo order", exact: true }).click();
      await expect(page).toHaveURL(/\/orders\/\d+$/);
      await assertTarget();
      await next.click();
      await expect(page.locator("#guide-step")).toHaveText("Step 8 of 12");
      await next.click();
      await expect(page.locator("#lab-settings")).toBeVisible();
      await assertTarget();
      await page.locator('[name="BUG_WEEKEND_OFFER"]').check();
      await expect(page.locator("#guide-step")).toHaveText("Step 9 of 12");
      await page.screenshot({ path: resolve(output, width + "x" + height + "-" + theme + "-playground.png") });
      await next.click();
      await expect(page.locator("#test-drawer")).toBeVisible();
      await assertTarget();
      let sequence = 0;
      await page.route("**/api/lab/runs", async route => {
        const state = await (await page.request.get("/api/lab/state")).json();
        const expected = DEFECTS.filter(defect => state.bugs[defect.flag]).reduce((total, defect) => total + defect.failures.length, 0);
        const failed = sequence++ === 0;
        await route.fulfill({ json: {
          id: "guide-" + sequence, status: "completed", phase: "finished", mode: "current", bugs: state.bugs,
          startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(),
          total: BASELINE_CHECKS, completed: BASELINE_CHECKS, passed: BASELINE_CHECKS - (failed ? expected : 0),
          failed: failed ? expected : 0, skipped: 0, checks: [], activeTests: [], logs: [],
          expectedFailures: failed ? expected : 0, matched: true, reportUrl: "/lab-reports/guide/index.html"
        } });
      });
      await page.route("**/lab-reports/guide/index.html", route => route.fulfill({ contentType: "text/html", body: "<h1>Walkthrough report fixture</h1>" }));
      await next.click();
      await expect(page.locator("#guide-step")).toHaveText("Step 10 of 12");
      await page.locator("#catch-popup").evaluate(popup => { popup.hidden = false; });
      await expect(coach).toBeHidden();
      await page.locator("#catch-popup").evaluate(popup => { popup.hidden = true; });
      await assertTarget();
      await next.click();
      await expect(page.frameLocator("#report-frame").getByRole("heading")).toHaveText("Walkthrough report fixture");
      await expect(page.locator("#report-section")).toHaveClass(/guide-next/);
      await expect(page.locator("#report-section")).toBeFocused();
      await expect(page.locator("#toggle-report-view")).not.toHaveClass(/guide-next/);
      const reportBounds = await page.locator("#test-drawer").boundingBox();
      assert.ok(reportBounds.width <= 1120 && Math.abs(reportBounds.x - (width - reportBounds.width) / 2) < 2, "Report is bounded and centered");
      await next.click();
      await expect(page.locator("#guide-step")).toHaveText("Step 11 of 12");
      await next.click();
      await assertTarget();
      await next.click();
      await expect(page.locator("#guide-step")).toHaveText("Step 12 of 12");
      await next.click();
      await next.click();
      await expect(page.locator("#guide-title")).toHaveText("Correct build verified.");
      await assertTarget();
      await page.screenshot({ path: resolve(output, width + "x" + height + "-" + theme + "-complete.png") });
      await next.click();
      await expect(coach).toBeHidden();
      await page.goto("/");
      await expect(coach).toBeHidden();
      const restart = page.locator("#guide-toggle");
      if (width < 850) await page.locator("[data-mobile-menu]").click();
      await restart.click();
      await expect(coach).toBeVisible();
      await page.getByRole("button", { name: "Skip guide", exact: true }).click();
      await page.reload();
      await expect(coach).toBeHidden();
      assert.deepEqual(errors, []);
      console.log("Guide passed: " + width + "x" + height + " " + theme + ", shopping → defect → evidence → fix, persistence, skip/restart, no covered targets or errors.");
      await context.close();
    }
  }
  // A reviewer can launch checks directly or pick a setup outside the guided sequence.
  for (const scenario of [
    { phase: "detect", status: "completed", matched: true, title: "Correct-build checks passed." },
    { phase: "detect", status: "completed", matched: true, runningFirst: true, title: "Correct-build checks passed." },
    { phase: "bug", status: "completed", matched: true, defect: true, title: "The checks caught the defect." },
    { phase: "shop", status: "completed", matched: true, title: "Correct-build checks passed." },
    { phase: "verify", status: "completed", matched: true, title: "Correct build verified." },
    { phase: "detect", status: "completed", matched: false, title: "This run needs review." },
    { phase: "detect", status: "error", matched: null, title: "The run could not finish." },
    { phase: "detect", status: "cancelled", matched: null, title: "The run was stopped." }
  ]) {
    const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
    await context.addInitScript(phase => localStorage.setItem("fieldwork-tour-v1", JSON.stringify({ status: "active", phase })), scenario.phase);
    const page = await context.newPage();
    let polls = 0;
    await page.route("**/api/lab/state", async route => {
      const response = await route.fetch();
      await route.fulfill({ json: { ...await response.json(), lastRun: "restored" } });
    });
    await page.route("**/api/lab/runs/restored", route => {
      const running = scenario.runningFirst && polls++ === 0;
      const failures = scenario.defect ? DEFECTS.find(defect => defect.flag === "BUG_WEEKEND_OFFER").failures.length : 0;
      return route.fulfill({ json: {
      id: "restored", status: running ? "running" : scenario.status, matched: running ? null : scenario.matched, phase: "finished", mode: "baseline",
      bugs: Object.fromEntries(DEFECTS.map(defect => [defect.flag, Boolean(scenario.defect && defect.flag === "BUG_WEEKEND_OFFER")])), expectedFailures: failures,
      passed: BASELINE_CHECKS - failures, failed: failures, total: BASELINE_CHECKS, completed: BASELINE_CHECKS, skipped: 0,
      checks: [], activeTests: [], logs: [], startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(),
      reportUrl: !running && scenario.status === "completed" ? "/lab-reports/restored/index.html" : null,
      error: scenario.status === "error" ? "Browser launch failed." : null
    } }); });
    await page.route("**/lab-reports/restored/index.html", route => route.fulfill({ contentType: "text/html", body: "<h1>Restored report fixture</h1>" }));
    await page.goto("/");
    await expect(page.locator("#guide-title")).toHaveText(scenario.title);
    await expect(page.locator("#guide-action")).not.toHaveText("Run tests");
    await page.reload();
    await expect(page.locator("#guide-title")).toHaveText(scenario.title);
    if (scenario.phase === "verify") {
      await page.locator("#guide-action").click();
      await page.locator("#test-drawer").evaluate(drawer => drawer.close());
      await page.locator("[data-mobile-menu]").click();
      await page.locator("#guide-toggle").click();
      await expect(page.locator("#guide-title")).toHaveText("Start with a real purchase.");
    }
    await context.close();
    console.log("Restored/out-of-sequence outcome passed: " + scenario.phase + "/" + scenario.status + "/" + scenario.matched);
  }
} finally {
  await browser?.close();
  await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  runtime.close();
}
