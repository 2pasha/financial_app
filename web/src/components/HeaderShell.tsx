import { type ReactNode } from "react";
import { FrameCornerSvg } from "./SiteFrame";
import { cn } from "./ui/utils";

/**
 * The header's shape, with nothing in it. Both the app header (SiteHeader) and the
 * marketing header (LandingHeader) are this shell plus their own contents, so the
 * pill geometry, the shoulders and the scroll spacer are defined once and any tweak
 * to the silhouette lands on both.
 *
 * Whatever a caller puts inside is chrome sitting on an inverted surface: the bar is
 * filled with `--frame`, which is always the tonal opposite of the page. That rules
 * out the shared `Button` variants — `variant="default"` is `bg-primary`, and
 * `--primary` tracks the *page*, so it collides with the header in both themes.
 * Contents must be built from `--frame` / `--frame-foreground` and nothing else.
 *
 * Below `lg` there is no bar at all, and the rule above inverts with it: contents
 * float directly over the page, so they need page-coloured surfaces (or `--frame`
 * used as a fill, the way the menu pill does) rather than `--frame-foreground`.
 */

/**
 * The header's own height at each breakpoint, as padding utilities. A page that
 * opts out of the spacer has to clear the floating header itself, and this is the
 * one place those two numbers are allowed to be written down.
 */
export const HEADER_CLEARANCE = "pt-20 lg:pt-[90px]";

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

interface HeaderShellProps {
  children: ReactNode;
  /**
   * Whether to reserve the fixed header's height in the flow. Every app page wants
   * this. The landing page does not: its hero owns the full viewport and the header
   * floats over it, so a spacer would push the hero down and make the first screen
   * taller than the viewport by exactly the header's height.
   */
  spacer?: boolean;
}

export function HeaderShell({ children, spacer = true }: HeaderShellProps) {
  return (
    <>
      {/*
       * Two different headers share this element.
       *
       * Below `lg` there is no bar: the element is transparent and only its contents
       * are visible, floating over content that scrolls beneath. `pointer-events-none`
       * here with `pointer-events-auto` on each floating child is what stops the
       * transparent strip swallowing taps on the content underneath — the reference
       * leaves the whole strip live, which would put a dead zone across the top of
       * every screen.
       *
       * At `lg` it becomes the frame-coloured pill hanging off the top band:
       * `lg:top-2.5` is 10px and must stay equal to --frame-width so band and header
       * meet with no seam, and `lg:overflow-visible` is required because the
       * shoulders sit outside the box. No `overflow-hidden` at any width — the menu
       * panel renders inside this element at both breakpoints and would be clipped.
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
        <div className="h-20 px-5 sm:px-6 lg:px-8">{children}</div>

        <FrameShoulder side="left" />
        <FrameShoulder side="right" />
      </header>

      {/*
       * Reserves the fixed header's space so no page shell needs a padding
       * change. Must track the header: 80px for the floating mobile row, and
       * 10px offset + 80px bar at lg. HEADER_CLEARANCE mirrors these two heights
       * for callers that opt out and have to clear the header themselves.
       */}
      {spacer && <div aria-hidden="true" className="h-20 lg:h-[90px]" />}
    </>
  );
}
