# Release Verification Lab

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary audience: hiring reviewers evaluating a QA/SDET portfolio. They need to
understand the failure, reproduce it, inspect evidence, and assess the release
decision without access to private work.

Customer and administrator are demonstration roles within the synthetic shop.

## Product Purpose

Provide public, reproducible proof of release verification skills. Visitors explore
a working shop, enable realistic defects, run real checks, and inspect results.
Success means a reviewer can connect a defect to its detection, evidence, and
verified correct behaviour. Portfolio and release evidence take priority over
expanding shopping functionality.

## Positioning

The same synthetic application supports four toggleable defects and four test
layers: browser, API, database, and security. Correct-build checks and intended
defect failures demonstrate why a release should pass or be blocked.

## Operating Context

- Node.js 22.13+ and Express serve HTML with plain browser JavaScript and CSS.
  SQLite uses Node's built-in module; Playwright runs the automated checks.
- `npm start` opens the interactive lab at `http://127.0.0.1:3000` by default;
  `npm run dev` enables server watching. `npm run start:shop` runs the separate
  original shop mode.
- The landing page introduces the lab; `/products`, `/offers`, product details,
  `/cart`, `/checkout`, and `/orders` provide the customer journey.
- The QA playground exposes defect toggles, the demo day, reproduction guidance,
  live test progress, and reports.
- `/admin/login` leads to product, order, customer, and signup-request management.
- Local browsers share a persistent shop by default. Admin changes reach buyers;
  sessions and carts remain separate. Automated runs use isolated data.

## Capabilities and Constraints

- Four deliberate defects: authentication bypass, weekend-offer expiry bypass,
  purchase-limit bypass, and receipt/ledger total mismatch. Keep their identities
  and real detection paths intact.
- Guests can browse and build carts. Customer signup requires admin approval;
  approved customers sign in afterward. Admin and customer authentication remain
  separate. The customer authentication demonstration must not bypass admin checks.
- Purchases use synthetic credit, not a payment gateway. Server pricing, order
  records, and ledger reconciliation are central to the demonstration.
- Shared-shop reset affects all browsers and requires clear confirmation.
- Use original code and synthetic accounts, products, and transactions only.
  Exclude employer material, real customer data, private notes, and credentials.
  `.local/` remains private and ignored.
- Work directly on `master-branch` unless the user changes that instruction.
  Publication and deployment require authorization within the requested scope.
- Feature expansion beyond the approved lab scope is not an implicit roadmap.

## Brand Commitments

Release Verification Lab is the portfolio project name; Fieldwork is the fictional
shop identity in the current implementation. Preserve that distinction. No new
voice or visual direction was selected during init.

## Evidence on Hand

- `tests/`: browser journeys, direct API checks, SQL reconciliation, security
  probes, and unit checks.
- `README.md`, `COMMANDS.md`, and `docs/INTERACTIVE-DEMO.md`: project explanation,
  operation, and reproduction guidance.
- `public/images/`: existing demo imagery; existing rendered UI is the incumbent
  visual implementation.
- `.github/workflows/`: hosted verification configuration. README links to public
  source and published evidence; historical results are version-specific.
- Test counts, runtimes, repeatability, deployment, and hosted results must be
  verified for the revision being described. Init does not establish fresh results.
- No testimonials, customer endorsements, or commercial outcomes were established.

## Product Principles

- Make release decisions traceable to reproducible evidence.
- Run real checks against real application behaviour; never simulate a result.
- Keep intentional defects explicit and distinguish them from accidental failures.
- Preserve role boundaries, cart isolation, and disposable test data.
- Keep the lab small enough for a reviewer to understand and run independently.

## Open Decisions

No product-specific accessibility standard or new brand voice was selected.
Existing responsive and reduced-motion behaviour remains part of the incumbent
implementation; future work must assess its actual coverage.
