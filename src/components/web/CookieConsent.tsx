import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const STORAGE_KEY = "sha-verse-cookie-consent";

/**
 * GDPR cookie consent banner.
 * Web only — hidden on native app and after user has chosen.
 */
export const CookieConsent = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // @ts-expect-error Capacitor global may exist at runtime
    if (window.Capacitor?.isNativePlatform?.()) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) setOpen(true);
  }, []);

  const choose = (value: "accepted" | "rejected") => {
    localStorage.setItem(STORAGE_KEY, value);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      className="fixed inset-x-2 z-[60] mx-auto max-w-3xl rounded-lg border bg-card text-card-foreground shadow-lg p-4 sm:p-5 bottom-[calc(3.5rem+var(--safe-area-bottom,0px)+0.5rem)] sm:bottom-[calc(4rem+var(--safe-area-bottom,0px)+0.5rem)]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed">
          We use cookies to improve your experience and to show personalized ads. See our{" "}
          <Link to="/privacy" className="underline text-primary">Privacy Policy</Link>.
        </p>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => choose("rejected")}>
            Reject
          </Button>
          <Button size="sm" onClick={() => choose("accepted")}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
};
