import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUserInterests = () => {
  const { user } = useAuth();

  const { data: interests } = useQuery({
    queryKey: ['user-interests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_interests')
        .select('*')
        .eq('user_id', user.id)
        .order('score', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const trackInterest = useMutation({
    mutationFn: async (category: string) => {
      if (!user || !category) return;
      const { error } = await supabase
        .from('user_interests')
        .upsert(
          {
            user_id: user.id,
            category,
            score: 1,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,category' }
        );
      if (error) throw error;
    },
  });

  const topCategories = (interests || []).slice(0, 5).map((i) => i.category);

  return { interests, topCategories, trackInterest };
};
