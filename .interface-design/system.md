# Design System — Fieldwork / Release Verification Lab

The storefront is a synthetic shop wrapped around an interactive QA bug-catching lab.
Two registers coexist: a calm, trustworthy shopping surface, and a bold, playful
verification layer (the QA playground band + red bug-caught celebrations). Keep them
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
--muted    #61758d / dark #a3b5cf   supporting text, descriptions
--faint    #7a899f / dark #8695ad   captions, footnotes, meta (one notch below muted)
--line     #dce5f2 / dark #2c405d   hairline borders
--surface  #ffffff / dark #142239   solid reading surfaces
--background#f3f7fd / dark #0b1425   page canvas
--soft     #e8effb / dark #1d304d   tonal fills, chips, tracks
--accent   #2864dc / dark #83b0ff   the one brand colour (hover #1e50b7 / #a2c4ff, ink #fff / #0b2041)
--success  #2f9e54 (soft #edf7ef, ink #32864b)   PASS / positive — semantic, not accent
--danger   #e9565f (soft #fef2f2, ink #b91c1c)   FAIL / bug-active — semantic, not accent
```
Accent budget ~60/30/10: neutrals carry structure, accent ≤ ~10% (primary CTAs, focal metric,
the lab band). Status colours mean status only.

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
Icon-only controls (theme, cart, avatar, add, quantity steppers, icon buttons) are **≥36px, 40px on
mobile**; tap areas expanded with padding + negative margin where the visual must stay small. Target
is WCAG 44 / 40 min.

### The lab band (headline feature)
Full-width accent gradient band, sticky under the topbar (never set `position` on `.has-lab .shop-lab`
— it inherits sticky from glass.css; a `position` override reintroduces the panel-overlap bug). Glass
pill toggle with a gear badge; contrasting white Run-checks button. Finite (non-infinite) attention
animations only — perpetual repaint here flakes the real-browser lab tests.

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
| Lab band is bold and sticky; shop stays calm | The playground is the headline feature and must catch the eye; the shop must stay trustworthy. | 2026-11-02 |
| Finite animations in the lab; no perpetual repaint | Infinite repaints near the real-browser test runs cause flakes. Delight without starving the suite. | 2026-11-02 |
| `tabular-nums` on all figures; `--faint` caption tier | It's a ledger/reconciliation app — aligned numbers and a real 3-step text ramp read as precise. | 2026-11-02 |
