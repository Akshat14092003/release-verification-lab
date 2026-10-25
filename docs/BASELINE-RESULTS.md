# Correct-build baseline results

Recorded: 2026-10-25. Command: npm run test:bugs, baseline phase, with CI=true.

| Check | Result |
| --- | --- |
| Full baseline | 34 passed, 0 failed, 0 skipped |
| API | 15 passed |
| Browser | 8 passed |
| SQL/database | 3 passed |
| Security | 8 passed |
| Elapsed suite duration | 17.7 seconds |
| Workers / retries | 2 / 0 |
| Node / Playwright | v22.17.1 / 1.64.1 |
| Platform | Local Windows, CI-mode configuration |

Duration is read from test-results/results.json. This is not a GitHub-hosted run.
Each test has an isolated server, SQLite file, and clock. Database reconciliation uses independent SQL.
Security probes include four SQL-like-input checks and four reflected/stored XSS contexts.

The initial Step 2 development run had three offer-navigation selector failures; the locator was corrected before the earlier 26-test baseline passed.
Subsequent security additions expanded the suite to 34 tests. No application behaviour was changed for the security tests.

Reports: playwright-report/index.html; test-results/results.json and junit.xml.
Hosted CI execution is now verified separately in [HOSTED-CI-RESULTS.md](HOSTED-CI-RESULTS.md).
Cross-browser coverage and long-run flake rate remain unmeasured; a ten-run local sample is recorded in [repeatability](REPEATABILITY.md). Report publication is live at https://akshat14092003.github.io/release-verification-lab/.
