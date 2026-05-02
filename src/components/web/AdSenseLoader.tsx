import { useEffect } from "react";
import { ADSENSE_PUBLISHER_ID, isAdSenseEligible } from "@/lib/ads/adsenseConfig";

/**
 * Injects the Google AdSense script tag exactly once, ONLY on production web.
 * No-op on Lovable preview, localhost, and native app (AdMob handles those).
 */
export const AdSenseLoader = () => {
  useEffect(() => {
    if (!isAdSenseEligible()) return;
    if (document.querySelector('script[data-sha-verse-adsense="1"]')) return;

    const s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`;
    s.dataset.shaVerseAdsense = "1";
    document.head.appendChild(s);
  }, []);

  return null;
};
