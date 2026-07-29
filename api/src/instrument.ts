import * as Sentry from '@sentry/nestjs';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    integrations: [
      Sentry.nestIntegration(),
      Sentry.prismaIntegration(),
    ],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    environment: process.env.NODE_ENV || 'development',
  });
} else {
  console.warn('[Sentry] SENTRY_DSN environment variable not found. Backend Sentry tracking is disabled.');
}
