import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { AdCategory } from "@/lib/ads/adTypes";

const ACTIVITY_TO_CATEGORIES: Record<string, AdCategory[]> = {
  bookshelf: ["education", "lifestyle", "tech"],
  movion: ["entertainment", "tech"],
  novachat: ["saas_tools", "tech"],
  groups: ["community", "lifestyle"],
};

/**
 * Returns the most likely ad category for the current user based on
 * their recent activity. Falls back to 'general'.
 *
 * Lightweight — uses existing tables only, no DB schema changes.
 */
export function useAdTargeting(): { category: AdCategory } {
  const { user } = useAuth();
  const [category, setCategory] = useState<AdCategory>("general");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

        const [readingRes, viewsRes, chatRes, groupsRes] = await Promise.all([
          supabase
            .from("book_reading_progress")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .gte("last_read_at", sevenDaysAgo),
          supabase
            .from("ai_conversations")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .gte("updated_at", sevenDaysAgo),
          supabase
            .from("group_members")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("subscriptions" as any)
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
        ]);

        if (cancelled) return;

        const scores = {
          bookshelf: readingRes.count || 0,
          novachat: viewsRes.count || 0,
          groups: groupsRes.count || 0,
          movion: (groupsRes as any).count || 0,
        };

        const top = (Object.entries(scores) as [keyof typeof scores, number][])
          .sort((a, b) => b[1] - a[1])[0];

        if (top && top[1] > 0) {
          const cats = ACTIVITY_TO_CATEGORIES[top[0]];
          if (cats && cats.length > 0) {
            setCategory(cats[0]);
          }
        }
      } catch {
        // Silent fallback
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { category };
}
