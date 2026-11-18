import express from "express";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { projectRoot } from "./config.js";

let manifest;
const production = () => process.env.NODE_ENV === "production" || process.argv.includes("--production");
const development = () => process.argv.includes("--dev");
export function validateAssets() {
  if (!production()) return;
  try {
    manifest = JSON.parse(readFileSync(join(projectRoot, "dist", ".vite", "manifest.json"), "utf8"));
    for (const file of ["frontend.js", "lab-entry.js", ...styles(true)]) {
      if (!manifest[file]?.file) throw new Error("Missing asset: " + file);
    }
  } catch (error) {
    throw new Error("Frontend build is missing or invalid. Run npm run build before starting production.", { cause: error });
  }
}
function styles(lab) {
  return ["tokens.css", "styles.css", "theme.css", "shop.css", ...(lab ? ["lab.css"] : []), "glass.css", "blue.css", "experience.css", "experiment.css"];
}
export function frontendTags(lab = false) {
  if (production() && !manifest) validateAssets();
  const url = file => "/" + (production() ? manifest[file].file : file);
  // Theme selection stays synchronous, before CSS, to avoid a light/dark flash.
  const theme = '<script src="/theme.js"></script>';
  const css = styles(lab).map(file => '<link rel="stylesheet" href="' + url(file) + '"/>').join("");
  if (production() || development()) {
    return theme + css + (development() ? '<script type="module" src="/@vite/client"></script>' : '') +
      '<script type="module" src="' + url(lab ? "lab-entry.js" : "frontend.js") + '"></script>';
  }
  // Isolated test fixtures and direct createApp callers retain the source path.
  return theme + css + ["motion.js", "app.js", "bug.js", "home.js", "experiment.js", ...(lab ? ["lab.js", "guide.js"] : [])]
    .map(file => '<script src="/' + file + '" defer></script>').join("");
}
export function builtAssets() {
  return express.static(join(projectRoot, "dist", "assets"), { index: false, immutable: true, maxAge: "1y" });
}
