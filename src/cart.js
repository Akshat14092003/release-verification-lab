import { positiveId, quoteOrder, ShopError } from "./shop.js";

export function getCart(db, cartKey) {
  const rows = db.prepare(
    "SELECT c.product_id, c.offer_id, c.quantity, p.name, p.category, p.description, p.artwork, p.price_cents," +
    " o.name AS offer_name, o.price_cents AS offer_price FROM cart_items c " +
    "JOIN products p ON p.id=c.product_id LEFT JOIN offers o ON o.id=c.offer_id WHERE c.cart_key=? ORDER BY c.product_id"
  ).all(cartKey);
  const items = rows.map(row => ({
    product: { id: row.product_id, name: row.name, category: row.category, description: row.description, artwork: row.artwork, price_cents: row.price_cents },
    offer: row.offer_id ? { id: row.offer_id, name: row.offer_name, price_cents: row.offer_price } : null,
    quantity: row.quantity,
    unit_price_cents: row.offer_id ? row.offer_price : row.price_cents,
    total_cents: (row.offer_id ? row.offer_price : row.price_cents) * row.quantity
  }));
  return { items, count: items.reduce((sum, line) => sum + line.quantity, 0), total_cents: items.reduce((sum, line) => sum + line.total_cents, 0) };
}

export function cartRequestItems(cart) {
  return cart.items.map(line => ({ product_id: line.product.id, quantity: line.quantity, offer_id: line.offer?.id }));
}

export function addCartItem(db, cartKey, input, userId, now, bugs) {
  const productId = positiveId(input?.product_id);
  const quantity = positiveId(input?.quantity ?? 1, "Quantity");
  const offerId = input?.offer_id === undefined || input.offer_id === "" ? null : positiveId(input.offer_id, "Offer");
  const existing = db.prepare("SELECT * FROM cart_items WHERE cart_key=? AND product_id=?").get(cartKey, productId);
  if (existing && existing.offer_id !== offerId) throw new ShopError("This item is already in your cart at a different price. Remove it before changing the promotion.", 409);
  const combined = quantity + (existing?.quantity || 0);
  quoteOrder(db, userId, [{ product_id: productId, quantity: combined, offer_id: offerId }], now, { bugs });
  db.prepare("INSERT INTO cart_items (cart_key, product_id, offer_id, quantity) VALUES (?, ?, ?, ?) " +
    "ON CONFLICT(cart_key, product_id) DO UPDATE SET quantity=excluded.quantity").run(cartKey, productId, offerId, combined);
  return getCart(db, cartKey);
}

export function updateCartItem(db, cartKey, productValue, quantityValue, userId, now, bugs) {
  const productId = positiveId(productValue);
  const existing = db.prepare("SELECT * FROM cart_items WHERE cart_key=? AND product_id=?").get(cartKey, productId);
  if (!existing) throw new ShopError("Cart item not found.", 404);
  const quantity = positiveId(quantityValue, "Quantity");
  quoteOrder(db, userId, [{ product_id: productId, quantity, offer_id: existing.offer_id }], now, { bugs });
  db.prepare("UPDATE cart_items SET quantity=? WHERE cart_key=? AND product_id=?").run(quantity, cartKey, productId);
  return getCart(db, cartKey);
}

export function removeCartItem(db, cartKey, productValue) {
  db.prepare("DELETE FROM cart_items WHERE cart_key=? AND product_id=?").run(cartKey, positiveId(productValue));
  return getCart(db, cartKey);
}
