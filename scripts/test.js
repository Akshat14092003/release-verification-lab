import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { chromium } from "@playwright/test";

const require = createRequire(import.meta.url);
const cli = require.resolve("@playwright/test/cli");
const args = process.argv.slice(2);
const needsBrowser = !args.includes("--list") && !args.includes("--project=api");
if (needsBrowser && !existsSync(chromium.executablePath())) {
  console.log("Installing the Chromium build pinned to this Playwright version...");
  const install = spawnSync(process.execPath, [cli, "install", "chromium", "--no-shell"], { stdio: "inherit" });
  if (install.status !== 0) process.exit(install.status || 1);
}
const result = spawnSync(process.execPath, [cli, "test", ...args], { stdio: "inherit" });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
