import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import App from "./App";
import "./index.css";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

// In dev, VITE_CLERK_PROXY_URL is undefined — Clerk talks to its CDN directly.
// In production, this is automatically set by the Replit platform.
const proxyUrl = import.meta.env.VITE_CLERK_PROXY_URL as string | undefined;

createRoot(document.getElementById("root")!).render(
  <ClerkProvider
    publishableKey={publishableKey}
    proxyUrl={proxyUrl}
  >
    <App />
  </ClerkProvider>
);
