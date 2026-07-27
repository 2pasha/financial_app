import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { Moon, Sun, Languages, Menu, HelpCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { cn } from "./ui/utils";
import { type Language, getTranslation } from "../lib/translations";

type NavView = 'dashboard' | 'plan' | 'expenses';
type ActiveView = NavView | 'trips';

/**
 * The header is chrome on an inverted surface: it is filled with `--frame`,
 * which is always the tonal opposite of the page. That rules out the shared
 * `Button` variants — `variant="default"` is `bg-primary`, and `--primary`
 * tracks the *page*, so it collides with the header in both themes. Everything
 * in here is built from `--frame` / `--frame-foreground` and nothing else.
 *
 * The mobile Sheet is exempt: it renders through a portal on document.body,
 * outside the frame, so it keeps using `Button` and stays page-themed.
 */
/**
 * Ring-based, not outline-based: `outline-none` sets `--tw-outline-style: none`,
 * which a later `outline-2` reads back, so the two cancel out. `ring-*` is also
 * what ui/button.tsx uses.
 */
const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-frame-foreground focus-visible:ring-offset-0";

const navItem = cn(
  "h-9 px-4 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
  focusRing,
);
const navItemActive = "bg-frame-foreground text-frame";
const navItemIdle =
  "text-frame-foreground/70 hover:text-frame-foreground hover:bg-frame-foreground/10";

const iconButton = cn(
  "size-9 shrink-0 rounded-full grid place-items-center transition-colors",
  "text-frame-foreground/80 hover:text-frame-foreground hover:bg-frame-foreground/10",
  focusRing,
);

/**
 * Fills the concave junction where the top frame band meets the header's side,
 * turning a hard T-joint into a smooth shoulder. Only meaningful at `lg` and up,
 * where the frame exists and the header is inset from the viewport edges.
 */
function FrameShoulder({ side }: { side: 'left' | 'right' }) {
  return (
    <svg
      className={cn(
        "hidden lg:block absolute top-0 text-frame pointer-events-none",
        side === 'left' ? "-left-[49px] rotate-180" : "-right-[49px] rotate-90",
      )}
      width="50"
      height="50"
      viewBox="0 0 50 50"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5.50871e-06 0C-0.00788227 37.3001 8.99616 50.0116 50 50H5.50871e-06V0Z"
        fill="currentColor"
      />
    </svg>
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const selectView = (v: NavView) => {
    if (onViewChange) {
      onViewChange(v);
    } else {
      localStorage.setItem('view', v);
      navigate('/app');
    }
    setMobileMenuOpen(false);
  };

  const goTrips = () => {
    navigate('/trips');
    setMobileMenuOpen(false);
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
       * Hangs off the top frame band: `lg:top-2.5` is 10px, which must stay equal
       * to --frame-width so band and header meet with no seam. Full-bleed and
       * square-topped below `lg`, where the frame is dropped.
       *
       * `lg:overflow-visible` is required — the shoulders sit outside the box.
       * The max-width step-down keeps the header clear of the side bands so it
       * never clips its own shoulders (1152 + 2*10 < 1280).
       */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-40 w-full overflow-hidden",
          "bg-frame rounded-b-frame shadow-[0_18px_40px_-12px_rgb(0_0_0/0.35)]",
          "lg:top-2.5 lg:left-1/2 lg:right-auto lg:-translate-x-1/2",
          "lg:max-w-4xl xl:max-w-6xl lg:overflow-visible",
        )}
      >
        <div className="h-16 lg:h-20 px-4 sm:px-6">
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

          {/* Mobile header */}
          <div className="flex lg:hidden h-full items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src="/favicon.png"
                alt="Moneta"
                className="w-7 h-7 coin-logo cursor-pointer"
                onClick={() => navigate('/')}
              />
              <span className="font-semibold text-sm text-frame-foreground">{t.appTitle}</span>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className={iconButton}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        <FrameShoulder side="left" />
        <FrameShoulder side="right" />
      </header>

      {/*
       * Reserves the fixed header's space, so no page shell needs a padding
       * change. Heights must track the header: 64px mobile, 10px offset + 80px
       * bar at lg.
       */}
      <div aria-hidden="true" className="h-16 lg:h-[90px]" />

      {/* Mobile menu sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-72 flex flex-col">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 mt-4 px-2 flex-1">
            {/* Navigation */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Navigation</span>
              <div className="flex flex-col gap-0.5">
                {navItems.map((item) => (
                  <Button
                    key={item.key}
                    variant={activeView === item.key ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={item.onClick}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>

            {onShowWelcome && (
              <Button
                variant="outline"
                className="w-full justify-start h-9"
                onClick={() => {
                  onShowWelcome();
                  setMobileMenuOpen(false);
                }}
              >
                <HelpCircle className="w-4 h-4" />
                <span className="ml-1.5 text-sm">Show welcome tour</span>
              </Button>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={onToggleLanguage}
                className="rounded-full flex-1 h-9"
              >
                <Languages className="w-4 h-4" />
                <span className="ml-1.5 text-sm">{language === 'en' ? 'EN' : 'UK'}</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onToggleTheme}
                className="rounded-full flex-1 h-9"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span className="ml-1.5 text-sm">{isDarkMode ? 'Light' : 'Dark'}</span>
              </Button>
            </div>

            {/* Account */}
            <div className="mt-auto pt-4 border-t border-border flex items-center gap-3">
              <UserButton afterSignOutUrl="/sign-in" />
              <span className="text-sm text-foreground">Account</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
