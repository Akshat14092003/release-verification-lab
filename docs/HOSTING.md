# Free hosting

GitHub Pages hosts saved evidence only. The interactive shop needs Node 22,
SQLite, Chromium, writable temporary storage, and permission to spawn processes.

`Dockerfile` installs the locked Playwright browser and Linux libraries, includes
the release tests, and runs as the unprivileged `node` user. `.dockerignore`
allows only runtime source, tests, and package metadata into the build context.

## Render candidate

No hosting account or live app has been provisioned. `render.yaml` explicitly
requests the **free** plan. Do not select a paid instance or persistent disk.

1. Create a personal Render account and connect this public GitHub repository.
2. Create a Blueprint from `render.yaml`, using `main` after its checks pass.
3. Confirm the service plan is Free before creating it. No card or paid resource
   is authorized by this project setup.
4. Wait for the Docker build; inspect `/health` and `/products` over HTTPS.
5. Run Correct build from the website: require 47 passes, a report, preserved
   cart/credit, and no timeout. Then enable Login + Weekday and require exactly
   10 expected failures with 37 passing controls. Check two independent visitors.
6. Add the actual public URL to the README only after those checks pass.

Free Render instances have 512 MB RAM and 0.1 CPU. The CI container integration
uses 512 MB and one CPU; it checks the memory budget, **not** free-tier CPU speed.
The real deployment must meet the existing execution limits. If it cannot, this
host is unsuitable for the interactive runner; do not hide failures or loosen
detector rules. A free local demo plus published CI evidence remains usable.

Free services sleep after 15 minutes idle; waking can take about a minute.
Temporary files and visitor sessions disappear on restart/redeploy/sleep.
The workspace has a free-hours allowance, so review usage before adding services.
There is intentionally no external database: each visitor has an isolated
in-memory SQLite shop; test data and reports are disposable.

`LAB_TEST_WORKERS=1` limits browser concurrency on the host. Local and hosted
release CI retain their normal worker count and all 47 checks. `TRUST_PROXY=1`
is for Render's reverse proxy; local default remains loopback without it.

Sources: [Render free services](https://render.com/docs/free),
[Blueprint configuration](https://render.com/docs/blueprint-spec),
[Docker deployment](https://render.com/docs/docker),
[Playwright containers](https://playwright.dev/docs/docker).

## Local image check

```sh
docker build -t release-verification-lab .
docker run --rm -p 3000:3000 release-verification-lab
docker run --rm --memory=512m --memory-swap=512m --cpus=1 -e CI=true release-verification-lab npm run test:runner
```

Do not mount private folders or pass real credentials. Public demo accounts are
synthetic. The workflow uploads the integration result and container state/logs
as `live-runner-evidence`, including when the check fails.
