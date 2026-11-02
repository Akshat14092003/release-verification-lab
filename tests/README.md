# Correct-build test coverage

The baseline checks correct behaviour across API, browser, database, and security layers. Intentional defects are verified separately.

The four defect-detection Node unit checks in `unit/defect-detection.test.js` guard the visitor's bug-caught feedback:
exact detector identities, enabled flags, assertion-only failures, provisional counts, and final
verification. Run `node --test tests/unit/defect-detection.test.js` from the project root. These
are separate from the 47 Playwright release checks and do not change the expected red counts.

Three additional runner lifecycle guards cover cancellation, startup errors, timeout, ownership, and the active-process lock. `npm run test:unit` runs all seven. `npm run test:runner` exercises the actual Playwright subprocess separately from the 47 release checks, preventing recursive test launches. CI runs that integration in the deployment container under a 512 MB memory limit.

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
- db/: a multi-item order created through checkout from an empty database and a new single-item purchase reconciled against independent SQL,
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
The legacy fixtures explicitly include the sample order; the multi-item detector selects `sampleOrder: false`
and builds its own receipt through the browser. Interactive startup defaults to no sample purchases.
No test-only HTTP endpoint is exposed by the app.

Browser tests block optional third-party CDN/font requests. Local HTML, JS, CSS, and API responses are real.
The local CSS fallback is exercised; failures are not hidden behind a mocked checkout.
Scope is Chromium with one explicit mobile viewport check; this is not a cross-browser claim.

Reports:
- playwright-report/index.html: local HTML report.
- test-results/results.json: machine-readable results and measured duration.
- test-results/junit.xml: JUnit report.
- test-results/artifacts/: per-test SQLite files, screenshots, traces, and attachments.
- Browser failure screenshots and explicit receipt captures include the full page, so offer actions,
  the UTC demo date, and receipt/ledger totals remain visible below the initial viewport.
- Failed tests get a database evidence snapshot; checked API responses and SQL comparisons are attached.
  API-only tests use these structured attachments; they do not create browser screenshots.
- Retries are disabled so the first failure stays visible.

Reports are ignored by Git. The earlier version's hosted reports are published on Pages.
The local interactive revision has 47 tests; see ../docs/INTERACTIVE-DEMO.md.
Five storefront-control browser checks cover inline switches, visitor isolation/reset, themes,
mobile layout, contextual hints, sidebar persistence, reduced motion, and run errors. Cart API
checks cover quantity merging, validation, rollback, guest sign-in continuity, and cookie isolation.
Nested launches are disabled in these fixtures; the real same-page run-to-report flow is verified
separately with the actual runner.

The theme check holds the animation callback pending while navigating, proving the preference
is saved synchronously. The mobile report fixture maps GET responses by run ID and advances the
browser clock across the former 500ms polling race: a completed run stays finished, with no
extra poll and its evidence action still visible. Retries and detector expectations are unchanged.
It also checks the loading skeletons before results arrive, their removal when results stream in,
and their static appearance with reduced motion. Placeholders never count as test results.

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
