import { createHash, randomBytes } from "node:crypto";
import { hashPassword, verifyPassword } from "./database.js";
import { ShopError } from "./shop.js";

const COOKIE = "fieldwork_session";
const ADMIN_COOKIE = "fieldwork_admin_session";
const SESSION_SECONDS = 8 * 60 * 60;
const tokenHash = token => createHash("sha256").update(token).digest("hex");

export function findSession(db, cookieHeader, now, { role } = {}) {
  const cookies = String(cookieHeader || "").split(";").map(part => part.trim());
  const names = role === "admin" ? [ADMIN_COOKIE, COOKIE] : role === "customer" ? [COOKIE] : [COOKIE, ADMIN_COOKIE];
  for (const name of names) {
    const pair = cookies.find(part => part.startsWith(name + "="));
    const token = pair?.slice(name.length + 1);
    if (!/^[a-f0-9]{64}$/.test(token || "")) continue;
    const user = db.prepare(
      "SELECT u.id, u.email, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id " +
      "WHERE s.token_hash = ? AND s.expires_at > ?"
    ).get(tokenHash(token), now.getTime());
    if (user && (!role || user.role === role)) return user;
  }
  return null;
}

export function login(db, email, password, now, response, bugs = {}, { role } = {}) {
  if (typeof email !== "string" || typeof password !== "string" ||
      email.length > 254 || password.length > 256) {
    throw new ShopError("Enter a valid email and password.", 400);
  }
  let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.trim().toLowerCase());
  // Seeded defect: an authentication path accidentally reuses guest provisioning,
  // then skips credential verification for both guest and existing accounts.
  if (!user && bugs.BUG_AUTH_BYPASS) {
    const created = db.prepare(
      "INSERT INTO users (email, name, role, password_hash, opening_balance_cents) VALUES (?, ?, ?, ?, 0)"
    ).run(email.trim().toLowerCase(), "Unverified guest", "customer", "0".repeat(128));
    user = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(created.lastInsertRowid));
  }
  if (!user || (role && user.role !== role) || ((!bugs.BUG_AUTH_BYPASS || user.role === "admin") && !verifyPassword(password, user))) {
    throw new ShopError("Email or password is incorrect.", 401);
  }
  return startSession(db, user, now, response);
}

function startSession(db, user, now, response) {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now.getTime());
  const token = randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(
    tokenHash(token), user.id, now.getTime() + SESSION_SECONDS * 1000
  );
  response.cookie(user.role === "admin" ? ADMIN_COOKIE : COOKIE, token, { httpOnly: true, sameSite: "lax", secure: Boolean(response.req?.secure), path: "/", maxAge: SESSION_SECONDS * 1000 });
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export function signup(db, input, now, response) {
  const { name, email, password } = input || {};
  if (typeof name !== "string" || !name.trim() || name.trim().length > 80) {
    throw new ShopError("Enter a display name between 1 and 80 characters.");
  }
  if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new ShopError("Enter a valid email address.");
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 256) {
    throw new ShopError("Use a password between 8 and 256 characters.");
  }
  const address = email.trim().toLowerCase();
  const passwordHash = hashPassword(password);
  db.exec("BEGIN IMMEDIATE");
  try {
    if (db.prepare("SELECT id FROM users WHERE email=?").get(address)) {
      throw new ShopError("This email already has an account. Sign in instead.", 409);
    }
    const result = db.prepare("INSERT INTO users (email,name,role,password_hash,opening_balance_cents) VALUES (?,?,'customer',?,100000)")
      .run(address, name.trim(), passwordHash);
    const user = startSession(db, { id: Number(result.lastInsertRowid), email: address, name: name.trim(), role: "customer" }, now, response);
    db.exec("COMMIT");
    return user;
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}

export function logout(db, cookieHeader, response, { role } = {}) {
  const cookies = String(cookieHeader || "").split(";").map(part => part.trim());
  for (const name of role === "customer" ? [COOKIE] : [COOKIE, ADMIN_COOKIE]) {
    const pair = cookies.find(part => part.startsWith(name + "="));
    const hash = pair ? tokenHash(pair.slice(name.length + 1)) : null;
    const account = hash ? db.prepare("SELECT u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?").get(hash) : null;
    if (role && name === COOKIE && account?.role !== role) continue;
    if (hash) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hash);
    response.clearCookie(name, { httpOnly: true, sameSite: "lax", path: "/" });
  }
  if (role === "admin") return;
  // Carts are keyed by the fieldwork_cart cookie, not the account. Drop both the
  // rows and the cookie so a shared browser never carries one person's cart to the next.
  const cartPair = cookies.find(part => part.startsWith("fieldwork_cart="));
  const cartKey = cartPair?.slice("fieldwork_cart=".length);
  if (/^[a-f0-9]{32}$/.test(cartKey || "")) db.prepare("DELETE FROM cart_items WHERE cart_key = ?").run(cartKey);
  response.clearCookie("fieldwork_cart", { httpOnly: true, sameSite: "lax", path: "/" });
}
