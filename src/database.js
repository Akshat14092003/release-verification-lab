import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const DEMO_PASSWORD = "DemoShop!2026";
export const DEMO_ACCOUNTS = [
  { id: 1, email: "customer@example.test", name: "Alex Morgan", role: "customer" },
  { id: 2, email: "jamie@example.test", name: "Jamie Parker", role: "customer" },
  { id: 3, email: "admin@example.test", name: "Taylor Reed", role: "admin" }
];

function passwordHash(password, email) {
  // Deterministic salt is deliberately scoped to public, synthetic demo accounts.
  const salt = createHash("sha256").update("fieldwork-demo:" + email).digest("hex");
  return scryptSync(password, salt, 64);
}

export function verifyPassword(password, user) {
  const [kind, salt, hash] = user.password_hash.split("$");
  const expected = Buffer.from(kind === "scrypt" ? hash : user.password_hash, "hex");
  const actual = kind === "scrypt" ? scryptSync(password, salt, 64) : passwordHash(password, user.email);
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return "scrypt$" + salt + "$" + scryptSync(password, salt, 64).toString("hex");
}

function migrateDatabase(db) {
  if (!db.prepare("PRAGMA table_info(products)").all().some(column => column.name === "active")) {
    db.exec("ALTER TABLE products ADD COLUMN active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))");
  }
  if (!db.prepare("PRAGMA table_info(orders)").all().some(column => column.name === "status")) {
    db.exec("ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'shipped', 'delivered'))");
  }
  const users = db.prepare("SELECT sql FROM sqlite_master WHERE name='users'").get();
  if (!users.sql.includes("store-owner")) return;
  // Preserve IDs, passwords, purchases and sessions while removing the obsolete role.
  db.exec("PRAGMA foreign_keys = OFF; BEGIN IMMEDIATE");
  try {
    db.exec("CREATE TABLE users_next (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL," +
      " role TEXT NOT NULL CHECK (role IN ('customer', 'admin')), password_hash TEXT NOT NULL," +
      " opening_balance_cents INTEGER NOT NULL CHECK (opening_balance_cents >= 0));" +
      "INSERT INTO users_next SELECT id,email,name,CASE WHEN role='store-owner' THEN 'customer' ELSE role END,password_hash,opening_balance_cents FROM users;" +
      "DROP TABLE users; ALTER TABLE users_next RENAME TO users;");
    if (db.prepare("PRAGMA foreign_key_check").all().length) throw new Error("Account migration found an invalid reference.");
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
  finally { db.exec("PRAGMA foreign_keys = ON"); }
}

export function openDatabase(path) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
  migrateDatabase(db);
  return db;
}

export function seedDatabase(db, { reset = false, includeSampleOrder = true } = {}) {
  if (!reset && db.prepare("SELECT COUNT(*) AS count FROM users").get().count > 0) return false;
  db.exec("BEGIN IMMEDIATE");
  try {
    if (reset) {
      for (const table of ["sessions", "cart_items", "ledger", "order_items", "orders", "offers", "products", "users"]) {
        db.exec("DELETE FROM " + table);
      }
      db.exec("DELETE FROM sqlite_sequence");
    }
    const addUser = db.prepare(
      "INSERT INTO users (id, email, name, role, password_hash, opening_balance_cents) VALUES (?, ?, ?, ?, ?, ?)"
    );
    for (const user of DEMO_ACCOUNTS) {
      addUser.run(user.id, user.email, user.name, user.role,
        passwordHash(DEMO_PASSWORD, user.email).toString("hex"), 100000);
    }
    const addProduct = db.prepare(
      "INSERT INTO products (id, name, category, description, price_cents, artwork) VALUES (?, ?, ?, ?, ?, ?)"
    );
    addProduct.run(1, "Everyday journal", "Stationery", "A little room for your next big idea.", 2800, "journal");
    addProduct.run(2, "Studio headphones", "Audio", "Find your focus. Stay in your flow.", 4500, "headphones");
    addProduct.run(3, "Ceramic mug", "Home", "A better companion for your morning ritual.", 1800, "mug");
    addProduct.run(4, "Arc desk lamp", "Lighting", "Good light for whatever comes next.", 3900, "lamp");
    db.prepare(
      "INSERT INTO offers (id, product_id, name, price_cents, max_purchases_per_user, weekend_only) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(1, 1, "The weekend edit", 1900, 1, 1);
    if (includeSampleOrder) {
      db.prepare(
        "INSERT INTO orders (id, user_id, total_cents, created_at) VALUES (?, ?, ?, ?)"
      ).run(1001, 1, 7300, "2026-10-23T10:30:00.000Z");
      const addItem = db.prepare(
        "INSERT INTO order_items (id, order_id, product_id, product_name, unit_price_cents, quantity) VALUES (?, ?, ?, ?, ?, ?)"
      );
      addItem.run(1, 1001, 1, "Everyday journal", 2800, 1);
      addItem.run(2, 1001, 2, "Studio headphones", 4500, 1);
      const addEntry = db.prepare(
        "INSERT INTO ledger (id, order_id, user_id, amount_cents, description, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      );
      addEntry.run(1, 1001, 1, -2800, "Everyday journal", "2026-10-23T10:30:00.000Z");
      addEntry.run(2, 1001, 1, -4500, "Studio headphones", "2026-10-23T10:30:00.000Z");
    }
    db.exec("COMMIT");
    return true;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function balanceCents(db, userId) {
  return db.prepare(
    "SELECT u.opening_balance_cents + COALESCE(SUM(l.amount_cents), 0) AS balance_cents " +
    "FROM users u LEFT JOIN ledger l ON l.user_id = u.id WHERE u.id = ? GROUP BY u.id"
  ).get(userId)?.balance_cents ?? 0;
}
