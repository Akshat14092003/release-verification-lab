# Release Verification Lab

[![Release verification](https://github.com/Akshat14092003/release-verification-lab/actions/workflows/release-verification.yml/badge.svg)](https://github.com/Akshat14092003/release-verification-lab/actions/workflows/release-verification.yml)

A fictional shop where automated checks will demonstrate whether a release meets defined requirements.

The portfolio goal is reproducible evidence: introduce a realistic defect, catch it at the right layer, inspect the evidence, and verify corrected behaviour.

**Published and verified on GitHub Actions.**
The correct build passes all 34 checks, including 8 security probes. The red job verifies exactly 12 intended failures and 22 passing controls.
[View the successful hosted run](https://github.com/Akshat14092003/release-verification-lab/actions/runs/40180501884) and download its green-evidence/red-evidence artifacts.
Standalone report publication and the walkthrough are next.

## Run the shop

Requires Node.js 22.13 or newer. This project uses Node's built-in SQLite module.
Node 22.17 displays an experimental SQLite warning; no native database package or external database server is required.

~~~sh
npm ci
npm run seed
npm start
~~~

Open http://127.0.0.1:3000.

On Windows PowerShell, use npm.cmd if execution policy blocks npm.ps1.
Use npm run dev for automatic server restarts.

### Public synthetic accounts

| Role | Email | Password |
| --- | --- | --- |
| Customer | customer@example.test | DemoShop!2026 |
| Store Owner | owner@example.test | DemoShop!2026 |
| Admin | admin@example.test | DemoShop!2026 |

These are deliberately public, fictional local-demo credentials.
The app simulates purchases using demo credit; there is no payment gateway.

### Repeatable data

Startup initializes an empty database automatically. The seed command preserves existing orders by default.

~~~sh
npm run seed -- --reset
~~~

Stop the app before resetting. This clears and recreates this demo database's records, including sessions.
It does not touch external databases. The default file is .data/lab.sqlite, which is ignored by Git.

Initial data: 3 users, 4 products, 1 weekend offer, 1 customer order, 2 order lines, and 2 matching ledger entries.
Alex's opening credit is $1,000; the seeded $73 order leaves $927.

### Clock and configuration

The normal app uses the current server clock. Offer availability is Saturday/Sunday in UTC, with one purchase per user for this offer.

For a reproducible Saturday, set LAB_NOW to 2026-10-24T12:00:00.000Z.
For Monday, set it to 2026-10-26T12:00:00.000Z.

Copy .env.example to .env and start with:

~~~sh
node --env-file=.env src/server.js
~~~

The normal npm start command uses existing process environment variables; it does not load .env automatically.
Supported configuration: HOST, PORT, DATABASE_PATH, LAB_NOW. The server binds to loopback by default.
A server-side clock can also be injected into createApp for the later isolated test fixtures.

### Pages

- /login: role shortcuts, sign-in, and a visible error state.
- /products: searchable product cards with original SVG illustrations.
- /offers: the weekend offer and its actual availability.
- /checkout?product=1: server-priced order summary; offer purchases also pass offer=1.
- /orders and /orders/:id: personal orders, receipt, and transaction records.
- /admin: administrator-only, read-only store overview.

Store Owner is a separate seeded role; additional owner-management workflows are outside this scaffold.
The demo uses one item per new order and quantity 1. The seeded sample order contains two items to make reconciliation meaningful.

### API surface

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /health | Readiness |
| POST | /api/auth/login | Sign in with email and password |
| POST | /api/auth/logout | End the session |
| GET | /api/auth/me | Current user and demo credit |
| GET | /api/products?q= | Search products |
| GET | /api/offers | Offer availability and UTC clock |
| GET | /api/checkout?product_id=1 | Quote a purchase; optional offer_id |
| POST | /api/orders | Purchase product_id; optional offer_id |
| GET | /api/orders | Own orders |
| GET | /api/orders/:id | Own receipt, items, and ledger; admins can inspect any order |

API authentication uses the same HTTP-only session cookie as the browser.
Prices, customer identity, and totals come from server data, not client-supplied amounts.
All stored amounts use integer cents. Checkout and ledger insertion commit together.

## Baseline verification

~~~sh
npm test
npm run test:api
npm run test:e2e
npm run test:db
npm run test:security
npm run report
~~~

The runner starts isolated app instances automatically. Each test owns a SQLite file, loopback port, and server-side clock; your interactive demo data is untouched.
On first browser execution, the runner installs its pinned Chromium revision if missing.
Browser checks block optional external CDN/fonts and exercise the local CSS fallback.

Coverage: 15 direct API checks, 8 Playwright browser journeys, 3 SQL/database checks, and 8 focused security probes.
Database reconciliation compares actual rendered amounts with independent read-only SQL sums.
Screenshots and traces are retained on failure; HTTP responses and SQL evidence are attached to reports.
Retries are disabled. Security probes cover SQL-like login/search/identifier input and reflected/stored XSS contexts.
Only each test's disposable database is modified for untrusted-value setup; no interactive demo records are used.

See [tests/README.md](tests/README.md) for fixtures, isolation, and evidence details.
The HTML report is generated at playwright-report/index.html; open it with npm run report.
JSON and JUnit results are in test-results/. Reports are local and Git-ignored.

npm run check checks JavaScript syntax separately from npm test.

## Intentional defect demonstrations

All four flags default to 0: BUG_AUTH_BYPASS, BUG_WEEKEND_OFFER, BUG_NO_LIMIT, BUG_TOTAL_MISMATCH.
Set an individual flag to 1 in the process environment or explicitly loaded .env to explore it.
Active flags render red warning banners on login and dashboard pages.

~~~sh
npm run test:bugs
~~~

This command verifies a correct-build run, each flag against its existing guards, then all four together.
It requires exact failing-test identities and a fresh per-run report token; stale reports, extra failures,
skips, retries, timeouts, and setup errors cannot count as successful defect detection.
The underlying defective test runs still fail normally. Only the outer verification harness succeeds
when the intended failures match.

| Scenario | Checks | Passes | Intended failures | Duration |
| --- | --- | --- | --- | --- |
| baseline | 34 | 34 | 0 | 17.7s |
| auth | 5 | 0 | 5 | 9.3s |
| weekend | 7 | 2 | 5 | 11.7s |
| limit | 2 | 1 | 1 | 3.4s |
| total | 2 | 1 | 1 | 3.2s |
| all | 34 | 22 | 12 | 30.1s |

Correct-build HTML remains in playwright-report/. Separate defect reports are in defect-reports/.
JSON/JUnit and attachments are in test-results/defects/; summary.json records the matrix verdict.
See [defect demonstrations](docs/DEFECT-DEMONSTRATIONS.md) for behaviour, evidence, and report commands.

## Case study 1: The offer that outlived the weekend

**Implemented synthetic reconstruction.** BUG_WEEKEND_OFFER omits the server's UTC weekday guard.
Opening/closing API checks, Monday UI checks, a stale Sunday checkout, and independent database checks detect it.
With the flag off the checks pass; enabling it produces five specific failures while valid weekend checks still pass.

## Case study 2: A purchase cap bypassed through the API

**Implemented synthetic reconstruction.** BUG_NO_LIMIT omits only the purchase-time cap.
The UI still marks the offer as claimed, but a second direct API request succeeds.
The API guard fails with the successful repeat response attached; the UI control remains a passing comparison.

## Case study 3: The displayed total that disagreed with the ledger

**Implemented synthetic reconstruction.** BUG_TOTAL_MISMATCH reuses the first order line as the receipt total.
The two-item seed receipt displays $28 while the order, line-item sum, and ledger remain $73.
Independent SQL and the rendered amount expose the mismatch; a single-item receipt remains correct.

## GitHub Actions

The workflow has exactly two jobs: green verifies the correct build, then red verifies all four enabled defects.
Both retain their reports and evidence artifacts even on test failure. Action references are commit-pinned.
The red job succeeds only when the expected failing-test identities match; its underlying test report still contains real failures.

~~~sh
npm run test:red
~~~

This runs the red job's local verification command. Its reports are isolated under defect-reports/red/ and test-results/defects/red/.
The first hosted workflow passed on Ubuntu 24.04: green 34/34, red 22 passing controls plus 12 verified assertion failures.
Both evidence artifacts were downloaded and inspected. See [hosted results](docs/HOSTED-CI-RESULTS.md) and [CI workflow notes](docs/CI.md).
Standalone report publication is still pending.

## Measurements

Latest local baseline (2026-10-25): **34/34 passed in 17.7 seconds**, with CI=true, 2 workers, and zero retries.
Runtime is the latest full baseline in the verified defect matrix. Long-run flake rate has not been measured.
Hosted results: green 34/34 in 17.8s; red verified 12 intended failures in 27.1s.
[Real CI run](https://github.com/Akshat14092003/release-verification-lab/actions/runs/40180501884) - [local baseline](docs/BASELINE-RESULTS.md) - [hosted evidence](docs/HOSTED-CI-RESULTS.md).

<!-- MEASURED: 34 tests passed in 17.7 seconds; Node v22.17.1, Playwright 1.64.1, Windows CI-mode, 2 workers, zero retries. -->
<!-- MEASURED: insert flake rate here -->
<!-- MEASURED: successful hosted run https://github.com/Akshat14092003/release-verification-lab/actions/runs/40180501884; green 34/34, red 12 intended failures with 22 passing controls. -->

## Implementation notes

Express serves HTML directly; public assets include a local CSS fallback and original SVG product artwork.
Tailwind CSS is loaded from the CDN as requested, with optional Google Fonts.
External CDN/font availability must not be mistaken for backend readiness or future test success.
All important layout styles are local so the demo remains usable without those services.

This is a local training application. It is not a production commerce or authentication platform.
Enabled defect switches intentionally introduce unsafe behaviour in isolated demonstrations.

## Explore the project

- [Test design and isolation](tests/README.md)
- [Defect demonstrations](docs/DEFECT-DEMONSTRATIONS.md)
- [Measured results](docs/DEFECT-RESULTS.md)
- [CI workflow](docs/CI.md)

Private planning, authentication, generated databases, and local reports are excluded from this repository.
