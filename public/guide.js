(() => {
  const coach = document.getElementById("guide-coach");
  if (!coach) return;
  const $ = id => document.getElementById(id);
  const { store } = window.Fieldwork;
  let dismissed = false, added = false, cart = null;
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
    $("direct-tools").hidden = !(state?.bugs.BUG_NO_LIMIT && path === "/offers");
    if (dismissed) return;
    let step = 1, title = "Find something you like.", copy = "Browse a product, choose a quantity, and build your own cart. We’ll guide you as you go.", label = "View an item";
    action = () => document.querySelector('.product-card .add-button')?.click();
    if (path === "/products" && !document.querySelector(".product-card")) {
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
    $("guide-step").textContent = "SHOPPING GUIDE · " + step + " OF 5";
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
    dismissed = !dismissed;
    store("fieldwork-guide-dismissed", dismissed ? "1" : "0");
    render();
  });
  document.addEventListener("fieldwork:settings", render);
  document.addEventListener("fieldwork:content", render);
  document.addEventListener("fieldwork:cart", event => { cart = event.detail.cart; added ||= event.detail.added; render(); });
  render();
})();
