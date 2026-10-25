# GitHub Actions verification

Workflow: .github/workflows/release-verification.yml.
Status: implemented and actionlint-validated locally; no hosted run or public repository exists yet.

## Jobs

| Job | Configuration | Required outcome |
| --- | --- | --- |
| green | All flags 0, Node 22.17.1, Ubuntu 24.04 | All 34 tests pass |
| red | Depends on green; all flags 1 | Exactly 12 known failures, 22 passing controls |

The underlying red Playwright run exits 1 and contains real red assertions.
The validation wrapper exits 0 only after checking exact failing identities, fresh report identity, test count, and absence of skips/setup failures.
Unexpected outcomes fail the job. No blanket continue-on-error is used.

## Evidence and permissions

- HTML, JSON/JUnit, screenshots, traces, HTTP/SQL evidence, and disposable test databases are uploaded.
- Artifacts green-evidence and red-evidence have 14-day retention and upload with always(), including when tests fail.
- Job summaries include pass counts and detector-verification status.
- Only contents: read is granted. Checkout credential persistence is disabled.
- Actions are pinned to commit SHAs resolved from the official v7 references.
- No production service or account secret is required. All accounts/data are synthetic.

## Local verification performed

- Clean npm ci completed; 72 packages audited, 0 vulnerabilities reported at that time.
- All 34 correct-build tests passed with CI=true and 2 workers.
- The six-phase defect matrix and the separate red-only command verified.
- Both job-summary commands produced the expected Markdown.
- actionlint 1.7.12 passed; its official release archive was SHA256-checked.
- Optional shellcheck/pyflakes integrations were disabled; workflow commands are direct npm/Node invocations.

Local validation does not prove GitHub runner provisioning, Linux browser libraries, artifact upload, or hosted summaries.
Those require the first authorized repository push/Actions run. Do not replace the CI-run-link placeholder until that run exists.

## Run locally

~~~sh
npm ci
npm run check
npm test
npm run test:security
npm run test:bugs
npm run test:red
~~~

For full Ubuntu-like browser setup on a supported Linux machine: npx playwright install --with-deps chromium --no-shell.
Security tests always use each test's disposable database, including deliberate untrusted-value setup.

References: [Playwright CI](https://playwright.dev/docs/ci-intro), [workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), [artifact retention/upload](https://docs.github.com/en/actions/tutorials/store-and-share-data).
