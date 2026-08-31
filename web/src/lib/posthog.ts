import type { PostHog } from 'posthog-js';
import { MASK } from './privacy';
import { consentState, subscribeToConsent } from './consent';
import { bucketHours, type AnalyticsEvent, type EventProps, type NoBannedKeys } from './analytics-events';

/**
 * PostHog product analytics. Shaped to mirror lib/sentry.ts — one `init*` called
 * from main.tsx, one user-sync helper called from AppWithAuth, and a no-op when
 * the DSN/key is absent.
 *
 * Three things differ from a stock PostHog setup, all on purpose:
 *
 * 1. The SDK is loaded lazily. It is ~65 kB gzipped and the first thing most
 *    visitors see is the marketing landing page, so it must not sit in the
 *    critical chunk. Everything exported here is safe to call before the import
 *    resolves — early calls queue and flush on load.
 *
 * 2. `autocapture` is off. Autocapture records the text of whatever was clicked
 *    into `$el_text`; on the expenses table that is a merchant name and on the
 *    dashboard it is a balance. There is no configuration that reliably prevents
 *    that, so this app captures events explicitly instead (lib/analytics-events.ts).
 *
 * 3. Nothing loads until the visitor has consented. Not `opt_out_capturing` — the
 *    module is genuinely not fetched, because `init` writes a cookie and that is
 *    the thing being consented to. See lib/consent.ts.
 */

let posthog: PostHog | null = null;
let loading: Promise<void> | null = null;
let enabled = false;

/** Calls made before the SDK finishes loading. Capped so a failed load can't leak. */
type QueuedCall = () => void;
const queue: QueuedCall[] = [];
const QUEUE_LIMIT = 50;

function enqueue(call: QueuedCall) {
  // `enabled` is checked before `posthog`, not after: once consent is withdrawn
  // the SDK object still exists, and this is what stops calls reaching it.
  if (!enabled) return;
  if (posthog) {
    call();
    return;
  }
  if (queue.length >= QUEUE_LIMIT) return;
  queue.push(call);
}

/**
 * Runtime backstop behind `SafeProps`. Drops any property whose *name* suggests
 * money or identity, and redacts anything email-shaped that arrives as a value.
 */
const SENSITIVE_KEY = /(amount|balance|budget|spent|income|token|email|merchant|description|password)/i;
const EMAIL_SHAPED = /[^\s@]+@[^\s@]+\.[^\s@]+/;

/**
 * posthog-js transport fields that live *inside* `properties` but are not user
 * data, so the name-based filter below must not touch them.
 *
 * `token` is the one that bites: it is the project API key, and posthog-js builds
 * the request envelope as `{ api_key: batch[0].properties.token, batch, sent_at }`.
 * Strip it and `api_key` becomes undefined, JSON.stringify drops the field, and
 * the capture endpoint can no longer match the body against its batch shape — so
 * it falls through to the single-event shape and rejects the request with the
 * thoroughly misleading "non-engage request missing event name attribute".
 *
 * `distinct_id` is exempt for a different reason: redacting it would collapse
 * every user into one person.
 */
const STRUCTURAL_KEYS = new Set(['token', 'distinct_id']);

function sanitizeProperties(properties: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (STRUCTURAL_KEYS.has(key)) {
      clean[key] = value;
      continue;
    }
    // PostHog's own `$`-prefixed properties are structural, not user data.
    if (!key.startsWith('$') && SENSITIVE_KEY.test(key)) continue;
    clean[key] = typeof value === 'string' && EMAIL_SHAPED.test(value) ? '[redacted]' : value;
  }

  return clean;
}

/** Properties attached to every event, so breakdowns work without extra wiring. */
function globalProperties(): Record<string, unknown> {
  if (typeof window === 'undefined') return {};

  return {
    language: localStorage.getItem('language') || 'en',
    theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  };
}

/**
 * Whether analytics is switched on for this build at all — a key is present and
 * the environment gates passed. The consent banner reads this: with no key there
 * is nothing to consent to, so asking would be a dark pattern in miniature.
 */
let configured = false;

export function analyticsConfigured() {
  return configured;
}

