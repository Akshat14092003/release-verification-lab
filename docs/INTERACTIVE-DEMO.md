# Interactive storefront and contextual guidance

The application opens a landing page at `/`, with the collection photograph, a project introduction,
four-step overview, source/report links, and Enter the shop. `/products` is the catalogue without
the marketing hero. `/lab` remains a compatibility redirect to `/products`. Home is available from
the shopping navigation; the landing page has a simple header instead of the workspace sidebar.

A small SVG beetle follows the mouse across the website, circling nearby when it catches up.
Hover keeps it moving; keyboard focus or the pause/resume control pauses it. Without a mouse,
it roams freely. Catching it triggers a
600ms leap from its current location into a full-screen You caught the bug dialog.
Let it roam dismisses the dialog and restarts movement. Fix it throws the beetle off-screen,
shows Bug Fixeddd!, and removes it until the next page load. Refresh to replay the easter egg.
Closing with × or Escape restarts the chase immediately; no extra click is needed. It is silent and
does not touch bug switches/cart/login. Reduced motion keeps it still and opens the popup without
the leap. Other native dialogs hide/pause it. Shop controls remain clickable when it crosses them.

## Shopping flow

Create an account from Sign in → Create account. Registration signs in a new customer with
$1,000 demo credit, retaining the guest cart and checkout destination. Use fictional details;
resetting the demo, sandbox expiry or restarting the interactive server removes these accounts.
The two public role shortcuts are Customer and Admin. Store Owner has been removed; older
owner accounts migrate to customers while retaining their data.

Admin now manages the catalogue (add/edit, prices and availability), fulfilment (Processing,
Shipped, Delivered), and a customer overview with credit/order counts. Hiding an item prevents
checkout through the UI, an existing cart, or a direct request. Paid receipts and ledger entries
retain their original prices/names. Admin edits affect the current visitor's sandbox, while
automated checks always run on isolated test data.

Open `/admin` or `/admin/login` for the dedicated admin sign-in page. Choose Use demo admin
to fill the credentials, then sign in. Customer credentials are rejected here; the customer
login/signup remains separate. Admin sign-out returns to this portal. Safe management links
return to their requested section after sign-in, and admin passwords are always verified even
when the intentional customer login bug is enabled.

Admin accounts sign in to the management dashboard. Their sidebar/profile contains
management actions instead of cart, offers, checkout or personal purchases; no personal credit
is shown. Customer receipts open at `/admin/orders/:id`. Server-side guards reject admin shopping
APIs and purchase forms, including the direct-repeat helper. Use the Customer shortcut or signup
for manual purchasing tests. QA controls and automated verification remain available to admin.

To compare admin changes with a buyer, open **Admin → Products → Open buyer window**. It opens
the same demo shop as Customer while leaving the admin signed in. For another browser/profile,
choose **Copy link for another browser** and paste that one-use link within five minutes.
Opening the normal shop URL in an unrelated profile creates a separate shop instead.
Connected views refresh after price, name, category, photo, availability, product creation and
fulfilment changes. Pending edits and quantity selections are protected. Admin logout preserves
the buyer's session and cart; buyer logout preserves admin. Reset affects the connected shop and
revokes unused buyer links. Links grant a demo customer session, never administrator access.

Admin Home is the management overview, including when visiting `/`. Its sidebar is Overview,
Products, Orders and Customers. Overview shows actual ledger sales, paid/processing order counts,
customer accounts and five recent orders. Use Products to edit the catalogue, Orders to filter
by status/customer and update fulfilment, and Customers to open a customer's purchase history.
Receipt review identifies the customer and returns to Orders. Status updates retain the selected
filters; an order moved out of a filtered status disappears from that result. Clear filters to
see it again. Fresh demo shops show empty orders until a customer buys something.

Cart quantity and removal controls update the current page and totals without navigating; focus
stays in the cart. Product editing saves inline with Saving… / Saved ✓ and retains the expanded
editor. Validation failures keep the entered values. Adding a product appends its new editor.
Notifications pause their dismissal while hovered, keyboard-focused, or in a background tab,
and have a dismiss button. Menus use short pointer transitions and immediate keyboard actions;
reduced motion fades without movement. The beetle stops background frame/layout work when paused
or fixed, while keeping mouse-following, click-to-catch, close-to-resume and refresh-to-return behavior.

1. Browse the collection or filter/search it. Each product arrow opens that product's detail page.
2. Choose a quantity and **Add to cart**, or use a card's quick-add button. A toast and cart badge confirm the change.
3. Open **Cart** to update quantities, remove lines, and review the server-priced total.
4. **Proceed to checkout**. Guests sign in and return to checkout with their cart intact.
5. Place the order. Every line and ledger debit is recorded; the cart clears in that transaction.

