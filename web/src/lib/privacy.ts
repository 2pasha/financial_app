/**
 * Session replay masking.
 *
 * This is a financial app: balances, transaction amounts and merchant names are
 * the most sensitive things on screen, and both PostHog and Sentry record the
 * DOM. `MASK` is the one class both recorders are configured to mask, so a
 * surface only has to opt in once — see `maskTextSelector` in lib/posthog.ts and
 * `mask` in lib/sentry.ts.
 *
 * Apply it to the *container* rather than to each number: the replay keeps its
 * layout and every interaction stays visible, only the text is replaced. Which
 * is the whole point — a fully redacted replay tells you nothing about why
 * someone got stuck.
 *
 * Rule of thumb: if an element renders an amount, a merchant/description, or a
 * name the user typed, it (or an ancestor) needs this class.
 */
export const MASK = 'ph-mask';

/**
 * The inverse: chrome that stays legible in Sentry replays, which mask all text
 * by default. Only navigation labels — never anything user-specific.
 */
export const REPLAY_SAFE = 'data-replay-safe';
