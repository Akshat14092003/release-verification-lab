import { createHash, randomBytes, scryptSync } from "node:crypto";
import { verifyPassword } from "./database.js";
import { ShopError } from "./shop.js";

const COOKIE = "fieldwork_session";
const SESSION_SECONDS = 8 * 60 * 60;
const tokenHash = token => createHash("sha256").update(token).digest("hex");

// --- session helpers ---

export function findSession(db, cookieHeader, now) {
  const pair = String(cookieHeader || "").split(";").map(p => p.trim())
    .find(p => p.startsWith(COOKIE + "="));
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
  response.cookie(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: Boolean(response.req?.secure), path: "/", maxAge: SESSION_SECONDS * 1000
  });
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export function logout(db, cookieHeader, response) {
  const pair = String(cookieHeader || "").split(";").map(p => p.trim())
    .find(p => p.startsWith(COOKIE + "="));
  if (pair) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash(pair.slice(COOKIE.length + 1)));
  response.clearCookie(COOKIE, { httpOnly: true, sameSite: "lax", path: "/" });
}

// --- signup approval flow ---

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Hash format for signup passwords: "scrypt:<salt_hex>:<hash_hex>"
 * Distinct from the deterministic demo hash used by seedDatabase.
 */
function signupPasswordHash(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return "scrypt:" + salt + ":" + hash;
}

/**
 * Submit a signup request for admin approval.
 * Does NOT create a user account — that happens in approveSignup().
 */
export function signup(db, name, email, password, now) {
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
    throw new ShopError("Enter your full name (2–100 characters).", 400);
  }
  if (typeof email !== "string" || !EMAIL_RE.test(email) || email.length > 254) {
    throw new ShopError("Enter a valid email address.", 400);
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 256) {
    throw new ShopError("Password must be 8–256 characters.", 400);
  }
  const normalEmail = email.trim().toLowerCase();
  if (db.prepare("SELECT id FROM users WHERE email = ?").get(normalEmail)) {
    throw new ShopError("An account with this email already exists.", 409);
  }
  if (db.prepare("SELECT id FROM signup_requests WHERE email = ? AND status = 'pending'").get(normalEmail)) {
    throw new ShopError("A signup request for this email is already awaiting approval.", 409);
  }
  db.prepare(
    "INSERT INTO signup_requests (email, name, password_hash, status, requested_at) VALUES (?, ?, ?, 'pending', ?)"
  ).run(normalEmail, name.trim(), signupPasswordHash(password), now.toISOString());
  return { email: normalEmail, name: name.trim() };
}

export function listSignupRequests(db, status = "pending") {
  return db.prepare(
    "SELECT id, email, name, status, requested_at, reviewed_at " +
    "FROM signup_requests WHERE status = ? ORDER BY requested_at ASC"
  ).all(status);
}

/**
 * Approve a pending request: create the user account and mark the request approved.
 * New customers get $1,000 demo credit.
 */
export function approveSignup(db, requestId, now) {
  const req = db.prepare("SELECT * FROM signup_requests WHERE id = ? AND status = 'pending'").get(requestId);
  if (!req) throw new ShopError("Signup request not found or already reviewed.", 404);
  // Guard against a duplicate that arrived between request and approval.
  if (db.prepare("SELECT id FROM users WHERE email = ?").get(req.email)) {
    db.prepare("UPDATE signup_requests SET status = 'rejected', reviewed_at = ? WHERE id = ?")
      .run(now.toISOString(), requestId);
    throw new ShopError("An account with this email already exists. Request rejected automatically.", 409);
  }
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      "INSERT INTO users (email, name, role, password_hash, opening_balance_cents) VALUES (?, ?, 'customer', ?, 100000)"
    ).run(req.email, req.name, req.password_hash);
    db.prepare("UPDATE signup_requests SET status = 'approved', reviewed_at = ? WHERE id = ?")
      .run(now.toISOString(), requestId);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return { email: req.email, name: req.name };
}

export function rejectSignup(db, requestId, now) {
  const req = db.prepare("SELECT id FROM signup_requests WHERE id = ? AND status = 'pending'").get(requestId);
  if (!req) throw new ShopError("Signup request not found or already reviewed.", 404);
  db.prepare("UPDATE signup_requests SET status = 'rejected', reviewed_at = ? WHERE id = ?")
    .run(now.toISOString(), requestId);
}
