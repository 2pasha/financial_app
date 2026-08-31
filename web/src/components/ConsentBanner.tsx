import { useAppSettings } from "../hooks/useAppSettings";
import { analyticsConfigured } from "../lib/posthog";
import { denyConsent, grantConsent, useConsent } from "../lib/consent";
import { cn } from "./ui/utils";

/**
 * The analytics consent gate.
 *
 * Deliberately not a modal: it does not trap focus, does not dim the page and
 * does not block the product. Someone who wants to read the landing page before
 * deciding can, and nothing is captured while they do.
 *
 * Accept and Decline carry equal visual weight. A greyed-out Decline next to a
 * bright Accept is the standard dark pattern here, and it is also the thing that
 * makes the consent legally worthless.
 */
export function ConsentBanner() {
  const consent = useConsent();
  const { t } = useAppSettings();

  // No key in this build means there is nothing to consent to.
  if (!analyticsConfigured() || consent !== "pending") return null;

  return (
    <div
      role="region"
      aria-label={t.consentTitle}
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
    >
      <div
        className={cn(
          "mx-auto flex max-w-3xl flex-col gap-4",
          "rounded-2xl border border-border bg-background/95 p-4 shadow-lg backdrop-blur",
          "sm:flex-row sm:items-center sm:gap-6 sm:p-5",
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{t.consentTitle}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.consentBody}</p>
        </div>

        {/* Equal weight, and Decline first — the safer choice should not be the
            one you have to hunt for. */}
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={denyConsent}
            className={cn(
              "inline-flex h-10 flex-1 items-center justify-center rounded-full px-5 text-sm font-medium",
              "border border-border bg-background text-foreground",
              "transition-colors hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "sm:flex-none",
            )}
          >
            {t.consentDecline}
          </button>

          <button
            type="button"
            onClick={grantConsent}
            className={cn(
              "inline-flex h-10 flex-1 items-center justify-center rounded-full px-5 text-sm font-medium",
              "bg-primary text-primary-foreground",
              "transition-opacity hover:opacity-90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "sm:flex-none",
            )}
          >
            {t.consentAccept}
          </button>
        </div>
      </div>
    </div>
  );
}
