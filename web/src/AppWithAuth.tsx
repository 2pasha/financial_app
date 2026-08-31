import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import {
  SignedIn,
  SignedOut,
  SignIn,
  SignUp,
  useUser,
} from '@clerk/clerk-react';
import App from './App';
import LandingPage from './pages/LandingPage';
import MonobankSetupPage from './pages/monobank/MonobankSetupPage';
import MonobankSyncPage from './pages/monobank/MonobankSyncPage';
import TripsPage from './pages/TripsPage';
import TripDetailPage from './pages/TripDetailPage';
import { SiteFrame } from './components/SiteFrame';
import { Toaster } from './components/ui/sonner';
import { SentryErrorBoundary } from './components/SentryErrorBoundary';
import { ConsentBanner } from './components/ConsentBanner';
import { setSentryUser } from './lib/sentry';
import { capturePageview, identifyUser, once, resetAnalytics, setUserProps, track } from './lib/posthog';
import { bucketDays } from './lib/analytics-events';
import { isNavView, type NavView } from './components/shellNav';

/**
 * `/app` is a bookmarkable alias for "the view you were last on". App itself is
 * the sole writer of `localStorage['view']`, so this only ever reads it.
 */
function AppViewRedirect() {
  const saved = typeof window !== 'undefined' ? localStorage.getItem('view') : null;
  const view: NavView = isNavView(saved) ? saved : 'dashboard';

  return <Navigate to={`/app/${view}`} replace />;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * One place that tells both telemetry SDKs who the user is. Sentry gets the
 * identifying details because triaging a crash report means finding the person
 * who sent it; PostHog gets the id and the signup date and nothing more.
 */
function TelemetryUserSync() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      setSentryUser(null);
      resetAnalytics();
      return;
    }

    setSentryUser({
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress,
      username: user.username || user.fullName || undefined,
    });

    identifyUser({ id: user.id, createdAt: user.createdAt });
    setUserProps({ onboarding_completed: user.unsafeMetadata?.onboardingCompleted === true });

    const createdAt = user.createdAt?.getTime();
    const ageMs = createdAt ? Date.now() - createdAt : null;

    // Clerk has no client-side "just signed up" callback, so this is inferred:
    // an authenticated session on an account minutes old, fired at most once.
    if (ageMs !== null && ageMs < 10 * 60 * 1000) {
      once(`signup:${user.id}`, 'user', () => {
        track('signup_completed', { minutes_since_created: Math.round(ageMs / 60000) });
      });
    }

    // Once per browser session: the heartbeat every retention chart is built on.
    once(`opened:${user.id}`, 'session', () => {
      // Per-user: two people sharing a browser must not read each other's
      // "last seen" and report a wrong return interval.
      const lastOpenKey = `analytics:lastOpen:${user.id}`;
      const lastOpenRaw = localStorage.getItem(lastOpenKey);
      localStorage.setItem(lastOpenKey, String(Date.now()));

      track('app_opened', {
        days_since_signup: ageMs !== null ? Math.floor(ageMs / DAY_MS) : undefined,
        days_since_last_open_bucket: lastOpenRaw
          ? bucketDays(Math.floor((Date.now() - Number(lastOpenRaw)) / DAY_MS))
          : 'first_open',
        entry_view: window.location.pathname.startsWith('/app/')
          ? window.location.pathname.slice(5)
          : window.location.pathname,
      });
    });
  }, [user, isLoaded]);

  return null;
}

/**
 * Pageviews are manual (`capture_pageview: false`), so this is the only thing
 * sending them. It has to live inside BrowserRouter — unlike TelemetryUserSync,
 * which deliberately sits outside so it runs even if routing fails.
 */
function PostHogPageviews() {
  const location = useLocation();

  useEffect(() => {
    // pathname only: the query string is where ids and tokens would show up.
    capturePageview({
      view: location.pathname.startsWith('/app/') ? location.pathname.slice(5) : undefined,
    });
  }, [location.pathname]);

  return null;
}

export default function AppWithAuth() {
  return (
    <SentryErrorBoundary>
      <TelemetryUserSync />
      <BrowserRouter>
        <PostHogPageviews />
        <Toaster />
        <ConsentBanner />
        <Routes>
          {/* Public routes */}
          <Route
            path="/sign-in/*"
            element={
              <div className="min-h-screen flex items-center justify-center bg-background">
                <SignIn routing="path" path="/sign-in" forceRedirectUrl="/app" />
              </div>
            }
          />
          <Route
            path="/sign-up/*"
            element={
              <div className="min-h-screen flex items-center justify-center bg-background">
                <SignUp routing="path" path="/sign-up" forceRedirectUrl="/app" />
              </div>
            }
          />

          {/* Public marketing landing at "/" for everyone; its header adapts to auth state */}
          <Route path="/" element={<LandingPage />} />

          {/* Protected routes (the app lives at /app) */}
          <Route
            path="/*"
            element={
              <>
                <SignedOut>
                  <Navigate to="/sign-in" replace />
                </SignedOut>
                <SignedIn>
                  {/* Mounted here, not at the router root, so the marketing
                      landing page and the Clerk screens stay unframed. */}
                  <SiteFrame />
                  <Routes>
                    <Route path="/app" element={<AppViewRedirect />} />
                    <Route path="/app/:view" element={<App />} />
                    <Route path="/trips" element={<TripsPage />} />
                    <Route path="/trips/:id" element={<TripDetailPage />} />
                    <Route path="/monobank/setup" element={<MonobankSetupPage />} />
                    <Route path="/monobank/sync" element={<MonobankSyncPage />} />
                  </Routes>
                </SignedIn>
              </>
            }
          />
        </Routes>
      </BrowserRouter>
    </SentryErrorBoundary>
  );
}

