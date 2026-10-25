# Intentional defect demonstrations

All switches default to 0. Set a switch to 1 in the process environment or an explicitly loaded .env.
The corresponding red banner is visible on login and dashboard pages.
These switches alter real application code paths; tests keep their normal assertions.

| Switch | Defect | Evidence |
| --- | --- | --- |
| BUG_AUTH_BYPASS | Credential verification is skipped; an unknown email becomes a zero-credit guest | Invalid logins return 200 or enter the shop |
| BUG_WEEKEND_OFFER | The UTC weekday restriction is omitted | Friday/Monday availability and checkout checks fail |
| BUG_NO_LIMIT | Purchase-time cap is omitted while listing/quote still enforce it | A second direct API purchase succeeds although UI access stays blocked |
| BUG_TOTAL_MISMATCH | Receipt summary uses only the first order line | A two-line $73 receipt displays $28 while SQL and ledger still show $73 |

Single-item receipts remain correct under the total defect, and the normal UI cap remains correct under the direct-request defect.
Those passing controls make each demonstration more specific.

## Run the verification matrix

~~~sh
npm run test:bugs
~~~

It runs the full correct build, each individual switch against its tagged guards, then all four together.
The harness requires exact failing test identities and rejects missing/extra failures, skips, retries,
test timeouts, and non-assertion/setup failures. It does not mark tests as expected-to-fail or ignore every nonzero exit.

The underlying defective test runs still exit with failure and retain their real failure reports.
The outer command succeeds only if the expected detection pattern is verified.

Expected checks:

| Scenario | Executed | Passed | Intended failures |
| --- | --- | --- | --- |
| Baseline | 34 | 34 | 0 |
| Auth | 5 | 0 | 5 |
| Weekend | 7 | 2 | 5 |
| Limit | 2 | 1 | 1 |
| Total | 2 | 1 | 1 |
| All four | 34 | 22 | 12 |

Measured on 2026-10-25: all six scenarios matched these counts. The completed summary is test-results/defects/summary.json.
Each report carries a unique run token, preventing stale output from counting as verification.

## Reports

- Correct-build HTML: playwright-report/index.html.
- Defect HTML: defect-reports/auth, weekend, limit, total, and all/index.html.
- Individual JSON/JUnit, screenshots, traces, SQLite files, and HTTP/SQL attachments: test-results/defects/.
- Matrix outcome: test-results/defects/summary.json.
- Use npx playwright show-report defect-reports/auth to open an individual report.

Only synthetic records are used. The app binds to loopback by default.
Security probes are implemented. The two SQL-like-login guards also fail under auth bypass; that is credential-bypass evidence, not a SQL-parser-injection finding.
GitHub Actions is implemented, linted locally, and verified on hosted runners; see [hosted results](HOSTED-CI-RESULTS.md). npm run test:red verifies the red job command in isolation.
