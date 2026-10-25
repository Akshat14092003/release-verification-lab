import express from "express";
import { join } from "node:path";
import { projectRoot, readBugFlags } from "./config.js";
import { balanceCents, openDatabase, seedDatabase } from "./database.js";
import { findSession, login, logout } from "./auth.js";
import { getOrder, listOffers, listOrders, listProducts, placeOrder, quoteOrder, ShopError } from "./shop.js";
import * as view from "./views.js";

export function createApp({ databasePath, now = () => new Date(), bugs = readBugFlags({}) }) {
  const db = openDatabase(databasePath);
  seedDatabase(db);
  const app = express();
  app.disable("x-powered-by");
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
    next();
  });

  const isApi = req => req.path.startsWith("/api/");
  const page = (req, res, title, active, body, status = 200) => res.status(status).send(view.shell({
    title, active, user: req.user, balance: balanceCents(db, req.user.id), now: now(), body, bugs
  }));
  const authenticated = (req, res, next) => {
    if (req.user) return next();
    if (isApi(req)) return res.status(401).json({ error: "Sign in to continue." });
    return res.redirect("/login");
  };
  const administrator = (req, res, next) => {
    if (req.user.role === "admin") return next();
    throw new ShopError("This page is for administrators.", 403);
  };

  app.get("/health", (req, res) => res.json({ status: "ok", application: "release-verification-lab" }));
  app.get("/", (req, res) => res.redirect(req.user ? "/products" : "/login"));
  app.get("/login", (req, res) => req.user ? res.redirect("/products") : res.send(view.loginPage("", "", bugs)));

  const signIn = (req, res, next) => {
    try {
      const user = login(db, req.body?.email, req.body?.password, now(), res, bugs);
      return isApi(req) ? res.json({ user }) : res.redirect(303, "/products");
    } catch (error) {
      if (!isApi(req) && error instanceof ShopError) {
        const email = typeof req.body?.email === "string" ? req.body.email.slice(0, 254) : "";
        return res.status(error.status).send(view.loginPage(error.message, email, bugs));
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

  app.get("/products", authenticated, (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q.slice(0, 100) : "";
    return page(req, res, "Products", "products", view.productsPage(listProducts(db, query), query));
  });
  app.get("/api/products", authenticated, (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q.slice(0, 100) : "";
    res.json({ products: listProducts(db, query) });
  });
  app.get("/offers", authenticated, (req, res) => page(
    req, res, "Offers", "offers", view.offersPage(listOffers(db, req.user.id, now(), { bugs }))
  ));
  app.get("/api/offers", authenticated, (req, res) => {
    res.json({ offers: listOffers(db, req.user.id, now(), { bugs }), now: now().toISOString(), timezone: "UTC" });
  });
  app.get("/checkout", authenticated, (req, res) => {
    if (req.query.product === undefined) return page(req, res, "Checkout", "checkout", view.checkoutPage(null));
    const quote = quoteOrder(db, req.user.id, req.query.product, req.query.offer, now(), { bugs });
    return page(req, res, "Checkout", "checkout", view.checkoutPage(quote));
  });
  app.get("/api/checkout", authenticated, (req, res) => {
    res.json({ quote: quoteOrder(db, req.user.id, req.query.product_id, req.query.offer_id, now(), { bugs }) });
  });
  const checkout = (req, res, next) => {
    try {
      const order = placeOrder(db, req.user.id, req.body?.product_id, req.body?.offer_id, now(), bugs);
      return isApi(req) ? res.status(201).json({ order }) : res.redirect(303, "/orders/" + order.id);
    } catch (error) {
      next(error);
    }
  };
  app.post("/checkout", authenticated, checkout);
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
    const status = error instanceof ShopError ? error.status : error.status === 400 ? 400 : 500;
    const message = error instanceof ShopError ? error.message : status === 400 ? "Invalid request body." : "Something went wrong. Please try again.";
    if (status === 500) console.error(error);
    if (isApi(req)) return res.status(status).json({ error: message });
    if (!req.user) return res.status(status).send(view.loginPage(message, "", bugs));
    return page(req, res, "Something went wrong", "", view.errorPage(status, message), status);
  });

  return { app, db, close: () => db.close() };
}
