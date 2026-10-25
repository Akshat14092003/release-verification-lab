import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const roots = ["src", "scripts", "public", "tests"];
const paths = ["playwright.config.js"];
for (const root of roots) {
  for (const file of readdirSync(root, { recursive: true })) {
    if (file.endsWith(".js")) paths.push(join(root, file));
  }
}
for (const path of paths) {
  const result = spawnSync(process.execPath, ["--check", path], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log("Syntax checked " + paths.length + " JavaScript files.");
