import { useNavigate } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { Moon, Sun, Languages, HelpCircle } from "lucide-react";
import { FrameCornerSvg } from "./SiteFrame";
import { MobileMenu } from "./MobileMenu";
import { focusRingOnFrame, focusRingOnPage } from "./chrome";
import { cn } from "./ui/utils";
import { type Language, getTranslation } from "../lib/translations";

type NavView = 'dashboard' | 'plan' | 'expenses';
type ActiveView = NavView | 'trips';

/**
 * The desktop header is chrome on an inverted surface: it is filled with
 * `--frame`, which is always the tonal opposite of the page. That rules out the
 * shared `Button` variants — `variant="default"` is `bg-primary`, and `--primary`
 * tracks the *page*, so it collides with the header in both themes. Everything
 * in here is built from `--frame` / `--frame-foreground` and nothing else.
 *
 * Below `lg` there is no bar at all: the logo badge and `MobileMenu` float over
 * the page. See MobileMenu for the one surface that is exempt from the rule above.
 */
const navItem = cn(
  "h-9 px-4 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
  focusRingOnFrame,
);
const navItemActive = "bg-frame-foreground text-frame";
const navItemIdle =
  "text-frame-foreground/70 hover:text-frame-foreground hover:bg-frame-foreground/10";

const iconButton = cn(
  "size-9 shrink-0 rounded-full grid place-items-center transition-colors",
  "text-frame-foreground/80 hover:text-frame-foreground hover:bg-frame-foreground/10",
  focusRingOnFrame,
);

/**
 * Fills the concave junction where the top frame band meets the header's side,
 * turning a hard T-joint into a smooth shoulder. The same shape the frame uses for
 * its inner corners, just rotated into a different joint. Only meaningful at `lg`
 * and up, where the frame exists and the header is inset from the viewport edges.
 *
 * Offset 49px rather than 50px so it overlaps the header by a pixel — same colour,
 * so no hairline seam can open up between shoulder and header.
 */
function FrameShoulder({ side }: { side: 'left' | 'right' }) {
  return (
    <FrameCornerSvg
      className={cn(
        "hidden lg:block absolute top-0 text-frame pointer-events-none",
        side === 'left' ? "-left-[49px] rotate-180" : "-right-[49px] rotate-90",
      )}
    />
  );
}

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

  const selectView = (v: NavView) => {
    if (onViewChange) {
      onViewChange(v);
    } else {
      localStorage.setItem('view', v);
      navigate('/app');
    }
  };

  const goTrips = () => {
    navigate('/trips');
  };

  const navItems: { key: ActiveView; label: string; onClick: () => void }[] = [
    { key: 'dashboard', label: 'Dashboard', onClick: () => selectView('dashboard') },
    { key: 'plan', label: t.planning, onClick: () => selectView('plan') },
    { key: 'expenses', label: 'Expenses', onClick: () => selectView('expenses') },
    { key: 'trips', label: 'Trips', onClick: goTrips },
  ];

  return (
    <>
      {/*
       * Two different headers share this element.
       *
       * Below `lg` there is no bar: the element is transparent and only the logo
       * badge and the menu pill are visible, floating over content that scrolls
       * beneath. `pointer-events-none` here with `pointer-events-auto` on those two
       * children is what stops the transparent strip swallowing taps on the content
       * underneath — the reference leaves the whole strip live, which would put a
       * dead zone across the top of every screen.
       *
       * At `lg` it becomes the frame-coloured pill hanging off the top band:
       * `lg:top-2.5` is 10px and must stay equal to --frame-width so band and header
       * meet with no seam, and `lg:overflow-visible` is required because the
       * shoulders sit outside the box. No `overflow-hidden` at any width — it would
       * clip the mobile menu's expanding panel, which renders inside this element.
       *
       * Capped at 48rem (768px), deliberately much narrower than the max-w-6xl
       * content column so it reads as a pill floating over it. Because the cap is
       * below the 1024px breakpoint it always binds, so no width guard is needed:
       * the header is inset at least 128px per side, leaving the shoulders 69px of
       * band clearance at worst.
       */}
      <header
        className={cn(
          "pointer-events-none fixed top-0 left-0 right-0 z-40 w-full",
          "lg:pointer-events-auto lg:bg-frame lg:rounded-b-frame",
          "lg:shadow-[0_18px_40px_-12px_rgb(0_0_0/0.35)]",
          "lg:top-2.5 lg:left-1/2 lg:right-auto lg:-translate-x-1/2",
          "lg:max-w-3xl lg:overflow-visible",
        )}
      >
        <div className="h-20 px-5 sm:px-6 lg:px-8">
          {/* Desktop header */}
          <div className="hidden lg:flex h-full items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <img
                src="/favicon.png"
                alt="Moneta"
                className="w-8 h-8 coin-logo cursor-pointer"
                onClick={() => navigate('/')}
              />
              <h1 className="text-lg font-semibold text-frame-foreground">{t.appTitle}</h1>
            </div>
            <div className="flex items-center gap-1">
              <nav className="flex items-center gap-1">
                {navItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={item.onClick}
                    aria-current={activeView === item.key ? 'page' : undefined}
                    className={cn(
                      navItem,
                      activeView === item.key ? navItemActive : navItemIdle,
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
              {onShowWelcome && (
                <button
                  type="button"
                  onClick={onShowWelcome}
                  className={cn(iconButton, "ml-2")}
                  aria-label="Help"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
              )}
              <button
                type="button"
                onClick={onToggleLanguage}
                className={cn(iconButton, !onShowWelcome && "ml-2")}
                aria-label="Change language"
              >
                <Languages className="w-5 h-5" />
                <span className="sr-only">{language === 'en' ? 'EN' : 'UK'}</span>
              </button>
              <button
                type="button"
                onClick={onToggleTheme}
                className={iconButton}
                aria-label={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <div className="ml-2 flex items-center">
                <UserButton afterSignOutUrl="/sign-in" />
              </div>
            </div>
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
            <MobileMenu
              language={language}
              isDarkMode={isDarkMode}
              onToggleLanguage={onToggleLanguage}
              onToggleTheme={onToggleTheme}
              activeView={activeView}
              navItems={navItems}
              onShowWelcome={onShowWelcome}
            />
          </div>
        </div>

        <FrameShoulder side="left" />
        <FrameShoulder side="right" />
      </header>

      {/*
       * Reserves the fixed header's space so no page shell needs a padding
       * change. Must track the header: 80px for the floating mobile row, and
       * 10px offset + 80px bar at lg.
       */}
      <div aria-hidden="true" className="h-20 lg:h-[90px]" />

    </>
  );
}
