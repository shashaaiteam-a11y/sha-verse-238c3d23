import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { initAdMob } from "./lib/ads/nativeAdMob";
import StartupSplash from "./components/StartupSplash";

// Initialize AdMob on native platforms (no-op on web).
initAdMob();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <StartupSplash />
    <App />
  </HelmetProvider>
);
