import { loadConfig } from "../src/config.js";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, openDatabase, seedDatabase } from "../src/database.js";

const args = process.argv.slice(2);
if (args.length > 1 || args.some(arg => !["--reset", "--fresh"].includes(arg))) {
  console.error("Usage: npm run seed [-- --reset | --fresh]");
  process.exit(1);
}

const config = loadConfig();
const db = openDatabase(config.databasePath);
try {
  const fresh = args.includes("--fresh");
  const sample = args.includes("--reset");
  const changed = seedDatabase(db, { reset: fresh || sample, includeSampleOrder: sample });
  const msg = !changed
    ? "Existing demo data preserved. Use --reset for sample data or --fresh for no purchases."
    : sample
      ? "Synthetic demo data seeded (includes the $73 sample order)."
      : "Fresh demo: $1,000 credit per account, no purchases or sessions.";
  console.log(msg);
  console.log("Database: " + config.databasePath);
  for (const { role, email } of DEMO_ACCOUNTS) console.log(role + ": " + email);
  console.log("Shared demo password: " + DEMO_PASSWORD);
} finally {
  db.close();
}
