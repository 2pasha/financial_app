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
 *   signed out   logo · [Sign up] · language · theme
 *   signed in    logo · [Back to app] · menu
 *
 * There is no nav and no menu for a signed-out visitor — the app's views are all
 * behind auth, and a menu holding two switches is not worth a click. Both switches
 * are promoted to the bar instead to fill that gap. Language belongs there now that
 * the landing copy is translated: a Ukrainian visitor has to be able to reach it
 * without an account, and there is nowhere else on the page to put it. A signed-in
 * visitor gets the full ShellMenu back, nav included, since every row in it is live
 * for them — and the menu already carries both switches, so they are not repeated
 * on the bar.
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
 * The mobile theme and language controls are page-surface badges, deliberately
 * matched to the logo badge opposite them rather than to the CTA: they are the quiet
 * controls of the row and should not compete with the one action on it.
 */
const badgeOnPage = cn(
  "pointer-events-auto grid w-13 h-11 place-items-center rounded-full",
  "border border-border bg-background text-foreground",
  "transition-colors hover:bg-accent",
  focusRingOnPage,
);

/**
 * The language switch shows a two-letter code rather than an icon. A globe or
 * `Languages` glyph says only "language exists"; the code says which one you are
 * currently reading, which is the thing a visitor needs to know before deciding to
 * press it. Sized to match the icon controls beside it so the row stays even.
 */
const langButtonOnFrame = cn(
  "h-9 shrink-0 px-2.5 rounded-full grid place-items-center transition-colors",
  "text-xs font-semibold tracking-wide",
  "text-frame-foreground/80 hover:text-frame-foreground hover:bg-frame-foreground/10",
  focusRingOnFrame,
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
  const themeLabel = isDarkMode ? t.lpToLightTheme : t.lpToDarkTheme;
  /* The badge shows what you are reading; the label says where pressing it takes you. */
  const langCode = language === 'en' ? 'EN' : 'UK';
  const langLabel = language === 'en' ? t.lpToUkrainian : t.lpToEnglish;

  /**
   * Nothing on the marketing page corresponds to an app view, so no nav item is
   * ever current. ShellMenu takes `null` rather than a default of 'dashboard',
   * which would light up a row the visitor is not on.
   */
  const menuProps = {
    t,
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
        <Link to="/" className="flex items-center gap-2" aria-label={t.lpHomeAria}>
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
              {t.lpSignUp}
            </Link>
            <button
              type="button"
              onClick={onToggleLanguage}
              aria-label={langLabel}
              className={langButtonOnFrame}
            >
              {langCode}
            </button>
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
              {t.lpBackToApp}
            </Link>
            <ShellMenu variant="bar" {...menuProps} />
          </SignedIn>
        </div>
      </div>

      {/* Mobile: no bar — every child floats over the page on its own surface. */}
      <div className="flex lg:hidden h-full items-center">
        <Link
          to="/"
          aria-label={t.lpHomeAria}
          className={cn(
            "pointer-events-auto grid w-13 h-11 place-items-center rounded-full border border-border bg-background",
            focusRingOnPage,
          )}
        >
          <img src="/favicon.png" alt="" className="w-7 h-7 coin-logo" />
        </Link>

        <SignedOut>
          {/*
           * Three controls on a phone row is the most this can carry. It fits because
           * the CTA here is the short `lpSignUp` rather than the hero's `lpSignUpFree`;
           * `min-w-0` lets the CTA give up width before anything is pushed off-screen
           * on the narrowest devices.
           */}
          <div className="ml-auto flex min-w-0 items-center gap-2">
            <Link to="/sign-up" className={cn(ctaOnPage, "min-w-0 truncate")}>
              {t.lpSignUp}
            </Link>
            <button
              type="button"
              onClick={onToggleLanguage}
              aria-label={langLabel}
              className={cn(badgeOnPage, "text-xs font-semibold tracking-wide")}
            >
              {langCode}
            </button>
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={themeLabel}
              className={badgeOnPage}
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
              {t.lpBackToApp}
            </Link>
          </div>
          <ShellMenu {...menuProps} />
        </SignedIn>
      </div>
    </HeaderShell>
  );
}
