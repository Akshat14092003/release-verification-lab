# Vercel entry point

Import `master-branch` with root directory `deploy/vercel` and framework preset
**Other**. `vercel.json` disables dependency installation/building, uses `public`
as the static output directory and forwards all paths to the existing Cloud Run
service. Dynamic responses are not cached. Express still renders the pages;
Playwright, SQLite and the API continue running on Cloud Run.

Before considering the Vercel URL ready, deploy the backend version supporting
`PUBLIC_ORIGIN` and set that Cloud Run environment variable to the exact Vercel
production origin, such as `https://your-project.vercel.app`, without a trailing
slash. Do not set it to a wildcard or a URL with a path. An unset value preserves
the existing same-origin checks. No credentials belong in this Vercel project.

Verify browser sign-in, cart/checkout, separate visitors, live checks and owner-only
reports through the Vercel URL. Direct Cloud Run access remains available. Preview
deployment origins are not automatically trusted.
