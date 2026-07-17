import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useCallback } from 'react';
import { debounce } from '@/lib/utils';
import { sanitizeSearchTerm } from '@/lib/security/sanitizeSearch';

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
      const safeTerm = sanitizeSearchTerm(debouncedTerm);
      if (!safeTerm || safeTerm.length < 2) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, bio')
        .or(`display_name.ilike.%${safeTerm}%,username.ilike.%${safeTerm}%`)
        .neq('id', user?.id || '')
        .limit(20);

      if (error) throw error;
      return data || [];
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
