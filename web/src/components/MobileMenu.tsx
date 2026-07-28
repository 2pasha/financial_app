import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { UserButton } from "@clerk/clerk-react";
import { Moon, Sun, Languages, HelpCircle } from "lucide-react";
import { cn } from "./ui/utils";
import { focusRingOnFrame, focusRingOnPage } from "./chrome";
import { type Language } from "../lib/translations";

type NavView = 'dashboard' | 'plan' | 'expenses';
type ActiveView = NavView | 'trips';

/** Collapsed and expanded widths of the pill container, in px. */
const COLLAPSED_W = 128;
const EXPANDED_W = 296;
/** Panel content width: EXPANDED_W minus the container's `p-2` on both sides. */
const PANEL_W = 280;

const SOFT_EASE = [0.22, 1, 0.36, 1] as const;

/**
 * 450ms, deliberately over DESIGN.md's 300ms cap for state changes, to match the
 * reference's feel. Recorded there as a named exception. Everything below is
 * gated on `useReducedMotion`.
 */
const DURATION = 0.45;
const FADE_DURATION = 0.35;

/**
 * Panel rows cascade in 45ms apart behind a 140ms lead. Built per-render from
 * `animate` so reduced motion collapses the stagger and the travel rather than
 * relying on variant propagation with a falsy `animate` prop.
 */
function makeRowVariants(animate: boolean) {
  return {
    hidden: { opacity: 0, y: animate ? 18 : 0 },
    visible: (i: number) =>
      animate
        ? {
            opacity: 1,
            y: 0,
            transition: {
              opacity: { duration: DURATION, ease: SOFT_EASE, delay: 0.14 + 0.045 * i },
              y: {
                type: 'spring' as const,
                stiffness: 420,
                damping: 42,
                mass: 0.9,
                restDelta: 0.01,
                delay: 0.14 + 0.045 * i,
              },
            },
          }
        : { opacity: 1, y: 0, transition: { duration: 0.01 } },
  };
}

const eyebrow = "text-[11px] font-medium tracking-wider uppercase text-muted-foreground";

/**
 * Two bars sharing one grid cell, so they rotate about a common centre into an X.
 */
function MenuBars({ open, animate }: { open: boolean; animate: boolean }) {
  const t = animate ? { duration: 0.3, ease: SOFT_EASE } : { duration: 0.01 };
  return (
    <span className="relative grid h-4 w-4 place-items-center" aria-hidden="true">
      <motion.span
        className="col-start-1 row-start-1 h-[1.6px] w-[15px] rounded-full bg-current"
        initial={false}
        animate={{ y: open ? 0 : -3, rotate: open ? 45 : 0 }}
        transition={t}
      />
      <motion.span
        className="col-start-1 row-start-1 h-[1.6px] w-[15px] rounded-full bg-current"
        initial={false}
        animate={{ y: open ? 0 : 3, rotate: open ? -45 : 0 }}
        transition={t}
      />
    </span>
  );
}

/**
 * Crossfades "Menu" ↔ "Close". Both words occupy the same grid cell inside a
 * 5ch box, so the pill does not jump as the label changes length.
 */
