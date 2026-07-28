/**
 * Focus treatments shared by the app shell.
 *
 * Ring-based rather than outline-based: `outline-none` sets
 * `--tw-outline-style: none`, which a later `outline-2` reads back, so the two
 * cancel out. `ring-*` is also what ui/button.tsx uses.
 *
 * There are two, because the shell has two surfaces with opposite tones. Picking
 * the wrong one produces a ring that is invisible in one theme — a white ring on
 * the white panel, or an ink ring on the ink pill.
 */

/** For chrome sitting on `--frame`: the header bar, the mobile menu pill. */
export const focusRingOnFrame =
  "outline-none focus-visible:ring-2 focus-visible:ring-frame-foreground focus-visible:ring-offset-0";

/** For controls on a page-coloured surface, e.g. inside the expanded menu panel. */
export const focusRingOnPage =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