export function initPostHog() {
  const key = import.meta.env.VITE_POSTHOG_KEY;

  if (!key) {
    console.warn('[PostHog] VITE_POSTHOG_KEY is not configured. PostHog initialization skipped.');
    return;
  }

  // Gate two: a local build stays silent unless you deliberately opt in, so
  // day-to-day development never shows up in the launch funnel.
  if (!import.meta.env.PROD && import.meta.env.VITE_POSTHOG_DEBUG !== 'true') {
    console.info('[PostHog] Disabled outside production. Set VITE_POSTHOG_DEBUG=true to override.');
    return;
  }

  configured = true;

  applyConsent(key);
  subscribeToConsent(() => applyConsent(key));
}

/**
 * Gate four, and the only one the user controls.
 *
 * Note what 'pending' does: calls are *queued* but the SDK is not loaded. Nothing
 * reaches the network and no cookie is written, yet the landing pageview and the
 * CTA click that led to signup survive long enough to be flushed if the answer
 * turns out to be yes. Declining discards them, unsent.
 */
function applyConsent(key: string) {
  const state = consentState();

  if (state === 'granted') {
    enabled = true;

    // Already loaded means consent was withdrawn and then given again.
    if (posthog) posthog.opt_in_capturing();
    else loadSdk(key);

    return;
  }

  if (state === 'pending') {
    enabled = true;
    // Back to undecided, via the footer's cookie settings. If the SDK is already
    // up it must stop capturing while we wait for the new answer.
    posthog?.opt_out_capturing();

    return;
  }

  enabled = false;
  queue.length = 0;
  // posthog-js clears its persisted identifiers on opt-out, so a withdrawal also
  // takes the cookie with it.
  posthog?.opt_out_capturing();
}

