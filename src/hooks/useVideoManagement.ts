import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ProposedChanges {
  title?: string;
  description?: string;
  thumbnail_url?: string;
  tags?: string[];
  visibility?: string;
}

export const useVideoManagementRequests = (channelId?: string) => {
  const { user } = useAuth();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['video-management-requests', channelId],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('video_management_requests')
        .select(`
          *,
          videos:video_id (
            id,
            title,
            thumbnail_url
          )
        `)
        .eq('requested_by', user.id)
        .order('created_at', { ascending: false });
      
      if (channelId) {
        query = query.eq('channel_id', channelId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return { requests, isLoading };
};

export const useSubmitVideoEditRequest = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      videoId, 
      channelId, 
      reason, 
      proposedChanges 
    }: { 
      videoId: string; 
      channelId: string; 
      reason: string; 
      proposedChanges: ProposedChanges;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('video_management_requests')
        .insert({
          video_id: videoId,
          channel_id: channelId,
          requested_by: user.id,
          request_type: 'edit',
          reason,
          proposed_changes: proposedChanges as any,
          status: 'pending',
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-management-requests'] });
      toast.success('Edit request submitted! It will be reviewed within 24-72 hours.');
    },
    onError: (error: Error) => {
      toast.error('Failed to submit request: ' + error.message);
    },
  });
};

export const useSubmitVideoDeleteRequest = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      videoId, 
      channelId, 
      reason 
    }: { 
      videoId: string; 
      channelId: string; 
      reason: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('video_management_requests')
        .insert({
          video_id: videoId,
          channel_id: channelId,
          requested_by: user.id,
          request_type: 'delete',
          reason,
          status: 'pending',
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-management-requests'] });
      toast.success('Delete request submitted! It will be reviewed within 24-72 hours.');
    },
    onError: (error: Error) => {
      toast.error('Failed to submit request: ' + error.message);
    },
  });
};

export const usePendingVideoRequests = () => {
  const { data: pendingRequests, isLoading } = useQuery({
    queryKey: ['pending-video-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('video_management_requests')
        .select(`
          *,
          videos:video_id (
            id,
            title,
            thumbnail_url,
            description
          ),
          channels:channel_id (
            id,
            name,
            avatar_url
          ),
          profiles:requested_by (
            display_name,
            avatar_url
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  return { pendingRequests, isLoading };
};

export const useApproveVideoRequest = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, notes }: { requestId: string; notes?: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Get the request details
      const { data: request } = await supabase
        .from('video_management_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (!request) throw new Error('Request not found');

      // If it's an edit request, apply the changes
      if (request.request_type === 'edit' && request.proposed_changes) {
        const changes = request.proposed_changes as ProposedChanges;
        await supabase
          .from('videos')
          .update({
            ...(changes.title && { title: changes.title }),
            ...(changes.description && { description: changes.description }),
            ...(changes.thumbnail_url && { thumbnail_url: changes.thumbnail_url }),
            ...(changes.tags && { tags: changes.tags }),
            ...(changes.visibility && { visibility: changes.visibility }),
          } as any)
          .eq('id', request.video_id);
      }

      // If it's a delete request, delete the video
      if (request.request_type === 'delete') {
        await supabase
          .from('videos')
          .delete()
          .eq('id', request.video_id);
      }

      // Update request status
      const { error } = await supabase
        .from('video_management_requests')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: notes,
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-video-requests'] });
      queryClient.invalidateQueries({ queryKey: ['video-management-requests'] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast.success('Request approved and processed');
    },
  });
};

export const useRejectVideoRequest = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, notes }: { requestId: string; notes: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('video_management_requests')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: notes,
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-video-requests'] });
      queryClient.invalidateQueries({ queryKey: ['video-management-requests'] });
      toast.success('Request rejected');
    },
  });
};
