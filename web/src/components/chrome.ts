import { cn } from "./ui/utils";

/**
 * Styles shared by the app shell's chrome, used by both SiteHeader and ShellMenu.
 * They live here rather than in either component because importing one from the
 * other would create a cycle — these are module-level consts, so the cycle would
 * read them before initialisation.
 *
 * Focus treatments are ring-based rather than outline-based: `outline-none` sets
 * `--tw-outline-style: none`, which a later `outline-2` reads back, so the two
 * cancel out. `ring-*` is also what ui/button.tsx uses.
 *
 * There are two of them, because the shell has two surfaces with opposite tones.
 * Picking the wrong one produces a ring that is invisible in one theme — a white
 * ring on the white panel, or an ink ring on the ink pill.
 */

/** For chrome sitting on `--frame`: the header bar, the mobile menu pill. */
export const focusRingOnFrame =
  "outline-none focus-visible:ring-2 focus-visible:ring-frame-foreground focus-visible:ring-offset-0";

/** For controls on a page-coloured surface, e.g. inside the expanded menu panel. */
export const focusRingOnPage =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * A 36px circular icon control on the frame bar. The desktop menu trigger is the
 * only remaining user, but it stays here because it defines the bar's control
 * vocabulary and is shared across components.
 */
export const iconButtonOnFrame = cn(
  "size-9 shrink-0 rounded-full grid place-items-center transition-colors",
  "text-frame-foreground/80 hover:text-frame-foreground hover:bg-frame-foreground/10",
  focusRingOnFrame,
);
