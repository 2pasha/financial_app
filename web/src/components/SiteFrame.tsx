/**
 * The page frame: four fixed bands, one per viewport edge, that the floating
 * `SiteHeader` appears to hang from. Purely decorative.
 *
 * All of the behaviour lives in `.site-frame` in globals.css — colour (which
 * inverts against the page theme), thickness, and the `lg` breakpoint below
 * which the frame is dropped entirely. That's why this takes no props and does
 * not need to know the current theme.
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
    </>
  );
}
