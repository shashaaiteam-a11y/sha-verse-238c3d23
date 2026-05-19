import { Link, useLocation } from "react-router-dom";

/**
 * Web-only footer with legal links. Hidden on native app, auth, messages,
 * reader, and immersive routes so it never breaks existing layouts.
 */
export const SiteFooter = () => {
  const location = useLocation();

  // Hide on native app
  if (typeof window !== "undefined") {
    // @ts-expect-error Capacitor global may exist at runtime
    if (window.Capacitor?.isNativePlatform?.()) return null;
  }

  const hiddenRoutes = [
    "/auth",
    "/messages",
    "/novachat",
  ];
  const hiddenPrefixes = [
    "/movion",
    "/bookshelf/read/",
    "/video/",
    "/motion",
  ];

  if (hiddenRoutes.includes(location.pathname)) return null;
  if (hiddenPrefixes.some((p) => location.pathname.startsWith(p))) return null;

  return (
    <footer
      className="mt-8 border-t bg-card/40 sm:pb-6"
      style={{
        paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + 4.5rem)`,
      }}
    >
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link to="/about" className="hover:text-foreground">About</Link>
          <Link to="/contact" className="hover:text-foreground">Contact</Link>
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/help" className="hover:text-foreground">Help</Link>
        </nav>
        <p className="mt-3 text-center text-xs">
          © {new Date().getFullYear()} Sha-Verse. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
