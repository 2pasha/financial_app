/**
 * The analytics event taxonomy, in one place.
 *
 * Naming is `object_action`, snake_case, verb past-tense — so every
 * `transaction_*` event sorts together in PostHog's event list, which is what
 * keeps a 35-event taxonomy navigable.
 *
 * THE RULE: no event property may ever carry a monetary amount, a merchant or
 * description string, a category / trip / income-source *name*, an email, a
 * Monobank token, or free text the user typed. Counts, booleans, enums, bucket
 * labels and opaque ids only.
 *
 * That rule is enforced twice: `SafeProps` below rejects the obvious property
 * names at compile time, and `sanitizeProperties` in lib/posthog.ts strips
 * anything that slips past at runtime. Both exist because either one alone is
 * easy to work around by accident.
 */

export type AnalyticsEvent =
  // --- Activation funnel
  | 'landing_cta_clicked'
  | 'signup_completed'
  | 'onboarding_started'
  | 'onboarding_step_viewed'
  | 'onboarding_completed'
  | 'monobank_connect_started'
  | 'monobank_token_saved'
  | 'monobank_token_failed'
  | 'monobank_sync_started'
  | 'monobank_sync_completed'
  | 'activation_reached'
  // --- Feature usage
  | 'nav_item_clicked'
  | 'transaction_created'
  | 'transaction_updated'
  | 'transaction_deleted'
  | 'transaction_categorized'
  | 'transaction_trip_assigned'
  | 'transactions_filtered'
  | 'transactions_sorted'
  | 'category_created'
  | 'category_updated'
  | 'category_deleted'
  | 'category_opened'
  | 'budget_plan_saved'
  | 'budget_plan_deleted'
  | 'income_changed'
  | 'period_changed'
  | 'ai_export_generated'
  | 'ai_export_handoff'
  | 'trip_created'
  | 'trip_opened'
  | 'monobank_webhook_connected'
  | 'settings_toggled'
  // --- Retention
  | 'app_opened'
  | 'help_tip_expanded'
  // --- Friction
  | 'api_request_failed'
  | 'app_error_boundary_hit'
  | 'empty_state_viewed';

/**
 * Property keys that would carry sensitive values. Adding a property with one of
 * these names is a type error — pick a shape that describes the data instead
 * (`amount` → `amount_bucket`, `name` → `changed_fields`, and so on).
 */
type BannedKey =
  | 'amount'
  | 'amounts'
  | 'balance'
  | 'budget'
  | 'spent'
  | 'income'
  | 'description'
  | 'merchant'
  | 'name'
  | 'title'
  | 'source'
  | 'email'
  | 'username'
  | 'token'
  | 'query'
  | 'text'
  | 'value';

/**
 * Intersected with the caller's own object type, this collapses any banned key to
 * `never`, so passing a value for one is an assignment error at the call site.
 *
 * It has to be written as a key-remapped type intersected with `T` rather than a
 * mapped type over `T` — a plain mapped type is reverse-inferable, so TypeScript
 * happily infers a `T` that satisfies it and the ban silently does nothing.
 */
export type NoBannedKeys<T> = {
  [K in keyof T as Lowercase<Extract<K, string>> extends BannedKey ? K : never]: never;
};

/** Property values worth sending. Anything else is either PII or noise. */
export type SafeValue = string | number | boolean | null | undefined | string[] | number[];

export type EventProps = Record<string, SafeValue>;

// ---------------------------------------------------------------------------
// Buckets
//
// Raw counts are fine; raw money is not. Bucketing also keeps PostHog's property
// cardinality low enough that breakdowns stay readable — a `duration_ms` of
// 4,312 is a chart with one bar per user, `1s-5s` is a chart you can act on.
// ---------------------------------------------------------------------------

export function bucketCount(n: number): string {
  if (n <= 0) return '0';
  if (n === 1) return '1';
  if (n <= 10) return '2-10';
  if (n <= 50) return '11-50';
  if (n <= 200) return '51-200';
  if (n <= 1000) return '201-1000';
  return '1000+';
}

export function bucketMs(ms: number): string {
  if (ms < 1000) return '<1s';
  if (ms < 5000) return '1-5s';
  if (ms < 15000) return '5-15s';
  if (ms < 60000) return '15-60s';
  if (ms < 300000) return '1-5m';
  return '5m+';
}

export function bucketHours(hours: number): string {
  if (hours < 1) return '<1h';
  if (hours < 24) return '1-24h';
  if (hours < 72) return '1-3d';
  if (hours < 168) return '3-7d';
  return '7d+';
}

export function bucketDays(days: number): string {
  if (days <= 0) return 'same-day';
  if (days === 1) return '1d';
  if (days <= 7) return '2-7d';
  if (days <= 30) return '8-30d';
  if (days <= 90) return '31-90d';
  return '90d+';
}

export function bucketPercent(pct: number): string {
  if (pct <= 0) return '0';
  if (pct < 25) return '1-24';
  if (pct < 50) return '25-49';
  if (pct < 75) return '50-74';
  if (pct < 100) return '75-99';
  return '100+';
}

export function bucketLength(len: number): string {
  if (len < 1000) return '<1k';
  if (len < 5000) return '1k-5k';
  if (len < 20000) return '5k-20k';
  return '20k+';
}

/**
 * Months relative to the current one, signed: -1 is last month, +2 is two months
 * out. Tells you whether people plan ahead or reconcile the past, without
 * pinning the event to a calendar date.
 */
export function monthOffset(year: number, month: number): number {
  const now = new Date();
  return (year - now.getFullYear()) * 12 + (month - (now.getMonth() + 1));
}

/**
 * Bucket an HTTP failure into something you can chart. Deliberately does not
 * touch the response body — server messages can echo whatever the user typed.
 */
export function failureReason(status: number | undefined): string {
  if (status === undefined) return 'network';
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 400 || status === 422) return 'invalid_token';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server_error';
  return 'unknown';
}

/**
 * `/trips/abc-123/items/def` → `/trips/:id/items/:id`, so the friction dashboard
 * groups by endpoint instead of exploding into one row per record.
 */
export function endpointTemplate(url: string): string {
  const path = url.split('?')[0];
  return path
    .split('/')
    .map((segment) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(segment) || /^\d+$/.test(segment) || segment.length > 20
        ? ':id'
        : segment,
    )
    .join('/');
}
