# Commands and browser controls

Use PowerShell from this project folder:

```powershell
cd D:\Akshat\Projects\release-verification-lab
```

## Start the interactive website

One-time setup (or after dependency changes):

```powershell
npm.cmd ci
npx.cmd playwright install chromium --no-shell
```

Start:

```powershell
npm.cmd start
```

Open **http://127.0.0.1:3000**. It opens the storefront directly. Browse products and use the controls on the same page.
Keep that terminal open. **Ctrl+C in the same terminal stops it.** There is no `npm stop` script.
If port 3000 is busy, use the process-identification commands in the advanced section below.

For development, start this once and leave its terminal running:

```powershell
npm.cmd run dev
```

Keep using **http://127.0.0.1:3000** and refresh the browser after edits. CSS, images and browser
scripts are served directly from disk. Server-code changes restart Node automatically.
VS Code's Go Live extension serves static files and cannot run this Express/SQLite app.
Switch from an already running `npm start` to this mode once; do not start a second server on port 3000.
Automatic server restarts clear the interactive demo's temporary sessions and run lookup;
ordinary CSS/browser-script refreshes preserve them.

## Browser controls: no terminal flags required

| What you want | Website action |
| --- | --- |
| Enable or disable a bug | Open QA playground, read the bug card, and use its switch; it applies immediately |
| Try a weekend rule on Monday | In QA playground, open Day, choose Monday, then Apply day |
| Reset purchases and balance | Reset my purchases; sign in again for $1,000 and zero orders |
| Run tests against your chosen bugs | Run checks ? My current bug switches ? Run tests |
| Run the correct build | Run checks ? Correct build ? Run tests |
| See all defect detectors | Run checks ? All four bugs on ? Run tests |
| Read the result | The actual Playwright report opens in a larger same-page reading view; Run details returns to progress/results |
| Stop a verification | Stop run |
| Log out through your profile | Click the avatar, then Log out |
| Reproduce each defect manually | Follow the hint that changes as you browse, add to cart, checkout, and inspect a receipt |
| Send a repeat offer request | Enable Purchase cap, open Offers, and use Send direct repeat purchase after completing one offer checkout |
| Change the theme | Use the sun/moon button; preference persists and the theme animates |

Each visitor gets an isolated in-memory SQLite shop and settings. Changing a switch takes effect
immediately; refresh an already-open shop page. Test runs snapshot the chosen switches and use
separate data/clocks, so they do not spend your demo balance. Correct build: **47 passes**.
All bugs on: **35 controls pass and 12 intended checks fail**. A complete matched failure pattern
verifies detection; it does not mean the defective application passed.

The current GitHub Pages URL still contains saved reports. The interactive website requires a
Node/Chromium host; see [hosting notes](docs/INTERACTIVE-DEMO.md).

## Advanced: original persistent shop and terminal commands

The commands below work with the original persistent `.data/lab.sqlite` shop. Run it with
**npm.cmd run start:shop**. Its database/credit/reset commands do **not** change the browser lab's
isolated visitor shops. Use the website reset button for those.

### Install, start, stop

Install the pinned dependencies when setting up the project:

```powershell
npm.cmd ci
```

Start the shop:

```powershell
npm.cmd run start:shop
```

Keep that terminal open. **Ctrl+C in that same terminal stops the shop.** There is no `npm stop` script.
For automatic restarts while editing code:

```powershell
node --watch src/server.js --shop
```

Check whether the shop responds:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/health
```

If you see `EADDRINUSE`, an earlier process already holds port 3000. Find its PID:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object LocalAddress, OwningProcess
```

Inspect that PID before stopping it. Replace `YOUR_PID` in both commands:

```powershell
Get-CimInstance Win32_Process -Filter "ProcessId = YOUR_PID" | Select-Object CommandLine
Stop-Process -Id YOUR_PID
```

Only stop the process you identified as this local shop. Then run `npm.cmd run start:shop` once.

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Customer | customer@example.test | DemoShop!2026 |
| Store Owner | owner@example.test | DemoShop!2026 |
| Admin | admin@example.test | DemoShop!2026 |

These are public synthetic demo accounts. Browse product details, add to cart, and adjust quantities from 1 to 99. Offer items require quantity 1.
Review the cart and checkout before placing an order.

### Reset purchases and balances

**Stop the shop first.** Resetting removes existing demo data and login sessions.

Start with **$1,000 per account, zero purchases, no used offer claims**:

```powershell
npm.cmd run seed -- --fresh
npm.cmd run start:shop
```

Sign in again. Repeat this whenever you want to demonstrate a scenario from scratch.
An empty new database also starts without purchases. Restarting preserves existing purchases.

