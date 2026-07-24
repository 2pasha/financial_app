import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import {
  SignedIn,
  SignedOut,
  SignIn,
  SignUp,
} from '@clerk/clerk-react';
import App from './App';
import LandingPage from './pages/LandingPage';
import MonobankSetupPage from './pages/monobank/MonobankSetupPage';
import MonobankSyncPage from './pages/monobank/MonobankSyncPage';
import TripsPage from './pages/TripsPage';
import TripDetailPage from './pages/TripDetailPage';
import { Toaster } from './components/ui/sonner';

export default function AppWithAuth() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        {/* Public routes */}
        <Route
          path="/sign-in/*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-background">
              <SignIn routing="path" path="/sign-in" />
            </div>
          }
        />
        <Route
          path="/sign-up/*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-background">
              <SignUp routing="path" path="/sign-up" />
            </div>
          }
        />

        {/* Public landing at "/" for signed-out visitors; the app for signed-in ones */}
        <Route
          path="/"
          element={
            <>
              <SignedOut>
                <LandingPage />
              </SignedOut>
              <SignedIn>
                <App />
              </SignedIn>
            </>
          }
        />

        {/* Protected routes */}
        <Route
          path="/*"
          element={
            <>
              <SignedOut>
                <Navigate to="/sign-in" replace />
              </SignedOut>
              <SignedIn>
                <Routes>
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
  );
}
