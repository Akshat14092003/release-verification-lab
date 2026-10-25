import { createHash, randomBytes } from "node:crypto";
import { verifyPassword } from "./database.js";
import { ShopError } from "./shop.js";

const COOKIE = "fieldwork_session";
const SESSION_SECONDS = 8 * 60 * 60;
const tokenHash = token => createHash("sha256").update(token).digest("hex");

export function findSession(db, cookieHeader, now) {
  const pair = String(cookieHeader || "").split(";").map(part => part.trim())
    .find(part => part.startsWith(COOKIE + "="));
  if (!pair) return null;
  const token = pair.slice(COOKIE.length + 1);
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  return db.prepare(
    "SELECT u.id, u.email, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id " +
    "WHERE s.token_hash = ? AND s.expires_at > ?"
  ).get(tokenHash(token), now.getTime()) || null;
}

export function login(db, email, password, now, response, bugs = {}) {
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
  if (!user || (!bugs.BUG_AUTH_BYPASS && !verifyPassword(password, user))) {
    throw new ShopError("Email or password is incorrect.", 401);
  }
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now.getTime());
  const token = randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(
    tokenHash(token), user.id, now.getTime() + SESSION_SECONDS * 1000
  );
  response.cookie(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_SECONDS * 1000 });
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export function logout(db, cookieHeader, response) {
  const pair = String(cookieHeader || "").split(";").map(part => part.trim())
    .find(part => part.startsWith(COOKIE + "="));
  if (pair) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash(pair.slice(COOKIE.length + 1)));
  response.clearCookie(COOKIE, { httpOnly: true, sameSite: "lax", path: "/" });
}
