import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import { BottomNav } from "./components/BottomNav";
import { RealtimeStatus } from "./components/RealtimeStatus";
import { GlobalVideoManager } from "./components/GlobalVideoManager";
import { GlobalRefresh } from "./components/GlobalRefresh";

import { MobileProvider } from "./contexts/MobileContext";
import { Suspense, lazy as reactLazy, useEffect, ComponentType } from "react";

// Wrap React.lazy to auto-recover from stale chunk errors after a new deploy.
// When the browser still has the old index-*.js cached and tries to fetch a
// hashed chunk that no longer exists, force a one-time hard reload instead of
// showing a blank screen.
const lazy = <T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) =>
  reactLazy(() =>
    factory().catch((err) => {
      const msg = String(err?.message || err);
      const isChunkError =
        /Failed to fetch dynamically imported module/i.test(msg) ||
        /Importing a module script failed/i.test(msg) ||
        /ChunkLoadError/i.test(msg);
      if (isChunkError && typeof window !== "undefined") {
        const key = "__lv_chunk_reload__";
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          window.location.reload();
          // Return a never-resolving promise so Suspense keeps showing the
          // loader until the reload happens.
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw err;
    })
  );
import { Loader2 } from "lucide-react";
import { ThemeProvider } from "next-themes";
import { SwipeWrapper } from "./components/SwipeWrapper";
import { AdProvider } from "./contexts/AdContext";
import { ChatPresenceBridge } from "./components/chat/ChatPresenceBridge";
import { GlobalCallHost } from "./modules/chats/components/GlobalCallHost";
import { AdSenseLoader } from "./components/web/AdSenseLoader";
import { SiteFooter } from "./components/web/SiteFooter";
import { CookieConsent } from "./components/web/CookieConsent";
import { useIsMobile } from "./hooks/use-mobile";

// Lazy load pages for better performance
// Top-level main modules — keep import factory references so we can prefetch them
const homeImport = () => import("./modules/home/pages/Home");
const movionImport = () => import("./modules/movion/pages/Movion");
const novachatImport = () => import("./modules/novachat/pages/NovaChat");
const bookshelfImport = () => import("./modules/bookshelf/pages/Bookshelf");
const groupsImport = () => import("./modules/groups/pages/Groups");
const profileImport = () => import("./modules/profile/pages/Profile");

const Home = lazy(homeImport);
const Movion = lazy(movionImport);
const VideoWatch = lazy(() => import("./modules/movion/pages/VideoWatch"));
const ChannelPage = lazy(() => import("./modules/movion/pages/ChannelPage"));
const CreatorStudio = lazy(() => import("./modules/movion/pages/CreatorStudio"));
const MovionLibrary = lazy(() => import("./modules/movion/pages/MovionLibrary"));
const NovaChat = lazy(novachatImport);
const NovaChatShare = lazy(() => import("./pages/NovaChatShare"));
const Bookshelf = lazy(bookshelfImport);
const BookDetail = lazy(() => import("./modules/bookshelf/pages/BookDetail"));
const EditBook = lazy(() => import("./modules/bookshelf/pages/EditBook"));
const BookReader = lazy(() => import("./modules/bookshelf/pages/BookReader"));
const AuthorChannel = lazy(() => import("./modules/bookshelf/pages/AuthorChannel"));
const EditAuthorChannel = lazy(() => import("./modules/bookshelf/pages/EditAuthorChannel"));
const Groups = lazy(groupsImport);
const GroupDetail = lazy(() => import("./modules/groups/pages/GroupDetail"));
const GroupAdmin = lazy(() => import("./modules/groups/pages/GroupAdmin"));
const Profile = lazy(profileImport);
const Friends = lazy(() => import("./modules/profile/pages/Friends"));
const Auth = lazy(() => import("./pages/Auth"));
const SavedPosts = lazy(() => import("./modules/home/pages/SavedPosts"));
const Messages = lazy(() => import("./modules/chats/pages/Messages"));
const Notifications = lazy(() => import("./modules/home/pages/Notifications"));
const Settings = lazy(() => import("./modules/profile/pages/Settings"));
const HelpSupport = lazy(() => import("./pages/HelpSupport"));
const PrivacyCenter = lazy(() => import("./pages/PrivacyCenter"));
const NotFound = lazy(() => import("./pages/NotFound"));
const OfflinePage = lazy(() => import("./pages/Offline"));
const AdminSeed = lazy(() => import("./pages/AdminSeed"));
const MovionAdmin = lazy(() => import("./modules/movion/pages/MovionAdmin"));
const MovionComingSoon = lazy(() => import("./pages/MovionComingSoon"));
const Pages = lazy(() => import("./pages/Pages"));
const PageDetail = lazy(() => import("./pages/PageDetail"));
const Privacy = lazy(() => import("./pages/legal/Privacy"));
const Terms = lazy(() => import("./pages/legal/Terms"));
const About = lazy(() => import("./pages/legal/About"));
const Contact = lazy(() => import("./pages/legal/Contact"));
const DeleteAccount = lazy(() => import("./pages/legal/DeleteAccount"));
const DeleteData = lazy(() => import("./pages/legal/DeleteData"));
const PageAdmin = lazy(() => import("./pages/PageAdmin"));
const Motion = lazy(() => import("./pages/Motion"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const PromoteInfo = lazy(() => import("./pages/PromoteInfo"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <span className="text-sm text-muted-foreground">Loading...</span>
    </div>
  </div>
);

// 🚀 Route-level loader (smaller, inline)
const RouteLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center bg-background">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

// 🚀 Wrapper to add Suspense to each route
const withSuspense = (Component: React.ComponentType) => (
  <Suspense fallback={<RouteLoader />}>
    <Component />
  </Suspense>
);

// 🚀 Prefetch main module chunks during idle time so module-switching feels instant
const ModulePrefetcher = () => {
  useEffect(() => {
    const ric: any = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 1500));
    const handle = ric(() => {
      // Fire-and-forget — vite/browser caches these chunks
      homeImport().catch(() => {});
      movionImport().catch(() => {});
      novachatImport().catch(() => {});
      bookshelfImport().catch(() => {});
      groupsImport().catch(() => {});
      profileImport().catch(() => {});
    }, { timeout: 4000 });
    return () => {
      const cic: any = (window as any).cancelIdleCallback;
      if (cic && typeof handle === 'number') cic(handle);
    };
  }, []);
  return null;
};

const ResponsiveSonner = () => {
  const isMobile = useIsMobile();
  return (
    <Sonner
      position={isMobile ? "bottom-center" : "top-center"}
      offset={isMobile ? "calc(56px + 12px + env(safe-area-inset-bottom))" : undefined}
    />
  );
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <ResponsiveSonner />
        <BrowserRouter>
          <AuthProvider>
            <MobileProvider>
              <AdProvider>
              <ChatPresenceBridge />
              <ModulePrefetcher />
              <GlobalCallHost>
              <div className="min-h-screen bg-background safe-left safe-right">
                <SwipeWrapper>
                  <Routes>
                    <Route path="/auth" element={withSuspense(Auth)} />
                    <Route path="/offline" element={withSuspense(OfflinePage)} />
                    <Route path="/" element={<ProtectedRoute>{withSuspense(Home)}</ProtectedRoute>} />
                    <Route path="/movion/*" element={<ProtectedRoute>{withSuspense(MovionComingSoon)}</ProtectedRoute>} />
                    <Route path="/video/:videoId" element={<ProtectedRoute>{withSuspense(MovionComingSoon)}</ProtectedRoute>} />
                    <Route path="/channel/:channelId" element={<ProtectedRoute>{withSuspense(MovionComingSoon)}</ProtectedRoute>} />
                    <Route path="/novachat" element={<ProtectedRoute>{withSuspense(NovaChat)}</ProtectedRoute>} />
                    <Route path="/novachat/share/:token" element={withSuspense(NovaChatShare)} />
                    <Route path="/bookshelf" element={<ProtectedRoute>{withSuspense(Bookshelf)}</ProtectedRoute>} />
                    <Route path="/bookshelf/edit/:bookId" element={<ProtectedRoute>{withSuspense(EditBook)}</ProtectedRoute>} />
                    <Route path="/bookshelf/read/:bookId" element={<ProtectedRoute>{withSuspense(BookReader)}</ProtectedRoute>} />
                    <Route path="/bookshelf/book/:bookId" element={<ProtectedRoute>{withSuspense(BookDetail)}</ProtectedRoute>} />
                    <Route path="/bookshelf/channel/:channelId" element={<ProtectedRoute>{withSuspense(AuthorChannel)}</ProtectedRoute>} />
                    <Route path="/bookshelf/channel/:channelId/edit" element={<ProtectedRoute>{withSuspense(EditAuthorChannel)}</ProtectedRoute>} />
                    <Route path="/groups" element={<ProtectedRoute>{withSuspense(Groups)}</ProtectedRoute>} />
                    <Route path="/groups/:groupId/admin" element={<ProtectedRoute>{withSuspense(GroupAdmin)}</ProtectedRoute>} />
                    <Route path="/groups/:groupId" element={<ProtectedRoute>{withSuspense(GroupDetail)}</ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute>{withSuspense(Profile)}</ProtectedRoute>} />
                    <Route path="/profile/:userId" element={<ProtectedRoute>{withSuspense(Profile)}</ProtectedRoute>} />
                    <Route path="/friends" element={<ProtectedRoute>{withSuspense(Friends)}</ProtectedRoute>} />
                    <Route path="/saved" element={<ProtectedRoute>{withSuspense(SavedPosts)}</ProtectedRoute>} />
                    <Route path="/messages" element={<ProtectedRoute>{withSuspense(Messages)}</ProtectedRoute>} />
                    <Route path="/notifications" element={<ProtectedRoute>{withSuspense(Notifications)}</ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute>{withSuspense(Settings)}</ProtectedRoute>} />
                    <Route path="/help" element={withSuspense(HelpSupport)} />
                    <Route path="/privacy-center" element={<ProtectedRoute>{withSuspense(PrivacyCenter)}</ProtectedRoute>} />
                    <Route path="/admin/seed" element={<AdminRoute>{withSuspense(AdminSeed)}</AdminRoute>} />
                    <Route path="/pages" element={<ProtectedRoute>{withSuspense(Pages)}</ProtectedRoute>} />
                    <Route path="/pages/:pageId" element={<ProtectedRoute>{withSuspense(PageDetail)}</ProtectedRoute>} />
                    <Route path="/pages/:pageId/admin" element={<ProtectedRoute>{withSuspense(PageAdmin)}</ProtectedRoute>} />
                    <Route path="/motion" element={<ProtectedRoute>{withSuspense(MovionComingSoon)}</ProtectedRoute>} />
                    <Route path="/post/:postId" element={<ProtectedRoute>{withSuspense(PostDetail)}</ProtectedRoute>} />
                    <Route path="/group-post/:postId" element={<ProtectedRoute>{withSuspense(PostDetail)}</ProtectedRoute>} />
                    <Route path="/movion/admin" element={<AdminRoute>{withSuspense(MovionAdmin)}</AdminRoute>} />
                    <Route path="/privacy" element={withSuspense(Privacy)} />
                    <Route path="/terms" element={withSuspense(Terms)} />
                    <Route path="/about" element={withSuspense(About)} />
                    <Route path="/contact" element={withSuspense(Contact)} />
                    <Route path="/delete-account" element={withSuspense(DeleteAccount)} />
                    <Route path="/delete-data" element={withSuspense(DeleteData)} />
                    <Route path="/help/delete-account" element={withSuspense(DeleteAccount)} />
                    <Route path="/promote/info" element={<ProtectedRoute>{withSuspense(PromoteInfo)}</ProtectedRoute>} />
                    <Route path="*" element={withSuspense(NotFound)} />
                  </Routes>
                </SwipeWrapper>
                <RealtimeStatus />
                <GlobalVideoManager />
                <BottomNav />
                <GlobalRefresh />

                <SiteFooter />
                <AdSenseLoader />
                <CookieConsent />
              </div>
              </GlobalCallHost>
              </AdProvider>
            </MobileProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
