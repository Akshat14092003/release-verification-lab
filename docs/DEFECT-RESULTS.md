# Measured defect-detection results

Recorded: 2026-10-25. Local Windows, Node v22.17.1, CI=true, 2 workers, no retries.
Command: npm run test:bugs.

| Scenario | Checks | Passes | Intended failures | Duration |
| --- | --- | --- | --- | --- |
| baseline | 34 | 34 | 0 | 17.7s |
| auth | 5 | 0 | 5 | 9.3s |
| weekend | 7 | 2 | 5 | 11.7s |
| limit | 2 | 1 | 1 | 3.4s |
| total | 2 | 1 | 1 | 3.2s |
| all | 34 | 22 | 12 | 30.1s |

All six phases verified. Exact failing assertions matched; no blanket continue-on-error or expected-failure annotations.
Security login probes add two auth-bypass detectors, expanding the combined expected failures from 10 to 12.
These failures establish missing credential rejection, not SQL injection in the parameterized query.

Red CI command also checked locally: npm run test:red.
Result: 22 passing controls and 12 intended failures in 29.5s.
Fresh per-run identity is required in each report. Red-only reports do not overwrite the six-phase matrix.

Matrix: test-results/defects/summary.json. Red-only verdict: test-results/defects/red-summary.json.
HTML: playwright-report/, defect-reports/{auth,weekend,limit,total,all,red}/.
HTTP/SQL evidence, screenshots, traces, and disposable databases remain under test-results/.

The GitHub workflow passes local actionlint validation. It has not run on GitHub or Ubuntu yet.