Browsing, product details, and carts work without login. Purchase identity always comes from the
server session. Client prices, user IDs, and submitted replacement items cannot override a cart checkout.
Offer items remain quantity 1 and obey eligibility/caps; normal products support quantities 1-99.

## Guidance in context

A compact hint changes with the page and the visitor's actions: browse ? product ? cart ? checkout
? receipt. It can highlight the next control, explain why a one-line order cannot expose the total
bug, or compare the actual receipt and ledger values. Dismiss it at any time; **Guide** brings it back.
There is no static wall of instructions to leave the shop and read first.

On a multi-item receipt, **Try receipt bug** enables the real switch. The receipt updates in place.
Switch it off in QA playground to see the same stored purchase display correctly again.

## Controls stay in the website

- **QA playground** opens an anchored panel from the desktop header, including before login. Each
  explains the broken behavior, how to reproduce it, and how many checks detect it. Icons and
  Correct behaviour/Bug active labels make the state clear; enabled cards and switches turn red.
  Switches apply automatically. Follow Flip a switch / Try the bug / Run checks.
- The panel starts closed on each page. Close it with its close button, Escape, or an outside click.
  On mobile it expands inside the navigation drawer in matching rows. Reproduction steps are
  disclosed under How to try it. Its expected-results
  summary updates for the chosen combination; Login + Weekday offers predicts 43 passes/10 failures.
- **Day** in QA playground opens a small selector on the same page; choose a UTC day and apply it.
- Reset and all-off actions are inside that selector. Reset asks for confirmation before clearing purchases, cart, and sign-in; cancelling preserves data. It affects only the current visitor.
- **Run checks** opens a same-page dialog for current switches, correct build, or all four bugs.
- Real progress appears in that dialog. On completion the report gets a near-full-window reading
  mode with a fixed heading, a clear expected-failure verdict, and one report scroll area. **Run details**
  returns to progress and **Read report** returns to the report. A new-tab link is also available.
- When an enabled bug's exact detector fails with a normal assertion, its live result is highlighted
  and a red **BUG SPOTTED!** popup names the bug, with a spring entrance, particle burst and actual
  spotted/enabled score. Each bug pops once per run; dismiss it or keep watching. A compact red
  count and per-bug counters keep the context after dismissal. The duplicate banner hides while
  the popup is visible. Reduced motion disables the effects. A **BUG CAUGHT!** celebration and
  **See the evidence** action appear only after the complete result matches all expected failures. Refreshing
  does not replay dismissed catches. Unrelated failures, execution errors and timeouts do not count as caught bugs; interrupted
  or mismatched runs remain unverified. Feedback uses the run's original switches even if you change them later.
- A receipt-total switch refreshes the receipt content without a manual page reload.
- With Purchase cap enabled, Offers exposes a direct-repeat request after completing an offer checkout.
  The helper calls the real shop API/session and shows its actual HTTP 201/409 response.

The sidebar collapses and remembers its state. The sun/moon theme control animates a theme transition
and persists the preference across shop pages. Both themes now use blue accents and cool frosted
navigation and overlays. The full theme reveal runs outside native dialogs; inside an open dialog,
color/icon transitions keep its controls interactive instead of capturing them in a root snapshot.
Reading and product surfaces stay solid for contrast. Pass/fail indicators
keep their semantic colors. Successful Add to cart buttons briefly show Added with a tick.
The storefront includes supplied Gemini photographs,
a ribbon that moves once for four seconds, hover effects, card entrances, toast feedback, and count animations. Reduced-motion
preferences disable nonessential movement and the theme's View Transition animation.

The embedded Playwright report starts in the shop's current light/dark theme. Its transparent
canvas is painted with the reporter's own background color, so dark text styles are never placed
over the iframe's former hardcoded white background. The report's Settings theme selector also works;
opening it after a shop-theme change resynchronizes it. Saved report files remain unchanged.

For local editing use `npm.cmd run dev` and keep visiting port 3000. Refresh after client-file edits;
server-module edits restart Node automatically. This is an Express/SQLite app, so VS Code Go Live
is not its server. A server restart clears the temporary in-memory demo sessions; refreshing CSS
or browser scripts does not.

Frosted translucent surfaces are a site-wide style in both light and dark mode. Login uses
a glass form card over slowly moving colored light; cards, menus, and sticky toolbars share
the same treatment. Light mode also changes the sidebar, wordmark, and login story panel.
The avatar opens cart/orders/logout options and closes on outside click or Escape. The sidebar
toggle sits on its edge, and cart/theme/profile controls stay pinned while the page scrolls.

The saved Login + Weekday offers run `09d60009` was reviewed against all failing identities and
assertion evidence: [report review](REPORT-REVIEW-09d60009.md). Its 10 failures are all expected.

## Isolation and real test execution

