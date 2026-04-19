import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { BottomNav } from "./components/BottomNav";
import { MobileProvider } from "./contexts/MobileContext";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { ThemeProvider } from "next-themes";
import { SwipeWrapper } from "./components/SwipeWrapper";
import { AdProvider } from "./contexts/AdContext";

// Lazy load pages for better performance
const Home = lazy(() => import("./modules/home/pages/Home"));
const Movion = lazy(() => import("./modules/movion/pages/Movion"));
const VideoWatch = lazy(() => import("./modules/movion/pages/VideoWatch"));
const ChannelPage = lazy(() => import("./modules/movion/pages/ChannelPage"));
const CreatorStudio = lazy(() => import("./modules/movion/pages/CreatorStudio"));
const MovionLibrary = lazy(() => import("./modules/movion/pages/MovionLibrary"));
const NovaChat = lazy(() => import("./modules/novachat/pages/NovaChat"));
const Bookshelf = lazy(() => import("./modules/bookshelf/pages/Bookshelf"));
const BookDetail = lazy(() => import("./modules/bookshelf/pages/BookDetail"));
const EditBook = lazy(() => import("./modules/bookshelf/pages/EditBook"));
const BookReader = lazy(() => import("./modules/bookshelf/pages/BookReader"));
const AuthorChannel = lazy(() => import("./modules/bookshelf/pages/AuthorChannel"));
const EditAuthorChannel = lazy(() => import("./modules/bookshelf/pages/EditAuthorChannel"));
const Groups = lazy(() => import("./modules/groups/pages/Groups"));
const GroupDetail = lazy(() => import("./modules/groups/pages/GroupDetail"));
const GroupAdmin = lazy(() => import("./modules/groups/pages/GroupAdmin"));
const Profile = lazy(() => import("./modules/profile/pages/Profile"));
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

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" />
        <BrowserRouter>
          <AuthProvider>
            <MobileProvider>
              <AdProvider>
              <div className="min-h-screen bg-background safe-left safe-right">
                <SwipeWrapper>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/offline" element={<OfflinePage />} />
                      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                      <Route path="/movion/*" element={<ProtectedRoute><Movion /></ProtectedRoute>} />
                      <Route path="/video/:videoId" element={<ProtectedRoute><VideoWatch /></ProtectedRoute>} />
                      <Route path="/channel/:channelId" element={<ProtectedRoute><ChannelPage /></ProtectedRoute>} />
                      <Route path="/novachat" element={<ProtectedRoute><NovaChat /></ProtectedRoute>} />
                      <Route path="/bookshelf" element={<ProtectedRoute><Bookshelf /></ProtectedRoute>} />
                      <Route path="/bookshelf/edit/:bookId" element={<ProtectedRoute><EditBook /></ProtectedRoute>} />
                      <Route path="/bookshelf/read/:bookId" element={<ProtectedRoute><BookReader /></ProtectedRoute>} />
                      <Route path="/bookshelf/book/:bookId" element={<ProtectedRoute><BookDetail /></ProtectedRoute>} />
                      <Route path="/bookshelf/channel/:channelId" element={<ProtectedRoute><AuthorChannel /></ProtectedRoute>} />
                      <Route path="/bookshelf/channel/:channelId/edit" element={<ProtectedRoute><EditAuthorChannel /></ProtectedRoute>} />
                      <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
                      <Route path="/groups/:groupId/admin" element={<ProtectedRoute><GroupAdmin /></ProtectedRoute>} />
                      <Route path="/groups/:groupId" element={<ProtectedRoute><GroupDetail /></ProtectedRoute>} />
                      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                      <Route path="/profile/:userId" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                      <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
                      <Route path="/saved" element={<ProtectedRoute><SavedPosts /></ProtectedRoute>} />
                      <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                      <Route path="/help" element={<ProtectedRoute><HelpSupport /></ProtectedRoute>} />
                      <Route path="/privacy-center" element={<ProtectedRoute><PrivacyCenter /></ProtectedRoute>} />
                      <Route path="/admin/seed" element={<ProtectedRoute><AdminSeed /></ProtectedRoute>} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </SwipeWrapper>
                <BottomNav />
              </div>
              </AdProvider>
            </MobileProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
