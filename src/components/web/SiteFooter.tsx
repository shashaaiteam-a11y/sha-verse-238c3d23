import { Link, useLocation } from "react-router-dom";

/**
 * Web-only footer with legal links. Hidden on native app, auth, messages,
 * reader, and immersive routes so it never breaks existing layouts.
 *
 * Rendered in-flow at the end of the page on both mobile and desktop.
 * On mobile, bottom spacing keeps it above the fixed BottomNav (h-14 = 56px)
 * and respects the iOS safe-area inset.
 */
export const SiteFooter = () => {
  const location = useLocation();

  // Note: previously hidden on native platform. Now shown in native too so
  // mobile users can reach legal/help links above the BottomNav.


  const hiddenRoutes = ["/auth", "/messages", "/novachat"];
  const hiddenPrefixes = [
    "/movion",
    "/bookshelf/read/",
    "/video/",
    "/motion",
    "/promote",
  ];

  if (hiddenRoutes.includes(location.pathname)) return null;
  if (hiddenPrefixes.some((p) => location.pathname.startsWith(p))) return null;

  const links = (
    <>
      <Link to="/about" className="hover:text-foreground">About</Link>
      <Link to="/contact" className="hover:text-foreground">Contact</Link>
      <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
      <Link to="/terms" className="hover:text-foreground">Terms</Link>
      <Link to="/help" className="hover:text-foreground">Help</Link>
    </>
  );

  return (
    <footer
      className="mt-8 border-t bg-card/40"
      style={{
        // On mobile, keep the footer clear of the fixed BottomNav (h-14 = 56px)
        // plus the iOS safe-area inset and a small 12px gap.
        // On desktop there is no BottomNav, but the same calc still works
        // because env(safe-area-inset-bottom) is 0 on desktop.
        paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + 3.5rem + 12px)`,
      }}
    >
      {/* Mobile: compact centered layout matching the previous design */}
      <div className="md:hidden px-3 py-3 text-[10px] text-muted-foreground">
        <nav className="flex items-center justify-center gap-x-3 gap-y-1 flex-wrap leading-tight">
          {links}
          <span className="opacity-70">© {new Date().getFullYear()} Sha-Verse</span>
        </nav>
      </div>

      {/* Desktop: original spacious layout */}
      <div className="hidden md:block mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {links}
        </nav>
        <p className="mt-3 text-center text-xs">
          © {new Date().getFullYear()} Sha-Verse. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
