import { useNavigate } from "react-router-dom";
import { HeaderShell } from "./HeaderShell";
import { ShellMenu } from "./ShellMenu";
import { focusRingOnFrame, focusRingOnPage } from "./chrome";
import { cn } from "./ui/utils";
import { useShellNav, type ActiveView, type NavView } from "./shellNav";
import { type Language, getTranslation } from "../lib/translations";

/**
 * The app shell's header: logo, nav, menu. Everything here is chrome on the
 * inverted surface HeaderShell provides, so it is built from `--frame` /
 * `--frame-foreground` and nothing else — see the note in HeaderShell, and
 * ShellMenu for the one surface that is exempt (its panel is page-coloured, so
 * page tokens are correct inside it).
 *
 * The marketing counterpart is LandingHeader.
 */
const navItem = cn(
  "h-9 px-4 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
  focusRingOnFrame,
);
const navItemActive = "bg-frame-foreground text-frame";
const navItemIdle =
  "text-frame-foreground/70 hover:text-frame-foreground hover:bg-frame-foreground/10";

interface SiteHeaderProps {
  t: ReturnType<typeof getTranslation>;
  language: Language;
  isDarkMode: boolean;
  onToggleLanguage: () => void;
  onToggleTheme: () => void;
  /** Which nav item is currently active. */
  activeView: ActiveView;
  /**
   * Provided by the `/` route (App) to switch its in-page view without a full
   * navigation. When absent (trip pages), selecting a view routes back to `/`.
   */
  onViewChange?: (v: NavView) => void;
  /**
   * Re-triggers the welcome flow. Only the dashboard passes this, so the "?"
   * button renders there and not on trip/monobank pages.
   */
  onShowWelcome?: () => void;
}

export function SiteHeader({
  t,
  language,
  isDarkMode,
  onToggleLanguage,
  onToggleTheme,
  activeView,
  onViewChange,
  onShowWelcome,
}: SiteHeaderProps) {
  const navigate = useNavigate();
  const navItems = useShellNav(t, onViewChange);

  return (
    <HeaderShell>
      {/*
       * Desktop: three things only — logo, nav, menu. Language, theme, the
       * welcome tour and the account row all live in the menu panel now.
       *
       * The nav is absolutely centred rather than laid out between the logo and
       * the menu, so it is centred on the header itself and does not drift as
       * Ukrainian labels change the logo/menu clusters' widths. Inner width at
       * `lg` is 704px and the nav is ~391px, which leaves ~55px to the logo and
       * ~121px to the trigger — no overlap in either language.
       */}
      <div className="relative hidden lg:flex h-full items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <img
            src="/favicon.png"
            alt="Moneta"
            className="w-8 h-8 coin-logo cursor-pointer"
            onClick={() => navigate('/')}
          />
          <h1 className="text-lg font-semibold text-frame-foreground">{t.appTitle}</h1>
        </div>

        <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              aria-current={activeView === item.key ? 'page' : undefined}
              className={cn(navItem, activeView === item.key ? navItemActive : navItemIdle)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <ShellMenu
          variant="bar"
          showNav={false}
          language={language}
          isDarkMode={isDarkMode}
          onToggleLanguage={onToggleLanguage}
          onToggleTheme={onToggleTheme}
          activeView={activeView}
          navItems={navItems}
          onShowWelcome={onShowWelcome}
        />
      </div>

      {/*
       * Mobile: logo badge only on the left, expanding menu pill on the right.
       * The badge needs its own solid background and border — unlike the desktop
       * header there is no bar behind it, so it has to hold its own against
       * whatever content scrolls underneath.
       */}
      <div className="flex lg:hidden h-full items-center">
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="Moneta home"
          className={cn(
            "pointer-events-auto grid size-13 place-items-center rounded-full border border-border bg-background",
            focusRingOnPage,
          )}
        >
          <img src="/favicon.png" alt="" className="w-7 h-7 coin-logo" />
        </button>
        <ShellMenu
          language={language}
          isDarkMode={isDarkMode}
          onToggleLanguage={onToggleLanguage}
          onToggleTheme={onToggleTheme}
          activeView={activeView}
          navItems={navItems}
          onShowWelcome={onShowWelcome}
        />
      </div>
    </HeaderShell>
  );
}
