import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HeroSurface } from "./HeroSurface";
import { HEADER_CLEARANCE } from "./HeaderShell";
import { cn } from "./ui/utils";
import { type getTranslation } from "../lib/translations";
import { track } from "../lib/posthog";

type T = ReturnType<typeof getTranslation>;

/**
 * The landing page's first screen: a dark field covering the whole viewport,
 * carrying the headline, the CTAs and a mockup of the product.
 *
 * Three decisions shape everything below.
 *
 * 1. **The field is always dark, in both themes.** It is the one surface on the
 *    site that does not follow the theme, so it cannot use page tokens — every
 *    colour on the field itself is literal. The mockup *inside* it is the
 *    exception and is explained where it is built.
 * 2. **It is full-bleed and full-height**, edge to edge and at least `100svh`, so
 *    it owns the first screen outright. The header floats over it rather than
 *    being spaced above it — which means that at `lg` in the *light* theme the
 *    header pill and the frame bands (both filled with `--frame`, #030213) sit
 *    directly on this near-black field and largely dissolve into it. That is a
 *    known consequence of going full-bleed, not an oversight.
 * 3. **Its bottom dissolves into the page** rather than ending on a hard edge, so
 *    the mockup reads as emerging from the page instead of sitting in a slab.
 */

/**
 * The field. Not `--primary` (#030213) even though it is close: sitting slightly
 * *off* the brand ink is what stops the chrome resting on it from disappearing
 * entirely in the light theme, keeps it distinct from the closing CTA band, and
 * gives the dot pattern something to register against. The gradient is a top-down
 * lift of a few percent — enough to stop a large flat area reading as dead.
 */
const FIELD = "linear-gradient(180deg, #0e0e1a 0%, #08080f 62%, #08080f 100%)";

/**
 * Halftone dots, present at the panel's edges and corners and absent through the
 * middle. The mask is what does the work: without it the grid runs straight under
 * the headline and turns it to mush.
 */
const DOT_GRID: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(circle at center, rgba(255,255,255,0.20) 1px, transparent 1.3px)",
  backgroundSize: "24px 24px",
  maskImage: "radial-gradient(ellipse 64% 58% at 50% 40%, transparent 55%, #000 100%)",
  WebkitMaskImage: "radial-gradient(ellipse 64% 58% at 50% 40%, transparent 55%, #000 100%)",
};

/**
 * The dissolve at the panel's foot.
 *
 * A plain `transparent → var(--background)` gradient cannot do this job: in the
 * light theme that is a straight near-black to white ramp, and a linear one reads
 * as a grey smear laid over the panel rather than as the field running out. So the
 * layer is filled flat with the page colour and *masked* instead, which lets the
 * profile be eased — almost nothing for the first third, then most of the
 * transition in the middle, fully page-coloured before the bottom edge.
 *
 * Filling with `var(--background)` is also what makes it theme-correct for free,
 * and what dissolves the panel's bottom corners: they fill with page colour and
 * stop reading as corners at all.
 */
const DISSOLVE_MASK =
  "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.35) 30%, rgba(0,0,0,0.82) 62%, #000 88%)";

/**
 * Concentric rings spreading from behind the headline. Pitched extremely low —
 * at 0.045 alpha they are barely resolvable as rings and read as depth rather than
 * as a pattern, which is the point. Faded out at the edges so they do not collide
 * with the dot grid coming the other way.
 */
const RIPPLE: React.CSSProperties = {
  backgroundImage:
    "repeating-radial-gradient(ellipse 52% 40% at 50% 36%, rgba(255,255,255,0.045) 0 1px, transparent 1px 44px)",
  maskImage: "radial-gradient(ellipse 70% 62% at 50% 36%, #000 20%, transparent 100%)",
  WebkitMaskImage: "radial-gradient(ellipse 70% 62% at 50% 36%, #000 20%, transparent 100%)",
};