function loadSdk(key: string) {
  // Consent can flip more than once; the SDK still loads exactly once.
  if (loading) return;

  loading = import('posthog-js')
    .then(({ default: ph }) => {
      ph.init(key, {
        api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com',
        ui_host: 'https://eu.posthog.com',

        // Pageviews are sent by hand from the router so each one can carry the
        // in-app view; see PostHogPageviews in AppWithAuth.tsx.
        capture_pageview: false,
        capture_pageleave: true,

        autocapture: false,
        rageclick: true,

        // Anonymous landing traffic doesn't need a person profile; identified
        // users get one on sign-in and the anonymous history stitches to it.
        person_profiles: 'identified_only',
        persistence: 'localStorage+cookie',
        respect_dnt: true,

        disable_surveys: true,
        disable_session_recording: !import.meta.env.PROD,

        session_recording: {
          maskAllInputs: true,
          maskTextSelector: `.${MASK}, [data-private]`,
          maskInputOptions: { password: true, email: true, text: true, number: true },
        },

        // `sanitize_properties` still works but posthog-js logs a deprecation
        // *error* through it on every single event, which buries anything real in
        // the console. `before_send` is the supported hook and it sees the whole
        // event, so $set/$set_once get the same filter — the old hook only reached
        // those on the $set_once path.
        before_send: (event) => {
          if (!event) return null;

          event.properties = sanitizeProperties(event.properties ?? {});
          if (event.$set) event.$set = sanitizeProperties(event.$set);
          if (event.$set_once) event.$set_once = sanitizeProperties(event.$set_once);

          return event;
        },

        loaded: (instance) => {
          // Gate three. Belt and braces behind the two checks above.
          if (!import.meta.env.PROD && import.meta.env.VITE_POSTHOG_DEBUG !== 'true') {
            instance.opt_out_capturing();
          }
          // Honour Global Privacy Control the same way we honour DNT.
          if (typeof navigator !== 'undefined' && 'globalPrivacyControl' in navigator &&
              (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) {
            instance.opt_out_capturing();
          }
        },
      });

      posthog = ph;

      while (queue.length) {
        queue.shift()?.();
      }
    })
    .catch(() => {
      // An ad blocker or a failed chunk should never take the app down with it.
      enabled = false;
      queue.length = 0;
    });
}

export function track<T extends EventProps>(
  event: AnalyticsEvent,
  properties?: T & NoBannedKeys<T>,
) {
  const props = { ...globalProperties(), ...(properties as EventProps | undefined) };
  enqueue(() => posthog?.capture(event, props));
}

/** Widened so callers can pass literal object types without casting. */
type SafeValueLike = string | number | boolean | null | undefined | string[] | number[];

export function capturePageview(properties?: EventProps) {
  // PostHog derives $current_url from window.location itself; the extra props
  // are what let us break pageviews down by in-app view.
  const props = { ...globalProperties(), ...properties };
  enqueue(() => posthog?.capture('$pageview', props));
}

/**
 * PostHog gets the Clerk id and the signup date — nothing else. Email and name
 * stay with Sentry, where they help triage a specific user's crash and are
 * covered by a different retention policy.
 */
export function identifyUser(user: { id: string; createdAt?: Date | null }) {
  currentUserId = user.id;

  const setOnce: Record<string, unknown> = {};

  if (user.createdAt) {
    setOnce.signup_date = user.createdAt.toISOString().slice(0, 10);
    setOnce.signup_month = user.createdAt.toISOString().slice(0, 7);
    setOnce.initial_language = localStorage.getItem('language') || 'en';
    // Stashed so non-React modules can measure time-to-activation without
    // reaching back into Clerk.
    try {
      localStorage.setItem(`${SIGNUP_AT_KEY}:${user.id}`, String(user.createdAt.getTime()));
    } catch {
      // Storage disabled — activation just loses its timing property.
    }
  }

  enqueue(() => posthog?.identify(user.id, undefined, setOnce));
}

const SIGNUP_AT_KEY = 'analytics:signupAt';

/**
 * Who the one-shot keys below belong to. Two people sharing a browser must not
 * share an "already fired" flag, or the second one silently never activates.
 */
let currentUserId: string | null = null;

export function currentAnalyticsUserId() {
  return currentUserId;
}

/**
 * The activation moment: the first time this user has any transaction at all.
 * Fires once, whichever path got them there.
 */
export function markActivated(transactionCount: number, source: 'monobank' | 'manual') {
  if (transactionCount <= 0 || !currentUserId) return;

  once(`activated:${currentUserId}`, 'user', () => {
    const signupAt = Number(localStorage.getItem(`${SIGNUP_AT_KEY}:${currentUserId}`));
    const hours = signupAt ? (Date.now() - signupAt) / 3_600_000 : null;

    track('activation_reached', {
      activation_source: source,
      hours_since_signup_bucket: hours === null ? undefined : bucketHours(hours),
    });
  });
}

/**
 * Person properties, diffed against the last write. Without this every render of
 * App that has fetched categories would send a `$set`.
 */
let lastProps: Record<string, unknown> = {};

export function setUserProps(properties: Record<string, SafeValueLike>) {
  const changed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined) continue;
    if (lastProps[key] !== value) changed[key] = value;
  }

  if (!Object.keys(changed).length) return;

  lastProps = { ...lastProps, ...changed };
  enqueue(() => posthog?.setPersonProperties(changed));
}

/**
 * Mandatory on sign-out. Without it the next user to sign in on this device
 * inherits the previous one's distinct_id and their two histories merge.
 */
export function resetAnalytics() {
  lastProps = {};
  currentUserId = null;
  enqueue(() => posthog?.reset());
}

/** For one-shot events that must fire at most once per user or per session. */
export function once(storageKey: string, scope: 'user' | 'session', fire: () => void) {
  if (typeof window === 'undefined') return;

  // Without this, a declined user still burns the "already fired" flag, and
  // activation would then never be recorded if they later opt in.
  if (!enabled) return;

  const store = scope === 'user' ? window.localStorage : window.sessionStorage;
  const key = `analytics:${storageKey}`;

  try {
    if (store.getItem(key)) return;
    store.setItem(key, '1');
  } catch {
    // Storage disabled (private mode, blocked cookies) — fire anyway rather than
    // losing the event entirely. Some double-counting beats a blank funnel.
  }

  fire();
}

/** Exposed for tests and for the verification pass; not used by app code. */
export function __analyticsReady() {
  return loading;
}
