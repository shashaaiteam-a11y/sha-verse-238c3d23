import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useCallback } from 'react';
import { debounce } from '@/lib/utils';

export const useUserSearch = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  // Debounce search term
  const debouncedSetSearch = useCallback(
    debounce((term: string) => {
      setDebouncedTerm(term);
    }, 300),
    []
  );

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    debouncedSetSearch(term);
  };

  // Search users
  const { data: results, isLoading } = useQuery({
    queryKey: ['user-search', debouncedTerm],
    queryFn: async () => {
      if (!debouncedTerm || debouncedTerm.length < 2) return [];

      // Two separate typed filters instead of one hand-built `.or()` string —
      // user text never becomes part of a PostgREST filter expression.
      const pattern = `%${debouncedTerm}%`;
      const base = () =>
        supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url, bio')
          .neq('id', user?.id || '')
          .limit(20);

      const [byName, byUsername] = await Promise.all([
        base().ilike('display_name', pattern),
        base().ilike('username', pattern),
      ]);

      if (byName.error) throw byName.error;
      if (byUsername.error) throw byUsername.error;

      const merged = new Map<string, (typeof byName.data)[number]>();
      [...(byName.data || []), ...(byUsername.data || [])].forEach((row) => {
        if (!merged.has(row.id)) merged.set(row.id, row);
      });
      return Array.from(merged.values()).slice(0, 20);
    },
    enabled: !!debouncedTerm && debouncedTerm.length >= 2,
  });

  // Check friendship status for each result
  const { data: friendshipStatuses } = useQuery({
    queryKey: ['friendship-statuses', results?.map(r => r.id).join(',')],
    queryFn: async () => {
      if (!user || !results || results.length === 0) return {};

      const userIds = results.map(r => r.id);
      
      const { data: friendships } = await supabase
        .from('friendships')
        .select('id, user_id, friend_id, status')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .or(`user_id.in.(${userIds.join(',')}),friend_id.in.(${userIds.join(',')})`);

      const statusMap: Record<string, { status: string; friendshipId: string }> = {};
      
      friendships?.forEach(f => {
        const otherUserId = f.user_id === user.id ? f.friend_id : f.user_id;
        if (userIds.includes(otherUserId)) {
          statusMap[otherUserId] = { status: f.status, friendshipId: f.id };
        }
      });

      return statusMap;
    },
    enabled: !!user && !!results && results.length > 0,
  });

  const resultsWithStatus = results?.map(r => ({
    ...r,
    friendshipStatus: friendshipStatuses?.[r.id]?.status || null,
    friendshipId: friendshipStatuses?.[r.id]?.friendshipId || null,
  })) || [];

  return {
    searchTerm,
    setSearchTerm: handleSearch,
    results: resultsWithStatus,
    isLoading,
    clearSearch: () => {
      setSearchTerm('');
      setDebouncedTerm('');
    },
  };
};