/** Category palette — the real COLOR_OPTIONS hexes from AddCategoryDialog.tsx. */
const CATEGORY = {
  green: "#22c55e",
  orange: "#f97316",
  purple: "#6366f1",
  pink: "#ec4899",
};

/**
 * On-mount entrance. The page's `Reveal` is scroll-triggered and would never fire
 * here — the hero is above the fold on load — so the stack fades up once, on a
 * short stagger, and reduced motion skips straight to the final state.
 */
function useEntrance() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);

      return;
    }

    const raf = requestAnimationFrame(() => setShown(true));

    return () => cancelAnimationFrame(raf);
  }, []);

  return shown;
}

function Rise({
  shown,
  delay,
  className,
  children,
}: {
  shown: boolean;
  delay: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "transition-all duration-700 ease-out motion-reduce:transition-none",
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/**
 * The product mockup, in window chrome.
 *
 * Unlike the panel it sits on, this *does* follow the theme, and deliberately: it
 * is a picture of the app, and the app has two themes. In light mode it reads as a
 * bright product shot against black; in dark mode it is the dark app, separated
 * from the field by its border and by the panel being darker than `--background`.
 * The visitor can flip the theme from the header and watch it change — which is a
 * more honest demo than a single baked screenshot.
 *
 * The copy is translated like the rest of the page, but the merchant names are not:
 * ATB and Uklon are Ukrainian brands and read the same in either language.
 */
function AppWindow({ t }: { t: T }) {
  const categories = [
    { name: t.lpMockGroceries, left: `₴4,200 ${t.lpMockLeft}`, pct: 62, color: CATEGORY.green },
    { name: t.lpMockTransport, left: `₴1,100 ${t.lpMockLeft}`, pct: 45, color: CATEGORY.purple },
    { name: t.lpMockEntertainment, left: `₴600 ${t.lpMockLeft}`, pct: 82, color: CATEGORY.orange },
    { name: t.lpMockRent, left: t.lpMockPaid, pct: 100, color: CATEGORY.pink },
  ];

  const transactions = [
    { name: "ATB", category: t.lpMockGroceries, amount: "−₴421.20", income: false },
    { name: t.lpMockSalary, category: t.lpMockIncome, amount: "+₴45,000.00", income: true },
    { name: "Uklon", category: t.lpMockTransport, amount: "−₴623.10", income: false },
  ];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)]">
      {/* Title bar */}
      <div className="relative flex h-9 items-center gap-1.5 border-b border-border bg-muted px-3.5">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="absolute inset-x-0 text-center text-[11px] font-medium text-muted-foreground">
          {t.appTitle}
        </span>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* App header row */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">{t.lpMockDashboard}</p>
            <p className="text-[11px] text-muted-foreground">{t.lpMockMonth}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              ₴ UAH
            </span>
            <span className="size-6 rounded-full bg-muted" />
          </div>
        </div>

        {/*
         * The app's own Balance Card, not an imitation of it — the same WebGL
         * aurora surface the dashboard runs, so the mockup carries real motion and
         * cannot drift from the product's signature surface.
         */}
        <HeroSurface className="p-4 sm:p-5">
          <p className="text-xs opacity-80">{t.safeToSpend}</p>
          <p className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">₴35,634.65</p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-primary-foreground/20">
            <div className="h-full rounded-full bg-primary-foreground" style={{ width: "78%" }} />
          </div>
        </HeroSurface>

        {/* Categories */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {categories.map((c) => (
            <div key={c.name} className="rounded-lg border border-border p-2.5">
              <div className="flex items-center gap-1.5">
                <span
                  className="size-2 shrink-0 rounded-sm"
                  style={{ backgroundColor: c.color }}
                />
                <span className="truncate text-[11px] font-semibold text-foreground">
                  {c.name}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{c.left}</p>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${c.pct}%`, backgroundColor: c.color }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Recent transactions */}
        <div className="rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-[11px] font-semibold text-foreground">{t.lpMockRecent}</span>
            <span className="text-[11px] text-muted-foreground">{t.lpMockSyncedShort}</span>
          </div>
          <div className="divide-y divide-border">
            {transactions.map((tx) => (
              <div key={tx.name} className="flex items-center justify-between px-3 py-2">
                <div>
                  <p className="text-[11px] font-medium text-foreground">{tx.name}</p>
                  <p className="text-[10px] text-muted-foreground">{tx.category}</p>
                </div>
                <span
                  className={cn(
                    "text-[11px] font-semibold tabular-nums",
                    tx.income ? "text-green-500" : "text-foreground",
                  )}
                >
                  {tx.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingHero({ t }: { t: T }) {
  const shown = useEntrance();

  return (
    /*
     * Full-bleed and at least one viewport tall, so the field owns the whole first
     * screen. `svh` rather than `vh`: on mobile Safari `100vh` is the *largest*
     * viewport, which leaves the bottom of the hero under the browser's toolbar
     * until the user scrolls.
     *
     * `min-h` rather than `h` — the copy plus the whole mockup does not fit in a
     * short laptop viewport, and clipping the mockup is not what was asked for. The
     * field covers the first screen and keeps going as far as the content needs.
     *
     * The header is not spaced out of the way here (see LandingHeader), so it floats
     * over this and the top padding has to clear it. `justify-center` then centres
     * the content in whatever is left below the header rather than in the raw
     * viewport, which would sit it visually low.
     */
    <section
      className={cn(
        "relative isolate flex min-h-svh w-full flex-col justify-center overflow-hidden pb-28",
        HEADER_CLEARANCE,
      )}
      style={{ background: FIELD }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={RIPPLE} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={DOT_GRID} />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <Rise shown={shown} delay={0} className="text-center">
          {/*
           * Two lines, the payoff in the heavier weight. `text-balance` is not
           * used: the break between the two lines is the design, so it is placed
           * explicitly and each line box is forced with a block-level span. Within
           * a line the text may still wrap on its own — which it does for the
           * longer Ukrainian headline on narrow viewports, and is fine.
           */}
          <h1 className="mx-auto max-w-3xl text-4xl sm:text-5xl lg:text-6xl leading-[1.08] tracking-tight text-white">
            <span className="block font-normal">{t.lpHeroTitleTop}</span>
            <span className="block font-bold italic">{t.lpHeroTitleBottom}</span>
          </h1>
        </Rise>

        <Rise shown={shown} delay={90} className="text-center">
          <p className="mx-auto mt-5 max-w-md text-base sm:text-lg text-white/60">
            {t.lpHeroSubtitle}
          </p>
        </Rise>

        <Rise shown={shown} delay={180}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/sign-up"
              onClick={() => track('landing_cta_clicked', { cta_id: 'hero_signup', placement: 'hero' })}
              className="inline-flex h-11 items-center rounded-lg bg-white px-6 text-sm font-medium text-[#08080f] transition-colors hover:bg-white/90 outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080f]"
            >
              {t.lpSignUpFree}
            </Link>
            <Link
              to="/sign-in"
              onClick={() => track('landing_cta_clicked', { cta_id: 'hero_signin', placement: 'hero' })}
              className="inline-flex h-11 items-center rounded-lg border border-white/20 px-6 text-sm font-medium text-white transition-colors hover:bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080f]"
            >
              {t.lpSignIn}
            </Link>
          </div>
        </Rise>

        <Rise shown={shown} delay={280} className="mx-auto mt-14 max-w-4xl sm:mt-16">
          <AppWindow t={t} />
        </Rise>
      </div>

      {/* Sits in the section's bottom padding, so it starts at the mockup's lower
          edge and never washes over it. See DISSOLVE_MASK. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
        style={{
          background: "var(--background)",
          maskImage: DISSOLVE_MASK,
          WebkitMaskImage: DISSOLVE_MASK,
        }}
      />
    </section>
  );
}
