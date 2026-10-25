# Walkthrough recording script

Target length: 5 minutes. Screen recording with voice-over, no face cam required.
Everything below is already implemented; nothing in this script requires new code.

## Before recording

- `npm ci`, then `npm run seed -- --reset` with the app stopped, so credit and orders start known.
- Open a terminal at the project root and a browser at http://127.0.0.1:3000.
- Terminal font large enough to read at 1080p; browser at 1440x1000.
- Close unrelated tabs, notifications, and any company windows.
- Have these ready in separate tabs: the repo, the hosted run
  https://github.com/Akshat14092003/release-verification-lab/actions/runs/40180501884.
- Confirm all four BUG_ flags are unset in the shell you record in.

## 0:00-0:30 - What this is

Shot: README top in the browser.

> This is the Release Verification Lab. It's a small fictional shop, plus the automated checks that
> decide whether a release is fit to ship. The point isn't the shop. The point is that I can switch on
> a realistic defect and show you the same checks catching it, with evidence.

## 0:30-1:15 - The application

Shot: log in as customer@example.test, visit /products, /offers, /checkout, /orders/1, then /admin as admin.

> Customer, store owner, and admin roles. Product search, a weekend-only offer, checkout at
> server-owned prices, one purchase per user for that offer, and an order ledger. All synthetic data,
> no payment gateway. The receipt here is $73 across two lines, and those same amounts are recorded
> independently in the ledger - that matters in a minute.

## 1:15-2:00 - The correct build passes

Shot: run `npm test` and let it finish on camera.

> Thirty-four checks across four layers: API checks that skip the interface, browser checks with page
> objects, SQL checks that recompute totals from stored records, and eight security probes for
> SQL-like input and cross-site scripting. All thirty-four pass in about eighteen seconds.

Shot: `npm run report`, scroll the HTML report briefly.

## 2:00-3:00 - Switch on a real defect

Shot: start the app with `BUG_WEEKEND_OFFER=1`, show the red banner, buy the weekend offer on a weekday.

> Nothing in the tests changes. This flag removes the server's weekday guard, so the weekend offer is
> purchasable on a Monday. The banner is there so nobody mistakes a demo build for the real one.

Shot: run the weekend scenario and show the failures in the report, including the screenshot and trace.

> Five specific checks fail, at the layers you'd want them to fail at, and the valid weekend checks
> still pass. The failure comes with a screenshot, a trace, and the actual HTTP response.

## 3:00-3:45 - Failing for the right reason

Shot: `npm run test:red`, then open `test-results/defects/red-summary.json`.

> A red X on its own proves nothing - a broken setup looks the same. So the harness matches exact
> failing-test identities. Twenty-two controls must still pass, these twelve named checks must fail,
> and the report has to carry a fresh per-run token. Stale reports, extra failures, skips, retries,
> timeouts, and setup errors are all rejected.

## 3:45-4:15 - The money check

Shot: `BUG_TOTAL_MISMATCH=1`, open order 1, show $28 displayed.

> The receipt now shows twenty-eight dollars. The stored order, the line items, and the ledger still
> say seventy-three. The SQL layer recomputes the total independently of whatever the page renders,
> which is the only way to catch a displayed total that lies.

## 4:15-5:00 - CI and the numbers

Shot: the hosted run, both jobs green, artifacts list.

> On GitHub Actions the green job has to pass before the red job runs, and the red job only succeeds
> if the exact intended failures are verified. Both jobs upload their evidence either way.
> Green was thirty-four of thirty-four in 17.8 seconds; red verified twelve intended failures in 27.1.

Shot: `docs/REPEATABILITY.md`.

> Repeated locally, these are the numbers I measured - not an estimate. Everything here is in the
> repo, including the defect reports and the case studies. Thanks for watching.

## Rules for the recording

- Show real runs. Do not splice a failed take's output into a passing one.
- Quote only numbers from the committed docs; if a live run disagrees, re-record or update the doc.
- Say "intended failure" every time red output appears on screen.
- No company systems, real accounts, private notes, or anything from `.local/` on camera.
