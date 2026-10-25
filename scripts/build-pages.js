// Assembles the publishable evidence site from reports that already exist:
// locally from this working tree, in CI from the downloaded job artifacts.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const site = "site";
const evidence = "ci-evidence";

function pick(...candidates) {
  return candidates.find(candidate => existsSync(candidate)) || null;
}

function readJson(path) {
  return path ? JSON.parse(readFileSync(path, "utf8")) : null;
}

function escape(value) {
  return String(value).replace(/[&<>"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character]));
}

const greenReport = pick(evidence + "/green/playwright-report", "playwright-report");
const redReport = pick(evidence + "/red/defect-reports/red", "defect-reports/red");
if (!greenReport) throw new Error("No green HTML report found. Run npm test or download green-evidence first.");
if (!redReport) throw new Error("No red HTML report found. Run npm run test:red or download red-evidence first.");
for (const report of [greenReport, redReport]) {
  if (!existsSync(report + "/index.html")) throw new Error("Report folder has no index.html: " + report);
}

const greenStats = readJson(pick(evidence + "/green/test-results/results.json", "test-results/results.json"))?.stats || null;
const redSummary = readJson(pick(evidence + "/red/test-results/defects/red-summary.json", "test-results/defects/red-summary.json"));
const redRun = redSummary?.scenarios?.find(scenario => scenario.name === "red") || null;
const repeat = readJson(pick("test-results/repeatability.json", "docs/repeatability.json"));

const repo = "https://github.com/Akshat14092003/release-verification-lab";
const run = repo + "/actions/runs/40180501884";

const greenLine = greenStats
  ? `${greenStats.expected} of ${greenStats.expected + greenStats.unexpected} checks passed in ${(greenStats.duration / 1000).toFixed(1)}s, ${greenStats.unexpected} unexpected failures, ${greenStats.skipped} skipped.`
  : "Result counts were not available for this build.";
const redLine = redRun
  ? `${redRun.passed} controls passed and ${redRun.expectedFailures.length} intended failures were verified in ${(redRun.durationMs / 1000).toFixed(1)}s.`
  : "Result counts were not available for this build.";
const verified = Boolean(redSummary?.complete && redRun?.verified);

const repeatBlock = repeat
  ? `<section>
      <h2>Repeatability</h2>
      <p>${repeat.runs} local green runs and ${repeat.runs} local red runs on ${escape(repeat.environment.platform)},
      Node ${escape(repeat.environment.node)}, ${repeat.environment.workers} workers.</p>
      <ul>
        <li>Green runs with no unexpected or flaky results: <strong>${repeat.green.cleanRuns} of ${repeat.runs}</strong>
        (${repeat.green.suiteSeconds.min}s to ${repeat.green.suiteSeconds.max}s, median ${repeat.green.suiteSeconds.median}s).</li>
        <li>Red runs verifying the exact intended failures: <strong>${repeat.red.verifiedRuns} of ${repeat.runs}</strong>
        (${repeat.red.suiteSeconds.min}s to ${repeat.red.suiteSeconds.max}s, median ${repeat.red.suiteSeconds.median}s).</li>
        <li>Identical failing-test set on every red run: <strong>${repeat.red.failureSetStable ? "yes" : "no"}</strong>.</li>
      </ul>
      <p class="note">A ${repeat.runs}-run sample on one machine. It is not a long-run flake rate.</p>
    </section>`
  : "";

const failures = redRun
  ? redRun.expectedFailures.map(name => `<li><code>${escape(name)}</code></li>`).join("\n        ")
  : "<li>Not available.</li>";

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Release Verification Lab - evidence</title>
<style>
  :root { color-scheme: light dark; --bg: #ffffff; --fg: #16181d; --muted: #5b6270; --line: #d9dde5; --card: #f6f7f9; --ok: #1a7f46; --warn: #a4442a; }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #14161a; --fg: #e9ecf1; --muted: #a2abba; --line: #2c313a; --card: #1b1e24; --ok: #52c98a; --warn: #e08a6a; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 48px 16px; background: var(--bg); color: var(--fg);
         font: 16px/1.6 ui-sans-serif, system-ui, "Segoe UI", Roboto, Arial, sans-serif; }
  main { max-width: 780px; margin: 0 auto; }
  h1 { font-size: 1.9rem; margin: 0 0 8px; letter-spacing: -0.01em; }
  h2 { font-size: 1.15rem; margin: 36px 0 10px; }
  p.lead { color: var(--muted); margin-top: 0; }
  .cards { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); margin-top: 20px; }
  .card { border: 1px solid var(--line); border-radius: 12px; background: var(--card); padding: 18px; }
  .card h3 { margin: 0 0 6px; font-size: 1rem; }
  .card a { display: inline-block; margin-top: 10px; font-weight: 600; }
  a { color: inherit; }
  code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 0.86em; }
  ul { padding-left: 20px; }
  .note { color: var(--muted); font-size: 0.92rem; }
  .ok { color: var(--ok); font-weight: 600; }
  .warn { color: var(--warn); font-weight: 600; }
  footer { margin-top: 44px; border-top: 1px solid var(--line); padding-top: 16px; color: var(--muted); font-size: 0.9rem; }
</style>
</head>
<body>
<main>
  <h1>Release Verification Lab</h1>
  <p class="lead">A synthetic shop and the automated checks that decide whether a release is fit to ship.
  These are the reports from the build that produced this page.</p>

  <div class="cards">
    <div class="card">
      <h3>Correct build</h3>
      <p>${escape(greenLine)}</p>
      <a href="green/index.html">Open the green report</a>
    </div>
    <div class="card">
      <h3>Seeded defects</h3>
      <p>${escape(redLine)}</p>
      <a href="red/index.html">Open the red report</a>
    </div>
  </div>

  <p class="warn">The red report contains real test failures on purpose. Four defect flags are switched on in
  that job, so the checks are meant to fail. The job succeeds only when the failures match the exact expected set.</p>

  <section>
    <h2>Why the red job is not just a red X</h2>
    <p>A failing suite can also mean a broken environment. The harness therefore requires exact failing-test
    identities and a fresh per-run report token, and rejects stale reports, extra failures, skips, retries,
    timeouts, and setup errors. Exact pattern verified on this build:
    <span class="${verified ? "ok" : "warn"}">${verified ? "yes" : "no"}</span>.</p>
    <p>Intended failures:</p>
    <ul>
        ${failures}
    </ul>
  </section>
${repeatBlock}
  <section>
    <h2>Layers</h2>
    <ul>
      <li>Browser tests with page objects, screenshots and traces on failure.</li>
      <li>API tests that bypass the interface entirely.</li>
      <li>SQL tests that recompute order totals from stored records.</li>
      <li>Security probes for SQL-like input and reflected or stored cross-site scripting.</li>
    </ul>
  </section>

  <footer>
    <a href="${repo}">Source repository</a> &middot;
    <a href="${run}">First verified hosted run</a><br>
    Synthetic data and fictional accounts only. A seeded defect is a demonstration, not a security certification.
  </footer>
</main>
</body>
</html>
`;

rmSync(site, { recursive: true, force: true });
mkdirSync(site, { recursive: true });
cpSync(greenReport, site + "/green", { recursive: true });
cpSync(redReport, site + "/red", { recursive: true });
writeFileSync(site + "/index.html", html);
writeFileSync(site + "/.nojekyll", "");

console.log("green report: " + greenReport);
console.log("red report:   " + redReport);
console.log("repeatability: " + (repeat ? "included" : "not available"));
console.log("site written: " + site + "/index.html");
