# Design System — Fieldwork / Release Verification Lab

The storefront is a synthetic shop wrapped around an interactive QA bug-catching lab.
Two registers coexist: a calm, trustworthy shopping surface, and a bold, playful
verification layer (compact QA controls + red bug-caught celebrations). Keep them
distinct — don't make the shop loud, don't make the lab timid.

## Direction

**Personality:** Sophistication & Trust (shop) with a Boldness & Clarity accent layer (the lab).
**Foundation:** cool / blue-tinted.
**Depth:** hybrid — frosted glass on chrome, subtle shadows on solid content.

Single source of truth for every token below is [`public/tokens.css`](../public/tokens.css).
Other stylesheets consume tokens and must not redeclare them.

## Tokens

### Colors
One accent (blue). Pass/fail keep their own semantic colours — never recolour them to the accent.
```
--ink      #172d49 / dark #e4edfc   primary text
--muted    #465b76 / dark #a3b5cf   supporting text, descriptions
--faint    #52617a / dark #9eafc9   small captions, footnotes, meta (contrast-safe)
--line     #dce5f2 / dark #2c405d   hairline borders
--surface  #ffffff / dark #142239   solid reading surfaces
--background#f3f7fd / dark #0b1425   page canvas
--soft     #e8effb / dark #1d304d   tonal fills, chips, tracks
--accent   #2864dc / dark #83b0ff   the one brand colour (hover #1e50b7 / #a2c4ff, ink #fff / #0b2041)
--success  #2f9e54 (soft #edf7ef, ink #32864b)   PASS / positive — semantic, not accent
--danger   #e9565f (soft #fef2f2, ink #b91c1c)   FAIL / bug-active — semantic, not accent
```
Accent budget ~60/30/10: neutrals carry structure, accent ≤ ~10% (primary CTAs, focal metric,
compact QA controls). Status colours mean status only.

### Glass (chrome only)
```
--glass        translucent surface   --glass-line  translucent border   --glass-shadow soft ambient
backdrop-filter: blur(20px) saturate(135%)
```
Applied to topbar, sidebar, nav, floating controls, dialogs, the login panel. **Reading content
(panels, product cards, stat/bento tiles) is solid `--surface`, not frosted** — frost is for chrome.

### Spacing
Pragmatic ~4px-based rhythm (not strict). Common steps: 6, 8, 10, 12, 16, 18, 22, 24, 28, 42.
Page gutter 42px desktop / 28 / 19 mobile. Keep new values on this rhythm.

### Radius (soft, role-scaled)
Pills/toggles `999px` · cards `18px` · panels/dialogs `12–22px` · inputs/buttons `9–10px` ·
chips `20px` · small icon buttons `9px`. Nest toward concentric where practical.

### Typography
Headings **Manrope**, body **DM Sans** (`font-synthesis:none`).
Scale: 9–12 (labels/caption), 13–14 (body), 16–19 (h2/h3), 32 (h1), `clamp(36px,3.8vw,57px)` (hero).
Weights 400–800. Large headings get negative tracking (−0.4 to −2.2px) and `text-wrap:balance`
(login headings opt out so the panel height is fixed).
**All figures are `tabular-nums`** — prices, totals, balances, the credit, bento metrics, the
ledger table, and the lab run counts/timer — so numbers align and don't jitter as they update.

## Patterns

### Button — primary
Accent background, `--accent-ink` text, radius 9–10px, weight 700, hover lifts `translateY(-1px)`.
One primary per view; everything else is `.secondary` (surface + border) or a tonal/subtle button.

### Card / panel
Solid `--surface`, `--line` border, radius 12–18px, soft `--glass-shadow`. Product cards lift on
hover (shadow + scale 1.025 on the image). No frost on content surfaces.

### Interactive target sizes
Icon-only controls (theme, cart, avatar, add, quantity steppers, icon buttons) are **≥36×36 CSS px,
40×40 at widths up to 850px**. These are project usability targets. WCAG 2.2 SC 2.5.8 (AA)
requires 24×24 CSS px, with exceptions; SC 2.5.5 (AAA) uses 44×44 CSS px.
Tap areas must not overlap. Small captions use size and placement for hierarchy; their
color must reach 4.5:1 against the rendered background in each theme.

### Home, catalogue and compact QA
The landing page at `/` introduces the lab, its test layers and the four-step bug hunt.
It uses a simple header and the existing collection photograph; `/products` begins with the
catalogue, filters and cards. Home is also in shopping navigation.

