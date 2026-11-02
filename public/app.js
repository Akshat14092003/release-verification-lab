(() => {
  let toastTimer;
  const addedTimers = new WeakMap();
  function toast(text, error = false) {
    const box = document.getElementById("cart-toast");
    if (!box) return;
    clearTimeout(toastTimer);
    document.getElementById("cart-toast-text").textContent = text;
    box.classList.toggle("is-error", error);
    box.querySelector(".toast-check").textContent = error ? "!" : "✓";
    box.hidden = false;
    toastTimer = setTimeout(() => { box.hidden = true; }, 3800);
  }
  function syncCart(cart, added = false) {
    document.querySelectorAll("[data-cart-count]").forEach(badge => {
      badge.textContent = cart.count;
      if (added) { badge.classList.remove("cart-pop"); void badge.offsetWidth; badge.classList.add("cart-pop"); }
    });
    document.dispatchEvent(new CustomEvent("fieldwork:cart", { detail: { cart, added } }));
  }
  async function refresh() {
    const response = await fetch(location.href, { cache: "no-store" });
    if (new URL(response.url).pathname !== location.pathname) { location.assign(response.url); return; }
    const parsed = new DOMParser().parseFromString(await response.text(), "text/html");
    const next = parsed.getElementById("main-content");
    const current = document.getElementById("main-content");
    if (next && current) { current.replaceChildren(...next.childNodes); document.dispatchEvent(new Event("fieldwork:content")); }
  }
  window.Fieldwork = { toast, syncCart, refresh };
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
  function closeMobileMenu() {
    if (mobileMenu?.open) mobileMenu.close();
  }
  function syncMobileNavigation() {
    if (!mobileMenu || !sidebar) return;
    closeMobileMenu();
    if (mobileViewport.matches) {
      mobileMenu.append(sidebar);
      mobileParts.slice(1).forEach(({ element }) => sidebar.insertBefore(element, sidebar.querySelector(".sidebar-footer")));
    } else mobileParts.forEach(({ element, placeholder }) => placeholder.after(element));
  }
  mobileMenu?.addEventListener("close", () => {
    mobileToggle.setAttribute("aria-expanded", "false");
    document.documentElement.classList.remove("mobile-menu-open");
    if (mobileViewport.matches && !document.querySelector("dialog[open]")) mobileToggle.focus();
  });
  mobileMenu?.addEventListener("click", event => {
    if (event.target === mobileMenu) {
      const bounds = mobileMenu.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeMobileMenu();
    }
  });
  mobileViewport.addEventListener("change", syncMobileNavigation);
  syncMobileNavigation();
  updateSidebar();
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") document.querySelectorAll(".profile-menu[open]").forEach(menu => {
      event.preventDefault();
      menu.open = false;
      menu.querySelector("summary").focus();
    });
  });
  document.addEventListener("click", event => {
    if (event.target.closest("[data-mobile-menu]")) {
      mobileMenu.showModal();
      mobileToggle.setAttribute("aria-expanded", "true");
      document.documentElement.classList.add("mobile-menu-open");
      mobileMenu.querySelector("[data-mobile-close]").focus();
    }
    if (event.target.closest("[data-mobile-close]") ||
        (mobileMenu?.open && event.target.closest("a[href],#open-tests,#guide-toggle"))) closeMobileMenu();
    document.querySelectorAll(".profile-menu[open]").forEach(menu => {
      if (!menu.contains(event.target)) menu.open = false;
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
    if (form.hasAttribute("data-cart-form")) {
      event.preventDefault();
      if (!form.reportValidity()) return;
      clearTimeout(addedTimers.get(form));
      form.classList.remove("just-added");
      const submitLabel = form.querySelector('button[type="submit"] span');
      if (submitLabel) {
        submitLabel.dataset.cartLabel ||= submitLabel.textContent;
        submitLabel.textContent = submitLabel.dataset.cartLabel;
      }
      const data = Object.fromEntries(new FormData(form));
      const states = [...form.querySelectorAll("button, input")].map(element => [element, element.disabled]);
      states.forEach(([element]) => { element.disabled = true; });
      form.classList.add("is-pending");
      try {
        const response = await fetch(form.dataset.cartApi, { method: form.dataset.cartMethod || "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not update your cart.");
        const added = !form.hasAttribute("data-cart-reload");
        syncCart(result.cart, added);
        const name = result.cart.items.find(line => String(line.product.id) === data.product_id)?.product.name;
        const text = added ? (name || "Item") + " added to your cart" : "Your cart is updated";
        if (form.hasAttribute("data-cart-reload")) {
          try { sessionStorage.setItem("cart-message", text); } catch { /* No storage required. */ }
          location.reload();
        } else {
          toast(text);
          form.classList.add("just-added");
          if (submitLabel) submitLabel.textContent = "Added";
          addedTimers.set(form, setTimeout(() => {
            form.classList.remove("just-added");
            if (submitLabel) submitLabel.textContent = submitLabel.dataset.cartLabel;
          }, 1600));
        }
      } catch (error) { toast(error.message, true); }
      finally {
        form.classList.remove("is-pending");
        states.forEach(([element, disabled]) => { element.disabled = disabled; });
      }
      return;
    }
    if (form.id === "lab-settings") return;
    if (form.method.toLowerCase() === "post") {
      const button = form.querySelector('button[type="submit"]');
      if (button) { button.disabled = true; button.setAttribute("aria-busy", "true"); }
    }
  });
  fetch("/api/cart", { cache: "no-store" }).then(r => r.json()).then(data => syncCart(data.cart)).catch(() => {});
  try { const text = sessionStorage.getItem("cart-message"); if (text) { sessionStorage.removeItem("cart-message"); toast(text); } } catch { /* Optional toast. */ }
})();
