# Design review — making Fieldwork not read as "AI slop"

Scope: `src/views.js`, `public/tokens.css`, `public/glass.css`, `public/blue.css`,
`public/experience.css`.

**Baseline:** the engineering is not slop. Disciplined token system, single accent,
real dark mode, reduced-motion handling, good a11y (skip link, aria, sr-only). The
smell comes from **over-uniform copy and a few leftover global effects**, not card
styling and not code quality. The fix is selective subtraction, not a rebuild.

## Keep on purpose (do NOT touch)

These are intentional and stay:

- **Glass login** and **restrained frost on navigation / floating controls**.
- **Bug hunt = one interaction.** Roaming beetle + catch popup are a single feature
  (`views.js:183-193`). Do not split or remove either.
- **Landing hero photo corner caption** — placed to cover the Gemini logo. Keep.
- **Check ticker, scroll reveals, action feedback** already exist
  (`experience.css:130-166`). Keep as-is; nothing to add.
- **Content cards are already solid.** `blue.css:4-8` overrides the broad glass rules
  to `--surface` + `backdrop-filter:none`. Clean up conflicting CSS if touched — do
  not "rebuild cards."

---

Changes ranked by payoff. Each is independent.

## 1. Plainer utility headings

Almost every heading is the same beat: short fragment + period. Fine once; identical
everywhere is the machine tell. Keep personality on the **landing page only**.

- [x] `views.js:267` "Your cart." → **Cart**
- [x] `views.js:302` "Your checkout." → **Checkout**
- [x] `views.js:339` "A good choice." → **Order confirmed**
- [x] Plain headings for login/signup, offers and admin; landing voice preserved.

## 2. Fewer uppercase kickers

ALL-CAPS eyebrows on every section ("YOUR GOOD FINDS", "ONE LAST LOOK",
"WELCOME TO FIELDWORK", "STORE MANAGEMENT") signal a template.

- [x] Remove redundant kickers above Cart, Checkout and admin headings via
      `heading()` (`views.js:148`).
- [x] Keep functional labels: product categories, order IDs, status pills.

## 3. Quieter shopping/admin backgrounds

Content cards are solid, but the **global body glows still sit behind them**.

- [x] `glass.css:3-5` — radial-gradient body glows: flatten to a plain `--background`
      on shopping/admin pages. Keep restrained frost on nav and login.
- [x] Review `product-peek` blur (`blue.css:23`) — retained as a floating control;
      reading surfaces remain solid. Removed them from the broad glass selector.

## 4. Less decorative movement

- [x] Remove hero **orbit dots** (`views.js:220`).
- [x] Stop the login photo float/drift — `photo-drift` on `.story-art.story-photo`
      (`shop.css:149`, keyframe `shop.css:154`). A scoped `animation:none` override on
      `.login-body .story-photo` stops it correctly (parallels `experience.css:11`).
- [x] Keep the check ticker, scroll reveals, and button busy spinner.

## 5. Shorter supporting copy

"Demo credit / fictional / no payment / synthetic data" is restated across footer,
hero note, login disclaimer, checkout note, summary note, signup note.

- [x] Audit: `rg -n "demo|fictional|synthetic|No payment" src/views.js`
- [x] Trim redundant hero/cart/product copy; retain functional demo-credit labels.
      **Preserve** signup account-expiry warning
      (`views.js:124`) and checkout available-balance line (`views.js:313`).

---

## Suggested order

1. #1 utility copy + #2 redundant kickers — mechanical, high signal, low risk.
2. #3 quieter shopping/admin backgrounds.
3. **Screenshot and assess** before removing more effects (#4).
4. #5 copy dedupe — polish.

**Implemented 2026-11-05** on `polish/design-cleanup`, preserving the newer hardening
and landing-motion commits already checked out. Captured before/first-pass/final
screenshots, inspected desktop/mobile in both themes, and checked 90 page/width/theme
combinations including 320px. No document overflow or browser errors. Mobile heading
actions now sit below the description rather than squeezing beside it.
Private screenshots/results: `.local/design-cleanup/`. Handoff records test results.
