import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AppPromotion {
  id: string;
  owner_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  link_url: string | null;
  created_at: string;
  expires_at: string;
  views_count: number;
}

/** Is the current user an app admin/owner? Uses public.user_roles + has_role pattern. */
export const useIsAppOwner = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['is-app-owner', user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .eq('role', 'admin')
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
  });
};

/** Active (non-expired) app promotions, ordered oldest -> newest for sequential play. */
export const useActiveAppPromotions = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['app-promotions-active'],
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    queryFn: async (): Promise<AppPromotion[]> => {
      const { data, error } = await supabase
        .from('app_promotions')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as AppPromotion[];
    },
  });

  // Realtime: new promotions / expiry updates / view bumps
  useEffect(() => {
    const channel = supabase
      .channel(`app-promotions-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_promotions' },
        () => queryClient.invalidateQueries({ queryKey: ['app-promotions-active'] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

/** Realtime live view count for a specific promotion (eye icon counter). */
export const usePromotionLiveViews = (promotionId: string | null, initial = 0) => {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    if (!promotionId) return;
    setCount(initial);

    const channel = supabase
      .channel(`promo-views-${promotionId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'app_promotions',
          filter: `id=eq.${promotionId}`,
        },
        (payload) => {
          const next = (payload.new as { views_count?: number } | null)?.views_count;
          if (typeof next === 'number') setCount(next);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promotionId]);

  return count;
};

/** Mark a promotion as viewed by the current user (idempotent via unique constraint). */
export const useRecordPromotionView = () => {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (promotionId: string) => {
      if (!user?.id) return;
      await supabase
        .from('app_promotion_views')
        .insert({ promotion_id: promotionId, viewer_id: user.id })
        // duplicates are fine — unique constraint just blocks them silently
        .then(() => undefined, () => undefined);
    },
  });
};

/** Upload media + create a promotion row (admin only — enforced by RLS). */
export const useCreatePromotion = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, caption, linkUrl, expiresAt }: { file: File; caption?: string; linkUrl?: string; expiresAt?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Compress before upload (image/video). Safe no-op on failure.
      const uploadFile = await compressForUpload(file);
      const isVideo = uploadFile.type.startsWith('video/');
      const bucket = isVideo ? 'videos' : 'post-images';
      const ext = uploadFile.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
      const path = `${user.id}/promo-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage.from(bucket).upload(path, uploadFile, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);

      const payload: Record<string, unknown> = {
        owner_id: user.id,
        media_url: pub.publicUrl,
        media_type: isVideo ? 'video' : 'image',
        caption: caption || null,
        link_url: linkUrl || null,
      };
      if (expiresAt) payload.expires_at = expiresAt;

      const { error } = await supabase.from('app_promotions').insert(payload as never);
      if (error) throw error;
    },

    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['app-promotions-active'] }),
  });
};

/** Delete a promotion (owner/admin only — enforced by RLS). */
export const useDeletePromotion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (promotionId: string) => {
      const { error } = await supabase
        .from('app_promotions')
        .delete()
        .eq('id', promotionId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['app-promotions-active'] }),
  });
};
