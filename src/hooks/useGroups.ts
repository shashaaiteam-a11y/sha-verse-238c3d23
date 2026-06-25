import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { triggerImageCompression } from '@/lib/compressImage';
import { compressImage } from '@/lib/media/compressImage';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export type GroupPrivacy = 'public' | 'private' | 'invite_only';

export interface CreateGroupPayload {
  name: string;
  description?: string;
  privacy?: GroupPrivacy;
  country?: string;
  language?: string;
  rules?: string;
  category?: string;
  avatarUrl?: string;
  coverUrl?: string;
}

// NOTE: `posts_count` (maintained column) is used directly instead of an
// expensive nested `group_posts(count)` aggregate — same number, far faster.
const GROUP_SELECT = `
  id, name, description, avatar_url, cover_url,
  is_private, members_count, posts_count,
  created_at, creator_id
`;

export const useGroups = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's joined groups
  const { data: myGroups, isLoading: myGroupsLoading } = useQuery({
    queryKey: ['my-groups', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('group_members')
        .select(`id, role, joined_at, groups (${GROUP_SELECT})`)
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch all groups for Discover — no exclusion, show everything
  const { data: suggestedGroups, isLoading: suggestedLoading } = useQuery({
    queryKey: ['suggested-groups', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('groups')
        .select(GROUP_SELECT)
        .order('members_count', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch group IDs where user has a pending join request
  const { data: pendingRequestGroups } = useQuery({
    queryKey: ['pending-join-requests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('group_join_requests')
        .select('group_id')
        .eq('user_id', user.id)
        .eq('status', 'pending');
      if (error) throw error;
      return data?.map((r: any) => r.group_id) || [];
    },
    enabled: !!user,
  });

  const pendingRequestGroupIds = new Set<string>(pendingRequestGroups || []);

  // Search groups
  const searchGroups = async (query: string, filters?: { country?: string; language?: string; category?: string }) => {
    let q: any = (supabase
      .from('groups') as any)
      .select(GROUP_SELECT)
      .ilike('name', `%${query}%`)
      .order('members_count', { ascending: false })
      .limit(30);
    if (filters?.country) q = q.eq('country', filters.country);
    if (filters?.language) q = q.eq('language', filters.language);
    if (filters?.category) q = q.eq('category', filters.category);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  };

  // Create group mutation
  const createGroup = useMutation({
    mutationFn: async (payload: CreateGroupPayload) => {
      if (!user) throw new Error('Not authenticated');

      // Free user cap at 5 groups
      const { count } = await supabase
        .from('group_members')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('role', 'admin');
      if ((count || 0) >= 5) throw new Error('You can create a maximum of 5 groups.');

      const trimmedName = payload.name.trim();

      // Pre-check for duplicate name (case-insensitive)
      const { data: existing } = await (supabase
        .from('groups') as any)
        .select('id')
        .ilike('name', trimmedName)
        .maybeSingle();
      if (existing) throw new Error('A group with this name already exists. Please choose a different name.');

      const privacyValue = payload.privacy || 'public';
      const { data: group, error: groupError } = await (supabase
        .from('groups') as any)
        .insert({
          name: trimmedName,
          description: payload.description,
          is_private: privacyValue !== 'public',
          privacy: privacyValue,
          creator_id: user.id,
          avatar_url: payload.avatarUrl || null,
          cover_url: payload.coverUrl || null,
          category: payload.category || 'General',
          language: payload.language || null,
          country: payload.country || null,
          rules: payload.rules || null,
        })
        .select()
        .single();
      if (groupError) {
        if (groupError.code === '23505' || /duplicate|unique/i.test(groupError.message || '')) {
          throw new Error('A group with this name already exists. Please choose a different name.');
        }
        throw groupError;
      }

      const { error: memberError } = await supabase
        .from('group_members')
        .insert({ group_id: group.id, user_id: user.id, role: 'admin' });
      if (memberError) throw memberError;

      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      toast({ title: 'Group created!' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to create group', description: error.message, variant: 'destructive' });
    },
  });

  // Join group mutation — handles public (direct join) vs private (join request)
  const joinGroup = useMutation({
    mutationFn: async ({ groupId, message }: { groupId: string; message?: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('id, role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (existingMember) {
        // If admin/creator, don't allow join request
        if (existingMember.role === 'admin') {
          throw new Error('You are the group creator/admin.');
        }
        throw new Error('You are already a member of this group');
      }

      // Check group privacy
      const { data: group } = await supabase
        .from('groups')
        .select('is_private, require_join_approval, members_count, creator_id')
        .eq('id', groupId)
        .single();

      if (!group) throw new Error('Group not found');

      // Blocked user cannot join or request to join
      const { data: blockedEntry, error: blockedErr } = await supabase
        .from('group_blocked_users')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle();
      // If RLS denies access the user has no block row — safe to proceed
      if (!blockedErr && blockedEntry) throw new Error('You have been blocked from this group.');

      // If user is group creator, don't allow join request
      if (group.creator_id === user.id) {
        throw new Error('You are the group creator/admin.');
      }

      const needsRequest = group.is_private; // Like Facebook: public = instant join, private = request

      if (!needsRequest) {
        // Check if already a member
        const { data: existing } = await supabase
          .from('group_members')
          .select('id')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (existing) return { type: 'joined' };
        
        const { error } = await supabase
          .from('group_members')
          .insert({ group_id: groupId, user_id: user.id, role: 'member' });
          
        if (error) {
          if (error.code === '23505') return { type: 'joined' }; // Ignore duplicates gracefully
          throw error;
        }
        return { type: 'joined' };
      } else {
        // private group → send join request
        // Check for any existing request (pending or rejected)
        const { data: existing } = await supabase
          .from('group_join_requests')
          .select('id, status')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing?.status === 'pending') {
          // Already requested — return early
          return { type: 'requested' };
        }

        // Insert fresh join request or UPSERT if fixing a previous rejected state
        // This permanently fixes the 'duplicate key value violates unique constraint' error
        const { error } = await supabase
          .from('group_join_requests')
          .upsert(
            { group_id: groupId, user_id: user.id, status: 'pending' },
            { onConflict: 'group_id,user_id', ignoreDuplicates: false }
          );
          
        if (error) {
          if (error.code === '23505') return { type: 'requested' }; // Safely ignore the error if it still throws
          throw error;
        }
        return { type: 'requested' };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['suggested-groups'] });
      queryClient.invalidateQueries({ queryKey: ['pending-join-requests'] });
      toast({ title: result.type === 'joined' ? 'Joined group!' : 'Join request sent!' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    },
  });

  // Leave group mutation
  const leaveGroup = useMutation({
    mutationFn: async (groupId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['suggested-groups'] });
      toast({ title: 'Left group' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to leave group', description: error.message, variant: 'destructive' });
    },
  });

  // Delete group mutation (creator only)
  const deleteGroup = useMutation({
    mutationFn: async (groupId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId)
        .eq('creator_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['suggested-groups'] });
      toast({ title: 'Group deleted' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to delete group', description: error.message, variant: 'destructive' });
    },
  });

  // Update group (name/description/is_private/avatar/cover)
  const updateGroup = useMutation({
    mutationFn: async ({ groupId, name, description, isPrivate, requireJoinApproval, requirePostApproval, avatarFile, coverFile }: { 
      groupId: string; name: string; description?: string; isPrivate?: boolean;
      requireJoinApproval?: boolean; requirePostApproval?: boolean;
      avatarFile?: File; coverFile?: File;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const updates: Record<string, any> = { 
        name, 
        description: description || null, 
        is_private: isPrivate ?? false,
        require_join_approval: requireJoinApproval ?? false,
        require_post_approval: requirePostApproval ?? false,
      };

      // Upload avatar if provided
      if (avatarFile) {
        const img = await compressImage(avatarFile);
        const ext = img.name.split('.').pop();
        const path = `${user.id}/groups/${groupId}-avatar-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('avatars').upload(path, img, { upsert: false });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
        updates.avatar_url = publicUrl;
        triggerImageCompression('avatars', path); // background WebP variants, gated
      }

      // Upload cover if provided
      if (coverFile) {
        const img = await compressImage(coverFile);
        const ext = img.name.split('.').pop();
        const path = `${user.id}/groups/${groupId}-cover-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('avatars').upload(path, img, { upsert: false });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
        updates.cover_url = publicUrl;
        triggerImageCompression('avatars', path); // background WebP variants, gated
      }

      const { error } = await supabase
        .from('groups')
        .update(updates as any)
        .eq('id', groupId)
        .eq('creator_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['suggested-groups'] });
      toast({ title: 'Group updated!' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update group', description: error.message, variant: 'destructive' });
    },
  });

  // REALTIME-FIX: Faster invalidation (500ms) so join/approve/leave reflect within 3s
  useEffect(() => {
    if (!user?.id) return;

    let timeoutId: NodeJS.Timeout | null = null;
    const DEBOUNCE_MS = 500;

    const debouncedInvalidate = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['my-groups', user.id], refetchType: 'active' });
        queryClient.invalidateQueries({ queryKey: ['suggested-groups', user.id], refetchType: 'active' });
        queryClient.invalidateQueries({ queryKey: ['pending-join-requests'], refetchType: 'active' });
      }, DEBOUNCE_MS);
    };

    const channelId = `groups-realtime-${user.id}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members', filter: `user_id=eq.${user.id}` }, () => {
        debouncedInvalidate();
      })
      // REALTIME-FIX: react to ALL changes on my join requests (insert/update/delete)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_join_requests', filter: `user_id=eq.${user.id}` }, () => {
        debouncedInvalidate();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'groups' }, () => {
        debouncedInvalidate();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'groups' }, () => {
        debouncedInvalidate();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_posts' }, () => {
        debouncedInvalidate();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'group_posts' }, () => {
        debouncedInvalidate();
      })
      .subscribe();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);


  return {
    myGroups,
    myGroupsLoading,
    suggestedGroups,
    suggestedLoading,
    pendingRequestGroupIds,
    searchGroups,
    createGroup,
    joinGroup,
    leaveGroup,
    deleteGroup,
    updateGroup,
  };
};
