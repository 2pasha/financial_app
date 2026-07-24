import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { Moon, Sun, Languages, Menu, HelpCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { type Language, getTranslation } from "../lib/translations";

type NavView = 'dashboard' | 'plan' | 'expenses';
type ActiveView = NavView | 'trips';

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
  const location = useLocation();
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
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          {/* Desktop header */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src="/favicon.png"
                alt="Moneta"
                className="w-8 h-8 coin-logo cursor-pointer"
                onClick={() => navigate('/')}
              />
              <h1>{t.appTitle}</h1>
            </div>
            <div className="flex items-center gap-2">
              {navItems.map((item) => (
                <Button
                  key={item.key}
                  variant={activeView === item.key ? 'default' : 'outline'}
                  onClick={item.onClick}
                >
                  {item.label}
                </Button>
              ))}
              {onShowWelcome && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onShowWelcome}
                  className="rounded-full"
                  aria-label="Help"
                >
                  <HelpCircle className="w-5 h-5" />
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={onToggleLanguage}
                className="rounded-full"
              >
                <Languages className="w-5 h-5" />
                <span className="sr-only">{language === 'en' ? 'EN' : 'UK'}</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onToggleTheme}
                className="rounded-full"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              <UserButton afterSignOutUrl="/sign-in" />
            </div>
          </div>

          {/* Mobile header */}
          <div className="flex md:hidden items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src="/favicon.png"
                alt="Moneta"
                className="w-7 h-7 coin-logo cursor-pointer"
                onClick={() => navigate('/')}
              />
              <span className="font-semibold text-sm text-foreground">{t.appTitle}</span>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-4 h-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </div>
        </div>
      </header>

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
