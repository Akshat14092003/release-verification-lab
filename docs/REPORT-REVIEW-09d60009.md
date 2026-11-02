# Login and weekday-offer run review

Run: `09d60009-05d3-4f96-b471-987245ed2a9b`. Reviewed 2026-11-01.

The user enabled Login and Weekday offers. The saved report contains **47 checks:
37 passes and exactly 10 intended failures**. All ten failing identities match the
combination defined in `src/defects.js`. No unexpected extra failure, skipped check,
flaky result, top-level report error, or test-timeout result was found.

The run started at 16:25:05 IST and took 279.7 seconds, with two workers and no retries.
This is a review of that saved run, rather than a claim about a new CI execution.

| Layer | Failed check | Evidence and interpretation |
| --- | --- | --- |
| API | Wrong-password login | Expected HTTP 401, received 200 with an authenticated existing customer. |
| API | Unknown-account login | Expected HTTP 401, received 200 with a newly provisioned unverified guest. |
| Browser | Invalid credentials show an error without logging in | After the wrong-password submission, `/api/auth/me` returned 200 instead of 401: a real session was created. |
| Security | SQL-like email cannot authenticate | Expected 401, received 200. Login bypass accepted an unknown email and provisioned a guest. |
| Security | SQL-like password cannot authenticate | Expected 401, received 200. Login bypass skipped verification of the existing customer's password. |
| API | Friday before opening | Availability was true instead of false outside the UTC weekend. |
| API | Monday at closing | Availability was true instead of false after the UTC weekend ended. |
| Browser | Monday offer unavailable | The expected unavailable message was absent because the defective offer remained purchasable. |
| Browser | Sunday checkout refused after Monday begins | The expected weekday rejection heading was absent because checkout allowed the purchase. |
| Database | Rejected weekday purchase leaves data unchanged | The purchase returned 201 instead of 409 and created order 1002 for $64 on Monday. |

The two browser offer checks contain a normal five-second **assertion wait** for the
missing rejection message. Their attempt status is `failed`, not `timedOut`; they are
expected detectors of the enabled offer defect, not setup failures.

The SQL-like input failures demonstrate the enabled **authentication bypass**. They do
not establish a SQL injection vulnerability: login still uses parameterized queries.

Code cross-check: `src/auth.js` conditionally skips password checking and provisions unknown
accounts under `BUG_AUTH_BYPASS`. `src/shop.js` conditionally skips weekday restrictions
under `BUG_WEEKEND_OFFER`. Purchase-cap and receipt-total detectors stayed green, as expected.

Evidence reviewed: the run's `results.json`, error messages, HTTP response attachments,
database evidence and browser snapshots in `.data/demo/runs/09d60009-05d3-4f96-b471-987245ed2a9b/`.
The original run artifacts were not modified.
