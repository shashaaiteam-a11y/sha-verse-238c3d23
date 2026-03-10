// Motion Feed Page - Main page for the Motion module
import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Zap, Eye } from "lucide-react";
import { MotionHeader } from "@/components/motion/MotionHeader";
import { MotionSidebar } from "@/components/motion/MotionSidebar";
import { MotionCategoryTabs } from "@/components/motion/MotionCategoryTabs";
import { MotionCard } from "@/components/motion/MotionCard";
import { QuickMotionCard } from "@/components/motion/QuickMotionCard";
import { useMotions, useTrendingMotions, useQuickMotions } from "@/hooks/useMotion";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { MotionCategory } from "@/components/motion/types";

const Motion = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const initialTab = searchParams.get('tab') || 'home';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedCategory, setSelectedCategory] = useState<MotionCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { motions, isLoading } = useMotions({ 
    category: selectedCategory,
    searchQuery,
    sortBy: activeTab === 'trending' ? 'trending' : 'recent'
  });
  const { trending } = useTrendingMotions();
  const { quickMotions } = useQuickMotions();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['motions'] });
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    
    if (tab === 'dashboard') {
      navigate('/motion/dashboard');
    }
  };

  const renderContent = () => {
    if (activeTab === 'quick') {
      return (
        <div className="px-3 sm:px-6 py-4">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent" />
            Quick Motions
          </h2>
          {quickMotions && quickMotions.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {quickMotions.map((motion) => (
                <QuickMotionCard key={motion.id} motion={motion} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Zap className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No quick motions yet</p>
            </div>
          )}
        </div>
      );
    }

    // Default home view
    return (
      <>
        <MotionCategoryTabs selected={selectedCategory} onSelect={setSelectedCategory} />
        <PullToRefresh onRefresh={handleRefresh} className="min-h-[calc(100vh-120px)]">
          <div className="px-3 sm:px-6 pb-4">
            {/* Quick Motions Section */}
            {quickMotions && quickMotions.length > 0 && selectedCategory === 'All' && (
              <div className="mb-6 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-accent text-accent-foreground px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    Quick
                  </div>
                </div>
                <ScrollArea className="w-full">
                  <div className="flex gap-3 pb-2">
                    {quickMotions.slice(0, 10).map((motion) => (
                      <QuickMotionCard key={motion.id} motion={motion} />
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}

            {/* Trending Section */}
            {trending && trending.length > 0 && selectedCategory === 'All' && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h2 className="font-bold text-base">Trending Now</h2>
                </div>
                <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {trending.slice(0, 4).map((motion) => (
                    <MotionCard key={motion.id} motion={motion} />
                  ))}
                </div>
              </div>
            )}

            {/* Main Grid */}
            <h2 className="font-bold mb-3 text-base flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              {searchQuery ? `Results for "${searchQuery}"` : selectedCategory === 'All' ? 'For You' : selectedCategory}
            </h2>
            
            {isLoading ? (
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-video rounded-xl" />
                    <div className="flex gap-3">
                      <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : motions && motions.length > 0 ? (
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {motions.map((motion) => (
                  <MotionCard key={motion.id} motion={motion} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <Zap className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No motions yet</p>
                <p className="text-sm mt-1">Be the first to upload!</p>
              </div>
            )}
          </div>
        </PullToRefresh>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <MotionHeader 
        onSearch={setSearchQuery} 
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <MotionSidebar 
        isOpen={sidebarOpen}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onClose={() => setSidebarOpen(false)}
      />

      <main className={cn(
        "transition-all duration-200 pb-20 md:pb-4",
        sidebarOpen ? "md:ml-64" : "md:ml-[72px]"
      )}>
        {renderContent()}
      </main>
    </div>
  );
};

export default Motion;
