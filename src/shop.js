import { balanceCents } from "./database.js";

export class ShopError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function positiveId(value, label = "Product") {
  if (!["number", "string"].includes(typeof value) || !/^[1-9]\d*$/.test(String(value))) {
    throw new ShopError(label + " is invalid.");
  }
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

export function getProduct(db, value) {
  const product = db.prepare("SELECT * FROM products WHERE id=?").get(positiveId(value));
  if (!product) throw new ShopError("Product not found.", 404);
  return product;
}

export function listOffers(db, userId, now, { bugs = {} } = {}) {
  return db.prepare(
    "SELECT o.*, p.name AS product_name, p.description, p.artwork, p.price_cents AS regular_price_cents " +
    "FROM offers o JOIN products p ON p.id = o.product_id ORDER BY o.id"
  ).all().map(offer => ({ ...offer, ...offerAvailability(db, offer, userId, now, { bugs }) }));
}

function quoteItem(db, userId, item, now, options) {
  if (!item || typeof item !== "object" || Array.isArray(item)) throw new ShopError("Order item is invalid.");
  const { product_id: productValue, offer_id: offerValue } = item;
  const productId = positiveId(productValue);
  const quantity = positiveId(item.quantity ?? 1, "Quantity");
  if (quantity > 99) throw new ShopError("Quantity must be between 1 and 99.");
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(productId);
  if (!product) throw new ShopError("Product not found.", 404);
  let offer = null;
  if (offerValue !== undefined && offerValue !== null && offerValue !== "") {
    offer = db.prepare("SELECT * FROM offers WHERE id = ?").get(positiveId(offerValue, "Offer"));
    if (!offer || offer.product_id !== productId) throw new ShopError("Offer not found.", 404);
    if (quantity !== 1) throw new ShopError("Offer purchases must have quantity 1.");
    const availability = offerAvailability(db, offer, userId, now, options);
    if (!availability.available) throw new ShopError(availability.reason, 409);
  }
  const unitPrice = offer ? offer.price_cents : product.price_cents;
  const total = unitPrice * quantity;
  if (!Number.isSafeInteger(total)) throw new ShopError("Order amount is too large.");
  return { product, offer, quantity, unit_price_cents: unitPrice, total_cents: total };
}

export function quoteOrder(db, userId, items, now, options = {}) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 20) {
    throw new ShopError("Select between 1 and 20 products.");
  }
  const lines = items.map(item => quoteItem(db, userId, item, now, options));
  if (new Set(lines.map(line => line.product.id)).size !== lines.length) {
    throw new ShopError("Select each product once and use its quantity field.");
  }
  const offers = lines.filter(line => line.offer);
  if (offers.length > 1) throw new ShopError("Use at most one offer per order.");
  const total = lines.reduce((sum, line) => sum + line.total_cents, 0);
  if (!Number.isSafeInteger(total)) throw new ShopError("Order amount is too large.");
  return {
    items: lines,
    product: lines[0].product,
    offer: offers[0]?.offer ?? null,
    total_cents: total,
    balance_cents: balanceCents(db, userId)
  };
}

export function placeOrder(db, userId, items, now, bugs = {}, cartKey = null) {
  db.exec("BEGIN IMMEDIATE");
  try {
    // Resolve amounts and eligibility again inside the write transaction.
    // Seeded limit defect only omits the purchase-time cap. The UI listing
    // and quote still hide a spent offer, demonstrating a direct-request bypass.
    const quote = quoteOrder(db, userId, items, now, {
      bugs, enforcePurchaseCap: !bugs.BUG_NO_LIMIT
    });
    if (quote.balance_cents < quote.total_cents) throw new ShopError("Not enough demo credit.", 409);
    const createdAt = now.toISOString();
    const result = db.prepare(
      "INSERT INTO orders (user_id, offer_id, total_cents, created_at) VALUES (?, ?, ?, ?)"
    ).run(userId, quote.offer?.id ?? null, quote.total_cents, createdAt);
    const orderId = Number(result.lastInsertRowid);
    const addItem = db.prepare(
      "INSERT INTO order_items (order_id, product_id, product_name, unit_price_cents, quantity) VALUES (?, ?, ?, ?, ?)"
    );
    const addEntry = db.prepare(
      "INSERT INTO ledger (order_id, user_id, amount_cents, description, created_at) VALUES (?, ?, ?, ?, ?)"
    );
    for (const line of quote.items) {
      addItem.run(orderId, line.product.id, line.product.name, line.unit_price_cents, line.quantity);
      addEntry.run(orderId, userId, -line.total_cents, line.product.name, createdAt);
    }
    if (cartKey) db.prepare("DELETE FROM cart_items WHERE cart_key=?").run(cartKey);
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
