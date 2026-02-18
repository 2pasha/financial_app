import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import AppWithAuth from "./AppWithAuth.tsx";
import "./index.css";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error("Missing Clerk Publishable Key");
}

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={clerkPubKey}>
    <AppWithAuth />
  </ClerkProvider>
);
  