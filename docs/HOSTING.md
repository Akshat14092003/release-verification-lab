# Hosting

## Cloud Run deployment - 2026-11-13

- Public URL: https://release-verification-lab-326570610390.us-central1.run.app
- Project/service: `release-verification-lab`; region: `us-central1`.
- Revision: `release-verification-lab-00001-sl4`; application commit: `25c530b`.
- Image: `us-central1-docker.pkg.dev/release-verification-lab/lab-images/lab:25c530b`.
- Runtime: one CPU,2 GiB RAM, second-generation execution; minimum instances0,
  maximum1, concurrency20, request timeout900 seconds; CPU throttling disabled.
- Environment: `HOST=0.0.0.0`, `PORT=3000`, `LAB_SHARED_SHOP=0`,
  `LAB_TEST_WORKERS=1`, `TRUST_PROXY=1`.
- Separate service accounts: `lab-builder` has `roles/run.builder`; `lab-runtime`
  runs the website without project-wide roles. Container builds log to Cloud Logging.

[CI for the deployed code](https://github.com/Akshat14092003/release-verification-lab/actions/runs/43404490112)
passed the correct-build, seeded-defect and real container-runner jobs. The current
suite contains60 checks; all four defects produce12 expected failures and48 passing
controls. Live HTTPS/browser checkout, independent visitors, secure cookies, a
60/60 baseline and a weekend-defect run with55 passes/5 matching failures are
verified. Both run reports return200 for their owner and404 for another visitor.
Advancing the demo clock can expire a login; signing in again preserves cart/credit.
Smoke evidence and the clock/session check are in ignored
`test-results/cloud-run-25c530b/summary.json`.

Cloud Run currently serves the Express-rendered pages and API. Vercel is not yet
connected. GitHub Pages is a separate site for historical saved evidence.

The owner selected usage-based Cloud Run after reviewing possible charges. It has
a monthly free allowance, not a guaranteed zero bill. Instance lifetime, including
idle time before scale-down, is billed under instance-based billing. Builds, image
storage, logs and network transfer have separate allowances/pricing. Budget alerts
are notifications, not a spending cap. Open demo tabs poll the server and can keep
it active. Visitor shops and reports are temporary and can disappear on restart,
redeployment or scale-down. No external database or paid persistent disk is used.

Updates stay on `master-branch`. The existing workflow auto-triggers on `main`, so
run it manually on `master-branch` before deployment. Build the Dockerfile with a
commit-specific image tag, deploy that tag with the same runtime settings, and
verify the live service. The earlier free-only restriction and47-test checklist
below describe the previous hosting assessment and are not current configuration.

Sources: [Cloud Run billing](https://cloud.google.com/run/docs/configuring/billing-settings),
[Cloud Run pricing](https://cloud.google.com/run/pricing),
[Cloud Build service accounts](https://cloud.google.com/build/docs/securing-builds/configure-user-specified-service-accounts).

## Historical free-host assessment

GitHub Pages hosts saved evidence only. The interactive shop needs Node 22,
SQLite, Chromium, writable temporary storage, and permission to spawn processes.

`Dockerfile` installs the locked Playwright browser and Linux libraries, includes
the release tests, and runs as the unprivileged `node` user. `.dockerignore`
allows only runtime source, tests, and package metadata into the build context.

### Previous hosting status

No hosting account or live app has been provisioned. The budget is **free only**.
Do not select a paid instance or persistent disk.

Render Free was evaluated and rejected for the current runner. Its 512 MB RAM
limit caused Chromium page crashes in [container CI](https://github.com/Akshat14092003/release-verification-lab/actions/runs/41498874988).
The saved container state reports `OOMKilled: true`; the baseline finished with
30 passes and 17 execution failures, correctly rejected as unverified.
The proposed Render manifest was removed instead of publishing a known-broken
one-click setup. Its 0.1 CPU allocation would also need performance validation.

The required CI integration uses a one-CPU, **1 GB** reference container. This
does not establish that any free hosting plan can run the app. No paid resource
has been created. Until a suitable free compute account is available, use the
local interactive app and the public GitHub Pages evidence.

### Previous host-validation checklist

1. Connect a personal account offering sufficient free Docker compute. Confirm
   the free allowance and limits before creating anything.
2. Deploy this image from `main` only after CI passes. Use `HOST=0.0.0.0`, the
   platform's `PORT`, and `LAB_TEST_WORKERS=1`; configure proxy trust for its
   actual proxy topology rather than copying a host-specific setting blindly.
3. Inspect `/health` and `/products` over HTTPS.
4. Run Correct build from the website: require 47 passes, a report, preserved
   cart/credit, and no timeout. Then enable Login + Weekday and require exactly
   10 expected failures with 37 passing controls. Check two independent visitors.
5. Add the actual public URL to the README only after those checks pass.

The real deployment must meet the existing execution limits. Do not hide failures
or loosen detector rules to make an undersized host appear supported.

Free services sleep after 15 minutes idle; waking can take about a minute.
Temporary files and visitor sessions disappear on restart/redeploy/sleep.
The workspace has a free-hours allowance, so review usage before adding services.
There is intentionally no external database: each visitor has an isolated
in-memory SQLite shop; test data and reports are disposable.

`LAB_TEST_WORKERS=1` limits browser concurrency on the host. Local and hosted
release CI retain their normal worker count and all 47 checks. Local default
remains loopback without proxy trust.

Sources: [Render free services](https://render.com/docs/free),
[Blueprint configuration](https://render.com/docs/blueprint-spec),
[Docker deployment](https://render.com/docs/docker),
[Playwright containers](https://playwright.dev/docs/docker).

## Local image check

```sh
docker build -t release-verification-lab .
docker run --rm -p 3000:3000 release-verification-lab
docker run --rm --no-healthcheck --memory=1g --memory-swap=1g --cpus=1 -e CI=true release-verification-lab npm run test:runner
```

Do not mount private folders or pass real credentials. Public demo accounts are
synthetic. The workflow uploads the integration result and container state/logs
as `live-runner-evidence`, including when the check fails.
