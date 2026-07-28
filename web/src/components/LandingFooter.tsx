import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { focusRingOnFrame } from "./chrome";
import { cn } from "./ui/utils";

/**
 * The footer, revealed as a drawer.
 *
 * It is pinned to the bottom of the viewport *behind* the page: `main` carries an
 * opaque background and a higher z-index, so for most of the scroll the footer is
 * completely covered. A spacer the footer's own height sits at the end of the flow,
 * and as the reader scrolls into it, main's bottom edge travels up and uncovers the
 * footer from the top down. Nothing about the footer moves — the page slides off it.
 *
 * Two things this depends on, and both will silently break the effect if changed:
 * `main` must keep `relative z-10 bg-background`, and the page wrapper must NOT have
 * a background of its own, or it will paint over the pinned footer.
 *
 * Like the header and the frame bands, this surface is `--frame` — the tonal
 * opposite of the page — so the drawer opens dark under a light page and light under
 * a dark one, and the reveal has real contrast in both themes. Page tokens are wrong
 * in here; everything is `--frame` / `--frame-foreground`.
 */

/** Where the reveal is abandoned. See the guard in the effect. */
const MAX_VIEWPORT_SHARE = 0.9;

const EMAIL = "hello@moneta.app";

const NAV: { heading: string; links: { label: string; to: string }[] }[] = [
  {
    heading: "Get started",
    links: [
      { label: "Sign up free", to: "/sign-up" },
      { label: "Sign in", to: "/sign-in" },
    ],
  },
];

const footerLink = cn(
  "text-sm text-frame-foreground/65 transition-colors hover:text-frame-foreground",
  focusRingOnFrame,
);

export function LandingFooter() {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const [height, setHeight] = useState(0);
  const [pinnable, setPinnable] = useState(false);
  const [measured, setMeasured] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const h = el.offsetHeight;

      setHeight(h);
      /*
       * A pinned footer taller than the viewport can never be fully scrolled to —
       * its top would stay above the viewport's top edge no matter how far down the
       * reader goes. Short viewports and long footers therefore fall back to a
       * footer in normal flow, which is always reachable.
       */
      setPinnable(h <= window.innerHeight * MAX_VIEWPORT_SHARE);
      setMeasured(true);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  /*
   * Renders in normal flow until it has been measured, rather than guessing a height
   * and correcting: pinning first would put a zero-height spacer in the flow for one
   * frame and jump the page. The swap costs nothing visually because the spacer that
   * replaces it is exactly the height the footer just occupied.
   */
  const pinned = measured && !reduceMotion && pinnable;

  return (
    <>
      {pinned && <div aria-hidden="true" style={{ height }} />}

      <footer
        ref={ref}
        className={cn(
          "bg-frame text-frame-foreground",
          pinned && "fixed bottom-0 left-0 right-0 z-0",
        )}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          {/* The address, given the weight of a headline. */}
          <a
            href={`mailto:${EMAIL}`}
            className={cn(
              "inline-block text-[clamp(1.75rem,5vw,3.25rem)] font-medium tracking-tight leading-[1.1]",
              "transition-opacity hover:opacity-70",
              focusRingOnFrame,
            )}
          >
            {EMAIL}
          </a>

          <div className="mt-8">
            <Link
              to="/sign-up"
              className={cn(
                "inline-flex h-12 items-center rounded-full px-7 text-sm font-medium",
                /* Inverts against the frame, exactly as the header's CTA does. */
                "bg-frame-foreground text-frame transition-opacity hover:opacity-90",
                focusRingOnFrame,
              )}
            >
              Sign up free
            </Link>
          </div>

          <div className="mt-14 h-px w-full bg-frame-foreground/15" />

          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <p className="text-lg font-semibold">Moneta</p>
              <p className="mt-1 text-sm text-frame-foreground/65">
                Budgeting, synced from your bank.
              </p>
            </div>

            {NAV.map((group) => (
              <nav key={group.heading} aria-label={group.heading}>
                <p className="text-[11px] font-medium uppercase tracking-wider text-frame-foreground/45">
                  {group.heading}
                </p>
                <ul className="mt-4 space-y-3">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      {/*
                       * In-page anchors stay plain <a>: react-router's Link would
                       * treat "#services" as a route and push it onto history rather
                       * than letting the browser scroll to the element.
                       */}
                      {link.to.startsWith("#") ? (
                        <a href={link.to} className={footerLink}>
                          {link.label}
                        </a>
                      ) : (
                        <Link to={link.to} className={footerLink}>
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          <div className="mt-14 flex flex-col gap-3 border-t border-frame-foreground/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-frame-foreground/45">© 2026 Moneta</p>
            <p className="text-xs text-frame-foreground/45">
              Free during early access. If we ever introduce paid plans, current users will hear
              about it first.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
