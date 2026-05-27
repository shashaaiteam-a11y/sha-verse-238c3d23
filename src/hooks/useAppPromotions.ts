import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface AppPromotion {
  id: string;
  owner_id: string;
  media_url: string;
  media_type: string; // 'image' | 'video' | 'text'
  caption: string | null;
  background_color: string | null;
  text_content: string | null;
  link_url: string | null;
  created_at: string;
  expires_at: string;
  views_count: number;
}

const viewedPromoCache = new Set<string>();

/** Check if current user has admin role (= App Owner). */
export function useIsAppOwner() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["is-app-owner", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });
  return !!data;
}

export function useActivePromotions() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["app-promotions-active"],
    queryFn: async (): Promise<AppPromotion[]> => {
      const { data, error } = await supabase
        .from("app_promotions" as any)
        .select("*")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AppPromotion[];
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`app_promotions:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_promotions" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["app-promotions-active"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "app_promotion_views" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["app-promotions-active"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useCreatePromotion() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      mediaFile,
      caption,
      linkUrl,
      textContent,
      backgroundColor,
    }: {
      mediaFile?: File;
      caption?: string;
      linkUrl?: string;
      textContent?: string;
      backgroundColor?: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      let media_url = "";
      let media_type: "image" | "video" | "text" = "text";

      if (mediaFile) {
        const ext = mediaFile.name.split(".").pop();
        const fileName = `${user.id}/promo_${Date.now()}.${ext}`;
        media_type = mediaFile.type.startsWith("video") ? "video" : "image";
        const { error: upErr } = await supabase.storage
          .from("post-images")
          .upload(fileName, mediaFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage
          .from("post-images")
          .getPublicUrl(fileName);
        media_url = urlData.publicUrl;
      }

      const { data, error } = await supabase
        .from("app_promotions" as any)
        .insert({
          owner_id: user.id,
          media_url,
          media_type,
          caption: caption || null,
          text_content: textContent || null,
          background_color: backgroundColor || null,
          link_url: linkUrl || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-promotions-active"] });
      toast.success("Promotion published");
    },
    onError: (e: any) => {
      toast.error(e?.message || "Failed to publish promotion");
    },
  });
}

export function useDeletePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("app_promotions" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-promotions-active"] });
      toast.success("Promotion deleted");
    },
  });
}

export async function markPromotionViewed(promotionId: string, viewerId: string | undefined) {
  if (!viewerId) return;
  const key = `${promotionId}:${viewerId}`;
  if (viewedPromoCache.has(key)) return;
  viewedPromoCache.add(key);
  await supabase
    .from("app_promotion_views" as any)
    .insert({ promotion_id: promotionId, viewer_id: viewerId } as any);
}
