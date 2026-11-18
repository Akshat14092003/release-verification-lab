import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("./public", import.meta.url));
export default defineConfig({
  root,
  publicDir: false,
  appType: "custom",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    manifest: true,
    rolldownOptions: {
      input: ["frontend.js", "lab-entry.js", "tokens.css", "styles.css", "theme.css", "shop.css", "lab.css", "glass.css", "blue.css", "experience.css", "experiment.css"].map(file => resolve(root, file))
    }
  }
});
