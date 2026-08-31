import { useSyncExternalStore } from 'react';

/**
 * Analytics consent, stored per browser.
 *
 * This gate sits *upstream* of PostHog's own `opt_out_capturing`, and that
 * placement is the whole point. With `persistence: 'localStorage+cookie'` the SDK
 * writes its cookie the moment it initialises, so opting out after init still
 * leaves the cookie behind — which is precisely the thing consent is supposed to
 * gate. Nothing here loads the SDK at all until the answer is 'granted'; see
 * `applyConsent` in lib/posthog.ts.
 *
 * Shaped like hooks/useAppSettings.ts — a module-level store rather than local
 * state, so every consumer observes the same answer.
 */

export type ConsentState = 'pending' | 'granted' | 'denied';

const STORAGE_KEY = 'analytics:consent';

const listeners = new Set<() => void>();

/**
 * A browser already signalling Do Not Track or Global Privacy Control has
 * answered the question. Asking again would be theatre, so treat it as a settled
 * 'denied' and never show the banner.
 */
function signalsOptOut(): boolean {
  if (typeof navigator === 'undefined') return false;

  const nav = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };

  return nav.globalPrivacyControl === true || nav.doNotTrack === '1' || nav.msDoNotTrack === '1';
}

function read(): ConsentState {
  if (typeof window === 'undefined') return 'pending';
  if (signalsOptOut()) return 'denied';

  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    return saved === 'granted' || saved === 'denied' ? saved : 'pending';
  } catch {
    // Storage blocked. With nowhere to record an answer we could not honour one
    // past this page, so stay closed rather than ask a question we would forget.
    return 'denied';
  }
}

let snapshot: ConsentState = read();

export function consentState(): ConsentState {
  return snapshot;
}

export function subscribeToConsent(listener: () => void) {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

function set(next: ConsentState) {
  if (snapshot === next) return;

  snapshot = next;

  try {
    if (next === 'pending') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Non-fatal: the choice holds for this page life, just not the next one.
  }

  listeners.forEach((l) => l());
}

export const grantConsent = () => set('granted');
export const denyConsent = () => set('denied');

/** Reopens the banner so a decision can be withdrawn or changed later. */
export const resetConsent = () => set('pending');

export function useConsent(): ConsentState {
  return useSyncExternalStore(
    subscribeToConsent,
    () => snapshot,
    () => snapshot,
  );
}
