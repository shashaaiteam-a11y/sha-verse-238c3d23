import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initAdMob } from "./lib/ads/nativeAdMob";

// Initialize AdMob on native platforms (no-op on web).
initAdMob();

createRoot(document.getElementById("root")!).render(<App />);
