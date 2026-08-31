import React from 'react';
import * as Sentry from '@sentry/react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { track } from '../lib/posthog';

interface FallbackProps {
  error: Error;
  componentStack: string | null;
  eventId: string | null;
  resetError(): void;
}

function ErrorFallback({ error, resetError }: FallbackProps) {
  // Sentry already has the stack. PostHog gets only enough to show a crash rate
  // per route on the friction dashboard — never the message, which can quote
  // back whatever the user typed.
  React.useEffect(() => {
    track('app_error_boundary_hit', {
      route_pattern: window.location.pathname.replace(/\/[0-9a-f-]{8,}.*$/i, '/:id'),
      error_name: error?.name ?? 'Error',
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-xl text-center">
        <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Something went wrong</h2>
        <p className="text-muted-foreground text-sm mb-6">
          An unexpected error occurred. Our technical monitoring system (Sentry) has recorded this issue.
        </p>
        {error?.message && (
          <div className="bg-muted p-3 rounded-lg text-left mb-6 overflow-x-auto text-xs font-mono text-muted-foreground">
            {error.message}
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={resetError}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium text-sm rounded-lg hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground font-medium text-sm rounded-lg hover:bg-secondary/80 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}

export function SentryErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <Sentry.ErrorBoundary fallback={ErrorFallback}>
      {children}
    </Sentry.ErrorBoundary>
  );
}
