import { balanceCents } from "./database.js";

export class ShopError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function positiveId(value, label = "Product") {
  if (!/^[1-9]\d*$/.test(String(value))) throw new ShopError(label + " is invalid.");
  const id = Number(value);
  if (!Number.isSafeInteger(id)) throw new ShopError(label + " is invalid.");
  return id;
}

export function offerAvailability(db, offer, userId, now, { bugs = {}, enforcePurchaseCap = true } = {}) {
  const purchases = db.prepare(
    "SELECT COUNT(*) AS count FROM orders WHERE user_id = ? AND offer_id = ?"
  ).get(userId, offer.id).count;
  if (enforcePurchaseCap && purchases >= offer.max_purchases_per_user) {
    return { available: false, reason: "You have already claimed this offer." };
  }
  const day = now.getUTCDay();
  if (offer.weekend_only && !bugs.BUG_WEEKEND_OFFER && day !== 0 && day !== 6) {
    return { available: false, reason: "Available Saturday and Sunday, UTC." };
  }
  return { available: true, reason: "One purchase per customer. Saturday and Sunday, UTC." };
}

export function listProducts(db, search = "") {
  return db.prepare(
    "SELECT * FROM products WHERE instr(lower(name || ' ' || category), lower(?)) > 0 ORDER BY id"
  ).all(search);
}

export function listOffers(db, userId, now, { bugs = {} } = {}) {
  return db.prepare(
    "SELECT o.*, p.name AS product_name, p.description, p.artwork, p.price_cents AS regular_price_cents " +
    "FROM offers o JOIN products p ON p.id = o.product_id ORDER BY o.id"
  ).all().map(offer => ({ ...offer, ...offerAvailability(db, offer, userId, now, { bugs }) }));
}

export function quoteOrder(db, userId, productValue, offerValue, now, options = {}) {
  const productId = positiveId(productValue);
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(productId);
  if (!product) throw new ShopError("Product not found.", 404);
  let offer = null;
  if (offerValue !== undefined && offerValue !== null && offerValue !== "") {
    offer = db.prepare("SELECT * FROM offers WHERE id = ?").get(positiveId(offerValue, "Offer"));
    if (!offer || offer.product_id !== productId) throw new ShopError("Offer not found.", 404);
    const availability = offerAvailability(db, offer, userId, now, options);
    if (!availability.available) throw new ShopError(availability.reason, 409);
  }
  return {
    product,
    offer,
    total_cents: offer ? offer.price_cents : product.price_cents,
    balance_cents: balanceCents(db, userId)
  };
}

export function placeOrder(db, userId, productId, offerId, now, bugs = {}) {
  db.exec("BEGIN IMMEDIATE");
  try {
    // Resolve amounts and eligibility again inside the write transaction.
    // Seeded limit defect only omits the purchase-time cap. The UI listing
    // and quote still hide a spent offer, demonstrating a direct-request bypass.
    const quote = quoteOrder(db, userId, productId, offerId, now, {
      bugs, enforcePurchaseCap: !bugs.BUG_NO_LIMIT
    });
    if (quote.balance_cents < quote.total_cents) throw new ShopError("Not enough demo credit.", 409);
    const createdAt = now.toISOString();
    const result = db.prepare(
      "INSERT INTO orders (user_id, offer_id, total_cents, created_at) VALUES (?, ?, ?, ?)"
    ).run(userId, quote.offer?.id ?? null, quote.total_cents, createdAt);
    const orderId = Number(result.lastInsertRowid);
    db.prepare(
      "INSERT INTO order_items (order_id, product_id, product_name, unit_price_cents, quantity) VALUES (?, ?, ?, ?, 1)"
    ).run(orderId, quote.product.id, quote.product.name, quote.total_cents);
    db.prepare(
      "INSERT INTO ledger (order_id, user_id, amount_cents, description, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(orderId, userId, -quote.total_cents, quote.product.name, createdAt);
    db.exec("COMMIT");
    return { id: orderId, total_cents: quote.total_cents, created_at: createdAt };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function listOrders(db, user, { all = false } = {}) {
  return all
    ? db.prepare("SELECT o.*, u.name AS customer_name FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.id DESC").all()
    : db.prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC").all(user.id);
}

export function getOrder(db, user, orderValue) {
  const orderId = positiveId(orderValue, "Order");
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
  if (!order || (order.user_id !== user.id && user.role !== "admin")) {
    throw new ShopError("Order not found.", 404);
  }
  return {
    ...order,
    items: db.prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY id").all(orderId),
    ledger: db.prepare("SELECT * FROM ledger WHERE order_id = ? ORDER BY id").all(orderId)
  };
}
