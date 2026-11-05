(() => {
  const motion = window.FieldworkMotion;
  const toastBox = document.getElementById("cart-toast");
  let toastTimer, toastDeadline = 0, toastRemaining = 3800;
  const addedTimers = new WeakMap();
  const money = cents => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  function holdToast() {
    if (toastDeadline) toastRemaining = Math.max(0, toastDeadline - performance.now());
    clearTimeout(toastTimer); toastDeadline = 0;
  }
  function dismissToast() {
    holdToast();
    if (toastBox && !toastBox.hidden) motion.exit(toastBox, () => { toastBox.hidden = true; }, "toast");
  }
  function resumeToast() {
    if (!toastBox || toastBox.hidden || document.hidden || toastBox.matches(":hover,:focus-within")) return;
    clearTimeout(toastTimer); toastDeadline = performance.now() + toastRemaining;
    toastTimer = setTimeout(dismissToast, toastRemaining);
  }
  toastBox?.addEventListener("pointerenter", holdToast);
  toastBox?.addEventListener("pointerleave", resumeToast);
  toastBox?.addEventListener("focusin", holdToast);
  toastBox?.addEventListener("focusout", () => queueMicrotask(resumeToast));
  document.getElementById("dismiss-cart-toast")?.addEventListener("click", dismissToast);
  document.addEventListener("visibilitychange", () => document.hidden ? holdToast() : resumeToast());
  function toast(text, error = false) {
    const box = toastBox;
    if (!box) return;
    clearTimeout(toastTimer);
    const wasHidden = box.hidden;
    motion.cancel(box);
    document.getElementById("cart-toast-text").textContent = text;
    box.classList.toggle("is-error", error);
    box.querySelector(".toast-check").textContent = error ? "!" : "✓";
    box.hidden = false;
    if (wasHidden) motion.enter(box, "toast");
    toastRemaining = 3800; toastDeadline = 0; resumeToast();
  }
  function syncCart(cart, added = false) {
    document.querySelectorAll("[data-cart-count]").forEach(badge => {
      badge.textContent = cart.count;
      if (added) { badge.classList.remove("cart-pop"); void badge.offsetWidth; badge.classList.add("cart-pop"); }
    });
    document.dispatchEvent(new CustomEvent("fieldwork:cart", { detail: { cart, added } }));
  }
  function canRefreshStore() {
    const main = document.getElementById("main-content");
    return main && !document.querySelector("dialog[open]") && !main.querySelector('[data-admin-dirty],[data-store-dirty],.admin-product[open],[aria-busy="true"],.is-pending')
      && !(main.contains(document.activeElement) && document.activeElement.matches("input,textarea,select"));
  }
  async function refresh({ background = false } = {}) {
    if (background && !canRefreshStore()) return false;
    const response = await fetch(location.href, { cache: "no-store" });
    if (new URL(response.url).pathname !== location.pathname) { location.assign(response.url); return; }
    const parsed = new DOMParser().parseFromString(await response.text(), "text/html");
    const next = parsed.getElementById("main-content");
    const current = document.getElementById("main-content");
    if (background && !canRefreshStore()) return false;
    if (next && current) {
      const quantities = [...current.querySelectorAll('input[id][name="quantity"]')].filter(input => input.value !== input.defaultValue).map(input => [input.id, input.value]);
      current.replaceChildren(...next.childNodes);
      for (const [id, value] of quantities) {
        const input = document.getElementById(id);
        if (input) input.value = value;
      }
      current.dataset.storeRevision = next.dataset.storeRevision;
      document.dispatchEvent(new Event("fieldwork:content"));
      return true;
    }
    return false;
  }
  window.Fieldwork = { toast, syncCart, refresh };
  async function updateCartPage(cart) {
    const rows = document.querySelectorAll("[data-cart-line]");
    if (!rows.length) return;
    if (!cart.items.length) {
      await refresh(); document.getElementById("main-content").focus({ preventScroll: true }); return;
    }
    rows.forEach(row => {
      const line = cart.items.find(item => String(item.product.id) === row.dataset.cartLine);
      if (!line) { row.remove(); return; }
      row.querySelector(".cart-line-total").textContent = money(line.total_cents);
      const input = row.querySelector('[name="quantity"]');
      input.value = input.defaultValue = line.quantity;
      row.querySelector('[data-quantity-step="-1"]').disabled = line.quantity <= 1;
      row.querySelector('[data-quantity-step="1"]').disabled = Boolean(line.offer) || line.quantity >= 99;
    });
    document.querySelectorAll('[data-testid="cart-total"],[data-cart-subtotal]').forEach(el => { el.textContent = money(cart.total_cents); });
    const copy = document.querySelector(".page-heading .muted");
    if (copy) copy.textContent = cart.count + (cart.count === 1 ? " item" : " items") + " picked. Ready when you are.";
  }
  async function saveAdminProduct(form) {
    if (!form.reportValidity() || form.getAttribute("aria-busy") === "true") return;
    const data = Object.fromEntries(new FormData(form)), id = form.dataset.adminProduct;
    const button = form.querySelector('button[type="submit"]'), feedback = form.querySelector("[data-admin-feedback]");
    const fields = [...form.querySelectorAll("input,select,textarea,button")].map(el => [el, el.disabled]);
    const focused = document.activeElement;
    const label = id === "new" ? "Add product" : "Save product";
    button.textContent = "Saving…"; form.setAttribute("aria-busy", "true");
    fields.forEach(([el]) => { el.disabled = true; }); feedback.hidden = true;
    try {
      const [whole, fraction = ""] = data.price.split(".");
      const response = await fetch("/api/admin/products" + (id === "new" ? "" : "/" + id), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, active: data.active === "1", price_cents: Number(whole) * 100 + Number(fraction.padEnd(2, "0")) })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Product could not be saved. Try again.");
      const product = result.product;
      if (Number.isSafeInteger(result.revision)) document.getElementById("main-content").dataset.storeRevision = result.revision;
      delete form.dataset.adminDirty;
      if (id === "new") {
        document.getElementById("manage-products").insertAdjacentHTML("beforeend", result.html);
        form.reset();
        const count = document.querySelectorAll("[data-admin-product-id]").length;
        document.querySelector("#manage-products .panel-heading .pill").textContent = count + " products";
        const tile = [...document.querySelectorAll(".bento-tile")].find(el => el.querySelector(".bento-label")?.textContent === "Products");
        if (tile) tile.querySelector(".bento-figure").textContent = count;
      } else {
        const detail = form.closest("details"); detail.open = true;
        detail.querySelector("[data-product-name]").textContent = product.name;
        detail.querySelector("[data-product-summary]").textContent = money(product.price_cents) + " · " + (product.active ? "For sale" : "Hidden");
      }
      button.textContent = "Saved ✓"; feedback.setAttribute("role", "status");
      feedback.textContent = id === "new" ? product.name + " added. You can add another product." : "Saved. Catalogue settings are up to date.";
      document.dispatchEvent(new Event("fieldwork:content"));
    } catch (error) {
      button.textContent = label; feedback.setAttribute("role", "alert"); feedback.textContent = error.message;
    } finally {
      feedback.hidden = false; form.removeAttribute("aria-busy");
      fields.forEach(([el, disabled]) => { el.disabled = disabled; });
      if (focused?.isConnected && document.activeElement === document.body) focused.focus({ preventScroll: true });
    }
  }
  document.addEventListener("input", event => {
    const pending = event.target.closest(".admin-filters,.search-box,.order-status-form");
    if (pending) pending.dataset.storeDirty = "true";
    const form = event.target.closest("[data-admin-product]");
    if (form) form.dataset.adminDirty = "true";
    if (!form || form.getAttribute("aria-busy") === "true") return;
    form.querySelector("[data-admin-feedback]").hidden = true;
    form.querySelector('button[type="submit"]').textContent = form.dataset.adminProduct === "new" ? "Add product" : "Save product";
  });
  function updateSidebar() {
    const collapsed = document.documentElement.dataset.sidebar === "collapsed";
    document.querySelectorAll("[data-sidebar-toggle]").forEach(button => {
      button.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
      button.setAttribute("aria-expanded", String(!collapsed));
    });
  }
  const mobileMenu = document.getElementById("mobile-navigation");
  const mobileToggle = document.querySelector("[data-mobile-menu]");
  const mobileViewport = window.matchMedia("(max-width: 850px)");
  const sidebar = document.querySelector(".app-shell>.sidebar");
  const mobileParts = sidebar ? [sidebar, document.querySelector(".account-bar"), document.querySelector(".shop-lab"),
    document.getElementById("lab-settings"), document.getElementById("lab-message")].filter(Boolean).map(element => {
    const placeholder = document.createComment("Desktop navigation position");
    element.before(placeholder);
    return { element, placeholder };
  }) : [];
  function closeMobileMenu(immediate = false) {
    if (mobileMenu?.open) motion.exit(mobileMenu, () => mobileMenu.close(), "drawer", immediate);
  }
  function syncMobileNavigation() {
    if (!mobileMenu || !sidebar) return;
    closeMobileMenu(true);
    if (mobileViewport.matches) {
      mobileMenu.append(sidebar);
      mobileParts.slice(1).forEach(({ element }) => sidebar.insertBefore(element, sidebar.querySelector(".sidebar-footer")));
    } else {
      mobileParts.forEach(({ element, placeholder }) => placeholder.after(element));
    }
  }
  mobileMenu?.addEventListener("close", () => {
    mobileToggle.setAttribute("aria-expanded", "false");
    document.documentElement.classList.remove("mobile-menu-open");
    if (mobileViewport.matches && !document.querySelector("dialog[open]")) mobileToggle.focus();
  });
  mobileMenu?.addEventListener("cancel", event => { event.preventDefault(); closeMobileMenu(true); });
  mobileMenu?.addEventListener("click", event => {
    if (event.target === mobileMenu) {
      const bounds = mobileMenu.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeMobileMenu();
    }
  });
  mobileViewport.addEventListener("change", syncMobileNavigation);
  syncMobileNavigation();
  updateSidebar();
  function closeProfile(menu, immediate = false) {
    menu.dataset.closing = "true";
    motion.exit(menu.querySelector(".profile-panel"), () => { menu.open = false; delete menu.dataset.closing; }, "popover", immediate);
  }
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") document.querySelectorAll(".profile-menu[open]").forEach(menu => {
      event.preventDefault();
      closeProfile(menu, true);
      menu.querySelector("summary").focus();
    });
  });
  document.addEventListener("click", event => {
    if (event.target.closest("[data-open-playground]")) {
      if (mobileViewport.matches) mobileToggle?.click();
      const playground = document.getElementById("toggle-playground");
      if (playground?.getAttribute("aria-expanded") === "false") playground.click();
      playground?.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      playground?.focus({ preventScroll: true });
    }
    if (event.target.closest("[data-mobile-menu]")) {
      mobileMenu.showModal();
      motion.enter(mobileMenu, "drawer");
      mobileToggle.setAttribute("aria-expanded", "true");
      document.documentElement.classList.add("mobile-menu-open");
      mobileMenu.querySelector("[data-mobile-close]").focus();
    }
    if (event.target.closest("[data-mobile-close]")) closeMobileMenu();
    else if (mobileMenu?.open && event.target.closest("a[href],#open-tests,#guide-toggle")) closeMobileMenu(true);
    const profileTrigger = event.target.closest(".profile-menu>summary");
    if (profileTrigger) {
      event.preventDefault();
      const menu = profileTrigger.parentElement;
      if (menu.open && !menu.dataset.closing) closeProfile(menu);
      else { delete menu.dataset.closing; menu.open = true; motion.enter(menu.querySelector(".profile-panel"), "popover", profileTrigger); }
    }
    document.querySelectorAll(".profile-menu[open]").forEach(menu => {
      if (!menu.contains(event.target)) closeProfile(menu);
    });
    const role = event.target.closest("[data-demo-role]");
    if (role) {
      const email = document.getElementById("email"), password = document.getElementById("password");
      if (email && password) {
        email.value = role.dataset.demoRole + "@example.test";
        password.value = "DemoShop!2026";
        document.querySelectorAll("[data-demo-role]").forEach(choice => choice.classList.toggle("selected", choice === role));
        document.querySelector('.login-form button[type="submit"]')?.focus();
      }
    }
    if (event.target.closest("[data-sidebar-toggle]")) {
      const state = document.documentElement.dataset.sidebar === "collapsed" ? "expanded" : "collapsed";
      document.documentElement.dataset.sidebar = state;
      try { localStorage.setItem("fieldwork-sidebar", state); } catch { /* Optional persistence. */ }
      updateSidebar();
    }
    const step = event.target.closest("[data-quantity-step]");
    if (step) {
      const form = step.closest("form"), input = form.querySelector('input[name="quantity"]');
      const next = Number(input.value) + Number(step.dataset.quantityStep);
      if (next >= Number(input.min || 1) && next <= Number(input.max || 99)) {
        input.value = next;
        if (step.hasAttribute("data-auto-submit")) form.requestSubmit();
      }
    }
  });
  document.addEventListener("submit", async event => {
    const form = event.target;
    if (form.hasAttribute("data-admin-product")) { event.preventDefault(); await saveAdminProduct(form); return; }
    if (form.hasAttribute("data-cart-form")) {
      event.preventDefault();
      if (form.classList.contains("is-pending")) return;
      if (!form.reportValidity()) return;
      clearTimeout(addedTimers.get(form));
      form.classList.remove("just-added");
      const submitLabel = form.querySelector('button[type="submit"] span');
      if (submitLabel) {
        submitLabel.dataset.cartLabel ||= submitLabel.textContent;
        submitLabel.textContent = submitLabel.dataset.cartLabel;
      }
      const data = Object.fromEntries(new FormData(form));
      const focused = document.activeElement;
      const updating = form.hasAttribute("data-cart-update");
      let updatedCart;
      const states = [...(updating ? document.querySelectorAll("[data-cart-line] button,[data-cart-line] input") : form.querySelectorAll("button, input"))].map(element => [element, element.disabled]);
      states.forEach(([element]) => { element.disabled = true; });
      form.classList.add("is-pending");
      try {
        const response = await fetch(form.dataset.cartApi, { method: form.dataset.cartMethod || "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not update your cart.");
        const added = !updating;
        syncCart(result.cart, added);
        const name = result.cart.items.find(line => String(line.product.id) === data.product_id)?.product.name;
        const text = added ? (name || "Item") + " added to your cart" : "Your cart is updated";
        if (updating) {
          updatedCart = result.cart;
          toast(text);
        } else {
          toast(text);
          form.classList.add("just-added");
          if (submitLabel) submitLabel.textContent = "Added";
          addedTimers.set(form, setTimeout(() => {
            form.classList.remove("just-added");
            if (submitLabel) submitLabel.textContent = submitLabel.dataset.cartLabel;
          }, 1600));
        }
      } catch (error) {
        if (updating) { const input = form.querySelector('[name="quantity"]'); if (input) input.value = input.defaultValue; }
        toast(error.message, true);
      }
      finally {
        form.classList.remove("is-pending");
        states.forEach(([element, disabled]) => { element.disabled = disabled; });
        if (updatedCart) {
          try { await updateCartPage(updatedCart); }
          catch { toast("Cart updated. Refresh the page to see the latest contents.", true); }
        }
        if (focused?.isConnected && document.activeElement === document.body) (focused.disabled ? form.querySelector('[name="quantity"]') : focused)?.focus({ preventScroll: true });
        else if (!focused?.isConnected && updatedCart?.items.length) document.querySelector('[data-cart-line] input[name="quantity"]')?.focus({ preventScroll: true });
      }
      return;
    }
    if (form.id === "lab-settings") return;
    if (form.method.toLowerCase() === "post") {
      const button = form.querySelector('button[type="submit"]');
      if (button) { button.disabled = true; button.setAttribute("aria-busy", "true"); }
    }
  });
  document.addEventListener("click", async event => {
    const button = event.target.closest("[data-buyer-window],[data-copy-buyer-link]");
    if (!button || button.disabled) return;
    const panel = button.closest(".admin-buyer-tools"), message = panel.querySelector("[data-buyer-link-message]"), input = panel.querySelector("[data-buyer-link]");
    const buyerWindow = button.hasAttribute("data-buyer-window") ? window.open("about:blank", "_blank") : null;
    if (buyerWindow) buyerWindow.opener = null;
    button.disabled = true; message.hidden = true; input.hidden = true;
    try {
      const response = await fetch("/api/lab/buyer-window", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not connect a buyer window. Try again.");
      const url = new URL(result.url, location.origin).href;
      input.value = url;
      if (buyerWindow) {
        buyerWindow.location.href = url;
        message.textContent = "Buyer window connected to this shop. Save a change to see it there.";
      } else {
        input.hidden = false;
        try { await navigator.clipboard.writeText(url); message.textContent = "Link copied. Open it in the other browser within five minutes; it works once."; }
        catch { input.focus(); input.select(); message.textContent = "Copy this link into the other browser within five minutes. It works once."; }
      }
      message.setAttribute("role", "status");
    } catch (error) {
      buyerWindow?.close(); message.textContent = error.message; message.setAttribute("role", "alert");
    } finally { button.disabled = false; message.hidden = false; }
  });
  if (!document.body.classList.contains("admin-body")) fetch("/api/cart", { cache: "no-store" }).then(r => r.json()).then(data => syncCart(data.cart)).catch(() => {});
  if (document.getElementById("main-content")?.hasAttribute("data-store-revision")) {
    let storeTimer, checkingStore = false;
    const checkStore = async () => {
      clearTimeout(storeTimer);
      if (checkingStore || document.hidden) return;
      checkingStore = true;
      try {
        const response = await fetch("/api/store/state", { cache: "no-store" });
        if (response.ok) {
          const state = await response.json();
          if (Number.isSafeInteger(state.revision) && state.revision !== Number(document.getElementById("main-content")?.dataset.storeRevision) && canRefreshStore()) {
            await refresh({ background: true });
          }
        }
      } catch { /* Retry when the connection returns; never interrupt an edit. */ }
      finally { checkingStore = false; if (!document.hidden) storeTimer = setTimeout(checkStore, 2000); }
    };
    storeTimer = setTimeout(checkStore, 2000);
    window.addEventListener("focus", checkStore);
    document.addEventListener("visibilitychange", () => document.hidden ? clearTimeout(storeTimer) : checkStore());
  }
  if (new URL(location.href).searchParams.get("connected") === "1") {
    toast("Buyer window connected. Admin changes appear here automatically.");
    const url = new URL(location.href); url.searchParams.delete("connected"); history.replaceState(null, "", url);
  }
  try { const text = sessionStorage.getItem("cart-message"); if (text) { sessionStorage.removeItem("cart-message"); toast(text); } } catch { /* Optional toast. */ }
})();
