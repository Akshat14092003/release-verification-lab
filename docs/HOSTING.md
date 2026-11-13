# Hosting

## Cloud Run deployment - 2026-11-13

- Public URL: https://release-verification-lab-326570610390.us-central1.run.app/
- Cloud Run hosts the complete website; Vercel is no longer needed.
- Project/service: `release-verification-lab`; region: `us-central1`.
- Latest owner-reported revision: `release-verification-lab-00003-lh6`;
  application commit: `9b00923`.
- Image: `us-central1-docker.pkg.dev/release-verification-lab/lab-images/lab:9b00923`.
- Runtime: one CPU,2 GiB RAM, second-generation execution; minimum instances0,
  maximum1, concurrency20, request timeout900 seconds; CPU throttling disabled.
- Environment: `HOST=0.0.0.0`, `PORT=3000`, `LAB_SHARED_SHOP=0`,
  `LAB_TEST_WORKERS=1`, `TRUST_PROXY=1`,
  `PUBLIC_ORIGIN=https://release-verification-lab-326570610390.us-central1.run.app`
  following the owner's reported configuration update.
- Separate service accounts: `lab-builder` has `roles/run.builder`; `lab-runtime`
  runs the website without project-wide roles. Container builds log to Cloud Logging.

[CI for the deployed code](https://github.com/Akshat14092003/release-verification-lab/actions/runs/43412064403)
passed the correct-build, seeded-defect and real container-runner jobs. The current
suite contains60 checks; all four defects produce12 expected failures and48 passing
controls. The original25c530b Cloud Run rollout verified browser checkout,
independent visitors, secure cookies, a60/60 baseline and a weekend-defect run with
55 passes/5 matching failures. Both reports returned200 for their owner and404 for
another visitor. Its smoke evidence remains in `test-results/cloud-run-25c530b/`.
Advancing the demo clock can expire a login; signing in again preserves cart/credit.
The Vercel-compatible9b00923 rollout verifies origin handling, browser sign-in,
checkout, desktop/mobile layout, secure cookies, independent visitors and a real
60/60 baseline through the public Vercel URL. Live progress, readable iframe report,
owner-only report access and preserved cart/credit all pass. The smoke verifier
completed successfully with no browser page errors.
Current smoke evidence is in ignored `test-results/vercel-9b00923/summary.json`.

After choosing Cloud Run alone, direct browser sign-in, cart, checkout and origin
protection were checked again successfully. No additional full live test run was
started. The owner subsequently confirmed the origin update and Vercel deletion.

## Deploy directly from VS Code

Open `D:\Akshat\Projects\release-verification-lab` as the VS Code workspace.
One-time setup on Windows:

1. Install the [Google Cloud CLI](https://docs.cloud.google.com/sdk/docs/install-sdk)
   with its bundled Python and add it to PATH. Restart VS Code afterward.
2. In the VS Code terminal, create a separate personal configuration and sign in
   with the Google account that owns this project:

   ```powershell
   gcloud.cmd configurations create release-verification-lab --no-activate
   gcloud.cmd auth login --configuration=release-verification-lab
   ```

For future updates, save your files, run the relevant tests, then press
**Ctrl+Shift+P**, choose **Tasks: Run Task**, and select **Deploy to Cloud Run**.
The task checks JavaScript syntax, then uploads this local workspace, builds the
Dockerfile in Google Cloud and updates the existing service. A syntax error stops
deployment. The task does not run the full release suite or commit/push changes;
it deploys saved files, including uncommitted changes. Keep source changes in Git.

No local Docker install or Cloud Shell is required. The task explicitly targets
this project's personal configuration, project, region and builder account.
`.gcloudignore` limits uploads to Docker inputs and excludes private bookkeeping,
environment files, databases, dependencies and generated reports.

The local task configuration was checked, but no deployment was started: the
Google Cloud CLI was not available on PATH during setup. Existing runtime settings
are retained; visitor shops and reports reset on redeployment.

## Simplified updates from Cloud Shell

The initial APIs, service accounts and permissions are already configured. After
tests pass and changes are pushed to `master-branch`, run:

```sh
cd ~/release-verification-lab
git pull --ff-only origin master-branch && \
gcloud run deploy release-verification-lab \
  --source=. \
  --project=release-verification-lab \
  --region=us-central1 \
  --build-service-account=projects/release-verification-lab/serviceAccounts/lab-builder@release-verification-lab.iam.gserviceaccount.com \
  --update-env-vars=PUBLIC_ORIGIN=https://release-verification-lab-326570610390.us-central1.run.app
```

Source deployment builds the existing Dockerfile and deploys the image in one
command. It can prompt to create the `cloud-run-source-deploy` image repository
on first use. It does not use `~/lab-cloudbuild.yaml` or the manual image tags.
Existing runtime settings stay in place. This simpler source-deployment path is
documented but has not yet been executed for this project.

For the current site, only the origin setting needs changing; no rebuild needed:

```sh
gcloud run services update release-verification-lab \
  --project=release-verification-lab \
  --region=us-central1 \
  --update-env-vars=PUBLIC_ORIGIN=https://release-verification-lab-326570610390.us-central1.run.app
```

Once that update succeeds, delete the `release-verification-lab-vercel` project
from Vercel Settings. Keep the Cloud Run project and service accounts.
Redeployments restart temporary visitor shops and reports.

Source: [Deploy services from source code](https://docs.cloud.google.com/run/docs/deploying-source-code).

## Previous Vercel entry point

Cloud Run serves the Express-rendered pages and API. The Vercel project uses root
directory `deploy/vercel`, Other preset, no install/build and external rewrites.
The home route has an explicit rewrite in addition to the catch-all. Dynamic
responses use no-store caching. GitHub Pages is a separate historical evidence site.

The exact production origin is configured on Cloud Run, not Vercel: the proxy
changes the upstream Host header. Setting Vercel environment variables does not
configure the Express process. Unset PUBLIC_ORIGIN preserves strict same-origin;
wildcards and arbitrary origins are rejected. Preview domains are not implicitly
trusted. This proxy configuration is historical; use the Cloud Run URL above.

Future application/UI changes require rebuilding the Docker image and updating
Cloud Run. A Vercel deployment alone only updates the forwarding configuration.
Cloud Build config was saved at `~/lab-cloudbuild.yaml` in the owner's Cloud Shell;
run builds from `~/release-verification-lab` and use a new commit-specific image tag.
Update with `--update-env-vars` to preserve the other environment settings.

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
