# Current verification evidence

The current local revision has **60 release checks** (31 API, 18 browser, 3 database,
8 security). On 2026-11-05, green passed **60/60 in 115.7 seconds** with two workers.
Strict red matched **48 passing controls / exactly 12 intended failures in 138.2 seconds**.
Unit guards passed **9/9** and syntax checks covered 48 JavaScript files.
The shared-store browser case saves a price in admin and observes it in a separate buyer
browser without a link, checks checkout/admin order visibility and separate carts/permissions,
and confirms shared-reset cancellation. Unit coverage verifies persistence across restart,
visitor expiry, reset invalidation and loopback/default-isolation configuration.
Multi-context lab cases run in file order to bound browser load; retries remain zero.
The new browser case opens a linked buyer window, checks automatic price updates without
navigation, preserves quantity selection, joins another browser with a one-use link, proves
unrelated-shop isolation and verifies independent admin/customer logout. Additional real-UI
audits at 390/1440px cover all catalogue fields, hide/restore, checkout pricing, paid history,
fulfilment, balances, creation, retained buyer cart and reset invalidation of unused links.
Six buyer-control layouts cover 320/390/1440px in both themes without document overflow.
Admin credential/role rejection, safe return destinations and failure without session creation
are covered in the existing admin API case, including with intentional customer defects enabled.
These are local results; no hosted CI or publication was performed for this revision.
The linked-browser case also checks an existing Incognito tab recovers when a second tab
joins another shop with the same revision counter. Both windows display matching public Shop
references; subsequent same-shop price changes still update without navigation.

The preceding 59-check revision passed59/59 in79.7s and strict red47 controls/exact12 failures
in93.6s, with8 unit guards. It added the original explicit buyer-link workflow.

The preceding 58-check QA/header/admin-portal revision passed 58/58 in 70.0 seconds and
red 46 controls/exactly 12 intended failures in 82.1 seconds. Its fourteen width/theme checks
covered delayed-JS header geometry, mobile navigation, offers and the admin portal.

The preceding admin-workspace revision had **54 release checks** (27 API, 16 browser,
3 database, 8 security). Local checks on 2026-11-04 passed **54/54** with two workers (74.5 seconds),
red verification matched **42 passing controls / 12 intended failures** (82.1 seconds),
and unit guards passed **8/8**. Ten admin width/theme combinations passed (320/390/850/1024/1440px,
light/dark), covering empty shops, real multi-item customer purchases, management navigation,
filters and receipts, with no document overflow or page errors. Guide actions, inline product
creation, error retention and HTML fallback passed. The preceding role-separation pass also
verified the blocked interactive repeat-offer purchase. No hosted CI or publication for this revision.

The preceding signup/admin revision had **53 release checks** (26 API, 16 browser,
3 database, 8 security), with 8 separate unit guards. Published results below describe
the earlier 47-check revision. The new revision has not been published or CI-verified yet.

Earlier signup/admin validation on 2026-11-04: **53/53** with two workers (1.9 minutes), red **41 passing
controls and exactly 12 intended failures** (186.0 seconds), and **8/8 unit guards**.
The real one-worker runner completed **53 passes**, streamed progress, preserved cart/credit,
served its owner-only report and verified cancellation. The signup/login/admin screens passed
18 width/theme combinations (320, 390, 1440px; light/dark), with no horizontal overflow or
page errors. Signup fit the tested 844/900px viewport heights without internal form scrolling.
An additional malformed-admin-form recovery check passed after the full-suite run.

## Published release

The [main run for ed0605f](https://github.com/Akshat14092003/release-verification-lab/actions/runs/41453518469)
passed on Ubuntu: green **47/47 in 49.3s**; red **35 passing controls and exactly
12 intended failures in 58.2s**. The [evidence site](https://akshat14092003.github.io/release-verification-lab/)
contains those reports and traces. Historical 34-test measurements are retained
in dated documents; they do not describe the current suite.

Coverage is 21 API, 15 browser, 3 database, and 8 focused security checks. Four
defect-detection and three runner lifecycle unit guards run separately.
Retries remain zero. Extra failures, timeouts, skips, stale reports, and wrong
failing identities cannot count as verified detection.

## Readiness repair validation

- UI sweep: 42 page/viewport/theme combinations, widths 320/390/1280, light/dark;
  no document overflow. All 34 sampled text/background contrast checks passed.
- Manual multi-item checkout: two journals and one headphones purchase records
  $101; the enabled receipt bug displays $56 while the ledger remains $101, in
  both themes at all three widths.
- Reset confirmation: cancellation preserves orders; confirmation clears only
  that visitor's cart/orders/session and restores credit.
- Settings now publish their applied state after refreshed content arrives.
  The browser regression delays that response deliberately and checks that the
  displayed clock does not announce the new day prematurely. Reset checks wait
  for the signed-out page, rather than an unchanged URL, before reading state.
- Current repeatability: three green runs at 47/47 and three red runs at 35/12,
  all accepted with zero retries. The initial five-pair study had two unexpected
  UI failures in its first green run and remains published separately.
- [Container CI 41500794090](https://github.com/Akshat14092003/release-verification-lab/actions/runs/41500794090)
  passed the live integration at one worker, one CPU, 1 GB RAM: 47 passes,
  verified report/progress/ownership, preserved cart/credit, cancellation, and
  container exit 0 without OOM. The standard server entry point was checked too.
- Main run 41503705053 rejected the immediate post-resize admin measurement
  (359px before the navigation resize listener finished). The regression now
  waits for the actual responsive reflow before requiring zero document overflow;
  its width limit and the suite's zero-retry policy are unchanged.
- PR #6 run 41504346951 matched the twelve defect detectors but also timed out
  in the mobile report-controls journey after a theme change. A deliberately
  extended native View Transition reproduced pointer interception by the root
  snapshot. Theme changes now use the existing color/icon transitions inside
  open dialogs; the full reveal remains enabled on the storefront. The browser
  regression checks both paths without adding retries or increasing timeouts.
- Real local runner integration: 47 passes, live progress, owner-only report,
  preserved visitor cart/credit, cancellation response. Docker integration is a
  separate required CI job; local Docker is unavailable on the author's machine.
- `main` requires PRs, current branch checks, resolved conversations, and the
  Correct build / Detect the seeded defects / Live runner integration checks.
  Administrators are included; force pushes and deletion are disabled. No outside
  approval is required for this personal repository.

## Limits

The interactive app is not publicly hosted. The free-only requirement and hosting findings are in [HOSTING.md](HOSTING.md).
Render Free was rejected after a 512 MB container ran out of memory. The 1 GB
reference container does not establish suitability for an available free host.

The browser suite uses Chromium, not Safari/Firefox or real phones. Viewport,
keyboard, and contrast checks do not establish universal accessibility. The
security probes cover their documented inputs, not a security certification or
production commerce readiness. All accounts, credit, and orders are synthetic.

Repeatability reports must retain every observation, including failures; a small
sample is not a long-run flake rate. See [REPEATABILITY.md](REPEATABILITY.md).
