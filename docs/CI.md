# GitHub Actions verification

Workflow: .github/workflows/release-verification.yml.
Status: published and verified on GitHub Actions. [Successful run](https://github.com/Akshat14092003/release-verification-lab/actions/runs/40180501884).

## Jobs

| Job | Configuration | Required outcome |
| --- | --- | --- |
| green | All flags 0, Node 22.17.1, Ubuntu 24.04 | All 34 tests pass |
| red | Depends on green; all flags 1 | Exactly 12 known failures, 22 passing controls |
| publish | Depends on both; push to main only | Deploys the evidence site to GitHub Pages |

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

The first hosted run completed both jobs successfully on Ubuntu 24.04. Browser dependency setup, tests, summaries, and artifact uploads succeeded.
The downloaded green/red artifacts confirm 34 correct-build passes and exactly 12 intended red failures with 22 passing controls.
See [hosted verification](HOSTED-CI-RESULTS.md).

## Evidence site

The publish job downloads the green-evidence and red-evidence artifacts, runs scripts/build-pages.js,
and deploys the result with the official Pages actions. It never re-runs the tests, so the published
reports are exactly the ones the verified jobs produced. It is skipped on pull requests and on
branches other than main, and uses its own pages-publish concurrency group so a deploy is not cancelled.

Job permissions are scoped to that job: pages: write and id-token: write, with the workflow default
remaining contents: read. Every added action is commit-pinned.

Build the same site locally from existing local reports:

~~~sh
npm test
npm run test:red
node scripts/build-pages.js
~~~

Status: validated locally with actionlint 1.7.12 (exit 0) and by building and rendering site/index.html,
site/green/index.html, and site/red/index.html without page errors. The repository's Pages source is set
to GitHub Actions; the published URL is recorded here once a deployment has run and been verified.

## Repeatability

Ten consecutive local green runs and ten red runs: 10/10 clean and 10/10 verified.
See [repeatability](REPEATABILITY.md).

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
