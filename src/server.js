import { createServer } from "node:http";
import { validateAssets } from "./assets.js";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDemoApp } from "./demo.js";
import { dirname, join } from "node:path";

validateAssets();
const config = loadConfig();
const server = createServer();
// Bundled config temp files trigger Node's import watcher again on every startup.
const vite = process.argv.includes("--dev")
  ? await (await import("vite")).createServer({ configLoader: "native", server: { middlewareMode: true, hmr: { server } } })
  : null;
const assetMiddleware = vite?.middlewares;
const legacyShop = process.argv.includes("--shop");
const runtime = legacyShop ? createApp({ ...config, assetMiddleware }) : createDemoApp({ directory: join(dirname(config.databasePath), "demo"), trustProxy: config.trustProxy, testWorkers: config.testWorkers, sharedShop: config.sharedShop, publicOrigin: config.publicOrigin, assetMiddleware });
server.on("request", runtime.app);
server.listen(config.port, config.host, () => {
  console.log((legacyShop ? "Fieldwork shop: " : "Release Verification Lab: ") + "http://" + config.host + ":" + config.port);
  if (legacyShop) {
    console.log("Database: " + config.databasePath);
    if (process.env.LAB_NOW) console.log("Demo clock: " + config.now().toISOString() + " (UTC)");
  } else {
    console.log(config.sharedShop ? "Shared local shop: admin changes reach every browser. Tests use separate data." : "Visitor shops are isolated. Tests use separate data.");
    if (config.sharedShop) console.log("Database: " + join(dirname(config.databasePath), "demo", "shop.sqlite"));
  }
});

server.on("error", async error => {
  console.error("Unable to start the shop:", error.message);
  runtime.close();
  await vite?.close();
  process.exitCode = 1;
});
async function shutdown() {
  await vite?.close();
  server.close(() => {
    runtime.close();
    process.exit(0);
  });
  server.closeIdleConnections();
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
