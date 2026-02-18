import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import {
  SignedIn,
  SignedOut,
  SignIn,
  SignUp,
  UserButton,
} from '@clerk/clerk-react';
import App from './App';
import MonobankSetupPage from './pages/monobank/MonobankSetupPage';
import MonobankSyncPage from './pages/monobank/MonobankSyncPage';
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

        {/* Protected routes */}
        <Route
          path="/*"
          element={
            <>
              <SignedOut>
                <Navigate to="/sign-in" replace />
              </SignedOut>
              <SignedIn>
                <div className="relative">
                  {/* User button in top right */}
                  <div className="absolute top-4 right-4 z-50">
                    <UserButton afterSignOutUrl="/sign-in" />
                  </div>
                  <Routes>
                    <Route path="/" element={<App />} />
                    <Route path="/monobank/setup" element={<MonobankSetupPage />} />
                    <Route path="/monobank/sync" element={<MonobankSyncPage />} />
                  </Routes>
                </div>
              </SignedIn>
            </>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
