import { Link } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { Moon, Sun } from "lucide-react";
import { HeaderShell } from "./HeaderShell";
import { ShellMenu, SHELL_MENU_COLLAPSED_W } from "./ShellMenu";
import { useShellNav } from "./shellNav";
import { focusRingOnFrame, focusRingOnPage, iconButtonOnFrame } from "./chrome";
import { cn } from "./ui/utils";
import { type Language, getTranslation } from "../lib/translations";

/**
 * The marketing header: the same pill as the app's SiteHeader, carrying what a
 * visitor can actually act on instead of the app nav.
 *
 *   signed out   logo · [Sign up] · theme
 *   signed in    logo · [Back to app] · menu
 *
 * There is no nav and no menu for a signed-out visitor — the app's views are all
 * behind auth, and a menu holding a lone theme switch is not worth a click. Theme
 * gets promoted to the bar to fill that gap; language does not, because the landing
 * copy is English-only, and a toggle that changes nothing on screen is worse than
 * no toggle. A signed-in visitor gets the full ShellMenu back, nav included, since
 * every row in it is live for them.
 */

/**
 * The CTA, in its two surfaces. On the bar it inverts to `--frame-foreground` —
 * the same treatment as the active nav item, which makes it the one loud thing on
 * the header. Below `lg` there is no bar to invert against, so it fills with
 * `--frame` instead and reads as the loud pill against the page, exactly like the
 * menu pill it stands in for.
 */
const ctaOnFrame = cn(
  "inline-flex h-9 items-center rounded-full px-4 whitespace-nowrap",
  "bg-frame-foreground text-frame text-sm font-medium",
  "transition-opacity hover:opacity-90",
  focusRingOnFrame,
);

const ctaOnPage = cn(
  "pointer-events-auto inline-flex h-13 items-center rounded-full px-5 whitespace-nowrap",
  "bg-frame text-frame-foreground text-sm font-medium",
  "transition-opacity hover:opacity-90",
  focusRingOnPage,
);

/**
 * The mobile theme control is a page-surface badge, deliberately matched to the
 * logo badge opposite it rather than to the CTA: it is the quiet control of the
 * pair and should not compete with the one action on the row.
 */
const themeButtonOnPage = cn(
  "pointer-events-auto grid size-13 place-items-center rounded-full",
  "border border-border bg-background text-foreground",
  "transition-colors hover:bg-accent",
  focusRingOnPage,
);

interface LandingHeaderProps {
  t: ReturnType<typeof getTranslation>;
  language: Language;
  isDarkMode: boolean;
  onToggleLanguage: () => void;
  onToggleTheme: () => void;
}

export function LandingHeader({
  t,
  language,
  isDarkMode,
  onToggleLanguage,
  onToggleTheme,
}: LandingHeaderProps) {
  const navItems = useShellNav(t);
  const ThemeIcon = isDarkMode ? Sun : Moon;
  const themeLabel = isDarkMode ? 'Switch to light theme' : 'Switch to dark theme';

  /**
   * Nothing on the marketing page corresponds to an app view, so no nav item is
   * ever current. ShellMenu takes `null` rather than a default of 'dashboard',
   * which would light up a row the visitor is not on.
   */
  const menuProps = {
    language,
    isDarkMode,
    onToggleLanguage,
    onToggleTheme,
    activeView: null,
    navItems,
  };

  return (
    /* No spacer: the hero owns the full viewport and this floats over it. */
    <HeaderShell spacer={false}>
      {/* Desktop: logo left, action cluster right. No centred nav to balance. */}
      <div className="hidden lg:flex h-full items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2" aria-label="Moneta home">
          <img src="/favicon.png" alt="" className="w-8 h-8 coin-logo" />
          <span className="text-lg font-semibold text-frame-foreground">{t.appTitle}</span>
        </Link>

        {/*
         * `h-full` is load-bearing for the signed-in case: ShellMenu's bar variant
         * positions its panel with `top-full` and needs a full-height wrapper to
         * drop clear of the bar rather than into it.
         */}
        <div className="flex h-full items-center gap-2">
          <SignedOut>
            <Link to="/sign-up" className={ctaOnFrame}>
              Sign up
            </Link>
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={themeLabel}
              className={iconButtonOnFrame}
            >
              <ThemeIcon className="w-4 h-4" />
            </button>
          </SignedOut>

          <SignedIn>
            <Link to="/app" className={ctaOnFrame}>
              Back to app
            </Link>
            <ShellMenu variant="bar" {...menuProps} />
          </SignedIn>
        </div>
      </div>

      {/* Mobile: no bar — every child floats over the page on its own surface. */}
      <div className="flex lg:hidden h-full items-center">
        <Link
          to="/"
          aria-label="Moneta home"
          className={cn(
            "pointer-events-auto grid size-13 place-items-center rounded-full border border-border bg-background",
            focusRingOnPage,
          )}
        >
          <img src="/favicon.png" alt="" className="w-7 h-7 coin-logo" />
        </Link>

        <SignedOut>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/sign-up" className={ctaOnPage}>
              Sign up
            </Link>
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={themeLabel}
              className={themeButtonOnPage}
            >
              <ThemeIcon className="w-5 h-5" />
            </button>
          </div>
        </SignedOut>

        <SignedIn>
          {/*
           * The menu pill is absolutely positioned, so it is out of flow and cannot
           * push the CTA aside. Reserve its collapsed width plus a 12px gap by hand;
           * both sit 20px from the header edge, so the reservation is measured from
           * the CTA's own right edge.
           */}
          <div className="ml-auto" style={{ marginRight: SHELL_MENU_COLLAPSED_W + 12 }}>
            <Link to="/app" className={ctaOnPage}>
              Back to app
            </Link>
          </div>
          <ShellMenu {...menuProps} />
        </SignedIn>
      </div>
    </HeaderShell>
  );
}
