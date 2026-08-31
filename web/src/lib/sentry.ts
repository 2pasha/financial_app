import * as Sentry from '@sentry/react';
import { REPLAY_SAFE } from './privacy';

/**
 * Sentry replay exists for error triage — the layout and the click sequence are
 * what you need to reproduce a crash, not the user's balances. So it masks all
 * text by default and only unmasks navigation chrome. PostHog is the recorder
 * you actually watch for UX, and it gets targeted masking instead (lib/posthog.ts).
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.warn('[Sentry] VITE_SENTRY_DSN is not configured. Sentry initialization skipped.');
    return;
  }

  Sentry.init({
    dsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
        unmask: [`[${REPLAY_SAFE}]`],
      }),
    ],
    sendDefaultPii: false,
    // Performance Monitoring sample rate
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    // Session Replay sample rates. Kept low because PostHog is the primary UX
    // recorder now — this one only needs to catch enough sessions to be useful
    // around errors, which replaysOnErrorSampleRate covers anyway.
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE,
  });
}

export function setSentryUser(user: { id: string; email?: string; username?: string } | null) {
  if (!user) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}
