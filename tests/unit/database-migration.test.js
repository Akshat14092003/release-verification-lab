import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { DEMO_PASSWORD, openDatabase, seedDatabase, verifyPassword } from "../../src/database.js";

test("legacy owner accounts migrate to customers without losing purchases, sessions or passwords", () => {
  mkdirSync("test-results", { recursive: true });
  const path = join("test-results", "migration-" + randomUUID() + ".sqlite");
  let db = new DatabaseSync(path);
  try {
    db.exec(readFileSync(new URL("../fixtures/legacy-schema.sql", import.meta.url), "utf8"));
    seedDatabase(db);
    db.exec("UPDATE users SET role='store-owner' WHERE id=2; UPDATE orders SET user_id=2; UPDATE ledger SET user_id=2;");
    db.prepare("INSERT INTO sessions VALUES (?,?,?)").run("a".repeat(64), 2, Date.now() + 60000);
    db.close(); db = openDatabase(path);
    const user = db.prepare("SELECT * FROM users WHERE id=2").get();
    assert.equal(user.role, "customer");
    assert.equal(verifyPassword(DEMO_PASSWORD, user), true);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM orders WHERE user_id=2").get().n, 1);
    assert.equal(db.prepare("SELECT status FROM orders WHERE id=1001").get().status, "processing");
    assert.equal(db.prepare("SELECT SUM(amount_cents) AS n FROM ledger WHERE user_id=2").get().n, -7300);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM order_items").get().n, 2);
    assert.equal(db.prepare("SELECT user_id FROM sessions").get().user_id, 2);
    assert.equal(db.prepare("SELECT SUM(active) AS n FROM products").get().n, 4);
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
    assert.throws(() => db.exec("UPDATE users SET role='store-owner' WHERE id=2"), /CHECK/);
    db.close(); db = openDatabase(path);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM users").get().n, 3);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM orders").get().n, 1);
  } finally {
    db.close();
    for (const suffix of ["", "-wal", "-shm"]) if (existsSync(path + suffix)) unlinkSync(path + suffix);
  }
});
