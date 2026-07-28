/**
 * The inverted-corner shape, used in two places: the four inner corners of the
 * frame, and the two shoulders where the header meets the top band. It fills a
 * thin concave wedge in one corner of its 50x50 box, so rotating it into a joint
 * turns a hard right angle into a smooth concave curve.
 *
 * Callers position and rotate it; it inherits `currentColor`, which must resolve
 * to `--frame`.
 */
export const FRAME_CORNER_SIZE = 50;

export function FrameCornerSvg({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={FRAME_CORNER_SIZE}
      height={FRAME_CORNER_SIZE}
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

/**
 * The page frame: four fixed bands, one per viewport edge, that the floating
 * `SiteHeader` appears to hang from, plus four fillets rounding the inner corners
 * where those bands meet. Purely decorative.
 *
 * All of the behaviour lives in `.site-frame` / `.site-corner` in globals.css —
 * colour (which inverts against the page theme), thickness, corner placement, and
 * the `lg` breakpoint below which the whole frame is dropped. That's why this
 * takes no props and does not need to know the current theme.
 *
 * Mounted once, in the authenticated subtree of `AppWithAuth`, so the marketing
 * landing page and the Clerk sign-in/up screens stay unframed.
 */
export function SiteFrame() {
  return (
    <>
      <div className="site-frame site-frame--top" aria-hidden="true" />
      <div className="site-frame site-frame--bottom" aria-hidden="true" />
      <div className="site-frame site-frame--left" aria-hidden="true" />
      <div className="site-frame site-frame--right" aria-hidden="true" />

      <FrameCornerSvg className="site-corner site-corner--top-left" />
      <FrameCornerSvg className="site-corner site-corner--top-right" />
      <FrameCornerSvg className="site-corner site-corner--bottom-left" />
      <FrameCornerSvg className="site-corner site-corner--bottom-right" />
    </>
  );
}
