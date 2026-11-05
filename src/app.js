import express from "express";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { projectRoot, readBugFlags } from "./config.js";
import { balanceCents, openDatabase, seedDatabase } from "./database.js";
import { findSession, login, logout, signup } from "./auth.js";
import { listCustomers, ORDER_STATUSES, saveProduct, updateOrderStatus } from "./admin.js";
import { getOrder, getProduct, listOffers, listOrders, listProducts, placeOrder, quoteOrder, ShopError } from "./shop.js";
import { addCartItem, cartRequestItems, getCart, removeCartItem, updateCartItem } from "./cart.js";
import * as view from "./views.js";

export function createApp({ databasePath, now = () => new Date(), bugs = readBugFlags({}), includeSampleOrder = false, labControls = false, trustProxy = false }) {
  const db = openDatabase(databasePath);
  seedDatabase(db, { includeSampleOrder });
  const app = express();
  let storeRevision = 0;
  app.disable("x-powered-by");
  app.set("trust proxy", trustProxy ? 1 : false);
  app.use(express.urlencoded({ extended: false, limit: "16kb" }));
  app.use(express.json({ limit: "16kb" }));
  app.use(express.static(join(projectRoot, "public"), { index: false }));

  app.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Referrer-Policy", "same-origin");
    res.set("X-Frame-Options", "SAMEORIGIN");
    // Strict CSP: all scripts/styles are same-origin files (no inline script); fonts come
    // from Google Fonts; one inline style attribute needs 'unsafe-inline' for styles only.
    res.set("Content-Security-Policy",
      "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; " +
      "img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self'; connect-src 'self'");
    // Normal browser forms are same-origin; reject cross-origin mutations.
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const origin = req.get("origin");
      if (origin && origin !== req.protocol + "://" + req.get("host")) {
        return res.status(403).json({ error: "Cross-origin request rejected." });
      }
    }
    const management = /^\/(?:admin(?:\/|$)|api\/admin(?:\/|$))/i.test(req.path);
    req.user = (management ? findSession(db, req.get("cookie"), now(), { role: "admin" }) : null)
      || findSession(db, req.get("cookie"), now());
    const cookie = String(req.get("cookie") || "").split(";").map(part => part.trim()).find(part => part.startsWith("fieldwork_cart="));
    const value = cookie?.slice("fieldwork_cart=".length);
    req.cartKey = /^[a-f0-9]{32}$/.test(value || "") ? value : randomBytes(16).toString("hex");
    if (req.cartKey !== value) res.cookie("fieldwork_cart", req.cartKey, { httpOnly: true, sameSite: "lax", secure: req.secure, path: "/", maxAge: 8 * 60 * 60 * 1000 });
    next();
  });

  const isApi = req => req.path.startsWith("/api/");
  const page = (req, res, title, active, body, status = 200) => res.status(status).send(view.shell({
    title, active, user: req.user, balance: req.user?.role === "customer" ? balanceCents(db, req.user.id) : null, now: now(), body, bugs, labControls, revision: storeRevision,
    cart: req.user?.role === "admin" ? { count: 0 } : getCart(db, req.cartKey)
  }));
  const authenticated = (req, res, next) => {
    if (req.user) return next();
    if (isApi(req)) return res.status(401).json({ error: "Sign in to continue." });
    if (/^\/admin(?:\/|$)/i.test(req.path)) {
      const destination = adminNextPage(req.originalUrl);
      return res.redirect("/admin/login" + (destination === "/admin" ? "" : "?next=" + encodeURIComponent(destination)));
    }
    return res.redirect("/login" + (req.path === "/checkout" ? "?next=/checkout" : ""));
  };
  const administrator = (req, res, next) => {
    if (req.user.role === "admin") return next();
    throw new ShopError("This page is for administrators.", 403);
  };
  app.use((req, res, next) => {
    if (req.user?.role !== "admin") return next();
    const shopPage = /^\/(?:products(?:\/|$)|offers\/?$|cart(?:\/|$)|checkout(?:\/|$)|orders\/?$)/i.test(req.path);
    const shopApi = /^\/api\/(?:cart(?:\/|$)|checkout\/?$|offers\/?$|orders\/?$)/i.test(req.path);
    if (shopPage && ["GET", "HEAD"].includes(req.method)) return res.redirect("/admin");
    if (shopPage || shopApi) throw new ShopError("Shopping is for customer accounts. Use a customer account to buy products.", 403);
    next();
  });

  app.get("/health", (req, res) => res.json({ status: "ok", application: "release-verification-lab" }));
  app.get("/api/store/state", (req, res) => res.json({ revision: storeRevision }));
  app.get("/", (req, res) => req.user?.role === "admin" ? res.redirect("/admin") : res.send(view.landingPage(req.user)));
  const nextPage = value => ["/checkout", "/cart", "/products"].includes(value) ? value : "/products";
  const adminNextPage = value => {
    if (typeof value !== "string" || value.length > 2048) return "/admin";
    try {
      const destination = new URL(value, "http://fieldwork.local");
      return destination.origin === "http://fieldwork.local" && /^\/admin(?:\/products|\/customers|\/orders(?:\/[1-9]\d*)?)?$/.test(destination.pathname)
        ? destination.pathname + destination.search : "/admin";
    } catch { return "/admin"; }
  };
  app.get("/login", (req, res) => req.user?.role === "customer" ? res.redirect(nextPage(req.query.next))
    : res.send(view.loginPage("", "", bugs, labControls, nextPage(req.query.next))));
  app.get("/admin/login", (req, res) => req.user?.role === "admin" ? res.redirect(adminNextPage(req.query.next))
    : res.send(view.adminLoginPage("", "", adminNextPage(req.query.next))));

  // In-memory per-(ip,email) sign-in throttle to blunt password guessing.
  const loginAttempts = new Map();
  const MAX_LOGIN_ATTEMPTS = 10, LOGIN_WINDOW_MS = 15 * 60 * 1000;
  const loginKey = req => (req.ip || "?") + "|" + String(req.body?.email ?? "").slice(0, 254).trim().toLowerCase();
  const guardLogin = key => {
    const entry = loginAttempts.get(key);
    if (entry && Date.now() - entry.first > LOGIN_WINDOW_MS) loginAttempts.delete(key);
    if ((loginAttempts.get(key)?.count ?? 0) >= MAX_LOGIN_ATTEMPTS) {
      throw new ShopError("Too many sign-in attempts. Please wait a few minutes and try again.", 429);
    }
  };
  const recordLoginFailure = key => {
    const entry = loginAttempts.get(key) ?? { count: 0, first: Date.now() };
    loginAttempts.set(key, { count: entry.count + 1, first: entry.first });
    if (loginAttempts.size > 1000) for (const [k, v] of loginAttempts) if (Date.now() - v.first > LOGIN_WINDOW_MS) loginAttempts.delete(k);
  };
  const signIn = (req, res, next) => {
    const key = loginKey(req);
    const adminLogin = /^\/admin\/login\/?$/i.test(req.path);
    try {
      guardLogin(key);
      const user = login(db, req.body?.email, req.body?.password, now(), res, adminLogin ? {} : bugs, {
        role: adminLogin ? "admin" : isApi(req) ? undefined : "customer"
      });
      loginAttempts.delete(key);
      return isApi(req) ? res.json({ user }) : res.redirect(303, adminLogin ? adminNextPage(req.body?.next) : nextPage(req.body?.next));
    } catch (error) {
      if (error instanceof ShopError && error.status === 401) recordLoginFailure(key);
      if (!isApi(req) && error instanceof ShopError) {
        const email = typeof req.body?.email === "string" ? req.body.email.slice(0, 254) : "";
        if (adminLogin) return res.status(error.status).send(view.adminLoginPage(
          error.status === 401 ? "Enter a valid administrator email and password." : error.message, email, adminNextPage(req.body?.next)
        ));
        return res.status(error.status).send(view.loginPage(error.message, email, bugs, labControls, nextPage(req.body?.next)));
      }
      next(error);
    }
  };
  app.post("/login", signIn);
  app.post("/admin/login", signIn);
  app.post("/api/auth/login", signIn);
  app.get("/signup", (req, res) => req.user?.role === "customer" ? res.redirect(nextPage(req.query.next))
    : res.send(view.loginPage("", "", bugs, labControls, nextPage(req.query.next), { signup: true })));
  app.post(["/signup", "/api/auth/signup"], (req, res, next) => {
    try {
      if (!isApi(req) && req.body?.password !== req.body?.password_confirmation) throw new ShopError("Passwords do not match. Enter them again.");
      const user = signup(db, req.body, now(), res);
      storeRevision++;
      return isApi(req) ? res.status(201).json({ user, balance_cents: balanceCents(db, user.id) }) : res.redirect(303, nextPage(req.body?.next));
    } catch (error) {
      if (!isApi(req) && error instanceof ShopError) {
        const email = typeof req.body?.email === "string" ? req.body.email.slice(0, 254) : "";
        const name = typeof req.body?.name === "string" ? req.body.name.slice(0, 80) : "";
        return res.status(error.status).send(view.loginPage(error.message, email, bugs, labControls, nextPage(req.body?.next), { signup: true, name }));
      }
      next(error);
    }
  });
  const signOut = (req, res) => {
    const admin = /^\/admin\/logout\/?$/i.test(req.path) || req.user?.role === "admin";
    const destination = admin ? "/admin/login" : "/login";
    logout(db, req.get("cookie"), res, isApi(req) ? {} : { role: admin ? "admin" : "customer" });
    return isApi(req) ? res.status(204).end() : res.redirect(303, destination);
  };
  app.post("/logout", signOut);
  app.post("/admin/logout", signOut);
  app.post("/api/auth/logout", signOut);
  app.get("/api/auth/me", authenticated, (req, res) => {
    res.json({ user: req.user, ...(req.user.role === "customer" ? { balance_cents: balanceCents(db, req.user.id) } : {}) });
  });

  app.get("/products", (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q.slice(0, 100) : "";
    const category = typeof req.query.category === "string" ? req.query.category : "";
    const products = listProducts(db, query).filter(product => !category || product.category === category);
    return page(req, res, "Products", "products", view.productsPage(products, query, category));
  });
  app.get("/products/:id", (req, res) => {
    const product = getProduct(db, req.params.id);
    return page(req, res, product.name, "products", view.productPage(product, listProducts(db).filter(item => item.id !== product.id)));
  });
  app.get("/api/products", authenticated, (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q.slice(0, 100) : "";
    res.json({ products: listProducts(db, query) });
  });
  app.get("/offers", (req, res) => page(
    req, res, "Offers", "offers", view.offersPage(listOffers(db, req.user?.id ?? 0, now(), { bugs }))
  ));
  app.get("/api/offers", authenticated, (req, res) => {
    res.json({ offers: listOffers(db, req.user.id, now(), { bugs }), now: now().toISOString(), timezone: "UTC" });
  });
  app.get("/checkout", authenticated, (req, res) => {
    const items = cartRequestItems(getCart(db, req.cartKey));
    const quote = items.length ? quoteOrder(db, req.user.id, items, now(), { bugs }) : null;
    return page(req, res, "Checkout", "checkout", view.checkoutPage(quote));
  });
  app.get("/cart", (req, res) => page(req, res, "Cart", "cart", view.cartPage(getCart(db, req.cartKey))));
  app.get("/api/cart", (req, res) => res.json({ cart: getCart(db, req.cartKey) }));
  const cartAction = action => (req, res) => {
    const cart = action(req);
    return isApi(req) ? res.json({ cart }) : res.redirect(303, "/cart");
  };
  const addItem = cartAction(req => addCartItem(db, req.cartKey, req.body, req.user?.id ?? 0, now(), bugs));
  const changeItem = cartAction(req => updateCartItem(db, req.cartKey, req.params.id, req.body?.quantity, req.user?.id ?? 0, now(), bugs));
  const removeItem = cartAction(req => removeCartItem(db, req.cartKey, req.params.id));
  app.post(["/cart/items", "/api/cart/items"], addItem);
  app.post(["/cart/items/:id", "/api/cart/items/:id"], changeItem);
  app.post("/cart/remove/:id", removeItem);
  app.delete("/api/cart/items/:id", removeItem);
  const requestItems = req => {
    if (req.body?.items !== undefined) {
      if (isApi(req)) return req.body.items;
      try { return JSON.parse(req.body.items); }
      catch { throw new ShopError("Order items are invalid."); }
    }
    return [{ product_id: req.body?.product_id, offer_id: req.body?.offer_id, quantity: req.body?.quantity ?? 1 }];
  };
  app.get("/api/checkout", authenticated, (req, res) => {
    res.json({ quote: quoteOrder(db, req.user.id, [{
      product_id: req.query.product_id, offer_id: req.query.offer_id, quantity: req.query.quantity ?? 1
    }], now(), { bugs }) });
  });
  app.post("/api/checkout", authenticated, (req, res) => {
    res.json({ quote: quoteOrder(db, req.user.id, requestItems(req), now(), { bugs }) });
  });
  const checkout = (req, res, next) => {
    try {
      const order = placeOrder(db, req.user.id, requestItems(req), now(), bugs);
      storeRevision++;
      return isApi(req) ? res.status(201).json({ order }) : res.redirect(303, "/orders/" + order.id);
    } catch (error) {
      next(error);
    }
  };
  const checkoutCart = (req, res) => {
    const items = cartRequestItems(getCart(db, req.cartKey));
    const order = placeOrder(db, req.user.id, items, now(), bugs, req.cartKey);
    storeRevision++;
    return isApi(req) ? res.status(201).json({ order }) : res.redirect(303, "/orders/" + order.id);
  };
  app.post(["/checkout", "/api/cart/checkout"], authenticated, checkoutCart);
  app.post("/api/orders", authenticated, checkout);
  app.get("/orders", authenticated, (req, res) => page(
    req, res, "Orders", "orders", view.ordersPage(listOrders(db, req.user))
  ));
  app.get("/api/orders", authenticated, (req, res) => res.json({ orders: listOrders(db, req.user) }));
  app.get("/orders/:id", authenticated, (req, res) => req.user.role === "admin"
    ? res.redirect("/admin/orders/" + encodeURIComponent(req.params.id))
    : page(req, res, "Orders", "orders", view.receiptPage(getOrder(db, req.user, req.params.id), bugs)));
  app.get("/admin/orders/:id", authenticated, administrator, (req, res) => page(
    req, res, "Order review", "orders", view.receiptPage(getOrder(db, req.user, req.params.id), bugs, {
      admin: true, customer: db.prepare("SELECT name,email FROM users WHERE id=(SELECT user_id FROM orders WHERE id=?)").get(req.params.id)
    })
  ));
  app.get("/api/orders/:id", authenticated, (req, res) => {
    res.json({ order: getOrder(db, req.user, req.params.id) });
  });
  const adminData = req => {
    const stats = {
      products: db.prepare("SELECT COUNT(*) AS count FROM products").get().count,
      users: db.prepare("SELECT COUNT(*) AS count FROM users").get().count,
      orders: db.prepare("SELECT COUNT(*) AS count FROM orders").get().count,
      sales_cents: db.prepare("SELECT COALESCE(-SUM(amount_cents), 0) AS total FROM ledger").get().total
    };
    return { stats, orders: listOrders(db, req.user, { all: true }), products: listProducts(db, "", { includeInactive: true }), customers: listCustomers(db) };
  };
  const orderFilters = (status = "", customer = "") => {
    if (typeof status !== "string" || (status && !ORDER_STATUSES.includes(status))) throw new ShopError("Choose a valid order status. Clear filters to see all orders.");
    if (typeof customer !== "string" || (customer && !/^[1-9]\d{0,9}$/.test(customer))) throw new ShopError("Choose a valid customer. Clear filters to see all orders.");
    if (customer && !db.prepare("SELECT id FROM users WHERE id=? AND role='customer'").get(Number(customer))) throw new ShopError("Customer not found. Clear filters to see all orders.", 404);
    return { status, customer };
  };
  const renderAdmin = (req, res, section = "overview", options = {}, status = 200) => {
    const sections = {
      overview: ["Overview", "admin", view.adminPage], products: ["Products", "products", view.adminProductsPage],
      orders: ["Orders", "orders", view.adminOrdersPage], customers: ["Customers", "customers", view.adminCustomersPage]
    };
    const [title, active, render] = sections[section];
    return page(req, res, title, active, render(adminData(req), { ...options, buyerWindow: labControls }), status);
  };
  app.get("/admin", authenticated, administrator, (req, res) => renderAdmin(req, res));
  app.get("/admin/products", authenticated, administrator, (req, res) => renderAdmin(req, res, "products", {
    message: req.query.saved === "product" ? "Product saved. Future purchases use these settings. Existing receipts keep their original prices." : ""
  }));
  app.get("/admin/orders", authenticated, administrator, (req, res) => renderAdmin(req, res, "orders", {
    filters: orderFilters(req.query.status, req.query.customer),
    message: req.query.saved === "order" ? "Order status updated. The customer can see it in their order history." : ""
  }));
  app.get("/admin/customers", authenticated, administrator, (req, res) => renderAdmin(req, res, "customers"));
  app.get("/api/admin", authenticated, administrator, (req, res) => res.json(adminData(req)));
  const productAction = (req, res, next) => {
    try {
      let input = req.body;
      if (!isApi(req)) {
        const price = String(req.body?.price || "");
        const [whole, fraction = ""] = price.split(".");
        input = { ...req.body, active: req.body?.active === "1", price_cents: /^\d{1,4}(\.\d{1,2})?$/.test(price)
          ? Number(whole) * 100 + Number(fraction.padEnd(2, "0")) : NaN };
      }
      const product = saveProduct(db, input, req.params.id ?? null);
      storeRevision++;
      return isApi(req) ? res.status(req.params.id ? 200 : 201).json({ product, html: view.adminProductEntry(product), revision: storeRevision }) : res.redirect(303, "/admin/products?saved=product");
    } catch (error) {
      if (!isApi(req) && error instanceof ShopError) return renderAdmin(req, res, "products", {
        error: error.message, draft: req.body, editingId: req.params.id ?? "new"
      }, error.status);
      next(error);
    }
  };
  app.post(["/admin/products", "/api/admin/products", "/admin/products/:id", "/api/admin/products/:id"], authenticated, administrator, productAction);
  app.patch("/api/admin/products/:id", authenticated, administrator, productAction);
  const orderAction = (req, res, next) => {
    try {
      const filters = isApi(req) ? {} : orderFilters(req.body?.filter_status, req.body?.filter_customer);
      const order = updateOrderStatus(db, req.params.id, req.body?.status);
      storeRevision++;
      return isApi(req) ? res.json({ order }) : res.redirect(303, "/admin/orders?" + new URLSearchParams({ saved: "order", ...filters }));
    } catch (error) {
      if (!isApi(req) && error instanceof ShopError) return renderAdmin(req, res, "orders", { error: error.message }, error.status);
      next(error);
    }
  };
  app.post(["/admin/orders/:id/status", "/api/admin/orders/:id/status"], authenticated, administrator, orderAction);
  app.patch("/api/admin/orders/:id/status", authenticated, administrator, orderAction);

  app.use((req, res, next) => next(new ShopError("Page not found.", 404)));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const clientError = Number.isInteger(error.status) && error.status >= 400 && error.status < 500;
    const status = error instanceof ShopError ? error.status : clientError ? error.status : 500;
    const message = error instanceof ShopError ? error.message
      : status === 413 ? "Request body is too large."
      : clientError ? "Invalid request body."
      : "Something went wrong. Please try again.";
    if (status === 500) console.error(error);
    if (isApi(req)) return res.status(status).json({ error: message });
    if (!req.cartKey) return res.status(status).send(view.loginPage(message, "", bugs, labControls));
    return page(req, res, "Something went wrong", "", view.errorPage(status, message, { admin: req.user?.role === "admin" }), status);
  });

  return { app, db, touchStore: () => { storeRevision++; }, close: () => db.close() };
}
