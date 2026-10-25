import { loadConfig } from "../src/config.js";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, openDatabase, seedDatabase } from "../src/database.js";

const args = process.argv.slice(2);
if (args.some(arg => arg !== "--reset") || args.length > 1) {
  console.error("Usage: npm run seed [-- --reset]");
  process.exit(1);
}
const config = loadConfig();
const db = openDatabase(config.databasePath);
try {
  const changed = seedDatabase(db, { reset: args.includes("--reset") });
  console.log(changed ? "Synthetic demo data seeded." : "Existing demo data preserved. Use --reset for a clean slate.");
  console.log("Database: " + config.databasePath);
  for (const account of DEMO_ACCOUNTS) console.log(account.role + ": " + account.email);
  console.log("Shared demo password: " + DEMO_PASSWORD);
} finally {
  db.close();
}