Restore the older sample dataset instead ($73 sample order; customer balance $927):

```powershell
npm.cmd run seed -- --reset
```

Initialize an empty database without replacing existing records:

```powershell
npm.cmd run seed
```

The default database is `.data/lab.sqlite`. The startup log prints the actual path.
`DATABASE_PATH` can select a different demo database:

```powershell
$env:DATABASE_PATH = ".data/my-demo.sqlite"
npm.cmd run start:shop
```

Return to the default database after stopping:

```powershell
Remove-Item Env:DATABASE_PATH -ErrorAction SilentlyContinue
```

### Add demo credit without deleting purchases

Stop the shop. This adds **$1,000** to the customer's opening credit, retaining purchases.
`100000` cents means $1,000. Change that number for a different positive amount.
This demo models purchase debits in the ledger; the adjustment changes opening credit.

```powershell
@'
import { loadConfig } from "./src/config.js";
import { openDatabase, balanceCents } from "./src/database.js";
const db = openDatabase(loadConfig().databasePath);
try {
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get("customer@example.test");
  if (!user) throw new Error("Customer account not found.");
  db.prepare("UPDATE users SET opening_balance_cents = opening_balance_cents + ? WHERE id = ?")
    .run(100000, user.id);
  console.log("New balance: $" + (balanceCents(db, user.id) / 100).toFixed(2));
} finally { db.close(); }
'@ | node --input-type=module
npm.cmd run start:shop
```

### Start the correct build

Stop the shop before changing its flags or clock. These variables apply to the current terminal
and are read when the server starts. A browser refresh alone does not change a running server's flags.

```powershell
$env:BUG_AUTH_BYPASS = "0"
$env:BUG_WEEKEND_OFFER = "0"
$env:BUG_NO_LIMIT = "0"
$env:BUG_TOTAL_MISMATCH = "0"
Remove-Item Env:LAB_NOW -ErrorAction SilentlyContinue
npm.cmd run start:shop
```

### Manually reproduce the total mismatch with your own order

Stop the shop, then run:

```powershell
$env:BUG_AUTH_BYPASS = "0"
$env:BUG_WEEKEND_OFFER = "0"
$env:BUG_NO_LIMIT = "0"
$env:BUG_TOTAL_MISMATCH = "1"
$env:LAB_NOW = "2026-10-24T12:00:00.000Z"
npm.cmd run seed -- --fresh
npm.cmd run start:shop
```

1. Open **Everyday journal**, set quantity **2**, and click **Add to cart**.
2. Open **Studio headphones** and add quantity **1**.
3. Open **Cart**: total **$101**. Proceed to checkout and sign in as Customer if prompted.
4. Click **Place demo order**. The receipt incorrectly shows **$56** (only the first line).
5. The Transactions section records **$101**; demo credit is **$899**.
6. Keep this receipt URL. Stop the shop, disable the flag, and restart without resetting:

```powershell
$env:BUG_TOTAL_MISMATCH = "0"
npm.cmd run start:shop
```

Reload the same receipt: both totals now show **$101**. No pre-existing order is required.
Choose other products/quantities to demonstrate it again. Two different product lines expose the defect;
one line with quantity 2 alone still displays its correct line total.

### Manually reproduce invalid login acceptance

Stop the shop, then run:

```powershell
$env:BUG_AUTH_BYPASS = "1"
$env:BUG_WEEKEND_OFFER = "0"
$env:BUG_NO_LIMIT = "0"
$env:BUG_TOTAL_MISMATCH = "0"
npm.cmd run seed -- --fresh
npm.cmd run start:shop
```

Log in with `customer@example.test` and `incorrect-password`. The bug admits you to Products.
Disable `BUG_AUTH_BYPASS`, restart, sign out if necessary, and try again: login should be rejected.
SQL-like input accepted under this flag also shows auth bypass; it does not establish SQL injection.

### Manually reproduce the weekday offer bug

Stop the shop. Use a fixed **Monday**, so the demo does not depend on today's date:

```powershell
$env:BUG_AUTH_BYPASS = "0"
$env:BUG_WEEKEND_OFFER = "1"
$env:BUG_NO_LIMIT = "0"
$env:BUG_TOTAL_MISMATCH = "0"
$env:LAB_NOW = "2026-10-26T12:00:00.000Z"
npm.cmd run seed -- --fresh
npm.cmd run start:shop
```

Open Offers, add the offer to your cart, and complete checkout as Customer. It incorrectly succeeds on Monday.
To compare the correct build, stop, set `BUG_WEEKEND_OFFER` to `0`, reset with `--fresh`,
and restart with the same Monday clock. The offer should be unavailable.
The page footer shows the server's simulated UTC date.

