import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const runtime = createApp(config);
const server = runtime.app.listen(config.port, config.host, () => {
  console.log("Fieldwork shop: http://" + config.host + ":" + config.port);
  console.log("Database: " + config.databasePath);
  if (process.env.LAB_NOW) console.log("Demo clock: " + config.now().toISOString() + " (UTC)");
});

server.on("error", error => {
  console.error("Unable to start the shop:", error.message);
  runtime.close();
  process.exitCode = 1;
});
function shutdown() {
  server.close(() => {
    runtime.close();
    process.exit(0);
  });
  server.closeIdleConnections();
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