function MenuLabel({ open, animate }: { open: boolean; animate: boolean }) {
  return (
    <span className="relative grid items-center overflow-hidden min-w-[5ch]">
      <AnimatePresence initial={false}>
        <motion.span
          key={open ? 'close' : 'menu'}
          className="col-start-1 row-start-1 text-left whitespace-nowrap"
          initial={{ opacity: 0, y: animate ? 8 : 0 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: animate ? -8 : 0 }}
          transition={animate ? { duration: 0.22, ease: SOFT_EASE } : { duration: 0.01 }}
        >
          {open ? 'Close' : 'Menu'}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

interface MobileMenuProps {
  language: Language;
  isDarkMode: boolean;
  onToggleLanguage: () => void;
  onToggleTheme: () => void;
  activeView: ActiveView;
  /**
   * Defined once in SiteHeader, where `selectView`/`goTrips` live, so the label
   * translation and the navigation behaviour stay in one place.
   */
  navItems: { key: ActiveView; label: string; onClick: () => void }[];
  onShowWelcome?: () => void;
}

/**
 * The mobile menu: a `--frame`-filled pill that expands in place into a
 * page-coloured card. Replaces the Radix Sheet drawer.
 *
 * Two surfaces with opposite rules live here. The pill is chrome, so it takes
 * `--frame`/`--frame-foreground` and inverts against the page. The expanded panel
 * is `bg-background` — a page surface — so page tokens (`text-foreground`,
 * `bg-border`, `ring-ring`) are correct inside it. See DESIGN.md's Inverted Frame
 * Rule, which carves this out explicitly.
 */
export function MobileMenu({
  language,
  isDarkMode,
  onToggleLanguage,
  onToggleTheme,
  activeView,
  navItems,
  onShowWelcome,
}: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const animate = !reduceMotion;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rowVariants = makeRowVariants(animate);

  // Escape closes and hands focus back to the trigger (reference parity).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Outside click closes. Not in the reference, but expected of a product app.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const transition = animate ? { duration: DURATION, ease: SOFT_EASE } : { duration: 0.01 };

  const secondaryRow = cn(
    "flex items-center gap-2 w-fit text-sm font-medium text-foreground/80 hover:text-foreground transition-colors",
    focusRingOnPage,
  );

  return (
    <motion.div
      ref={containerRef}
      initial={false}
      animate={{
        width: open ? EXPANDED_W : COLLAPSED_W,
        boxShadow: open
          ? '0 30px 70px -24px rgba(0, 0, 0, 0.25)'
          : '0 30px 70px -24px rgba(0, 0, 0, 0)',
      }}
      transition={transition}
      /*
       * `max-w` caps the animated width so the open card can never overflow the
       * viewport: 296px + the 20px inset needs 316px, which just clears a 320px
       * phone and would spill on anything narrower. A CSS max-width bounds
       * framer-motion's numeric width without fighting it.
       */
      className="pointer-events-auto absolute top-1.5 right-5 max-w-[calc(100vw_-_2.5rem)] rounded-[28px] p-2"
    >
      {/* The page-coloured card that appears behind the pill when open. */}
      <motion.div
        initial={false}
        animate={{ opacity: open ? 1 : 0 }}
        transition={animate ? { duration: FADE_DURATION, ease: SOFT_EASE } : { duration: 0.01 }}
        className="pointer-events-none absolute inset-0 rounded-[28px] border border-border bg-background"
      />

      <div className="relative">
        {/* Trigger pill — chrome, so frame tokens only. */}
        <div className="flex h-13 w-full items-center justify-end rounded-full bg-frame px-1.5 text-frame-foreground">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className={cn(
              "flex items-center gap-2.5 rounded-full px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-80",
              focusRingOnFrame,
            )}
          >
            <MenuBars open={open} animate={animate} />
            <MenuLabel open={open} animate={animate} />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="panel"
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              transition={transition}
              className="overflow-hidden"
            >
              <div className="flex justify-center">
                <motion.div
                  initial="hidden"
                  animate="visible"
                  style={{ width: PANEL_W }}
                  className="shrink-0 px-4 pt-7 pb-3"
                >
                  {/* Navigation */}
                  <div className="flex flex-col gap-2">
                    <motion.span custom={0} variants={rowVariants} className={cn(eyebrow, "mb-1")}>
                      Navigation
                    </motion.span>
                    {navItems.map((item, i) => (
                      <motion.button
                        key={item.key}
                        type="button"
                        custom={1 + i}
                        variants={rowVariants}
                        onClick={() => {
                          item.onClick();
                          setOpen(false);
                        }}
                        aria-current={activeView === item.key ? 'page' : undefined}
                        className={cn(
                          "w-fit text-left text-2xl leading-tight font-medium tracking-tight transition-colors",
                          activeView === item.key
                            ? "text-foreground"
                            : "text-foreground/55 hover:text-foreground",
                          focusRingOnPage,
                        )}
                      >
                        {item.label}
                      </motion.button>
                    ))}
                  </div>

                  <motion.div
                    custom={1 + navItems.length}
                    variants={rowVariants}
                    className="my-6 h-px w-full bg-border"
                  />

                  {/* Settings */}
                  <div className="flex flex-col gap-3">
                    <motion.span
                      custom={2 + navItems.length}
                      variants={rowVariants}
                      className={eyebrow}
                    >
                      Settings
                    </motion.span>
                    <motion.button
                      type="button"
                      custom={3 + navItems.length}
                      variants={rowVariants}
                      onClick={onToggleLanguage}
                      className={secondaryRow}
                    >
                      <Languages className="w-4 h-4" />
                      Language · {language === 'en' ? 'EN' : 'UK'}
                    </motion.button>
                    <motion.button
                      type="button"
                      custom={4 + navItems.length}
                      variants={rowVariants}
                      onClick={onToggleTheme}
                      className={secondaryRow}
                    >
                      {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                      {isDarkMode ? 'Theme · Dark' : 'Theme · Light'}
                    </motion.button>
                    {onShowWelcome && (
                      <motion.button
                        type="button"
                        custom={5 + navItems.length}
                        variants={rowVariants}
                        onClick={() => {
                          onShowWelcome();
                          setOpen(false);
                        }}
                        className={secondaryRow}
                      >
                        <HelpCircle className="w-4 h-4" />
                        Show welcome tour
                      </motion.button>
                    )}
                  </div>

                  <motion.div
                    custom={6 + navItems.length}
                    variants={rowVariants}
                    className="my-6 h-px w-full bg-border"
                  />

                  {/* Account */}
                  <motion.div
                    custom={7 + navItems.length}
                    variants={rowVariants}
                    className="flex items-center gap-3"
                  >
                    <UserButton afterSignOutUrl="/sign-in" />
                    <span className="text-sm text-foreground">Account</span>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