Latest repair verification (2026-11-01): correct build **47/47 passed in 54.5s**.
The actual website All four bugs run completed in **128.2s**, matched **35 passes/12 intended
failures**, displayed 47 real result cards, and automatically opened the rendered report.
Report preparation, fixed dialog heading, sticky header, profile logout, mobile layouts,
preserved cart, report-owner access, and zero browser errors were checked locally.

- Each visitor gets an unguessable HttpOnly/SameSite cookie and an isolated in-memory SQLite shop;
  an admin can explicitly connect buyer windows to that same shop using a short-lived link.
- New shops start with $1,000 per account, zero purchases, and an empty cart. Reset clears cart and login too.
- Shops expire after two hours of inactivity or server restart; other visitors cannot change them.
- Tests copy the chosen flags at start and use separate disposable data/clocks. They preserve the visitor's cart and purchases.
- Reports and run status are restricted to their owning visitor.
- `src/test-runner.js` launches fixed Playwright CLI arguments, never user-supplied commands.
- Progress comes from actual reporter start/end events. Completion checks fresh identity, count,
  expected failing-test identities, exit status, and absence of setup failures/skips/flakes.
- One run at a time, a start cooldown, cancellation, a five-minute execution limit, a separate two-minute report limit, and eight-folder retention bound resource use.
- A real reporter end event switches the UI to report preparation. CLI exit validates the saved report;
  inherited Windows output pipes do not delay completion. The centered dialog keeps its heading fixed
  while its body scrolls. Individual check cards show actual titles/statuses with ticks, crosses, and spinners.
- The current suite has **59 checks**: 31 API, 17 browser, 3 database, 8 security. All bugs yield 47 passing controls and 12 intended failures.
- Nested test launches are disabled in visitor-interface fixtures; the real button/report flow is exercised separately.

The original persistent shop remains available through `npm run start:shop`. Its `.data/lab.sqlite`
seed and top-up commands are separate from the isolated browser storefront.

## Local use

```powershell
npm.cmd start
```

Stop an older instance first with Ctrl+C in its own terminal. Open http://127.0.0.1:3000.
The full setup and advanced commands remain in [COMMANDS.md](../COMMANDS.md).

## Hosting requirements and current publication state

**The existing GitHub Pages site hosts saved reports only.** It cannot execute Express, SQLite,
child processes, or Chromium. These interactive features are implemented and verified locally;
no new public application deployment is claimed here.

Deploy this revision on a host that supports a long-running **Node 22.13+ process**, child processes,
Chromium with its Linux system dependencies, a writable run directory, and outbound-free local
browser requests. Install the development dependencies too: they contain the real test suite's runner.

Typical Linux host setup commands:

```sh
npm ci --include=dev
npx playwright install --with-deps chromium --no-shell
export HOST=0.0.0.0
# Only when there is one trusted HTTPS reverse proxy that preserves the Host header:
export TRUST_PROXY=1
npm start
```

Use the host's supplied `PORT` environment value. Leave `TRUST_PROXY=0` for direct/local access.
The app trusts one proxy only when explicitly configured, so HTTPS same-origin checks and secure
cookies work behind that proxy. A single app instance is required for in-memory visitor/run ownership;
multiple replicas would need shared session/job storage before using them.

Cloudflare Workers/Sites and static hosting do not provide this child-process/Chromium runtime.
Do not replace the real tests with a simulated browser animation to fit static hosting.

## Current local verification - 2026-11-01

- Syntax: 36 JavaScript files pass.
- API: 21/21; browser: 15/15; database: 3/3. Full baseline: 47/47 (63.2s, Windows, 3 workers, no retries).
- Individual scenarios: auth 0 passes/5 intended failures; weekend 2/5; limit 1/1; total 1/1.
- Combined scenario: 35 controls/12 intended failures (67.4s), exact identities verified.
- Manual visual check covered public browsing, distinct details, a guest multi-line cart, sign-in
  continuation, and a new $101 purchase. Its receipt changed to $56 with the switch and back to $101
  when disabled, on the same page. Cart/ledger records stayed correct. No browser page errors.
- Screenshots under `.local/storefront-qa/` cover light/dark storefront, collapsed sidebar, product,
  cart, checkout, receipt discrepancy, and mobile layout. Matrix: `test-results/defects/summary.json`.
- Actual same-page runner check: 47 tests, 46 passes and one intended total failure, pattern matched.
  The report opened over `/products` without navigation; the visitor's cart stayed intact. Changing
  switches during the run did not change its snapshot, another visitor could not open the report,
  and browser page errors were zero. Evidence: `.local/storefront-run-qa/verification.json`.
- Final focused guidance check passed for progression, sidebar persistence, reduced motion,
  empty checkout, and no-result search prompts.
- The final full green report was regenerated after those hint refinements: **47/47 passed in 50.2s**.
  Whitespace checks and Markdown link validation passed.

The earlier separate-page UI's 42-test verification remains historical in HANDOFF.md. No public
application deployment or new twenty-run repeatability measurement is claimed for this revision.