### Manually reproduce the purchase-limit bypass

Stop the shop. Use a fixed **Saturday**:

```powershell
$env:BUG_AUTH_BYPASS = "0"
$env:BUG_WEEKEND_OFFER = "0"
$env:BUG_NO_LIMIT = "1"
$env:BUG_TOTAL_MISMATCH = "0"
$env:LAB_NOW = "2026-10-24T12:00:00.000Z"
npm.cmd run seed -- --fresh
npm.cmd run start:shop
```

Log in as the customer, add the offer from Offers to your cart, and complete checkout once. Offers should now mark it claimed.
On the local shop page, open browser DevTools (**F12 → Console**). Run this **browser JavaScript**:

```javascript
fetch("/api/orders", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ items: [{ product_id: 1, offer_id: 1, quantity: 1 }] })
}).then(async response => console.log(response.status, await response.json()));
```

With the bug on, the repeat purchase returns **201** and creates another order.
Stop the shop, set `BUG_NO_LIMIT` to `0`, restart, and run the same request while signed in:
it should return **409** with the already-claimed message.
Changing the flag does not undo the earlier invalid purchase; use `--fresh` for another clean run.

### Controlled clocks and .env files

Set the clock before starting:

```powershell
# Saturday
$env:LAB_NOW = "2026-10-24T12:00:00.000Z"
# Sunday just before expiry
$env:LAB_NOW = "2026-10-25T23:59:59.000Z"
# Monday just after expiry
$env:LAB_NOW = "2026-10-26T00:00:00.000Z"
```

Pick **one** assignment. For a stale-checkout demo, add the offer to your cart and open checkout on Sunday, stop the server,
change to Monday, restart without resetting the database, then submit the still-open checkout.
The correct build rejects it; the weekend flag allows it. Larger clock jumps can expire login sessions.

Return to the real clock:

```powershell
Remove-Item Env:LAB_NOW -ErrorAction SilentlyContinue
```

`npm start` does not automatically load `.env`. If you prefer file configuration, copy once,
edit its values, and explicitly load it:

```powershell
Copy-Item .env.example .env
node --env-file=.env src/server.js --shop
```

Existing process environment variables override values in `.env`. Use one configuration approach
consistently, or open a clean terminal before loading the file. `.env` is gitignored.

### Automated checks and reports

Tests start their own servers and databases. You do not need to start the local shop first.
`npm test` and the layer commands run the correct build with bug flags off; the defect verifier
selects its own scenarios and flags. Manual demo flags do not change correct-build results.

```powershell
# Syntax
npm.cmd run check
# Bug-detection feedback guards (separate from the 47 release checks)
node --test tests/unit/defect-detection.test.js
# All correct-build tests
npm.cmd test
# Individual layers
npm.cmd run test:api
npm.cmd run test:e2e
npm.cmd run test:db
npm.cmd run test:security
# Correct build, each defect separately, then all defects together
npm.cmd run test:bugs
# Combined intentional-defect verification only
npm.cmd run test:red
# Repeated measurement (10 green and 10 red runs)
npm.cmd run test:repeat
# Shorter measurement
npm.cmd run test:repeat -- --runs=3
```

Current expected counts: **47 green passes**; **35 red controls and 12 intended failures**.
The underlying red tests fail; the verifier succeeds only for the exact expected failure set.
The total detector builds a fresh multi-item order through the browser and reconciles it using SQL.
Published green/red reports now cover 47 checks. Older explicitly dated 34-test records remain historical; see docs/CURRENT-RESULTS.md.

Open the local HTML reports:

```powershell
npm.cmd run report
npx.cmd playwright show-report defect-reports/red
npx.cmd playwright show-report defect-reports/total
```

Individual scenario reports exist after `test:bugs`. Red-only exists after `test:red`.
Browser failures have full-page images. API-only failures have HTTP/JSON evidence and no browser frames.
The first blank browser trace frame is the page before navigation; inspect later actions for the app.

Build a local copy of the evidence site from a **full** green run and the red-only run:

```powershell
npm.cmd test
npm.cmd run test:red
node scripts/build-pages.js
```

Generated output: `site/`. This builds files locally; it does not publish them.
Live saved reports: https://akshat14092003.github.io/release-verification-lab/

## Runner integration and free hosting

```powershell
npm.cmd run test:unit
npm.cmd run test:runner
$env:CI = "true"
npm.cmd run test:repeat -- --runs=5
Remove-Item Env:CI
```

Free Docker deployment setup and validation: [HOSTING.md](docs/HOSTING.md). No hosting account or public app exists yet.
