import * as Sentry from '@sentry/nestjs';

const dsn = process.env.SENTRY_DSN;

// A local `nest start` stays silent unless deliberately opted in, so errors from
// day-to-day development never reach the production project.
if (dsn && (process.env.NODE_ENV === 'production' || process.env.SENTRY_DEBUG === 'true')) {
  Sentry.init({
    dsn,
    integrations: [
      Sentry.nestIntegration(),
      Sentry.prismaIntegration(),
    ],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    environment: process.env.NODE_ENV || 'development',
  });
} else if (!dsn) {
  console.warn('[Sentry] SENTRY_DSN environment variable not found. Backend Sentry tracking is disabled.');
} else {
  console.warn('[Sentry] Disabled outside production. Set SENTRY_DEBUG=true to override.');
}
