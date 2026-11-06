import express from "express";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { projectRoot, readBugFlags } from "./config.js";
import { balanceCents, openDatabase, seedDatabase } from "./database.js";
import { findSession, login, logout } from "./auth.js";
import { getOrder, getProduct, listOffers, listOrders, listProducts, placeOrder, quoteOrder, ShopError } from "./shop.js";
import { addCartItem, cartRequestItems, getCart, removeCartItem, updateCartItem } from "./cart.js";
import * as view from "./views.js";

export function createApp({ databasePath, now = () => new Date(), bugs = readBugFlags({}), includeSampleOrder = false, labControls = false, trustProxy = false }) {
  const db = openDatabase(databasePath);
  seedDatabase(db, { includeSampleOrder });
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", trustProxy ? 1 : false);
  app.use(express.urlencoded({ extended: false, limit: "16kb" }));
  app.use(express.json({ limit: "16kb" }));
  app.use(express.static(join(projectRoot, "public"), { index: false }));

  app.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    // Normal browser forms are same-origin; reject cross-origin mutations.
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const origin = req.get("origin");
      if (origin && origin !== req.protocol + "://" + req.get("host")) {
        return res.status(403).json({ error: "Cross-origin request rejected." });
      }
    }
    req.user = findSession(db, req.get("cookie"), now());
    const cookie = String(req.get("cookie") || "").split(";").map(part => part.trim()).find(part => part.startsWith("fieldwork_cart="));
    const value = cookie?.slice("fieldwork_cart=".length);
    req.cartKey = /^[a-f0-9]{32}$/.test(value || "") ? value : randomBytes(16).toString("hex");
    if (req.cartKey !== value) res.cookie("fieldwork_cart", req.cartKey, { httpOnly: true, sameSite: "lax", secure: req.secure, path: "/", maxAge: 8 * 60 * 60 * 1000 });
    next();
  });

  const isApi = req => req.path.startsWith("/api/");
  const page = (req, res, title, active, body, status = 200) => res.status(status).send(view.shell({
    title, active, user: req.user, balance: req.user ? balanceCents(db, req.user.id) : null, now: now(), body, bugs, labControls,
    cart: getCart(db, req.cartKey)
  }));
  const authenticated = (req, res, next) => {
    if (req.user) return next();
    if (isApi(req)) return res.status(401).json({ error: "Sign in to continue." });
    return res.redirect("/login" + (req.path === "/checkout" ? "?next=/checkout" : ""));
  };
  const administrator = (req, res, next) => {
    if (req.user.role === "admin") return next();
    throw new ShopError("This page is for administrators.", 403);
  };

  app.get("/health", (req, res) => res.json({ status: "ok", application: "release-verification-lab" }));
  app.get("/", (req, res) => res.redirect("/products"));
  const nextPage = value => ["/checkout", "/cart", "/products"].includes(value) ? value : "/products";
  app.get("/login", (req, res) => req.user ? res.redirect(nextPage(req.query.next))
    : res.send(view.loginPage("", "", bugs, labControls, nextPage(req.query.next))));

  const signIn = (req, res, next) => {
    try {
      const user = login(db, req.body?.email, req.body?.password, now(), res, bugs);
      return isApi(req) ? res.json({ user }) : res.redirect(303, nextPage(req.body?.next));
    } catch (error) {
      if (!isApi(req) && error instanceof ShopError) {
        const email = typeof req.body?.email === "string" ? req.body.email.slice(0, 254) : "";
        return res.status(error.status).send(view.loginPage(error.message, email, bugs, labControls, nextPage(req.body?.next)));
      }
      next(error);
    }
  };
  app.post("/login", signIn);
  app.post("/api/auth/login", signIn);
  const signOut = (req, res) => {
    logout(db, req.get("cookie"), res);
    return isApi(req) ? res.status(204).end() : res.redirect(303, "/login");
  };
  app.post("/logout", signOut);
  app.post("/api/auth/logout", signOut);
  app.get("/api/auth/me", authenticated, (req, res) => {
    res.json({ user: req.user, balance_cents: balanceCents(db, req.user.id) });
  });

  app.get("/products", (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q.slice(0, 100) : "";
    const category = typeof req.query.category === "string" ? req.query.category : "";
    const products = listProducts(db, query).filter(product => !category || product.category === category);
    return page(req, res, "Products", "products", view.productsPage(products, query, category, labControls));
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
      return isApi(req) ? res.status(201).json({ order }) : res.redirect(303, "/orders/" + order.id);
    } catch (error) {
      next(error);
    }
  };
  const checkoutCart = (req, res) => {
    const items = cartRequestItems(getCart(db, req.cartKey));
    const order = placeOrder(db, req.user.id, items, now(), bugs, req.cartKey);
    return isApi(req) ? res.status(201).json({ order }) : res.redirect(303, "/orders/" + order.id);
  };
  app.post(["/checkout", "/api/cart/checkout"], authenticated, checkoutCart);
  app.post("/api/orders", authenticated, checkout);
  app.get("/orders", authenticated, (req, res) => page(
    req, res, "Orders", "orders", view.ordersPage(listOrders(db, req.user))
  ));
  app.get("/api/orders", authenticated, (req, res) => res.json({ orders: listOrders(db, req.user) }));
  app.get("/orders/:id", authenticated, (req, res) => page(
    req, res, "Orders", "orders", view.receiptPage(getOrder(db, req.user, req.params.id), bugs)
  ));
  app.get("/api/orders/:id", authenticated, (req, res) => {
    res.json({ order: getOrder(db, req.user, req.params.id) });
  });
  app.get("/admin", authenticated, administrator, (req, res) => {
    const stats = {
      products: db.prepare("SELECT COUNT(*) AS count FROM products").get().count,
      users: db.prepare("SELECT COUNT(*) AS count FROM users").get().count,
      orders: db.prepare("SELECT COUNT(*) AS count FROM orders").get().count,
      sales_cents: db.prepare("SELECT COALESCE(-SUM(amount_cents), 0) AS total FROM ledger").get().total
    };
    return page(req, res, "Admin", "admin", view.adminPage(stats, listOrders(db, req.user, { all: true })));
  });

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
    return page(req, res, "Something went wrong", "", view.errorPage(status, message), status);
  });

  return { app, db, close: () => db.close() };
}
