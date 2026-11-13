// Assembles the publishable evidence site from reports that already exist:
// locally from this working tree, in CI from the downloaded job artifacts.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const site     = "site";
const evidence = "ci-evidence";

function pick(...candidates) {
  return candidates.find(c => existsSync(c)) || null;
}

function readJson(path) {
  return path ? JSON.parse(readFileSync(path, "utf8")) : null;
}

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
function escape(value) {
  return String(value).replace(/[&<>"]/g, c => ESC[c]);
}

const greenReport = pick(evidence + "/green/playwright-report", "playwright-report");
const redReport   = pick(evidence + "/red/defect-reports/red",  "defect-reports/red");
if (!greenReport) throw new Error("No green HTML report found. Run npm test or download green-evidence first.");
if (!redReport)   throw new Error("No red HTML report found. Run npm run test:red or download red-evidence first.");
for (const report of [greenReport, redReport]) {
  if (!existsSync(report + "/index.html")) throw new Error("Report folder has no index.html: " + report);
}

const greenStats  = readJson(pick(evidence + "/green/test-results/results.json", "test-results/results.json"))?.stats || null;
const redSummary  = readJson(pick(evidence + "/red/test-results/defects/red-summary.json", "test-results/defects/red-summary.json"));
const redRun      = redSummary?.scenarios?.find(s => s.name === "red") || null;
const repeat      = readJson(pick("test-results/repeatability.json", "docs/repeatability.json"));

const repo = "https://github.com/Akshat14092003/release-verification-lab";
const run = process.env.GITHUB_RUN_ID
  ? repo + "/actions/runs/" + encodeURIComponent(process.env.GITHUB_RUN_ID)
  : repo + "/actions/workflows/release-verification.yml";

const greenLine = greenStats
  ? `${greenStats.expected} of ${greenStats.expected + greenStats.unexpected} checks passed in ${(greenStats.duration / 1000).toFixed(1)}s, ${greenStats.unexpected} unexpected failures, ${greenStats.skipped} skipped.`
  : "Result counts were not available for this build.";
const redLine = redRun
  ? `${redRun.passed} controls passed and ${redRun.expectedFailures.length} intended failures were verified in ${(redRun.durationMs / 1000).toFixed(1)}s.`
  : "Result counts were not available for this build.";
const verified = Boolean(redSummary?.complete && redRun?.verified);

const repeatBlock = repeat ? `<section>
      <h2>Repeatability (${repeat.expectedChecks}-check suite)</h2>
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
    </section>` : "";

const failures = redRun
  ? redRun.expectedFailures.map(name => `<li><code>${escape(name)}</code></li>`).join("\n        ")
  : "<li>Not available.</li>";

const greenVerified = Boolean(greenStats && greenStats.expected > 0 && !greenStats.unexpected && !greenStats.flaky && !greenStats.skipped);

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

  :root{--bg:#f3f7fd;--fg:#172d49;--muted:#465b76;--line:#d5e0f0;--card:#fff;--ok:#246d3a;--warn:#994322;--accent:#215cc8;--hero:#e0ebff}
  @media(prefers-color-scheme:dark){:root{--bg:#0b1425;--fg:#e4edfc;--muted:#aebdd5;--line:#2c405d;--card:#142239;--ok:#a9eac0;--warn:#ffc2aa;--accent:#93b7ff;--hero:#153d83}}
  html{scroll-behavior:smooth;scroll-padding-top:24px}body{padding:0 28px 32px;font-family:ui-sans-serif,system-ui,"Segoe UI",sans-serif}main{max-width:1150px}.evidence-brand{display:flex;justify-content:space-between;align-items:center;gap:24px;padding:28px 0;border-bottom:1px solid var(--line);font-size:14px}.evidence-brand>a:first-child{font-size:21px;font-weight:700;letter-spacing:-.5px;text-decoration:none}.evidence-brand span{font-size:13px;font-weight:400;letter-spacing:0;color:var(--muted)}.evidence-brand>a:last-child{font-size:13px;color:var(--accent)}
  .evidence-hero{display:grid;grid-template-columns:1.2fr 1fr;gap:50px;align-items:center;padding:56px 0}.evidence-hero h1{font-size:clamp(36px,4.5vw,62px);line-height:1.1;letter-spacing:-.035em;font-weight:750;margin-bottom:24px}.evidence-hero h1 span{color:var(--accent)}.evidence-hero .lead{font-size:18px;line-height:1.8;max-width:45ch}.evidence-hero p{font-size:15px;line-height:1.8;color:var(--muted);max-width:55ch}.hero-button{display:inline-flex;background:var(--accent);color:var(--bg);padding:13px 19px;border-radius:8px;font-size:14px;font-weight:650;text-decoration:none;margin-top:12px}.rule-example{background:var(--hero);padding:28px;border-radius:14px}.rule-example h2{font-size:23px;letter-spacing:-.5px;margin:0 0 20px}.rule-example>div{padding:16px 0;border-top:1px solid var(--line)}.rule-example span{display:block;font-size:12px;color:var(--muted);margin-bottom:7px}.rule-example strong{font-size:16px;font-weight:600;line-height:1.6}.rule-example>p{font-size:12px;margin-bottom:0}.result-intro{border-top:1px solid var(--line);padding-top:28px}.result-intro h2{font-size:28px;letter-spacing:-.6px;margin:0 0 12px}.result-intro p{color:var(--muted);max-width:70ch}.cards{grid-template-columns:1fr 1fr;gap:20px}.card{padding:26px;background:var(--card);border-radius:14px}.result-label{display:block;font-size:12px;color:var(--muted);margin-bottom:15px}.card h3{font-size:23px;line-height:1.3;letter-spacing:-.5px}.card p{font-size:14px;line-height:1.8}.card p:first-of-type{color:var(--muted)}.result-badge{display:block;padding-top:10px;font-size:14px}.card a{font-size:14px;color:var(--accent)}.report-explanation{margin:24px 0 12px;font-size:15px;line-height:1.9;max-width:85ch}.report-explanation strong{display:block}.technical-details{margin-top:30px;border-block:1px solid var(--line);padding:20px 0}.technical-details summary{font-size:16px;font-weight:600;cursor:pointer}.technical-details code{overflow-wrap:anywhere}.technical-details p,.technical-details li{font-size:14px}.technical-details+section li,main>section:last-of-type li{padding:8px 0;color:var(--muted)}main>section:last-of-type strong{color:var(--fg)}a:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:5px}::selection{background:var(--accent);color:var(--bg)}
  @media(prefers-color-scheme:dark){.rule-example{color:#edf4ff}.rule-example p,.rule-example span{color:#d3e2ff}.rule-example>div{border-color:#557caf}}
  @media(max-width:700px){body{padding-inline:20px}.evidence-brand{flex-wrap:wrap;gap:12px}.evidence-brand span{display:block;margin-top:6px}.evidence-hero{grid-template-columns:minmax(0,1fr);gap:28px;padding-block:34px}.evidence-hero h1{font-size:42px}.evidence-hero .lead{font-size:16px}.rule-example{padding:22px}.cards{grid-template-columns:minmax(0,1fr)}.card{padding:22px}.result-intro h2{font-size:26px}}
  @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
</style>
</head>
<body>
<main>
  <header class="evidence-brand"><a href="${repo}">Fieldwork<span> / Release Verification Lab</span></a><a href="#results">View the results &darr;</a></header>
  <section class="evidence-hero"><div><h1>Does this shop<br><span>work as it should?</span></h1><p class="lead">A wrong password should not let you sign in. A closed offer should not let you buy. An order total should match what you paid.</p><p>This project checks those rules in a fictional shop, then deliberately breaks them to see whether the checks notice.</p><a class="hero-button" href="#results">See what the checks found &darr;</a></div><div class="rule-example"><h2>A simple example</h2><div><span>The rule</span><strong>A weekend deal closes on Monday.</strong></div><div><span>The mistake</span><strong>The shop still lets someone buy it.</strong></div><div><span>The evidence</span><strong>A check catches the purchase and flags the release for review.</strong></div><p>One of four intentional mistakes in this demo.</p></div></section>
  <section class="result-intro" id="results"><h2>Two versions. One question.</h2><p>Can the checks tell a working shop from a broken one? Open either report to inspect the recorded results.</p></section>

  <div class="cards">
    <div class="card">
      <span class="result-label">01 / The working version</span><h3>The rules are enforced.</h3><p>Sign-in, offers and order totals are checked without intentional bugs.</p><span class="result-badge ${greenVerified ? "ok" : "warn"}">${greenStats ? greenVerified ? "Recorded checks passed" : "Recorded checks need review" : "Results unavailable"}</span>
      <p>${escape(greenLine)}</p>
      <a href="green/index.html">Explore the working-version report &rarr;</a>
    </div>
    <div class="card">
      <span class="result-label">02 / Four deliberate mistakes</span><h3>Can the checks catch them?</h3><p>The same shop has four bugs enabled. A useful check should expose the broken rule.</p><span class="result-badge ${verified ? "ok" : "warn"}">${verified ? "Expected failures confirmed" : "Detection not confirmed"}</span>
      <p>${escape(redLine)}</p>
      <a href="red/index.html">Explore the intentional-bug report &rarr;</a>
    </div>
  </div>

  <p class="report-explanation"><strong>A failed check can be good news here.</strong> In the intentional-bug report, it means the check noticed a mistake. The verification only succeeds when it catches exactly the expected failures, with no unrelated problems.</p>
  <p class="note">These are saved reports from the build that produced this page. This report library does not run the interactive shop.</p>

  <details class="technical-details"><summary>How do we know the bugs were really caught?</summary>
    <p>A failing suite can also mean a broken environment. The harness therefore requires exact failing-test
    identities and a fresh per-run report token, and rejects stale reports, extra failures, skips, retries,
    timeouts, and setup errors. Exact pattern verified on this build:
    <span class="${verified ? "ok" : "warn"}">${verified ? "yes" : "no"}</span>.</p>
    <p>Intended failures:</p>
    <ul>
        ${failures}
    </ul>
  </details>
${repeatBlock ? '<details class="technical-details"><summary>How consistent were repeated checks?</summary>' + repeatBlock + '</details>' : ''}
  <section>
    <h2>Four ways to check the shop</h2>
    <ul>
      <li><strong>Use it like a shopper.</strong> Try real clicks and purchases, with screenshots when something fails.</li>
      <li><strong>Check behind the buttons.</strong> Send requests directly to see whether the server enforces the rules.</li>
      <li><strong>Follow the money.</strong> Compare the displayed order total with the stored purchase and payment records.</li>
      <li><strong>Try unexpected input.</strong> Check how the demo handles suspicious login and search text.</li>
    </ul>
  </section>

  <footer>
    <a href="${repo}">Source repository</a> &middot;
    <a href="${run}">${process.env.GITHUB_RUN_ID ? "Workflow run for these reports" : "Verification workflow"}</a><br>
    Synthetic data and fictional accounts only. A seeded defect is a demonstration, not a security certification.
  </footer>
</main>
</body>
</html>
`;

if (process.argv.includes("--preview")) {
  mkdirSync(".local", { recursive: true });
  writeFileSync(".local/evidence-preview.html", html.replaceAll('href="green/index.html"', 'href="https://akshat14092003.github.io/release-verification-lab/green/index.html"').replaceAll('href="red/index.html"', 'href="https://akshat14092003.github.io/release-verification-lab/red/index.html"').replace('<body>', '<body><p class="note" style="max-width:1150px;margin:20px auto">Local design preview. Local reports may come from different runs; the report links open the published evidence.</p>'));
  console.log("Local preview: .local/evidence-preview.html (report links open the published reports)");
  process.exit(0);
}

rmSync(site, { recursive: true, force: true });
mkdirSync(site, { recursive: true });
cpSync(greenReport, site + "/green", { recursive: true });
cpSync(redReport,   site + "/red",   { recursive: true });
writeFileSync(site + "/index.html", html);
writeFileSync(site + "/.nojekyll", "");

console.log("green report:  " + greenReport);
console.log("red report:    " + redReport);
console.log("repeatability: " + (repeat ? "included" : "not available"));
console.log("site written:  " + site + "/index.html");
