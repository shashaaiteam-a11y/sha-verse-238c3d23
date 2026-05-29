import { Suspense, lazy, useState } from "react";
import { useLocation } from "react-router-dom";
import { Megaphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { isPromoteHidden } from "@/lib/promote/config";

// Lazy-loaded so the modal (and later the payment SDKs) only load on demand.
const PromoteModal = lazy(() => import("./PromoteModal"));

/**
 * Floating "Promote with Us" entry point.
 * Positioned JUST ABOVE the mobile footer nav (fixed; does NOT push layout).
 * Additive only — Header, Footer and HomeFeed remain untouched.
 */
export const PromoteEntryButton = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (!user) return null;
  if (isPromoteHidden(location.pathname)) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Promote with Us"
        className="fixed right-4 z-40 flex items-center gap-2 rounded-full bg-gradient-primary text-primary-foreground shadow-lg px-4 py-3 text-sm font-semibold active:scale-95 transition-transform"
        style={{
          bottom: "calc(76px + env(safe-area-inset-bottom))",
        }}
      >
        <Megaphone className="w-4 h-4" />
        <span className="hidden xs:inline sm:inline">Promote</span>
      </button>

      {open && (
        <Suspense fallback={null}>
          <PromoteModal open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </>
  );
};

export default PromoteEntryButton;
