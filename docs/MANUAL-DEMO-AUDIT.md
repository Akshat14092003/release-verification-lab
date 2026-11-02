# Manual demo audit - 2026-11-01

This records the 38-test checkout revision. The later 42-test visitor interface and real test-run
buttons are described in [INTERACTIVE-DEMO.md](INTERACTIVE-DEMO.md); measurements below remain historical.

Scope: checkout, manual reproduction of the four existing defects, reset behaviour, authoritative
pricing, order/ledger consistency, test evidence, and command documentation. All data is synthetic.
This revision is local; the published GitHub reports still describe the earlier 34-test version.

## Findings and changes

| Finding | Change |
| --- | --- |
| Checkout accepted one product and hardcoded quantity 1, making the multi-line receipt defect impossible to create manually | Checkout now selects products and quantities and quotes a complete order before purchase |
| Interactive startup created the sample receipt automatically | New manual databases start with $1,000 per account and zero purchases; `--fresh` repeats this state; only explicit `--reset` restores the sample |
| The total detector depended on receipt #1001 | The detector starts with no orders, creates a multi-item order through the UI, and reconciles the resulting receipt using independent SQL |
| Multi-item requests need validation beyond the original single-item path | Reject empty/malformed baskets, invalid quantities/IDs, duplicate products, and offer quantity above 1; recalculate all prices and eligibility on the server |
| A basket must not partially spend credit or claim an offer | Validate combined credit and commit the order, all lines, and ledger entries in one transaction; failed baskets roll back |
| Demo environment flags could affect the normal test command | Correct-build npm test/layer commands force flags off; the defect verifier explicitly selects its own scenario |
| Commands were scattered and previous measurements could be read as current | Added COMMANDS.md, labelled the earlier 34-test measurements, updated current counts, and retained the old raw observations |

The defect switches still change real app behaviour. There are no fixed order IDs or test-only
failure responses in checkout. The server obtains products and prices from SQLite, derives the
customer from the session, and checks offer time/caps again when committing the purchase.

## Manual reproduction from a clean shop

See [the command guide](../COMMANDS.md) for complete copyable commands and reset/stop instructions.

| Defect | Manual trigger | Evidence |
| --- | --- | --- |
| Auth bypass | Enable auth flag; submit a wrong password | Customer reaches Products instead of receiving a login rejection |
| Weekday offer | Enable weekend flag; run the server with the fixed Monday clock; buy the offer | Monday date plus successful receipt; fixed build blocks it |
| Purchase cap | Enable limit flag; claim once through UI, then send a second purchase from the browser console | UI says claimed; direct request incorrectly returns 201; fixed build returns 409 |
| Total mismatch | Enable total flag; select two journals and one pair of headphones in Checkout | Quote $101; receipt incorrectly $56; Transactions $101; remaining credit $899 |

For the total demo, disable the flag and reload the same receipt: it then displays $101 without
changing the stored purchase. Any order with multiple product lines can expose this defect.

## Verification

- Syntax: all 26 JavaScript files passed.
- First full baseline: 38/38 passed, zero skips/flakes (20.5s, local Windows, 3 workers, 0 retries).
- New checks cover server pricing/quantities, invalid basket rollback, insufficient combined credit,
  and mobile checkout. Existing limit and weekday rollback detectors now exercise mixed-item baskets.
- The updated full matrix passed locally:

| Scenario | Passed | Intended failures | Suite duration |
| --- | --- | --- | --- |
| Baseline | 38 | 0 | 18.8s |
| Auth | 0 | 5 | 8.6s |
| Weekend | 2 | 5 | 10.9s |
| Limit | 1 | 1 | 3.6s |
| Total | 1 | 1 | 4.4s |
| Combined | 26 | 12 | 27.5s |

Matrix evidence: `test-results/defects/summary.json`. The total failure contains the newly created
receipt, SQL comparison, database snapshot, and full-page screenshot.
- Red-only verifier: 26 controls and exactly 12 intended failures (25.6s).
- Correct-build environment probe: all four flags supplied as 1 to the launcher; 38/38 still passed
  (18.3s), confirming that manual flags do not contaminate baseline checks.
- Final checkout-query review: browser 9/9 and database 3/3 passed.
- Separate visual reproduction from another empty database used **3 mugs + 2 lamps = $132**.
  Checkout quoted $132; the flagged receipt showed $54 with ledger $132; disabling the flag made
  that same stored receipt display $132. Captures are local under `.local/manual-demo-audit-GViTYq/`.
The earlier 10+10 repeatability sample has not been rerun for the expanded suite.

## Deliberate limits

- The checkout form retains selections in its quote URL; there is no persistent cross-page cart.
- At most 20 product lines, quantities 1-99, one promotion per order, quantity 1 for an offer item.
- Synthetic catalogue and accounts remain deterministic starting data. Purchases are created by
  the user's actions; the optional older sample remains available for historical comparisons.
- Some isolated ownership/security fixtures still use the explicit sample. That is independent
  of the fresh UI path used by the total detector and manual demonstrations.
- Owner-management workflows and real payments remain outside this project's scope.
