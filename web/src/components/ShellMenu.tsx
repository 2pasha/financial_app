import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { UserButton } from "@clerk/clerk-react";
import { Moon, Sun, Languages, HelpCircle } from "lucide-react";
import { cn } from "./ui/utils";
import { focusRingOnFrame, focusRingOnPage, iconButtonOnFrame } from "./chrome";
import { type ActiveView, type NavItem } from "./shellNav";
import { type Language } from "../lib/translations";

/**
 * Collapsed and expanded widths of the floating pill container, in px. The
 * collapsed width is exported because the pill is absolutely positioned, so
 * anything else laid out in the mobile header row has to reserve its footprint by
 * hand — LandingHeader does exactly that for its CTA.
 */
export const SHELL_MENU_COLLAPSED_W = 128;
const COLLAPSED_W = SHELL_MENU_COLLAPSED_W;
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

interface MenuRowsProps {
  language: Language;
  isDarkMode: boolean;
  onToggleLanguage: () => void;
  onToggleTheme: () => void;
  activeView: ActiveView | null;
  navItems: NavItem[];
  onShowWelcome?: () => void;
  showNav: boolean;
  onClose: () => void;
  rowVariants: ReturnType<typeof makeRowVariants>;
}

/**
 * The panel body, shared by both variants — one definition of the rows.
 *
 * This is a *page*-coloured surface even though it belongs to the shell's chrome,
 * so page tokens are correct here: `text-foreground`, `bg-border`, and
 * `focusRingOnPage`. See DESIGN.md's Inverted Frame Rule carve-out.
 *
 * Stagger indices come from a running counter rather than arithmetic on
 * `navItems.length`: the Navigation group is conditional, and a hardcoded offset
 * that skips an index would leave a row stuck at `opacity: 0` forever.
 */
