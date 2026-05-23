import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useChannelApprovalStatus = (channelId?: string) => {
  const { data: approvalStatus, isLoading } = useQuery({
    queryKey: ['channel-approval', channelId],
    queryFn: async () => {
      if (!channelId) return null;
      
      const { data, error } = await supabase
        .from('channels')
        .select('approval_status, rejection_reason, approved_at')
        .eq('id', channelId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!channelId,
  });

  return { approvalStatus, isLoading };
};

export const useChannelApprovalLogs = (channelId?: string) => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['channel-approval-logs', channelId],
    queryFn: async () => {
      if (!channelId) return [];
      
      const { data, error } = await supabase
        .from('channel_approval_logs')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!channelId,
  });

  return { logs, isLoading };
};

export const useCreateChannelWithApproval = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      name, 
      username,
      description, 
      category,
      avatarFile, 
      bannerFile 
    }: { 
      name: string;
      username: string;
      description?: string;
      category?: string;
      avatarFile?: File; 
      bannerFile?: File;
    }) => {
      if (!user) throw new Error('Not authenticated');

      let avatarUrl = null;
      let bannerUrl = null;

      if (avatarFile) {
        const path = `${user.id}/avatar_${Date.now()}_${avatarFile.name}`;
        const { error } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile);
        
        if (!error) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(path);
          avatarUrl = data.publicUrl;
        }
      }

      if (bannerFile) {
        const path = `${user.id}/banner_${Date.now()}_${bannerFile.name}`;
        const { error } = await supabase.storage
          .from('avatars')
          .upload(path, bannerFile);
        
        if (!error) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(path);
          bannerUrl = data.publicUrl;
        }
      }

      // Create channel with pending approval status
      const { data: channel, error } = await supabase
        .from('channels')
        .insert({
          name,
          username: username.toLowerCase().replace(/\s+/g, '_'),
          description,
          category,
          user_id: user.id,
          channel_type: 'video',
          avatar_url: avatarUrl,
          banner_url: bannerUrl,
          approval_status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Log the submission
      await supabase
        .from('channel_approval_logs')
        .insert({
          channel_id: channel.id,
          action: 'submitted',
          performed_by: user.id,
          notes: 'Channel submitted for approval',
        });

      return channel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-channel'] });
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success('Channel submitted for approval! We will review it within 24-72 hours.');
    },
    onError: (error: Error) => {
      if (error.message.includes('unique')) {
        toast.error('This username is already taken. Please choose another.');
      } else {
        toast.error('Failed to create channel: ' + error.message);
      }
    },
  });
};

export const usePendingChannels = () => {
  const { data: pendingChannels, isLoading } = useQuery({
    queryKey: ['pending-channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channels')
        .select(`
          *,
          profiles:user_id (
            display_name,
            avatar_url,
            username
          )
        `)
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  return { pendingChannels, isLoading };
};

export const useApproveChannel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId }: { channelId: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.rpc('admin_approve_channel' as any, { _channel_id: channelId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-channels'] });
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success('Channel approved successfully');
    },
  });
};

export const useRejectChannel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, reason }: { channelId: string; reason: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.rpc('admin_reject_channel' as any, { _channel_id: channelId, _reason: reason });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-channels'] });
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success('Channel rejected');
    },
  });
};
