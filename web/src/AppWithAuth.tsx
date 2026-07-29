import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { setSentryUser } from './lib/sentry';

function SentryUserSync() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    if (user) {
      setSentryUser({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        username: user.username || user.fullName || undefined,
      });
    } else {
      setSentryUser(null);
    }
  }, [user, isLoaded]);

  return null;
}

export default function AppWithAuth() {
  return (
    <SentryErrorBoundary>
      <SentryUserSync />
      <BrowserRouter>
        <Toaster />
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
                    <Route path="/app" element={<App />} />
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

