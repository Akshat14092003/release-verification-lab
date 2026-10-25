CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer', 'store-owner', 'admin')),
  password_hash TEXT NOT NULL,
  opening_balance_cents INTEGER NOT NULL CHECK (opening_balance_cents >= 0)
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  artwork TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  max_purchases_per_user INTEGER NOT NULL CHECK (max_purchases_per_user > 0),
  weekend_only INTEGER NOT NULL DEFAULT 1 CHECK (weekend_only IN (0, 1))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  offer_id INTEGER REFERENCES offers(id),
  total_cents INTEGER NOT NULL CHECK (total_cents > 0),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents > 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount_cents INTEGER NOT NULL CHECK (amount_cents < 0),
  description TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS orders_user_offer ON orders(user_id, offer_id);
CREATE INDEX IF NOT EXISTS ledger_user ON ledger(user_id);
CREATE INDEX IF NOT EXISTS ledger_order ON ledger(order_id);
