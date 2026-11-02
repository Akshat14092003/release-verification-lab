# Current verification evidence

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
- Real local runner integration: 47 passes, live progress, owner-only report,
  preserved visitor cart/credit, cancellation response. Docker integration is a
  separate required CI job; local Docker is unavailable on the author's machine.
- `main` requires PRs, current branch checks, resolved conversations, and the
  Correct build / Detect the seeded defects / Live runner integration checks.
  Administrators are included; force pushes and deletion are disabled. No outside
  approval is required for this personal repository.

## Limits

The interactive app is not publicly hosted. The free-only deployment candidate
and account/setup steps are in [HOSTING.md](HOSTING.md). Actual free-host CPU
performance remains unverified; the container CI check constrains RAM, not the
candidate's much smaller CPU allocation.

The browser suite uses Chromium, not Safari/Firefox or real phones. Viewport,
keyboard, and contrast checks do not establish universal accessibility. The
security probes cover their documented inputs, not a security certification or
production commerce readiness. All accounts, credit, and orders are synthetic.

Repeatability reports must retain every observation, including failures; a small
sample is not a long-run flake rate. See [REPEATABILITY.md](REPEATABILITY.md).