QA playground is a quiet 40px desktop header control, with a blue Run checks action and
an active-bug count. It starts closed; its anchored panel uses the established surface,
border and radius tokens. Each bug keeps a visible explanation and discloses reproduction
steps through native details. Escape, outside click and a close button dismiss the panel.
Focus moves to its heading on open and returns to the trigger on Escape/close.
Mobile QA stays inside the native navigation drawer in matching 44px rows.
Active bugs use semantic red plus a text count; verified catches retain their red celebration.

A small original SVG beetle follows the mouse, circling nearby once it catches up. Hover does
not stop it. Keyboard focus and a visible pause/resume control pause it; touch/no mouse uses
free roaming. It cannot intercept shop controls when crossing them. Activation triggers a
600ms leap from its current location into a full-screen native You caught the bug dialog.
Let it roam restarts movement; Fix it throws the beetle away over650ms and shows Bug Fixeddd!
with a static check. Fixed state lasts until the next page load; refresh brings the bug back.
No replay button. Dismissal restores focus.
Reduced motion keeps it still, skips the leap and fades the fix over150ms; other
native dialogs pause/hide it. No sound, flashes, automatic jumpscare, or changes to real bug flags.

### Customer signup and admin management
Only Customer and Admin roles are visible. Signup reuses the sign-in glass layout and theme;
keep the four labelled fields, submit action and sign-in link visible at normal mobile heights.
Its contextual guide uses a compact row to preserve room for the form. Explain sandbox lifetime
beside the form. Public signup always creates a customer and retains the guest cart.
Admin uses the existing workspace: overview tiles, native product-edit details, labelled forms,
order-status controls and the customer table. Keep inputs at least44px, grid columns flexible,
and tables contained in their scroll wrapper. Availability uses For sale/Hidden text; saved order
prices remain historical. Admin guidance describes management rather than the shopping journey.

### Mobile navigation
At widths up to 850px, keep the brand, guest Sign in action and menu trigger in the 64px sticky topbar.
A native modal side drawer contains navigation, cart, theme, role, credit, profile and QA
controls. Its QA toolbar is static inside the drawer. Restore the original desktop positions
when widening the viewport, including the saved desktop sidebar preference.
Inside the drawer, use matching 44px rows and shared label/icon alignment for shop,
account and QA controls. Omit duplicate cart controls and guest placeholder balances.
Bug details start collapsed on mobile. The guest Sign in action also stays in the desktop header.

### Bug-caught celebration (keep the fun)
Red (`--danger`) is the lab's signal colour. The catch popup keeps its bounce-in, target spin, ring
and particle burst — this is intentional delight, not slop. Test progress and the pass/fail report
stay precise and legible (tabular counts, clear status). All of it respects `prefers-reduced-motion`.

## Motion
Durations ~0.2–0.6s, ease-out `cubic-bezier(.2,.8,.2,1)`; animate `transform`/`opacity`/`box-shadow`,
never `transition: all`. Theme switch uses a `::view-transition` reveal. Product cards stagger in.
Every animation has a `prefers-reduced-motion: reduce` off-switch.

## Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| One blue accent; green=pass, red=fail as separate semantic tokens | It's a verification lab — status must read as status, not brand. Prevents accent creep. | 2026-11-01 |
| Hybrid depth: frost on chrome, solid on content | Frost signals "shell"; solid keeps reading surfaces calm and legible in both themes. | 2026-11-01 |
| Single token file; no re-declaration downstream | Earlier green-vs-blue override wars came from duplicated tokens. One source keeps new components on-brand. | 2026-11-01 |
| Compact QA in the header; introduction lives on Home | User requested a focused catalogue and an integrated QA control rather than a prominent band. | 2026-11-03 |
| Finite invitation animations in the lab | Keep attention cues brief. Loading and celebration effects remain; no causal claim about test flakes. | 2026-11-02 |
| `tabular-nums` on all figures; `--faint` caption tier | It's a ledger/reconciliation app — aligned numbers and a real 3-step text ramp read as precise. | 2026-11-02 |

## Readiness corrections

Use the supporting-text token for table cells/headers and subtotal labels. Table scroll wrappers establish a positioning context so visually hidden headings cannot expand mobile pages. The home page introduces the lab and links into the shop. Destructive reset uses a consequence dialog with Keep shopping as its initial focus. The decorative ribbon completes once in four seconds; reduced motion disables it.