function MenuRows({
  language,
  isDarkMode,
  onToggleLanguage,
  onToggleTheme,
  activeView,
  navItems,
  onShowWelcome,
  showNav,
  onClose,
  rowVariants,
}: MenuRowsProps) {
  let row = 0;
  const next = () => row++;

  const secondaryRow = cn(
    "flex items-center gap-2 w-fit text-sm font-medium text-foreground/80 hover:text-foreground transition-colors",
    focusRingOnPage,
  );

  return (
    <>
      {showNav && (
        <>
          <div className="flex flex-col gap-2">
            <motion.span custom={next()} variants={rowVariants} className={cn(eyebrow, "mb-1")}>
              Navigation
            </motion.span>
            {navItems.map((item) => (
              <motion.button
                key={item.key}
                type="button"
                custom={next()}
                variants={rowVariants}
                onClick={() => {
                  item.onClick();
                  onClose();
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
            custom={next()}
            variants={rowVariants}
            className="my-6 h-px w-full bg-border"
          />
        </>
      )}

      {/* Settings */}
      <div className="flex flex-col gap-3">
        <motion.span custom={next()} variants={rowVariants} className={eyebrow}>
          Settings
        </motion.span>
        <motion.button
          type="button"
          custom={next()}
          variants={rowVariants}
          onClick={onToggleLanguage}
          className={secondaryRow}
        >
          <Languages className="w-4 h-4" />
          Language · {language === 'en' ? 'EN' : 'UK'}
        </motion.button>
        <motion.button
          type="button"
          custom={next()}
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
            custom={next()}
            variants={rowVariants}
            onClick={() => {
              onShowWelcome();
              onClose();
            }}
            className={secondaryRow}
          >
            <HelpCircle className="w-4 h-4" />
            Show welcome tour
          </motion.button>
        )}
      </div>

      <motion.div custom={next()} variants={rowVariants} className="my-6 h-px w-full bg-border" />

      {/* Account */}
      <motion.div custom={next()} variants={rowVariants} className="flex items-center gap-3">
        <UserButton afterSignOutUrl="/sign-in" />
        <span className="text-sm text-foreground">Account</span>
      </motion.div>
    </>
  );
}

interface ShellMenuProps {
  language: Language;
  isDarkMode: boolean;
  onToggleLanguage: () => void;
  onToggleTheme: () => void;
  /** `null` where no nav item can be active — the marketing header's panel. */
  activeView: ActiveView | null;
  /**
   * Built by `useShellNav`, so the label translation and the navigation behaviour
   * stay in one place across both headers.
   */
  navItems: NavItem[];
  onShowWelcome?: () => void;
  /**
   * `floating` (mobile): trigger and panel share one container that animates from
   * a pill into a card over the page. `bar` (desktop): the trigger is an icon
   * button inline in the frame bar, and the panel drops below it as a dropdown.
   */
  variant?: 'floating' | 'bar';
  /** `false` omits the Navigation group — the desktop bar already shows the nav. */
  showNav?: boolean;
  /**
   * Renders already-open. Exists because framer-motion only advances its values on
   * `requestAnimationFrame`, which never runs under headless virtual time, so a
   * click-opened panel cannot be screenshotted. `AnimatePresence initial={false}`
   * renders an initially-open panel at its final values with no animation.
   */
  defaultOpen?: boolean;
}

/**
 * The shell menu. Holds whatever does not earn a permanent place in the header:
 * language, theme, the welcome tour and the account row — plus the nav on mobile,
 * where there is no room for it in the bar.
 *
 * Two surfaces with opposite rules meet here. The trigger is chrome and takes
 * `--frame`/`--frame-foreground`; the panel is `bg-background`, a page surface, so
 * page tokens are correct inside it.
 *
 * The variants differ in geometry for a reason worth keeping. On mobile there is no
 * bar, so the container can wrap the trigger and grow into a card over the page. On
 * desktop that same geometry would punch a page-coloured card into the frame bar's
 * right end, and would leave the trigger with no colour that works on both
 * surfaces — white vanishes on the card, ink vanishes on the bar. So `bar` keeps the
 * trigger on the frame and drops the panel below it instead.
 */
export function ShellMenu({
  language,
  isDarkMode,
  onToggleLanguage,
  onToggleTheme,
  activeView,
  navItems,
  onShowWelcome,
  variant = 'floating',
  showNav = true,
  defaultOpen = false,
}: ShellMenuProps) {
  const [open, setOpen] = useState(defaultOpen);
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

  const rows = (
    <MenuRows
      language={language}
      isDarkMode={isDarkMode}
      onToggleLanguage={onToggleLanguage}
      onToggleTheme={onToggleTheme}
      activeView={activeView}
      navItems={navItems}
      onShowWelcome={onShowWelcome}
      showNav={showNav}
      onClose={() => setOpen(false)}
      rowVariants={rowVariants}
    />
  );

  const triggerAria = {
    'aria-expanded': open,
    'aria-label': open ? 'Close menu' : 'Open menu',
  } as const;

  if (variant === 'bar') {
    /*
     * `h-full` on the wrapper is load-bearing: the panel is positioned with
     * `top-full`, so the wrapper has to span the full height of the bar row. Sized
     * to the 36px trigger instead, `top-full` lands 14px *above* the bar's bottom
     * edge and the page-coloured card punches into the frame bar — the whole thing
     * this variant exists to avoid.
     */
    return (
      <div ref={containerRef} className="relative flex h-full shrink-0 items-center">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          {...triggerAria}
          className={iconButtonOnFrame}
        >
          <MenuBars open={open} animate={animate} />
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={transition}
              /*
               * Drops below the bar rather than overlapping it. The card carries
               * its own border and shadow because, unlike the floating variant,
               * there is no backdrop layer sitting behind the trigger.
               */
              className="absolute right-0 top-full mt-2 w-[296px] overflow-hidden rounded-[28px] border border-border bg-background shadow-[0_30px_70px_-24px_rgba(0,0,0,0.25)]"
            >
              {/*
               * `initial`/`animate` labels are required here, not decorative: the
               * rows resolve their stagger through variant propagation from a
               * parent. Without them their `variants` never resolve and every row
               * appears at once.
               */}
              <motion.div initial="hidden" animate="visible" className="px-6 pt-6 pb-5">
                {rows}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

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
            {...triggerAria}
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
                  {rows}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
