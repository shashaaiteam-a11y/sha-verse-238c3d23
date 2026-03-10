import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Generate a simple hash for content (placeholder for actual fingerprinting)
 * In production, this would use proper audio/video fingerprinting algorithms
 */
const generateContentHash = (videoId: string, title: string): string => {
  // Simple hash generation - in production use proper fingerprinting
  const content = `${videoId}-${title}-${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

/**
 * Create content fingerprint for a video
 */
export const useCreateFingerprint = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ videoId, title }: { videoId: string; title: string }) => {
      if (!user) throw new Error('Not authenticated');

      const combinedHash = generateContentHash(videoId, title);

      const { error } = await supabase
        .from('content_fingerprints')
        .insert({
          video_id: videoId,
          combined_hash: combinedHash,
          owner_id: user.id,
          audio_hash: generateContentHash(videoId, 'audio'),
          video_hash: generateContentHash(videoId, 'video'),
        } as any);

      if (error) throw error;
      return combinedHash;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fingerprints'] });
      toast.success('Content fingerprint created');
    },
  });
};

/**
 * Check for potential copyright matches
 */
export const useCheckCopyrightMatch = () => {
  return useMutation({
    mutationFn: async ({ videoId, title }: { videoId: string; title: string }) => {
      const hash = generateContentHash(videoId, title);

      // Check for similar fingerprints
      const { data, error } = await supabase
        .from('content_fingerprints')
        .select('*, videos:video_id(*)')
        .neq('video_id', videoId);

      if (error) throw error;

      // Simulate matching (in production, use proper similarity algorithms)
      const matches = (data || []).filter((fp: any) => {
        // Simple similarity check - replace with actual algorithm
        return Math.random() < 0.1; // 10% chance for demo
      });

      return matches;
    },
  });
};

/**
 * Submit a copyright claim
 */
export const useSubmitCopyrightClaim = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      videoId, 
      originalVideoId,
      matchPercentage 
    }: { 
      videoId: string; 
      originalVideoId?: string;
      matchPercentage?: number;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('copyright_claims')
        .insert({
          video_id: videoId,
          claimant_id: user.id,
          original_video_id: originalVideoId,
          match_percentage: matchPercentage || 100,
          status: 'pending',
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copyright-claims'] });
      toast.success('Copyright claim submitted');
    },
  });
};

/**
 * Get copyright claims for a channel
 */
export const useCopyrightClaims = (channelId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['copyright-claims', channelId, user?.id],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('copyright_claims')
        .select(`
          *,
          videos:video_id (
            id,
            title,
            thumbnail_url
          )
        `)
        .order('created_at', { ascending: false });

      if (channelId) {
        query = query.eq('videos.channel_id', channelId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
};

/**
 * Admin: Resolve copyright claim
 */
export const useResolveCopyrightClaim = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      claimId, 
      status, 
      action,
      notes 
    }: { 
      claimId: string; 
      status: 'approved' | 'rejected';
      action?: 'block' | 'monetize' | 'share_revenue' | 'mute_audio';
      notes?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('copyright_claims')
        .update({
          status,
          action,
          admin_notes: notes,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        } as any)
        .eq('id', claimId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copyright-claims'] });
      toast.success('Copyright claim resolved');
    },
  });
};
