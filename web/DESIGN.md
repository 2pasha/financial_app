---
name: Moneta
description: A quiet ledger for personal money — neutral chassis, color that carries meaning.
colors:
  ledger-ink: "#030213"
  ledger-ink-lift: "#232350"
  paper-white: "#ffffff"
  ink-black: "oklch(0.145 0 0)"
  secondary-surface: "oklch(0.95 0.0058 264.53)"
  accent-surface: "#e9ebef"
  muted-surface: "#ececf0"
  muted-ink: "#717182"
  field-fill: "#f3f3f5"
  hairline: "rgba(0, 0, 0, 0.1)"
  switch-track: "#cbced4"
  focus-ring: "oklch(0.708 0 0)"
  destructive: "#d4183d"
  severity-safe: "#16a34a"
  severity-limit: "#d97706"
  severity-over: "#ef4444"
  severity-over-extreme: "#b91c1c"
  bar-safe: "#22c55e"
  bar-limit: "#f59e0b"
  bar-over: "#f87171"
  category-indigo: "#6366f1"
  category-violet: "#8b5cf6"
  category-pink: "#ec4899"
  category-rose: "#f43f5e"
  category-orange: "#f97316"
  category-amber: "#eab308"
  category-green: "#22c55e"
  category-emerald: "#10b981"
  category-teal: "#14b8a6"
  category-cyan: "#06b6d4"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
  title:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
  eyebrow:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.1em"
  micro:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "normal"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  full: "9999px"
spacing:
  hair: "4px"
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "48px"
  section: "64px"
components:
  button-primary:
    backgroundColor: "{colors.ledger-ink}"
    textColor: "{colors.paper-white}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "rgba(3, 2, 19, 0.9)"
    textColor: "{colors.paper-white}"
  button-outline:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink-black}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-outline-hover:
    backgroundColor: "{colors.accent-surface}"
    textColor: "{colors.ledger-ink}"
  button-secondary:
    backgroundColor: "{colors.secondary-surface}"
    textColor: "{colors.ledger-ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-lg:
    rounded: "{rounded.md}"
    padding: "8px 24px"
    height: "40px"
  button-icon:
    rounded: "{rounded.full}"
    size: "36px"
  card:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.xl}"
    padding: "24px"
  category-card:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.lg}"
    padding: "12px"
  input:
    backgroundColor: "{colors.field-fill}"
    textColor: "{colors.ink-black}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
  badge-default:
    backgroundColor: "{colors.ledger-ink}"
    textColor: "{colors.paper-white}"
    typography: "{typography.micro}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  badge-secondary:
    backgroundColor: "{colors.secondary-surface}"
    textColor: "{colors.ledger-ink}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  progress-track:
    backgroundColor: "{colors.muted-surface}"
    rounded: "{rounded.full}"
    height: "6px"
---

# Design System: Moneta

## Overview

**Creative North Star: "The Quiet Ledger"**

Moneta looks like a well-kept account book. Near-black ink on white paper, hairline
rules instead of boxes, and nothing on the page competing for attention until a
number actually needs it. The interface is a chassis, not a performance: it holds
figures still so they can be read at a glance, mid-month, on a phone, in the two
seconds between wondering and knowing.

What makes it a *ledger* rather than a dashboard is where the color lives. The shell
is entirely neutral — white surfaces, near-black text, 10%-black hairlines. Every
non-neutral color in the product is doing a job: it is either the hue a user picked
for one of their own categories, or a severity signal telling them a budget is near
or past its limit. A category grid at rest is a field of small quiet cards; the same
grid with one category at 140% has exactly one place your eye goes. That contrast is
the design, and it only works because the resting state is genuinely quiet.

The component character is **refined and restrained**: fewer things per screen, more
air around each. The current implementation is tighter than that ideal — 36px
controls, 12px card padding, 14px labels — which is the baseline to open up from, not
a target to compress further. When a screen is in doubt, it should lose an element
rather than shrink one.

**Key Characteristics:**

- Neutral shell: white and near-black, with a faint blue-violet cast in the ink
- Color earns its place through meaning — category identity or budget severity
- Flat at rest, hairline-separated; depth appears only under the cursor
- Compact-but-opening density; information-first, never crowded
- No webfont — the system typeface is the native UI stack, deliberately unbranded
- Full light and dark implementation, both first-class
- Bilingual by construction: every layout must survive Ukrainian's longer words

## Colors

Two near-monochrome shells (light and dark) carrying three chromatic systems: the
user's category hues, a green→amber→red severity scale, and a single destructive red.

### Primary

