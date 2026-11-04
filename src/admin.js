import { balanceCents } from "./database.js";
import { getProduct, positiveId, ShopError } from "./shop.js";

export const CATEGORIES = ["Stationery", "Audio", "Home", "Lighting"];
export const ARTWORK = ["journal", "headphones", "mug", "lamp"];
export const ORDER_STATUSES = ["processing", "shipped", "delivered"];

export function saveProduct(db, input, id = null) {
  if (id !== null) getProduct(db, id, { includeInactive: true });
  const { name, category, description, artwork, active, price_cents: price } = input || {};
  if (typeof name !== "string" || !name.trim() || name.trim().length > 100) throw new ShopError("Product name must be between 1 and 100 characters.");
  if (!CATEGORIES.includes(category)) throw new ShopError("Choose a product category.");
  if (typeof description !== "string" || !description.trim() || description.trim().length > 300) throw new ShopError("Description must be between 1 and 300 characters.");
  if (!ARTWORK.includes(artwork)) throw new ShopError("Choose one of the four product photographs.");
  if (!Number.isSafeInteger(price) || price < 1 || price > 999999) throw new ShopError("Price must be between $0.01 and $9,999.99, with at most two decimal places.");
  if (typeof active !== "boolean") throw new ShopError("Choose whether the product is available for sale.");
  const values = [name.trim(), category, description.trim(), price, artwork, active ? 1 : 0];
  if (id === null) {
    const result = db.prepare("INSERT INTO products (name,category,description,price_cents,artwork,active) VALUES (?,?,?,?,?,?)").run(...values);
    id = Number(result.lastInsertRowid);
  } else {
    db.prepare("UPDATE products SET name=?,category=?,description=?,price_cents=?,artwork=?,active=? WHERE id=?").run(...values, positiveId(id));
  }
  return getProduct(db, id, { includeInactive: true });
}

export function updateOrderStatus(db, id, status) {
  const orderId = positiveId(id, "Order");
  if (!ORDER_STATUSES.includes(status)) throw new ShopError("Choose Processing, Shipped or Delivered.");
  const updated = db.prepare("UPDATE orders SET status=? WHERE id=?").run(status, orderId);
  if (!updated.changes) throw new ShopError("Order not found.", 404);
  return db.prepare("SELECT * FROM orders WHERE id=?").get(orderId);
}

export function listCustomers(db) {
  return db.prepare("SELECT u.id,u.name,u.email,COUNT(o.id) AS orders FROM users u LEFT JOIN orders o ON o.user_id=u.id WHERE u.role='customer' GROUP BY u.id ORDER BY u.id")
    .all().map(customer => ({ ...customer, balance_cents: balanceCents(db, customer.id) }));
}
