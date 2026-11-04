import { loadConfig } from "../src/config.js";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, openDatabase, seedDatabase } from "../src/database.js";

const args = process.argv.slice(2);
if (args.some(arg => !["--reset", "--fresh"].includes(arg)) || args.length > 1) {
  console.error("Usage: npm run seed [-- --reset | --fresh]");
  process.exit(1);
}
const config = loadConfig();
const db = openDatabase(config.databasePath);
try {
  const fresh = args.includes("--fresh");
  const sample = args.includes("--reset");
  const changed = seedDatabase(db, { reset: fresh || sample, includeSampleOrder: sample });
  console.log(changed ? !sample ? "Fresh demo: $1,000 per customer, admin management access, no purchases or sessions."
    : "Synthetic demo data seeded (includes the $73 sample order)."
    : "Existing demo data preserved. Use --reset for sample data or --fresh for no purchases.");
  console.log("Database: " + config.databasePath);
  for (const account of DEMO_ACCOUNTS) console.log(account.role + ": " + account.email);
  console.log("Shared demo password: " + DEMO_PASSWORD);
} finally {
  db.close();
}
