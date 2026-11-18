---
name: Release Verification Lab - Field Guide
description: A photographic fictional shop with tangible, reproducible release evidence.
colors:
  accent: "#925017"
  accent-hover: "#743b0e"
  accent-ink: "#fffaf0"
  accent-wash: "#eee0c8"
  focus: "#c17127"
  ink: "#17232b"
  muted: "#57636a"
  faint: "#657178"
  line: "#d6d6ca"
  surface: "#fffdf6"
  background: "#f1f0e6"
  soft: "#e8e7dc"
  sidebar: "#eeeee4"
  dark-accent: "#e8b969"
  dark-ink: "#f2f0e6"
  dark-muted: "#a7b4b9"
  dark-line: "#344149"
  dark-surface: "#1a2830"
  dark-background: "#101b23"
  ticket: "#f0e9d9"
  hero-action: "#efc169"
  hero-action-hover: "#f6d58f"
  success: "#1f9d6b"
  success-soft: "#e9f7f0"
  success-ink: "#16733f"
  danger: "#d63a5e"
  danger-soft: "#fdeef1"
  danger-ink: "#a81b3a"
  dark-success: "#74d7a8"
  dark-danger: "#ff6e8a"
typography:
  display:
    fontFamily: "Field Display, sans-serif"
    fontSize: "clamp(64px,7vw,96px)"
    fontWeight: 800
    lineHeight: 0.88
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Field Display, sans-serif"
    fontSize: "clamp(42px,5vw,64px)"
    lineHeight: 0.95
    letterSpacing: "-0.025em"
  chapter:
    fontFamily: "Field Display, sans-serif"
    fontSize: "clamp(34px,3.5vw,46px)"
    fontWeight: 800
    lineHeight: 1.05
  title:
    fontFamily: "Field Serif, serif"
    fontSize: "28px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: '"DM Sans", system-ui, sans-serif'
    fontSize: "14px"
    lineHeight: 1.8
  label:
    fontFamily: '"DM Sans", system-ui, sans-serif'
    fontSize: "11px"
rounded:
  editorial: "3px"
  surface: "4px"
spacing:
  compact: "12px"
  control: "18px"
  group: "24px"
  section: "40px"
  section-large: "64px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.surface}"
    padding: "12px 18px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-hero:
    backgroundColor: "{colors.hero-action}"
    textColor: "#18232a"
    rounded: "{rounded.editorial}"
    padding: "12px 20px"
    height: "48px"
  button-cart:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.editorial}"
    height: "43px"
  filter-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.background}"
    rounded: "{rounded.editorial}"
  experiment-ticket:
    backgroundColor: "{colors.ticket}"
    textColor: "{colors.ink}"
    rounded: "{rounded.editorial}"
    padding: "18px"
    width: "340px"
---

# Design System: Release Verification Lab - Field Guide

## Overview

**Creative North Star: "The Field Guide"**

A photographic shop paired with a tangible experiment slip: midnight navy, ivory and parchment, warm amber actions, compressed display type, and an italic serif counterpoint. Large editorial gestures introduce the experience; restrained controls support everyday shopping and evidence inspection.

Release Verification Lab is the portfolio project; Fieldwork is its fictional shop. The current visual world replaces the rejected bland purple dashboard direction. This document records the implemented system, not approval of a separate generated direction image. Storefront-specific typography and horizontal navigation do not imply an admin layout redesign; admin retains its existing structure and consumes the shared palette.

**Key Characteristics:**
- Product photography anchors the composition.
- Condensed uppercase display type pairs with expressive serif titles and plain body copy.
- Paper-like controls sit against midnight imagery.
- Amber indicates actions; pass/fail retains independent semantic colors.

## Colors

### Primary

Amber is the shared action and selection accent. Light mode uses the darker `accent` family for legible controls; dark mode maps the same CSS roles to warm light amber. The hero action has its own brighter, fixed palette against photography.

### Neutral

Midnight ink, warm ivory background, pale surfaces, subdued rules, and muted gray text establish the light theme. Dark mode replaces those shared roles with navy backgrounds, raised blue-gray surfaces, light ink, and restrained borders. The experiment ticket remains cream with dark text in both themes; it is a deliberately fixed material rather than a theme surface.

### Named Rules

**The Evidence Color Rule.** Amber is an action accent. Green and red remain reserved for success and failure; expected behavior alone is not a verified result.

Frontmatter records the reusable light palette, key dark equivalents, and fixed ticket/hero colors. `public/tokens.css` is authoritative for complete theme mappings, including status surface/text counterparts and navigation states; `public/experiment.css` defines the fixed editorial exceptions. Consume CSS variables rather than copying light values into dark components.

