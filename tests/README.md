# Correct-build test coverage

The baseline checks correct behaviour across API, browser, database, and security layers. Intentional defects are verified separately.

## Run

~~~sh
npm test
npm run test:api
npm run test:e2e
npm run test:db
npm run test:security
npm run test:bugs
npm run test:red
npm run report
~~~

On Windows PowerShell use npm.cmd if npm.ps1 is blocked.
First browser execution downloads the Chromium revision pinned to Playwright if it is missing.
Linux hosts may also need Playwright's system dependencies (npx playwright install-deps chromium).
No manually started app or shared demo database is required.

## Layers

- api/: authentication, catalogue search, authoritative price/identity, offer cap, account ownership,
  role access, and UTC opening/closing boundaries.
- e2e/: login/logout, error presentation, purchase/receipt, offers, stale checkout at expiry,
  mobile layout/sign-out, and administrator navigation.
- db/: a multi-item seed receipt and a new purchase reconciled against independent SQL,
  remaining credit, and absence of writes after a rejected purchase.
- security/: original SQL-like input and reflected/stored XSS probes against disposable app instances.
- fixtures/: one real SQLite database and ephemeral server per test, plus a controlled clock.
- pages/: small Playwright page objects.
- support/: independent synthetic-account expectations and recorded HTTP evidence.

## Isolation and evidence

Fixtures import the app factory, but business requests run over real HTTP.
Database assertions use a second, read-only SQLite connection and independent queries.
Tests never open or reset .data/lab.sqlite. Parallel tests cannot share accounts, orders, ports, or database files.
Each test starts on Saturday; clock.setTime() changes only that test's server clock.
No test-only HTTP endpoint is exposed by the app.

Browser tests block optional third-party CDN/font requests. Local HTML, JS, CSS, and API responses are real.
The local CSS fallback is exercised; failures are not hidden behind a mocked checkout.
Scope is Chromium with one explicit mobile viewport check; this is not a cross-browser claim.

Reports:
- playwright-report/index.html: local HTML report.
- test-results/results.json: machine-readable results and measured duration.
- test-results/junit.xml: JUnit report.
- test-results/artifacts/: per-test SQLite files, screenshots, traces, and attachments.
- Failed tests get a database evidence snapshot; checked API responses and SQL comparisons are attached.
- Retries are disabled so the first failure stays visible.

Reports are ignored by Git. The hosted workflow passed and uploaded both evidence artifacts. Standalone Pages report publication is pending.

## Defect verification

npm run test:bugs first forces all flags off for the full baseline, then checks each flag and all four together.
See docs/DEFECT-DEMONSTRATIONS.md for expected failing tests and positive controls.
Reports use a unique run ID so stale outputs cannot satisfy the matrix.
Defect HTML is under defect-reports/; JSON/JUnit and evidence are under test-results/defects/.
Individual defect runs exit with failures; the matrix returns success only for the exact intended pattern.

## Security setup and interpretation

Four SQL-like-input probes and four XSS-context probes are in security/input.spec.js.
XSS setup writes only to that test's SQLite file; the normal read-only SQL assertion connection remains separate.
Browser assertions require the payload to remain literal text/attribute content, no injected image/script nodes, and no marker execution.
SQL-like login rejection also detects BUG_AUTH_BYPASS. Its intentional red failures show missing credential verification, not proof of SQL parser injection.
These are focused regression probes, not a complete penetration test.

## CI command

npm run test:red runs only the combined defect scenario and preserves the full matrix reports separately.
The workflow waits for the green job before red and uploads distinct green-evidence/red-evidence artifacts.
Hosted execution is verified; see docs/CI.md and docs/HOSTED-CI-RESULTS.md.
