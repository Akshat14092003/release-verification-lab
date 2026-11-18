import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createServer } from "node:net";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { projectRoot } from "../../src/config.js";

test("Vite under Node watch stays idle and restarts only after a source change", { timeout: 20_000 }, async () => {
  const directory = mkdtempSync(join(tmpdir(), "fieldwork-watch-"));
  const entry = join(directory, "entry.mjs");
  const source = 'import ' + JSON.stringify(pathToFileURL(join(projectRoot, "src", "server.js")).href) + ';\n';
  writeFileSync(entry, source);
  const socket = createServer().listen(0, "127.0.0.1");
  await once(socket, "listening");
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  const child = spawn(process.execPath, ["--watch", "--watch-preserve-output", entry, "--dev"], {
    cwd: projectRoot,
    env: { ...process.env, NODE_ENV: "development", HOST: "127.0.0.1", PORT: String(port), DATABASE_PATH: join(directory, "lab.sqlite"), LAB_SHARED_SHOP: "0" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let logs = "";
  child.stdout.on("data", chunk => { logs += chunk; });
  child.stderr.on("data", chunk => { logs += chunk; });
  const starts = () => (logs.match(/Release Verification Lab:/g) || []).length;
  const waitForStarts = async count => {
    for (let attempt = 0; starts() < count && attempt < 80; attempt++) {
      assert.equal(child.exitCode, null, logs);
      await delay(100);
    }
    assert.ok(starts() >= count, logs);
  };
  try {
    await waitForStarts(1);
    await delay(2500);
    assert.equal(starts(), 1, "Idle development server restarted:\n" + logs);
    writeFileSync(entry, source + "// Exercise a real watched source change.\n");
    await waitForStarts(2);
    await delay(2000);
    assert.equal(starts(), 2, "Source change caused repeated restarts:\n" + logs);
    assert.equal((await fetch("http://127.0.0.1:" + port + "/health")).status, 200);
  } finally {
    if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else child.kill("SIGTERM");
    if (child.exitCode === null) await once(child, "exit");
    rmSync(directory, { recursive: true, force: true });
  }
});
