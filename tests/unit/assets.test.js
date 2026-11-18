import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { frontendTags } from "../../src/assets.js";
import { projectRoot } from "../../src/config.js";

test("frontend preserves theme and CSS order and loads lab controls only when requested", () => {
  const shop = frontendTags();
  const lab = frontendTags(true);
  assert.ok(shop.indexOf("/theme.js") < shop.indexOf("tokens"));
  const links = [...lab.matchAll(/<link[^>]+href="([^"]+)"/g)].map(match => match[1]);
  const names = links.map(link => link.split("/").pop().replace(/-[\w-]+\.css$/, ".css"));
  assert.deepEqual(names, ["tokens.css", "styles.css", "theme.css", "shop.css", "lab.css", "glass.css", "blue.css", "experience.css", "experiment.css"]);
  assert.doesNotMatch(shop, /(?:lab-entry|\/lab\.js|\/guide\.js)/);
  assert.match(lab, /(?:lab-entry|\/guide\.js)/);
});

test("production startup uses the manifest or explains how to build it", () => {
  const result = spawnSync(process.execPath, ["--input-type=module", "-e",
    'import { frontendTags } from "./src/assets.js"; console.log(frontendTags(true));'],
  { cwd: projectRoot, env: { ...process.env, NODE_ENV: "production" }, encoding: "utf8" });
  if (!existsSync(join(projectRoot, "dist", ".vite", "manifest.json"))) {
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Run npm run build/);
  } else {
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /type="module" src="\/assets\/lab-entry-[\w-]+\.js"/);
    assert.doesNotMatch(result.stdout, /@vite\/client|src="\/app\.js"/);
  }
});