## Typography

**Display Font:** Barlow Condensed, locally hosted as `Field Display` (sans-serif fallback), registered at weight 800.

**Serif Font:** Instrument Serif, locally hosted as `Field Serif` (serif fallback), regular and italic at weight 400.

**Body Font:** DM Sans, then system-ui and sans-serif. Existing operational headings retain Manrope where the editorial overrides do not apply.

The condensed display gives short statements scale; the serif brings a softer editorial cadence. Keep forms, prices' supporting text, navigation, and evidence details straightforward.

### Hierarchy

- **Display:** The frontmatter display role describes the desktop hero. At widths up to 850px it becomes `clamp(64px,12vw,88px)` with 0.88 line height; up to 430px it is 64px. The desktop maximum is intentionally reduced to 96px.
- **Headline:** The frontmatter headline role describes storefront page and catalogue headings. Narrative chapter headings use `clamp(34px,3.5vw,46px)` with serif italic continuation.
- **Title:** The frontmatter title role describes desktop product titles. They step to 24px on mobile and 22px on narrow phones. Hero serif copy is italic at `clamp(25px,2.3vw,32px)`.
- **Body:** The body role describes introductory and evidence prose, not a universal reset. Evidence paragraphs stop at 55ch. Supporting operational text uses existing smaller sizes.
- **Label:** Compact labels use the shared label size; ticket metadata switches to uppercase display type at 15px. Do not apply hero tracking to form text.

## Layout

Home groups the hero and journey in an introduction with a viewport-based minimum
height, excluding sticky chrome. Keep the next Rule card below the initial screen
so its rounded edge cannot peek in as a thin line. Hero type/ticket sizing stays
unchanged; the extra room belongs between the introduction and scroll narrative.

The storefront uses a full-width editorial shell. At 851px and above, navigation occupies a sticky 65px horizontal row and utilities a second sticky 55px row. The existing mobile menu remains below that threshold. Admin keeps its existing sidebar layout.

Standard storefront content has a maximum width of 1360px with 38px top, 40px horizontal, and 64px bottom padding. Experiment Home retains 24px outer gutters (12px on mobile), with its hero and journey extending to the window edges over a full-width photograph. The hero pairs copy with a 340px experiment ticket; below 851px they stack. The user rejected continuous split-screen reading columns: keep the photograph across the page.

The narrative uses an 1100px story with the diagram on the left and chapter copy on the right. Keep existing sticky scene progression and responsive diagram sizing. Hero and chapter containers remain transparent; only the subtitle and short supporting paragraphs receive a faint backing. Under reduced motion the diagram returns to normal flow. Desktop hero minimum height remains 540px, and existing mobile stacking is retained.

Catalogue image frames are 220px high, 200px below 1050px and 152px on phones; related images are 180/170/140px. The catalogue uses four columns from 1050px and two below. Product galleries cap at 360px, 280px on tablet and 240px on phones. Offers use an unboxed two-column composition: a square photo up to 340px wide, reduced to 280px on tablet, beside the offer details with a 40px gap (28px on tablet). Below 601px the offer stacks within a 360px maximum width, with a full-width photo and 24px gap. The title uses Field Serif; status, prices, restrictions and purchase controls keep their existing behavior. Whole product cards share their catalogue width caps so image, text and cart action align. Image frames stay square, without side bands or a contrasting gallery mat. Images use contain to preserve the whole product; catalogue and gallery hover does not zoom into or clip the photo. Cart and checkout retain their compact thumbnails. Existing narrow-phone controls and menu behavior remain in force.

Keep the footer in normal flow. Storefront body bottom padding is zero; mobile guide clearance belongs inside main content before the footer and follows the measured guide-space variable. Do not recreate an empty body-level gap.

Home ends with quiet footer links to the source repository and published test
reports. Keep them keyboard accessible and allow wrapping on phones. No separate
promotional box or headline is needed after the Proof chapter.
In light mode, the Home footer uses a full-width ivory surface, muted 12px metadata
and ink-colored links so the photograph cannot obscure its contents. Both themes
share the same 12px footer type, padding and grid: copyright left, resource links
centered, demo note right. On phones, the centered links occupy a second row.
Only footer colors/background differ between themes. All three journey numbers and labels use bold
white text with a small dark text shadow, without adding a journey background.
The journey row overlaps the hero by 68px, placing it 24px lower than the earlier
92px overlap while keeping the next Rule card below the initial viewport.

## Elevation & Depth

