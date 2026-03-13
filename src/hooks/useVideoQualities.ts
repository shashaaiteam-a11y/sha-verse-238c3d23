import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useVideoQualities = (videoId?: string) => {
  const { data: qualities, isLoading } = useQuery({
    queryKey: ['video-qualities', videoId],
    queryFn: async () => {
      if (!videoId) return [];
      
      const { data, error } = await supabase
        .from('video_qualities')
        .select('*')
        .eq('video_id', videoId)
        .order('height', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!videoId,
  });

  return { qualities: qualities || [], isLoading };
};

export const useTranscodingJob = (videoId?: string) => {
  const { data: job, isLoading } = useQuery({
    queryKey: ['transcoding-job', videoId],
    queryFn: async () => {
      if (!videoId) return null;
      
      const { data, error } = await supabase
        .from('transcoding_jobs')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!videoId,
    refetchInterval: (data) => {
      // Poll while processing
      if (data?.state?.data?.status === 'processing' || data?.state?.data?.status === 'pending') {
        return 5000;
      }
      return false;
    },
  });

  return { job, isLoading };
};
