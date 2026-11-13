(() => {
  const coach = document.getElementById("guide-coach");
  if (!coach) return;
  const $ = id => document.getElementById(id);
  const { store } = window.Fieldwork;
  if (!document.body.classList.contains("admin-body")) {
    startVisitorGuide();
    return;
  }
  let dismissed = false, expanded = false, added = false, cart = null;
  dismissed = store("fieldwork-guide-dismissed") === "1";
  let action = () => {};
  function highlight(selector) {
    const target = document.querySelector(selector);
    if (!target) return;
    target.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    target.classList.add("guide-highlight");
    target.focus({ preventScroll: true });
    setTimeout(() => target.classList.remove("guide-highlight"), 2400);
  }
  function render() {
    coach.hidden = dismissed;
    $("guide-toggle").setAttribute("aria-expanded", String(!dismissed));
    const path = location.pathname, state = window.Fieldwork.labState;
    const admin = document.body.classList.contains("admin-body");
    coach.classList.toggle("is-compact", !admin && !expanded && !Object.values(state?.bugs || {}).some(Boolean));
    coach.classList.toggle("is-checkout", path === "/checkout");
    coach.setAttribute("aria-label", admin ? "Admin guide" : "Shopping guide");
    $("direct-tools").hidden = admin || !(state?.bugs.BUG_NO_LIMIT && path === "/offers");
    if (dismissed) return;
    let step = 1, title = "Find something you like.", copy = "Browse a product, choose a quantity, and build your own cart. We’ll guide you as you go.", label = "View an item";
    action = () => document.querySelector('.product-card .add-button')?.click();
    if (path === "/") {
      title = "Explore the release lab."; copy = "Browse the shop, introduce a defect in QA playground, then run the checks and inspect the evidence.";
      label = "Explore the shop"; action = () => location.assign("/products");
    } else if (admin) {
      const receipt = path.startsWith("/admin/orders/");
      const section = receipt ? "receipt" : path.split("/")[2] || "overview";
      const steps = {
        overview: ["Your management workspace.", "Sales come from the ledger. Review processing orders, manage the catalogue, or inspect customer purchases. Use a customer account to try shopping.", "Review processing orders", () => location.assign("/admin/orders?status=processing")],
        products: ["Keep the catalogue current.", "Edit a product's price or availability and save it here. Changes affect future purchases; existing receipts keep their paid amounts.", "Add a product", () => { const detail = document.querySelector("#manage-products details"); detail.open = true; highlight("#product-name-new"); }],
        orders: ["Manage customer orders.", "Filter by customer or status, update fulfilment, and open an order to inspect its receipt and payment records.", "Filter orders", () => highlight("#admin-order-status")],
        customers: ["Review customer activity.", "Customer accounts show remaining demo credit and purchase counts. Open View orders to inspect one customer's purchases.", "View customer accounts", () => highlight("#manage-customers")],
        receipt: ["Review the customer's order.", "Compare each line and the receipt total with its recorded payment. Return to Orders to update fulfilment.", "Back to orders", () => location.assign("/admin/orders")]
      };
      [title, copy, label, action] = steps[section] || steps.overview;
    } else if (path === "/products" && !document.querySelector(".product-card")) {
      title = "Let’s find another good thing."; copy = "No products match this search. Clear the filters to explore the collection again.";
      label = "Show all products"; action = () => location.assign("/products");
    } else if (path === "/products" && state?.bugs.BUG_AUTH_BYPASS) {
      title = "Try the login rule."; copy = "Accept invalid logins is on in QA playground. Try signing in with a wrong password, then run the checks.";
      label = "Try invalid login"; action = async () => { await fetch("/api/auth/logout", { method: "POST" }); location.assign("/login"); };
    } else if (path === "/products" && (state?.bugs.BUG_WEEKEND_OFFER || state?.bugs.BUG_NO_LIMIT)) {
      title = "Put an offer rule to the test.";
      copy = state.bugs.BUG_WEEKEND_OFFER ? "Open Offers, choose Monday in the day selector, and try buying an offer that should be unavailable." : "Buy the offer once through checkout, then try the direct-repeat button on Offers.";
      label = "Explore offers"; action = () => location.assign("/offers");
    } else if (path === "/products" && state?.bugs.BUG_TOTAL_MISMATCH) {
      copy = "The receipt bug needs two different product lines. Pick an item, add it to cart, then add a different product before checkout.";
    }
    if (/^\/products\/\d+$/.test(path)) {
      step = added ? 3 : 2;
      title = added ? "Added. Your cart is taking shape." : "Make it yours.";
      copy = added ? "Keep exploring or review your cart. Add a different product to create a multi-line receipt." : "Choose your quantity and add this product to your cart. Nothing is purchased yet.";
      label = added ? "Review cart" : "Show add to cart";
      action = added ? () => location.assign("/cart") : () => highlight('.product-info .product-purchase button[type="submit"]');
    } else if (path === "/cart") {
      step = 3;
      title = cart?.count ? "Your picks, all together." : "Your first good find is waiting.";
      copy = cart?.count ? "Adjust quantities or remove items. Checkout will review the real server-priced total before you buy." : "Add something from the collection, then come back here to review it.";
      label = cart?.count ? "Go to checkout" : "Explore products";
      action = () => location.assign(cart?.count ? "/checkout" : "/products");
      if (state?.bugs.BUG_TOTAL_MISMATCH && cart?.items.length === 1) {
        title = "Give the receipt bug two lines.";
        copy = "One product—even with quantity 2—has only one line total. Add a different product to expose the mismatch.";
        label = "Add another product"; action = () => location.assign("/products");
      }
    } else if (path === "/checkout") {
      step = 4; title = "One last look.";
      copy = "Review your items, quantities, and total. Place the demo order to create a real receipt and ledger entries.";
      label = "Show order button"; action = () => highlight('form[action="/checkout"] button');
      if (!document.querySelector('[data-testid="checkout-total"]')) {
        title = "Add something before checkout."; copy = "Your cart is empty. Explore the collection and add your first item.";
        label = "Browse collection"; action = () => location.assign("/products");
      }
    } else if (/^\/orders\/\d+$/.test(path)) {
      step = 5;
      const total = document.querySelector('[data-testid="order-total"]')?.textContent;
      const ledger = document.querySelector('[data-testid="ledger-total"]')?.textContent;
      const lines = document.querySelectorAll(".receipt-line:not(.receipt-total)").length;
      title = total !== ledger ? "Can you spot the discrepancy?" : "Your order has a paper trail.";
      copy = total !== ledger ? "The receipt shows " + total + ", but Transactions records " + ledger + ". Run the checks to capture this bug with evidence."
        : lines > 1 ? "Compare the order total with Transactions. Open QA playground and turn on Show the wrong receipt total to see what breaks on this same order."
          : "This is a one-line order. Add two different products next time to demonstrate the receipt-total bug.";
      label = total !== ledger ? "Run checks" : lines > 1 ? "Try receipt bug" : "Keep exploring";
      action = total !== ledger ? () => window.Fieldwork.openTests() : lines > 1 ? () => {
        const input = document.querySelector('[name="BUG_TOTAL_MISMATCH"]'); input.checked = true; input.dispatchEvent(new Event("change"));
      } : () => location.assign("/products");
    } else if (["/signup", "/request-access"].includes(path)) {
      step = 4; title = "A fresh account, a fresh start.";
      copy = "Use fictional details to request an account. An admin must approve it before you sign in. Approval adds $1,000 demo credit; your cart stays here. Reset clears the account.";
      label = "Fill details"; action = () => highlight('#name');
    } else if (path === "/login") {
      step = 4; title = state?.bugs.BUG_AUTH_BYPASS ? "Try a password that should fail." : "Use a fictional demo account.";
      copy = state?.bugs.BUG_AUTH_BYPASS ? "Accept invalid logins is on in QA playground. Fill an incorrect password, then sign in and see whether it is rejected." : "Choose Customer to fill in the demo details. Your cart will be here after you sign in.";
      label = state?.bugs.BUG_AUTH_BYPASS ? "Fill incorrect credentials" : "Fill Customer details";
      action = () => {
        document.querySelector('[data-demo-role="customer"]')?.click();
        if (state?.bugs.BUG_AUTH_BYPASS) document.getElementById("password").value = "incorrect-password";
        highlight('.login-form button[type="submit"]');
      };
    } else if (path === "/offers") {
      step = 2; title = "An offer with a rule to test.";
      copy = "This offer is valid on weekends, once per customer. Open QA playground, choose Monday and toggle Keep weekend offers open to compare the behaviours.";
      label = "Show the offer"; action = () => highlight(".offer-card");
    } else if (path === "/orders") {
      step = 5; title = "Every purchase has evidence."; copy = "Open an order to compare its receipt with the recorded transactions.";
      label = "Show an order"; action = () => highlight('a[href^="/orders/"]');
      if (!document.querySelector('a[href^="/orders/"]')) {
        title = "Your first order starts here."; copy = "Explore the collection, build a cart, and checkout to create your own receipt.";
        label = "Browse collection"; action = () => location.assign("/products");
      }
    }
    $("guide-step").textContent = admin ? "ADMIN GUIDE" : "SHOPPING GUIDE · " + step + " OF 5";
    $("guide-title").textContent = title; $("guide-copy").textContent = copy;
    $("guide-action").textContent = label; $("guide-progress-fill").style.width = step * 20 + "%";
  }
  $("guide-action").addEventListener("click", () => action());
  $("guide-dismiss").addEventListener("click", () => {
    dismissed = true;
    store("fieldwork-guide-dismissed", "1");
    render();
  });
  $("guide-toggle").addEventListener("click", () => {
    if (!dismissed && coach.classList.contains("is-compact")) expanded = true;
    else { dismissed = !dismissed; expanded = !dismissed; }
    store("fieldwork-guide-dismissed", dismissed ? "1" : "0");
    render();
  });
  document.addEventListener("fieldwork:settings", render);
  document.addEventListener("fieldwork:content", render);
  document.addEventListener("fieldwork:cart", event => { cart = event.detail.cart; added ||= event.detail.added; render(); });
  render();

  function startVisitorGuide() {
    const key = "fieldwork-tour-v1";
    let tour;
    try { tour = JSON.parse(store(key) || "null"); } catch { /* Ignore invalid saved progress. */ }
    if (!tour || !["active", "skipped", "completed"].includes(tour.status)) {
      tour = { status: store("fieldwork-guide-dismissed") === "1" ? "skipped" : "active", phase: "shop" };
    }
    let cartCount = Number(document.querySelector("[data-cart-count]")?.textContent || 0);
    let target = null, signature = "", action = () => {}, scheduled = false;
    const home = document.createComment("Guide location");
    coach.before(home);
    const progress = coach.querySelector(".guide-progress");
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-label", "Guided walkthrough progress");
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", "12");
    $("guide-title").setAttribute("aria-live", "polite");
    $("guide-dismiss").setAttribute("aria-label", "Skip guide");
    coach.classList.add("is-tour");
    const save = () => store(key, JSON.stringify(tour));
    save();
    const visible = selector => [...document.querySelectorAll(selector)].find(element => element.getClientRects().length);
    let positionFrame = null;
    function queuePosition() {
      if (positionFrame !== null) return;
      positionFrame = requestAnimationFrame(() => { positionFrame = null; positionCoach(); });
    }
    function positionCoach() {
      if (coach.hidden) return;
      const size = coach.getBoundingClientRect();
      document.documentElement.style.setProperty("--guide-space", Math.ceil(size.height) + "px");
      if (coach.closest("#test-drawer")) {
        ["left", "right", "top", "bottom"].forEach(property => coach.style.removeProperty(property));
        return;
      }
      if (innerWidth <= 850) {
        coach.style.left = "12px"; coach.style.right = "12px"; coach.style.top = "auto";
        const viewport = window.visualViewport;
        coach.style.bottom = Math.max(12, viewport ? innerHeight - viewport.height - viewport.offsetTop + 12 : 12) + "px";
        return;
      }
      ["left", "right", "top", "bottom"].forEach(property => coach.style.removeProperty(property));
      const headerBottom = document.querySelector(".topbar").getBoundingClientRect().bottom;
      document.documentElement.style.setProperty("--guide-top", Math.max(0, headerBottom) + 12 + "px");
      const playground = visible("#lab-settings");
      if (playground) playground.style.setProperty("--qa-top", Math.round(coach.getBoundingClientRect().bottom + 12) + "px");
    }
    const go = path => location.assign(path);
    const focus = element => {
      element?.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      element?.focus({ preventScroll: true });
    };
    function clearTarget() {
      if (!target) return;
      target.classList.remove("guide-next");
      const descriptions = (target.getAttribute("aria-describedby") || "").split(" ").filter(id => id && id !== "guide-copy");
      if (descriptions.length) target.setAttribute("aria-describedby", descriptions.join(" "));
      else target.removeAttribute("aria-describedby");
      target = null;
    }
    function queueRender() {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => { scheduled = false; renderTour(); });
    }
    function reconcileRun(run) {
      if (tour.status !== "active" || !run || run.status === "running" || run.id === (tour.handledRunId || tour.runId)) return;
      tour.recoveryPhase = tour.phase === "verify" ? "verify" : Object.values(window.Fieldwork.labState?.bugs || {}).some(Boolean) ? "detect" : "bug";
      if (run.status === "completed" && run.matched && run.reportUrl) {
        if (run.expectedFailures > 0 && run.failed > 0) {
          tour.phase = "evidence";
          tour.runId = run.id;
        } else if (!run.expectedFailures && !run.failed && run.passed > 0 && !Object.values(run.bugs).some(Boolean)) {
          tour.phase = ["verify", "fix"].includes(tour.phase) || tour.runId ? "verified" : "baseline";
        } else tour.phase = "review";
      } else tour.phase = "review";
      tour.outcome = run.status;
      tour.reportSeen = false;
      tour.handledRunId = run.id;
      save();
    }
    function renderTour() {
      reconcileRun(window.Fieldwork.currentRun);
      const active = tour.status === "active";
      coach.hidden = !active;
      $("guide-toggle").setAttribute("aria-expanded", String(active));
      $("guide-toggle").title = active ? "Pause the guided walkthrough" : "Restart the guided walkthrough";
      document.body.classList.toggle("has-active-tour", active);
      const modal = document.querySelector("dialog[open]");
      const dialog = modal?.matches("#test-drawer,#mobile-navigation") ? modal : null;
      const suspended = Boolean(modal && !dialog) || Boolean(visible("#catch-popup:not([hidden])"));
      coach.hidden = !active || suspended;
      const host = dialog || home.parentNode;
      if (coach.parentNode !== host) {
        if (dialog) dialog.append(coach);
        else home.after(coach);
      }
      document.querySelectorAll("dialog.has-guide").forEach(element => element.classList.toggle("has-guide", active && !suspended && element === dialog));
      dialog?.classList.toggle("has-guide", active && !suspended);
      if (!active || suspended) { clearTarget(); return; }
      const path = location.pathname;
      const state = window.Fieldwork.labState;
      const run = window.Fieldwork.currentRun;
      const bugs = Object.values(state?.bugs || {}).some(Boolean);
      if (tour.phase === "bug" && bugs) { tour.phase = "detect"; save(); }
      if (tour.phase === "fix" && state && !bugs) { tour.phase = "verify"; save(); }
      let step = 1, title = "Start with a real purchase.", copy = "Explore the shop, place a fictional order, then introduce a bug and prove the checks catch it.", label = "Explore the shop";
      let selector = '.home-entry a[href="/products"],a[href="/products"]';
      action = () => go("/products");
      if (tour.phase === "shop") {
        if (path === "/products" || path === "/offers") {
          step = 2; title = "Choose a product."; copy = "Open an item to see its price and add it to your own cart. No real payment is involved.";
          selector = '.product-card .add-button,.offer-card a[href^="/products/"]';
          label = "View an item"; action = () => target ? target.click() : go("/products");
          if (cartCount) {
            step = 4; title = "Your cart is ready to review."; copy = "You have an item in your cart. Review it before continuing to checkout.";
            selector = 'a.header-cart[href="/cart"]'; label = "Review cart"; action = () => go("/cart");
          } else if (!visible(selector)) {
            title = "Find an available product."; copy = "Clear any filters and choose an item from the collection.";
            selector = '.page-heading'; label = "Browse products"; action = () => go("/products");
          }
        } else if (/^\/products\/\d+$/.test(path)) {
          step = cartCount ? 4 : 3; title = cartCount ? "Added. Review your cart next." : "Add your first item.";
          copy = cartCount ? "Your item is saved. Open the cart to review quantities and the server-priced total." : "Choose a quantity, then press Add to cart. This only saves the item; it does not buy it.";
          selector = cartCount ? 'a.header-cart[href="/cart"]' : '.product-purchase button[type="submit"]';
          label = cartCount ? "Review cart" : "Show add to cart"; action = () => cartCount ? go("/cart") : focus(target);
        } else if (path === "/cart") {
          step = 4; title = cartCount ? "Review your picks." : "Your cart needs an item.";
          copy = cartCount ? "Check quantities and the total, then continue to checkout. You can still edit everything here." : "Browse products and add an item to continue your walkthrough.";
          selector = cartCount ? 'a[href="/checkout"].button' : '.empty-cart a';
          label = cartCount ? "Go to checkout" : "Browse products"; action = () => go(cartCount ? "/checkout" : "/products");
        } else if (path === "/login") {
          step = 5; title = "Use the demo customer."; copy = "Choose Customer to fill the fictional credentials, then press Sign in. Your cart will stay with you.";
          const filled = $("email")?.value && $("password")?.value;
          selector = filled ? '.login-form button[type="submit"]' : '[data-demo-role="customer"]';
          label = filled ? "Show sign in" : "Fill Customer details";
          action = () => filled ? focus(target) : target?.click();
        } else if (path === "/checkout") {
          step = 6; title = "Place your demo order."; copy = "Review the total and place the order using fictional demo credit. No card or real money is involved.";
          selector = 'form[action="/checkout"] button'; label = "Show order button"; action = () => focus(target);
          if (!document.querySelector('[data-testid="checkout-total"]')) {
            title = "Add something before checkout."; copy = "Your cart is empty. Add a product to continue.";
            selector = '.empty-state a'; label = "Browse products"; action = () => go("/products");
          }
        } else if (/^\/orders\/\d+$/.test(path)) {
          step = 7; title = "Your purchase has evidence."; copy = "Compare the order total with Transactions. Next, introduce a deliberate bug and see which checks detect it.";
          selector = '[data-testid="order-total"]'; label = "Explore QA playground";
          action = () => { tour.phase = "bug"; save(); renderTour(); };
        } else if (path === "/orders") {
          selector = 'a[href^="/orders/"]'; label = visible(selector) ? "Open an order" : "Browse products";
          action = () => target ? target.click() : go("/products");
        } else if (["/signup", "/request-access"].includes(path)) {
          step = 5; title = "Use the ready-made demo account."; copy = "New accounts need admin approval. For this walkthrough, sign in with the existing demo customer instead.";
          selector = 'a[href^="/login"]'; label = "Use demo sign in"; action = () => go("/login?next=/checkout");
        }
      } else {
        const playground = visible('#toggle-playground') || visible('[data-open-playground]');
        const tests = visible('[data-open-tests]') || $("open-tests");
        const settingsOpen = !$("lab-settings").hidden && Boolean($("lab-settings").getClientRects().length);
        const openPlayground = () => {
          $("test-drawer").close();
          if (!settingsOpen) playground.click();
          queueRender();
        };
        if (["bug", "fix"].includes(tour.phase)) {
          const fix = tour.phase === "fix";
          step = fix ? 11 : 8; title = fix ? "Restore the correct behaviour." : "Introduce one deliberate bug.";
          copy = fix ? "Switch all bugs off. Then rerun the checks to prove the correct build passes." : "Open QA playground and enable Keep weekend offers open. This deliberately removes a real purchase rule.";
          selector = settingsOpen ? fix ? "#all-off" : '[name="BUG_WEEKEND_OFFER"]' : playground;
          label = settingsOpen ? fix ? "Switch all bugs off" : "Show bug switch" : "Open QA playground";
          action = () => settingsOpen ? fix ? $("all-off").click() : focus(target) : openPlayground();
        } else if (["detect", "verify"].includes(tour.phase)) {
          const verify = tour.phase === "verify";
          step = verify ? 12 : 9; title = verify ? "Prove the fix with another run." : "Run the checks against your bug.";
          copy = "Choose My current bug switches and press Run tests. Progress comes from real browser, API, database and security checks.";
          const open = $("test-drawer").open;
          const reading = $("test-drawer").classList.contains("is-report-view");
          selector = open ? reading ? "#toggle-report-view" : "#run-tests" : tests;
          label = open ? reading ? "Review test setup" : "Run tests" : "Open checks";
          action = () => {
            if (!open) {
              document.querySelector("#mobile-navigation[open]")?.close(); window.Fieldwork.openTests();
              if ($("test-drawer").classList.contains("is-report-view")) $("toggle-report-view").click();
            }
            else if (reading) $("toggle-report-view").click();
            else { $("run-mode").value = "current"; $("run-tests").click(); }
            queueRender();
          };
        } else if (["evidence", "verified", "baseline", "review"].includes(tour.phase)) {
          const verified = tour.phase === "verified";
          const baseline = tour.phase === "baseline", review = tour.phase === "review";
          const report = Boolean(run?.reportUrl);
          step = verified ? 12 : 10;
          title = verified ? "Correct build verified." : baseline ? "Correct-build checks passed." : review ? tour.outcome === "error" ? "The run could not finish." : tour.outcome === "cancelled" ? "The run was stopped." : "This run needs review." : "The checks caught the defect.";
          copy = verified ? "The completed run passed with all bugs off. You have explored, broken, tested and verified the shop. Reopen Guide anytime to try again." : baseline ? "This completed run tested the correct build with all bugs off. Read its report, then try a deliberate defect if you want to see the checks catch it." : review ? (run?.error || "The completed results did not match the expected checks.") + " This is not a verified pass. Inspect the result before retrying." : "The failures match the enabled bug. Read the report and inspect a failed check before restoring the correct behaviour.";
          if (verified && bugs) copy += " Your shop switches are still on; this report verifies the all-off setup.";
          selector = $("test-drawer").open ? $("test-drawer").classList.contains("is-report-view") ? "#report-section" : "#run-result" : tests;
          if (review && !report && $("test-drawer").open) selector = "#run-result";
          label = verified ? "Finish guide" : tour.reportSeen ? baseline ? "Try a defect" : review ? "Review test setup" : "I've reviewed the evidence" : report ? "Read the report" : "Inspect run result";
          action = () => {
            if (verified) { tour.status = "completed"; save(); renderTour(); return; }
            if (!tour.reportSeen) {
              document.querySelector("#mobile-navigation[open]")?.close(); window.Fieldwork.openTests();
              if (report && !$("test-drawer").classList.contains("is-report-view")) $("toggle-report-view").click();
              focus(report ? $("report-section") : $("run-result"));
              tour.reportSeen = true;
            } else {
              tour.phase = baseline ? "bug" : review ? tour.recoveryPhase : "fix";
              if (review) {
                if ($("test-drawer").classList.contains("is-report-view")) $("toggle-report-view").click();
              } else $("test-drawer").close();
            }
            save(); renderTour();
          };
        }
      }
      if (run?.status === "running") {
        title = "Watch the real checks run.";
        copy = "The run is in progress. When it finishes, the guide will show its actual result and the evidence to inspect.";
        selector = $("test-drawer").open ? "#test-progress" : visible('[data-open-tests]') || $("open-tests");
        label = $("test-drawer").open ? "Checks running…" : "View running checks";
        action = () => { document.querySelector("#mobile-navigation[open]")?.close(); window.Fieldwork.openTests(); };
      }
      for (const [id, text] of [["guide-step", "Step " + step + " of 12"], ["guide-title", title], ["guide-copy", copy], ["guide-action", label]]) {
        if ($(id).textContent !== text) $(id).textContent = text;
      }
      $("guide-action").disabled = run?.status === "running" && $("test-drawer").open;
      $("guide-progress-fill").style.width = step / 12 * 100 + "%";
      progress.setAttribute("aria-valuenow", String(step));
      const next = typeof selector === "string" ? visible(selector) : selector;
      const nextSignature = tour.phase + ":" + step + ":" + (next?.id || next?.getAttribute("name") || label);
      const stepSignature = tour.phase + ":" + step + ":" + title;
      if (coach.dataset.step !== stepSignature) {
        coach.dataset.step = stepSignature;
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
          for (const element of [coach.querySelector(".guide-copy"), $("guide-action")]) {
            element.getAnimations().forEach(animation => animation.cancel());
            element.animate([{ opacity: .35, transform: "translateY(5px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 220, easing: "cubic-bezier(.16,1,.3,1)" });
          }
        }
      }
      if (target !== next) {
        clearTarget(); target = next;
        if (target) {
          target.classList.add("guide-next");
          target.setAttribute("aria-describedby", ((target.getAttribute("aria-describedby") || "") + " guide-copy").trim());
        }
      }
      if (signature !== nextSignature && target) {
        signature = nextSignature;
        const bounds = target.getBoundingClientRect();
        const docked = innerWidth <= 850 || coach.closest("#test-drawer");
        const top = docked ? 110 : coach.getBoundingClientRect().bottom + 16;
        const bottom = docked ? innerHeight - coach.getBoundingClientRect().height - 32 : innerHeight - 24;
        if (bounds.top < top || bounds.bottom > bottom) {
          target.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
          if (!docked && !target.closest("#lab-settings")) {
            const after = target.getBoundingClientRect();
            if (after.top < top) window.scrollBy({ top: after.top - top, behavior: "instant" });
          }
        }
      }
      positionCoach();
    }
    $("guide-action").addEventListener("click", () => { action(); queueRender(); });
    function dismiss() { tour.status = "skipped"; save(); renderTour(); }
    $("guide-dismiss").addEventListener("click", dismiss);
    $("guide-toggle").addEventListener("click", () => {
      if (tour.status === "active") dismiss();
      else { tour = { status: "active", phase: "shop", handledRunId: window.Fieldwork.currentRun?.id }; save(); renderTour(); }
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && tour.status === "active" && !document.querySelector("dialog[open]")) dismiss();
    });
    document.addEventListener("fieldwork:cart", event => { cartCount = event.detail.cart.count; queueRender(); });
    document.addEventListener("fieldwork:settings", queueRender);
    document.addEventListener("fieldwork:content", queueRender);
    document.addEventListener("fieldwork:run", queueRender);
    document.addEventListener("click", queueRender);
    document.addEventListener("input", queueRender);
    new MutationObserver(queueRender).observe($("lab-settings"), { attributes: true, attributeFilter: ["hidden"] });
    new MutationObserver(queueRender).observe($("catch-popup"), { attributes: true, attributeFilter: ["hidden"] });
    document.querySelectorAll("dialog").forEach(dialog => {
      new MutationObserver(queueRender).observe(dialog, { attributes: true, attributeFilter: ["open"] });
    });
    matchMedia("(max-width: 850px)").addEventListener("change", queueRender);
    new ResizeObserver(queuePosition).observe(coach);
    window.addEventListener("scroll", queuePosition, true);
    window.addEventListener("resize", queuePosition);
    window.visualViewport?.addEventListener("resize", queuePosition);
    renderTour();
  }
})();