- **Ledger Ink** (#030213): the ink the book is written in. Near-black with a faint
  blue-violet cast that keeps it from reading as pure grey. Carries primary buttons,
  the active nav item, selection fills, and — with **Ledger Ink Lift** (#232350) — the
  315° gradient on the Plan hero card and the landing page's navy panels.

### Secondary

- **Quiet Lavender Surface** (oklch(0.95 0.0058 264.53)): the barely-tinted fill for
  secondary buttons and low-emphasis chips. Its tiny chroma is what separates it from
  the pure-grey accent surface sitting next to it.

### Tertiary

The ten **category hues** are a tertiary system the *user* controls, not the designer.
They run indigo → violet → pink → rose → orange → amber → green → emerald → teal →
cyan, and appear only as a category's identity: a 32px icon tile filled at 30% alpha
with a 40%-alpha border, a 10px selection swatch, or a chart series. They are never
used as UI chrome.

### Neutral

- **Paper White** (#ffffff): page background and card fill in light theme. One value
  for both — the shell does not use tonal steps to separate a card from the page.
- **Ink Black** (oklch(0.145 0 0)): body text and headings.
- **Muted Ink** (#717182): secondary text, helper copy, timestamps, the `₴spent /
  ₴budget` line, and any label that must not compete with a figure.
- **Muted Surface** (#ececf0): progress-bar tracks and disabled fills.
- **Accent Surface** (#e9ebef): the hover fill for outline and ghost buttons.
- **Field Fill** (#f3f3f5): input interiors. Fields are filled, not outlined-on-white.
- **Hairline** (rgba(0, 0, 0, 0.1)): every border in the system. A 10%-black rule,
  not a grey line — it stays subordinate on any surface it crosses.
- **Focus Ring** (oklch(0.708 0 0)): neutral mid-grey, rendered as a 3px ring at 50%
  alpha. Focus is deliberately not brand-colored.

### Severity

The one place color is unambiguously the message. Text figures and bar fills use
separate values so a small number stays legible while a large bar stays soft:

- **Safe** (#16a34a text / #22c55e bar): ≤90% of budget used.
- **At Limit** (#d97706 text / #f59e0b bar): 91–100%.
- **Over** (#ef4444 text / #f87171 striped cap): 101–200%.
- **Well Over** (#b91c1c): >200%. The only value in the system permitted to feel alarming.
- **Destructive** (#d4183d): irreversible actions only — delete confirmations, error
  states. Distinct from the severity reds so "over budget" never reads as "danger".

### Dark theme

Dark is a full parallel set, not a filter. Its shell inverts to `oklch(0.145 0 0)`
page / `oklch(0.22 0 0)` card / `oklch(0.985 0 0)` text, borders lift to
`oklch(0.32 0 0)`, and `--primary` **inverts** to near-white with dark text — so a
primary button is a light block on a dark page. Category hues and severity values are
theme-independent and carry through unchanged.

### Named Rules

**The Earned Color Rule.** Prefer color that is doing a job — a category's identity or
a severity signal. The resting neutrality is what makes a single amber bar readable,
so decorative color is a cost paid against that. Marketing surfaces may spend it
deliberately; product screens rarely should.

**The Two Reds Rule.** Severity red says "you overspent." Destructive red (#d4183d)
says "this cannot be undone." Never substitute one for the other; a user who learns to
ignore one will ignore both.

## Typography

**Display Font:** none — the native UI stack (`ui-sans-serif, system-ui, sans-serif`)
**Body Font:** the same stack
**Label/Mono Font:** none distinct

**Character:** The system loads no webfont, so Moneta renders in whatever the reader's
OS considers native — SF on Apple, Segoe on Windows, Roboto on Android. This is a
legitimate position for a ledger: unbranded, maximally legible at 11px, zero layout
shift, and it renders Cyrillic correctly on every platform without shipping a second
subset. Hierarchy is carried entirely by size, weight, and color — never by a face
change.

Root size is 16px (`--font-size`), and the base layer sets heading sizes with a shared
1.5 line-height, so headings and body share one rhythm rather than each having their own.

### Hierarchy

- **Display** (700, clamp(2.25rem, 5vw, 3rem), 1.1, -0.025em): landing hero headline
  only. The single place in the product with tight tracking and a display line-height.
- **Headline** (500, 1.5rem, 1.5): `h1` — page and app titles.
- **Title** (500, 1.25rem / 1.125rem, 1.5): `h2` / `h3` — section and card headings.
- **Body** (400, 1rem, 1.5): paragraphs, field values, table cells.
- **Label** (500, 0.875rem, 1.5): buttons, form labels, category names, nav items.
- **Eyebrow** (600, 0.875rem, uppercase, 0.1em): the one uppercase treatment —
  landing eyebrow and the "Navigation" group label in the mobile sheet.
- **Micro** (500, 0.6875rem, 1.3): the `left` / `over` suffix beside a figure and the
  parenthesized percentage. Small enough to be a footnote, weighted enough to read.

### Named Rules

**The Figure-First Rule.** In any card or row containing a monetary amount, the amount
is the heaviest and most saturated element present; its label is Muted Ink one step
smaller. The number is what the user came for.

**The One Uppercase Rule.** Uppercase is reserved for eyebrows and group labels. Never
set a button, heading, nav item, or category name in uppercase — Ukrainian loses more
legibility to caps than English does.

## Layout

A single centered column: `max-w-6xl` (72rem / 1152px) with 16px gutters, opening to
24px at ≥640px and 32px at ≥1024px. There is no persistent sidebar; navigation lives
in a sticky top header (`z-40`) that sits on `bg-card` with a hairline bottom border,
and on the landing page on `bg-background/80` with a backdrop blur.

Breakpoints are Tailwind defaults: 640 / 768 / 1024 / 1280 / 1536px. **768px is the
one structural break** — above it the header shows inline nav buttons and icon
controls; below it the entire nav collapses into a right-side Sheet (288px) and the
logo drops from 32px to 28px. Content grids are two-column at `md` and single-column
below; the landing page's alternating copy/screenshot sections collapse to stacked
with 48px gaps.

Vertical rhythm runs on 8px multiples, using 12px inside compact cards, 16px between
siblings, 24px inside standard cards, and 64–96px between landing sections. Horizontal
scroll is never a layout tool except for the month-period selector, which uses
`.no-scrollbar` to scroll without a visible bar.

### Named Rules

**The One Column Rule.** Every screen is one centered column at one max width. Moneta
has no sidebar, no split view, and no persistent panel; adding one would change what
kind of tool this is.

## Elevation & Depth

Flat at rest, shadowed only in response to the user. Structural separation is carried
entirely by the 10%-black hairline and, in dark theme, by the one tonal step between
page (`oklch(0.145 0 0)`) and card (`oklch(0.22 0 0)`). No card, header, or section
carries a resting shadow.

Shadow means one of two things: *you are touching this* (hover), or *this is
temporarily above the page* (dialog, sheet, dropdown, the Plan hero). Nothing else.

### Shadow Vocabulary

- **Hover lift** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`):
  applied to interactive cards on hover, paired with a border shift to `primary/30`.
  The border change does as much work as the shadow.
- **Feature elevation** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`):
  the Plan hero card only — the one surface that is permanently above the page because
  it carries the month's headline number.
- **Focus ring** (`0 0 0 3px oklch(0.708 0 0 / 0.5)`): not elevation, but the same
  vocabulary of response. Always present on focus-visible; never removed.

### Named Rules

**The Flat-At-Rest Rule.** A surface earns a shadow by being touched or by floating
above the page. A card sitting in a grid has neither claim: it gets a hairline.

## Shapes

One radius family, gently curved and consistently applied, stepping with the size of
the thing it wraps: 6px on chips and small inline elements, 8px on buttons and inputs,
10px on compact cards and icon tiles, 14px on standard cards and dialogs. Pills
(`9999px`) are reserved for icon buttons, progress tracks, and count chips — anything
that reads as a control or a meter rather than a container.

Borders are 1px and always the hairline token; the system has no 2px borders, no
dashed strokes, and no double rules. Category icon tiles are the one place a colored
border appears, at 40% alpha of the category's own hue over a 30%-alpha fill of the
same — the tile is tinted by the category, not outlined in it.

The one non-rounded form in the system is the **over-budget overflow cap**: a small
6px-radius rectangle with a 45° repeating-linear-gradient stripe, sitting outside the
progress bar's right edge, growing from 6px to a hard 24px ceiling as overage climbs.
It is the only diagonal geometry Moneta uses, which is why it reads as an alarm.

## Components

Character across the board: quiet at rest, unambiguous on interaction, and never
larger than the information inside it.

### Buttons

- **Shape:** gently curved (8px), 36px tall by default; 40px for `lg`, 32px for `sm`.
- **Primary:** Ledger Ink fill, white text, 8px/16px padding. Hover drops to 90% opacity.
- **Outline:** white fill, 1px hairline, ink text. Hover fills with Accent Surface.
  This is the *default* nav treatment — inactive nav items are outline, the active one
  is primary, which is how the header shows location without an underline or indicator.
- **Ghost:** no fill or border until hover, then Accent Surface. Used for row-level
  actions like the CategoryCard overflow menu.
- **Secondary / Destructive / Link:** Quiet Lavender fill / #d4183d fill / underline-on-hover.
- **Icon:** 36px square, `rounded-full`. Every icon-only control in the header is a pill.
- **Focus:** 3px neutral ring at 50% alpha plus a border shift to the ring color.
  `transition-all` — never a snap.

### Cards / Containers

- **Corner Style:** 14px standard (`Card`), 10px compact (`CategoryCard`, list rows).
- **Background:** Paper White, identical to the page in light theme; one tonal step
  above the page in dark.
- **Shadow Strategy:** none at rest. Hover lift + `primary/30` border on interactive cards.
- **Border:** 1px hairline, always.
- **Internal Padding:** 24px standard, 12px compact.

### Inputs / Fields

- **Style:** filled (Field Fill #f3f3f5) with a 1px hairline, 8px radius, 36px tall,
  16px text dropping to 14px at `md` so mobile Safari doesn't zoom on focus.
- **Focus:** border shifts to the ring color plus a 3px 50%-alpha ring; transitions
  `color, box-shadow` only, so the field never resizes.
- **Error:** `aria-invalid` drives a destructive border and a destructive-tinted ring —
  driven by the ARIA state, not a separate class.

### Navigation

Sticky top header on `bg-card` with a hairline bottom border. Logo (32px, `.coin-logo`)
plus wordmark at 24px/500 on the left; nav buttons, help, language, theme, and Clerk's
UserButton on the right. Active item is a primary button, inactive are outline. Below
768px the whole right cluster collapses into a 288px right Sheet with the nav stacked
as full-width ghost buttons under an uppercase "Navigation" label, and the account row
pinned to the bottom above a hairline.

### Category Card (signature component)

The product's defining component, and the clearest statement of the North Star. Three
rows in a 10px-radius, 12px-padded card:

1. A 32px icon tile tinted with the category's hue (30% fill, 40% border) holding an
   emoji, the name in 14px truncating text, and — right-aligned — the remaining or
   over amount as a severity-colored bold figure with a micro `left`/`over` suffix and
   a 10px parenthesized percentage beneath it.
2. A 6px pill progress track capped at 100%, filled green under 90% and amber above,
   with the striped overflow cap appended outside the bar when over budget.
3. The `₴spent / ₴budget` line in Muted Ink at 12px.

The overflow menu is the component's one piece of choreography: `opacity-0 max-w-0`
at rest, expanding to `max-w-7 ml-1` on group hover or when open, over 200ms. The card
has no visible affordance until you approach it.

### Motion

Three gestures only, all short and all respecting `prefers-reduced-motion`:

- **State transitions** (`transition-all`, 200ms): hover, focus, and the menu reveal.
- **Welcome step entry** (280ms, `cubic-bezier(0.16, 1, 0.3, 1)`): 16px slide from the
  right plus fade, as each onboarding step mounts.
- **Scroll reveal** (700ms ease-out): landing sections fade up 16px once, via
  IntersectionObserver at a 0.15 threshold, and never animate again.

The one flourish is `.coin-logo` — an 800ms `rotateY(360deg)` coin spin on hover.
It is the entire product's allowance for delight, and it lives on the logo where it
costs nothing.

## Do's and Don'ts

### Do:

- **Do** let the hairline (rgba(0,0,0,0.1)) carry structural separation, and reach for
  shadow only on hover or for genuinely floating surfaces.
- **Do** make the monetary figure the heaviest, most saturated element in any card or
  row, with its label one step smaller in Muted Ink (#717182).
- **Do** pick the severity color from the ratio, not the sentiment: ≤90% safe, 91–100%
  at limit, 101–200% over, >200% well over.
- **Do** tint category identity rather than outlining it — 30%-alpha fill with a
  40%-alpha border of the same hue, as the 32px icon tile does.
- **Do** ship every state in both themes. `--primary` inverts between them, so a
  primary button is dark-on-light in one and light-on-dark in the other; check both.
- **Do** test every string at Ukrainian length. Names truncate with `truncate`;
  figures use `whitespace-nowrap` and must never be the thing that wraps.
- **Do** keep the focus ring. 3px, neutral, 50% alpha, on every interactive element.
- **Do** open spacing rather than tighten it when a screen feels crowded — the
  component character is refined and restrained, and 12px/36px is the floor, not the goal.

### Don't:

- **Don't** give a resting card a shadow. If it needs to feel separate, it needs a
  hairline or a tonal step.
- **Don't** use a severity red for a destructive action, or #d4183d for over-budget.
  They are different messages.
- **Don't** introduce a second radius family or a 2px/dashed border. One curve, one
  weight, stepped 6 → 8 → 10 → 14px, plus pills for controls and meters.
- **Don't** add a sidebar, split view, or persistent panel. One centered column at
  `max-w-6xl` is the layout.
- **Don't** set buttons, headings, nav items, or category names in uppercase —
  uppercase belongs to eyebrows and group labels only.
- **Don't** add a webfont without deciding it deliberately. The system currently loads
  none, and that gives correct Cyrillic rendering and zero layout shift for free.
- **Don't** lengthen motion past 300ms for state changes, or animate anything without
  a `prefers-reduced-motion` escape.
