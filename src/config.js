import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = fileURLToPath(new URL("../", import.meta.url));

export const BUG_FLAGS = Object.freeze([
  "BUG_AUTH_BYPASS", "BUG_WEEKEND_OFFER", "BUG_NO_LIMIT", "BUG_TOTAL_MISMATCH"
]);

export function readBugFlags(env = process.env) {
  return Object.fromEntries(BUG_FLAGS.map(name => {
    if (env[name] !== undefined && env[name] !== "0" && env[name] !== "1") {
      throw new Error(name + " must be 0 or 1.");
    }
    return [name, env[name] === "1"];
  }));
}

export function loadConfig(env = process.env) {
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }
  if (env.LAB_NOW && !Number.isFinite(Date.parse(env.LAB_NOW))) {
    throw new Error("LAB_NOW must be a valid ISO date.");
  }
  const fixedNow = env.LAB_NOW ? new Date(env.LAB_NOW) : null;
  const testWorkers = Number(env.LAB_TEST_WORKERS || 2);
  if (![1, 2].includes(testWorkers)) throw new Error("LAB_TEST_WORKERS must be 1 or 2.");
  if (env.LAB_SHARED_SHOP !== undefined && !["0", "1"].includes(env.LAB_SHARED_SHOP)) throw new Error("LAB_SHARED_SHOP must be 0 or 1.");
  const host = env.HOST || "127.0.0.1";
  return {
    host,
    sharedShop: env.LAB_SHARED_SHOP === "1" || (env.LAB_SHARED_SHOP !== "0" && ["127.0.0.1", "localhost", "::1"].includes(host)),
    bugs: readBugFlags(env),
    port,
    trustProxy: env.TRUST_PROXY === "1",
    testWorkers,
    databasePath: resolve(projectRoot, env.DATABASE_PATH || ".data/lab.sqlite"),
    now: () => fixedNow ? new Date(fixedNow) : new Date()
  };
}