Photography, dark overlays, tonal surfaces, and fine rules carry most depth. Product cards have no surrounding card fill, border, or shadow. The cream experiment ticket is raised with `0 20px 45px #0004` and rotates 1 degree on desktop. The desktop guide has `0 14px 34px #0002`; inside the test drawer it returns to a flat separator. Shared glass surfaces retain their theme-aware shadow token. Existing control and image hover feedback remains subtle.

Hero copy enters over 650ms with `cubic-bezier(.16,1,.3,1)` when reduced motion is not requested. Hero links and switch knobs use brief 200ms feedback. The authored scroll sequence uses bounded 28px hero-photo parallax, an advancing route rail, a sticky rule diagram that progresses RULE/BUG/PROOF and up to 22px chapter movement. Chapter opacity stays at least 0.8 and focused chapters remain fully visible. Scroll never changes bugs, clock or run state. Reduced motion removes pinning, transforms, crossfades and entrance animations while preserving all three scene photos, text and controls. Photo visibility uses has-field-story independently of has-field-motion; never hide photos just because motion is reduced. There is no scroll hijacking, dependency or animation loop when idle.

## Shapes

Editorial controls, image frames, navigation items, and the ticket use close-cut corners (3px); general storefront buttons and evidence surfaces use 4px corners. This is scoped editorial styling, not a mandate to flatten every inherited operational component. Switches stay rounded to communicate toggling. Hairline rules separate metadata and category controls; product containers remain visually open.

## Components

### Buttons

Shared primary actions use the theme accent and accent ink, compact weighty labels, and existing disabled/busy behavior. The hero action is brighter amber on dark imagery, while its secondary link is a serif underline. Catalogue Add to cart actions are outlined and quiet; hover fills with ink and reverses to background-colored text. Keep the shared three-pixel focus outline and three-pixel offset.

### Inputs / Fields

Keep existing labeled fields, search submit action, validation, and theme styling. The search container receives the editorial corner treatment; the input retains inherited field styles. Do not assume all inputs were flattened by the redesign. Focus follows the shared focus color; errors must remain recognizable independently of accent.

### Chips

Category filters are compact, transparent, close-cut links separated from surrounding content by horizontal rules. The selected chip fills with ink and reverses its text to the page background, in either theme. Maintain selection semantics when adding filters.

### Cards / Containers

Catalogue cards expose bounded local product photographs, serif product names, condensed prices, and an outlined cart action. Use the existing light/dark responsive photo variants and meaningful product alt text. Keep the existing photography; the collection hero's sparkle is part of the source image, not a new effect to repeat everywhere.

### Navigation

Desktop storefront navigation is horizontal, compact, and separate from utilities. Existing active navigation backgrounds and foregrounds follow theme tokens. Retain visible focus, cart counts, role boundaries, and the mobile menu. Do not carry desktop utility density into narrow screens.

### Experiment Ticket

Five text blocks receive faint backing: the hero's italic subtitle, its
two-line description, and each chapter's main paragraph. Use the theme surface
at 55% opacity (62% on dark-mode phones for contrast), a 1px border using 18% of the theme line color, 3px radius and
2px/5px padding. In light mode, Explore the collection, both chapter links and
the Proof disclosure summary/expanded text use the same small backing and dark
ink. Keep large headings, chapter labels, other links, buttons and containers
unboxed. The light-mode hero heading has no text shadow or outline. Preserve the
full-photo layout, existing ticket and diagram
positions, and quiet footer links. Do not add full text cards, reading columns,
cloud shading, image veils or a separate mobile photo strip.

The Monday/UTC offer ticket is a real control surface: live product name and prices, a weekend-rule bug switch, expected-behavior text, purchase attempt, and error feedback. Light mode keeps the cream ticket and dark full-width action. Dark mode uses the navy surface, cream primary text, muted secondary text, amber price/switch, theme separators and a light full-width action with navy text. Error feedback uses the dark danger color. Keep the thumbnail, italic serif question and original sizing/behavior. Expected behavior and completed test results must remain distinct.

## Do's and Don'ts

### Do:
- **Do** use existing product photography and local responsive image variants.
- **Do** keep display gestures short and operational controls readable.
- **Do** preserve theme roles, semantic results, visible focus, and reduced-motion behavior.
- **Do** retain real runner, guide, role, cart, and checkout behavior under visual changes.

### Don't:
- **Don't** return to the rejected bland purple dashboard direction.
- **Don't** convert expected behavior into a fabricated pass result.
- **Don't** apply storefront navigation or hero typography to admin by assumption.
- **Don't** treat a generated direction image as shipped artwork or user-approved publication.
