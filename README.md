# Release Verification Lab

[![Release verification](https://github.com/Akshat14092003/release-verification-lab/actions/workflows/release-verification.yml/badge.svg)](https://github.com/Akshat14092003/release-verification-lab/actions/workflows/release-verification.yml)

A fictional shop where automated checks will demonstrate whether a release meets defined requirements.

The portfolio goal is reproducible evidence: introduce a realistic defect, catch it at the right layer, inspect the evidence, and verify corrected behaviour.

**Published and verified on GitHub Actions.**
The published reports contain 47 checks. The current revision has 54 checks,
including 8 security probes; its red verifier expects 12 intended failures and 42 passing controls. Visitors can toggle bugs, run the real tests,
watch progress, and inspect their report from the website. See [the interactive demo](docs/INTERACTIVE-DEMO.md).
Historical measurements below are labeled by version. The interactive Node app is not publicly deployed yet; [free hosting findings](docs/HOSTING.md) explain the confirmed memory limit and remaining account/compute requirement.
[View the successful hosted run](https://github.com/Akshat14092003/release-verification-lab/actions/runs/41453518469) and download its green-evidence/red-evidence artifacts.
[Browse the published evidence site](https://akshat14092003.github.io/release-verification-lab/): the landing page, the green report, and the red report from the latest verified run.

## Run the interactive lab

Requires Node.js 22.13 or newer. This project uses Node's built-in SQLite module.
Node 22.17 displays an experimental SQLite warning; no native database package or external database server is required.

~~~sh
npm ci
npx playwright install chromium --no-shell
npm start
~~~

Open http://127.0.0.1:3000.

The home page introduces the release verification lab, with an Enter the shop action, a short
walkthrough and source/report links. A beetle follows your mouse (or roams on touch devices); catch it to trigger a
full-screen jump. Choose Let it roam to release it or Fix it to throw it away and see Bug Fixeddd!
Fixing removes the roaming beetle until the page is refreshed.
Pause its movement with the small pause control.
Products at `/products` is the catalogue. Product arrows open distinct detail pages; Add to cart builds a real
basket with quantities and removal. Guests can browse and keep their cart through sign-in, then checkout.
QA playground is a compact header tool with an anchored settings panel, closed initially.
On mobile it lives in the navigation drawer. Each bug explains what it changes, with reproduction
steps under How to try it. Active bugs show a red state and count. Contextual hints follow the visitor through products,
cart, checkout, and receipts. **Run checks** opens live progress and reports over the same page.
The sidebar collapses, the sun/moon theme control animates, and the storefront has gentle motion with
reduced-motion support. Local browsers share one SQLite shop; test runs use isolated data. No separate guide page is needed.

All PowerShell commands, account details, reset options, and step-by-step manual reproductions:
[COMMANDS.md](COMMANDS.md).

On Windows PowerShell, use npm.cmd if execution policy blocks npm.ps1.
Use npm run dev for automatic server restarts.

### Public synthetic accounts

| Role | Email | Password |
| --- | --- | --- |
| Customer | customer@example.test | DemoShop!2026 |
| Admin | admin@example.test | DemoShop!2026 |

These are deliberately public, fictional local-demo credentials.
Visitors can also create a customer account at `/signup`, starting with $1,000 demo credit.
Signup uses a random salt and scrypt password hash and retains the guest cart. Only customer
accounts can be created publicly. Local startup shares catalogue, customer accounts and orders
across browsers. Admin changes reach buyers automatically, including Incognito, without links.
Sessions and carts remain separate. Data persists in `.data/demo/shop.sqlite` across restarts.
The app simulates purchases using demo credit; there is no payment gateway.

### Repeatable data

In the local browser lab, use **Reset shared shop**. Its confirmation explains that it restores
the catalogue, clears all carts, orders and registered accounts, and signs everyone out across
browsers. Seeded customers return to $1,000. **Keep shopping** cancels without changes.
Test runs have separate disposable data and do not modify your purchases.

Loopback hosts share the shop by default. Set `LAB_SHARED_SHOP=0` for independent visitor
sandboxes; non-loopback hosts default to that isolated mode. Only isolated mode needs buyer links.

The following terminal commands apply to the original persistent shop, started with `npm run start:shop`.
That mode keeps `.data/lab.sqlite`; it is separate from the browser lab's `.data/demo/shop.sqlite`.

Startup initializes an empty database automatically. The seed command preserves existing orders by default.

~~~sh
npm run seed -- --reset
~~~

Stop the app before resetting. This clears and recreates this demo database's records, including sessions.
It does not touch external databases. The default file is .data/lab.sqlite, which is ignored by Git.

Normal startup and `npm run seed` initialize 3 users, 4 products, and 1 weekend offer, with
$1,000 per user and no purchases. `--reset` explicitly restores the older $73 sample order instead,
leaving the customer $927. Existing data is preserved unless a reset option is supplied.

For manual testing with **$1,000 available credit and zero purchases**, stop the app and run:

~~~sh
npm run seed -- --fresh
npm run start:shop
~~~

This resets the demo accounts, removes all purchases (including the sample), clears offer claims
and sessions, and retains the products/offer. Log in again after restarting.
Run it again whenever you want to repeat a purchase scenario from scratch.
Normal startup preserves this fresh state. Automated tests continue to use their isolated sample data.
To reproduce the total mismatch, add two different products to your cart, review it, and complete
checkout. On the receipt, use the **Receipt total** switch to compare the faulty and correct displays. With `BUG_TOTAL_MISMATCH=1`, the receipt
shows only the first line's amount while Transactions records the full purchase. No sample order is required.

### Clock and configuration

For the browser lab, choose the demo day in the website controls and apply it. The clock/flag
environment variables below are supported by the advanced `start:shop` mode.

The normal app uses the current server clock. Offer availability is Saturday/Sunday in UTC, with one purchase per user for this offer.

For a reproducible Saturday, set LAB_NOW to 2026-10-24T12:00:00.000Z.
For Monday, set it to 2026-10-26T12:00:00.000Z.

Copy .env.example to .env and start with:

~~~sh
node --env-file=.env src/server.js --shop
~~~

The normal npm start command uses existing process environment variables; it does not load .env automatically.
Supported configuration: HOST, PORT, DATABASE_PATH, LAB_NOW. The server binds to loopback by default.
A server-side clock can also be injected into createApp for the later isolated test fixtures.

### Pages

- /login: role shortcuts, sign-in, and a visible error state.
- /signup: customer registration, automatic sign-in, and password confirmation.
- /products: searchable product cards with supplied Gemini product photographs.
- /offers: the weekend offer and its actual availability.
- /products/:id: individual product details, quantity selector, and Add to cart.
- /cart: review, update quantities, remove items, and proceed to checkout.
- /checkout: final server-priced review of the current cart before purchase.
- /orders and /orders/:id: personal orders, receipt, and transaction records.
- /admin/login: dedicated administrator sign-in, separate from customer login and signup.
- /admin: management overview with ledger sales, paid/processing order counts, customers and recent orders.
- /admin/products: add/edit products, prices and availability.
- /admin/orders: filter by customer/status, review receipts and update fulfilment.
- /admin/customers: customer credit, purchase counts and links to their orders.

Roles are Customer and Admin. Existing store-owner accounts migrate to customers without losing
orders or sessions. Admin can add/edit products, set prices, hide/restore products, and mark orders
Processing, Shipped or Delivered. Hidden products are rejected at checkout, including direct requests
and existing carts. Price/name edits preserve paid order lines and ledger records; offer prices stay separate.
Admin signs in through `/admin/login` to `/admin`, with management navigation and customer receipt review at
`/admin/orders/:id`. Home, logos and breadcrumbs return admin to management; `/` redirects admin
to `/admin`. Overview, Products, Orders and Customers are separate management pages.
Anonymous management visits open the admin sign-in page and preserve safe management destinations.
The customer HTML sign-in accepts customer accounts; the admin form accepts verified administrators
and has no customer signup or shopping shortcuts. Admin sign-out returns to `/admin/login`.
The intentional customer authentication bypass never skips administrator password verification.
For side-by-side testing, open **Admin → Products → Open buyer window**. This signs a customer
into the same demo shop while keeping the admin signed in. Use **Copy link for another browser**
to connect a separate browser profile; the link works once and expires after five minutes.
Unrelated browser profiles still have separate shops until explicitly connected.
Saved product changes and fulfilment updates appear in connected views automatically.
Unsaved forms and selected quantities are preserved. Existing paid receipts keep their prices;
weekend offer prices are separate from the product's regular catalogue price.
Cart, offers, checkout, personal order history and personal demo credit belong
to customers. Admin cannot purchase through browser forms, cart APIs, direct order requests or
the QA repeat-offer helper. Requests for shopping pages redirect admin to the dashboard; shopping
API mutations are denied with403. Customer and guest shopping behavior stays available.
Checkout supports multiple products and quantities 1-99. An order can use one promotion, with
quantity 1 for that offer item. Products, prices, eligibility, available credit, and all totals
are resolved by the server. Order lines and ledger entries commit in one transaction.

### API surface

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /health | Readiness |
| POST | /api/auth/signup | Create a customer with demo credit and a signed-in session |
| POST | /api/auth/login | Sign in with email and password |
| POST | /api/auth/logout | End the session |
| GET | /api/auth/me | Current user and demo credit |
| GET | /api/products?q= | Search products |
| GET | /api/offers | Offer availability and UTC clock |
| GET | /api/checkout?product_id=1 | Quote a purchase; optional offer_id |
| POST | /api/checkout | Quote a basket of items with product_id, quantity, optional offer_id |
| POST | /api/orders | Purchase a basket or the original single-product request |
| GET / POST | /api/cart, /api/cart/items | Read cart or add a product |
| POST / DELETE | /api/cart/items/:id | Update quantity or remove a line |
| POST | /api/cart/checkout | Purchase the server-side cart and clear it atomically |
| GET | /api/orders | Own orders |
| GET | /api/orders/:id | Own receipt, items, and ledger; admins can inspect any order |
| GET | /api/admin | Admin-only statistics, products, orders, and customers |
| POST | /api/admin/products | Admin-only product creation |
| POST / PATCH | /api/admin/products/:id | Admin-only product details, price_cents and active flag |
| POST / PATCH | /api/admin/orders/:id/status | Admin-only fulfilment status update |

API authentication uses the browser's HTTP-only sessions. Admin and customer use separate
cookies so linked views can run together; management routes select the admin session.
Signing out of either web view leaves the other role signed in. General API logout clears both.
Prices, customer identity, and totals come from server data, not client-supplied amounts.
All stored amounts use integer cents. Checkout and ledger insertion commit together.
The purchase endpoint accepts either the original single-product body or
`{ "items": [{ "product_id": 1, "quantity": 2 }, { "product_id": 2, "quantity": 1 }] }`.
Client-supplied prices, totals, and user IDs cannot override the server's values.

Current verified evidence and limitations: [CURRENT-RESULTS.md](docs/CURRENT-RESULTS.md).

## Baseline verification

~~~sh
npm test
npm run test:api
npm run test:e2e
npm run test:db
npm run test:security
npm run test:unit
npm run test:runner
npm run report
~~~

The runner starts isolated app instances automatically. Each test owns a SQLite file, loopback port, and server-side clock; your interactive demo data is untouched.
On first browser execution, the runner installs its pinned Chromium revision if missing.
Browser checks block optional external CDN/fonts and exercise the local CSS fallback.

Current local coverage: 31 direct API checks, 18 Playwright browser journeys, 3 SQL/database checks,
and 8 focused security probes (60 total). Published historical results are labelled separately below.
Database reconciliation compares actual rendered amounts with independent read-only SQL sums.
Screenshots and traces are retained on failure; HTTP responses and SQL evidence are attached to reports.
Retries are disabled. Security probes cover SQL-like login/search/identifier input and reflected/stored XSS contexts.
Only each test's disposable database is modified for untrusted-value setup; no interactive demo records are used.

See [tests/README.md](tests/README.md) for fixtures, isolation, and evidence details.
The HTML report is generated at playwright-report/index.html; open it with npm run report.
JSON and JUnit results are in test-results/. Reports are local and Git-ignored.

npm run check checks JavaScript syntax separately from npm test.
npm run test:repeat repeats the correct build and the defect demonstration ten times each and records
the measured results; see [repeatability](docs/REPEATABILITY.md).

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

Historical matrix (2026-10-25, before multi-item checkout); current measurements are in the audit.

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
See [defect demonstrations](docs/DEFECT-DEMONSTRATIONS.md) for behaviour, evidence, and report commands,
and [case studies](docs/CASE-STUDIES.md) for the three stories with screenshots of each defect.

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
Create a new order with two journals and one pair of headphones: $56 + $45 = $101.
With the flag enabled, the receipt displays $56 while the order, line-item sum, and ledger remain $101.
The current detector builds that order through the browser from an empty database, then compares the
rendered amount against independent SQL. A one-line receipt remains a passing control.

## GitHub Actions

The workflow has four jobs: green verifies the correct build and seven Node unit guards; red verifies all four enabled defects; Live runner integration builds the deployment image and exercises its real subprocess, report ownership, progress, cart preservation, and cancellation under a 1 GB memory limit. Publish deploys the evidence site only after all three checks pass.
Both retain their reports and evidence artifacts even on test failure. Action references are commit-pinned.
The red job succeeds only when the expected failing-test identities match; its underlying test report still contains real failures.

~~~sh
npm run test:red
~~~

This runs the red job's local verification command. Its reports are isolated under defect-reports/red/ and test-results/defects/red/.
The first hosted workflow passed on Ubuntu 24.04: green 34/34, red 22 passing controls plus 12 verified assertion failures.
Both evidence artifacts were downloaded and inspected. See [hosted results](docs/HOSTED-CI-RESULTS.md) and [CI workflow notes](docs/CI.md).

A final job publishes an evidence site built from those artifacts with scripts/build-pages.js: a landing page
with the measured numbers, the green report, and the red report. It runs only on pushes to main.
Published at https://akshat14092003.github.io/release-verification-lab/ - landing page, green report,
and red report, deployed from the artifacts of the same run that verified them.

## Measurements

Current 47-check repeatability sample: **3/3 green runs clean** and **3/3 red runs verified**,
with zero retries. The initial repair sample's failures and the older 34-check observations
are retained separately. See [the complete repeatability record](docs/REPEATABILITY.md).

Historical local baseline (2026-10-25): **34/34 passed in 17.7 seconds**, with CI=true, 2 workers, and zero retries.
Runtime is the latest full baseline in the verified defect matrix.
Current published results: green 47/47 in 49.3s; red 35 controls and 12 intended failures in 58.2s.

The earlier 34-test version was repeated locally ten times each with `npm run test:repeat`: **10/10 green runs clean**
(16.8-22.4s, median 18.5s) and **10/10 red runs verified** with an identical set of 12 intended
failures and 22 passing controls every time (23.9-28.6s, median 26.2s).
That is a ten-run sample on one Windows machine, not a long-run flake rate.
See [repeatability](docs/REPEATABILITY.md).

[Real CI run](https://github.com/Akshat14092003/release-verification-lab/actions/runs/40180501884) - [local baseline](docs/BASELINE-RESULTS.md) - [hosted evidence](docs/HOSTED-CI-RESULTS.md).

<!-- MEASURED: 34 tests passed in 17.7 seconds; Node v22.17.1, Playwright 1.64.1, Windows CI-mode, 2 workers, zero retries. -->
<!-- MEASURED: 10 green runs 10/10 clean, 10 red runs 10/10 verified, 2026-10-25, Node v22.17.1, Windows, 3 workers, zero retries. Long-run flake rate still unmeasured. -->
<!-- MEASURED: successful hosted run https://github.com/Akshat14092003/release-verification-lab/actions/runs/40180501884; green 34/34, red 12 intended failures with 22 passing controls. -->

## Implementation notes

Express serves HTML directly; public assets include local CSS, original interface icons, and supplied product photographs with responsive WebP variants.
Styles are local CSS, with optional Google Fonts.
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
