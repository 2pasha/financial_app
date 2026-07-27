# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Ukrainian Monobank customers managing their own household money. They already bank
with Monobank and can see every transaction in its app, but they cannot see whether
this month is on track. They come to Moneta on a laptop or phone, usually mid-month
when a purchase makes them wonder how much room is left, and again at the start of a
month to decide where the income goes.

They read English or Ukrainian, and the product treats both as real audiences rather
than one being a translation of the other.

## Product Purpose

Moneta turns Monobank transactions into a monthly budget the user can act on. It
answers "what is safe to spend right now" continuously, without manual bookkeeping,
and lets the user set that number deliberately before the month starts.

Success is a user who knows their remaining room per category without adding up
anything by hand, and who set that month's allocation on purpose instead of
discovering the result afterwards.

## Positioning

The differentiating mechanism is the closed loop between sync and plan: transactions
arrive categorized automatically **and** feed a forward-looking monthly allocation.

Monobank's own app shows history but never a plan. Budgeting apps offer a plan but
require manual entry to keep it true. Moneta owns both halves — the ledger fills
itself, and the plan it fills is the same one the user set.

## Operating Context

- **Two rhythms.** A start-of-month planning session (set income, allocate across
  categories) and frequent short mid-month checks (is this category still fine).
- **Sync arrives on its own.** A registered Monobank webhook pushes transactions in;
  the user is often reacting to data they did not enter. Monobank rate-limits polling
  to roughly once per minute, so manual refreshes are visibly slow and the UI must
  set that expectation.
- **Uncategorized is a normal state.** Synced transactions carry an MCC code and may
  land without a category until the user assigns one or an MCC rule matches.
- **Goals run alongside the month.** Trips are savings goals with their own progress,
  drawing from the same transaction ledger as the monthly budget.
- **Language and theme are per-user, client-side.** Stored in `localStorage`; theme
  seeds from `prefers-color-scheme`.

## Capabilities and Constraints

Confirmed functionality:

- **Dashboard** (`/app`) — category cards with budget vs. spent, per-month period
  selection, income sources, optional manual budget override.
- **Plan** — allocate income across categories for a chosen month; supports a few
  months ahead and several months back.
- **Expenses** — synced and manually created transactions, with filtering by amount,
  date range, and multi-select facets; sortable table; transaction detail drawer.
- **Trips** — savings goals with icon, color, goal amount, optional target date, a
  planned-items checklist, and collected/spent/available progress.
- **Monobank setup and sync** — personal API token stored server-side, webhook
  registration, sync status screens.
- **AI analysis** — builds a spending-summary prompt from month snapshots and copies
  it to the clipboard for the user to paste into their own AI assistant. Moneta does
  not transmit this to any third party itself.
- **Categories** — user-defined name, icon, color, budget, MCC code matching, and an
  `excludeFromDashboard` flag.
- **Light and dark themes** — both implemented via a `dark` class on `<html>`.

Technical constraints:

- React 18 + Vite + Tailwind CSS v4, shadcn/ui over Radix primitives, `lucide-react`
  icons, Recharts, `sonner` toasts. Routing via React Router; auth via Clerk.
- Multi-currency: transactions carry both a settled `amount`/`currency` and an
  `operationAmount`/`operationCurrency`. UAH (ISO 980) is the base; other currencies
  convert through hourly-cached Monobank exchange rates, and a rate may be absent.
- Monetary amounts arrive from the API as integer minor units.
- Deployment: web on Vercel, API on Render, Postgres on Supabase.

Binding product commitments:

- **English and Ukrainian parity.** Every user-facing string ships in both. Layouts
  must survive Ukrainian's longer words without truncation or reflow damage.
- **Manual entry stays equal.** A user with no Monobank connection can use the entire
  product. Sync is a convenience, never a prerequisite, and no screen may present
  connecting a bank as the only way forward.
- **Free during early access.** No pricing, paywalls, upgrade prompts, or plan tiers.
  Sign-up is open and free. Paid plans are an unpromised maybe; the only permitted
  claim is that current users would hear about them first.

Explicitly undecided:

- Support for banks other than Monobank.
- Whether and when paid plans exist.
- Privacy policy and terms pages (neither exists; do not link to them).

## Brand Commitments

- **Name:** Moneta.
- **Voice:** plain language, second person ("Add your first category," never "Let's
  add a category together"). Jargon is never shown bare — "webhook," "MCC," and
  "token scope" each need a one-line explanation next to them. Hint copy stays under
  roughly twenty words.
- **Help pattern:** a collapsed "How to use ___" accordion, always available rather
  than first-visit-only, is the single standard shape for in-context help.
- **Honesty in marketing:** the landing page uses real product screenshots, not
  illustrations.

## Evidence on Hand

- `Moneta_Landing_Page_Copy.docx` — approved English landing copy: hero, four feature
  sections (Plan, Monobank sync, Categories, Trips), closing CTA, footer.
- `Moneta_Onboarding_Content_Plan.docx` — first-run UX content plan: a four-step
  welcome flow plus per-screen contextual hint copy.
- `design-reference/landing-page/*.png` — seven reference frames for the landing page.
- `design-reference/welcome-flow/*.png` — four reference frames for the welcome flow.
- `moneta.pen` — Pencil design file mirroring the app screens, with ported tokens and
  reusable component IDs.
- Real product screenshots exist and are the intended marketing imagery.

Absences future work must not fabricate: there are no testimonials, no named
customers, no user counts, no press, no benchmarks, no pricing, and no
privacy/terms pages.

## Product Principles

1. **One number, always current.** Safe-to-spend is the answer the product exists to
   give; every screen either shows it or protects its accuracy.
2. **The ledger fills itself.** Automation is the promise. Any design that quietly
   reintroduces manual bookkeeping breaks the core mechanism.
3. **Never strand the unsynced user.** Every path that assumes a bank connection needs
   an equally complete manual path beside it.
4. **Plain words, at the moment they're needed.** Explain in place, in under twenty
   words, rather than front-loading a tutorial.
5. **Both languages are the product.** Ukrainian is not an afterthought; if a layout
   only works in English, it does not work.

## Accessibility & Inclusion

No formal standard has been committed. Recorded as undecided rather than invented —
do not cite a WCAG conformance level as a project requirement until the user sets one.
