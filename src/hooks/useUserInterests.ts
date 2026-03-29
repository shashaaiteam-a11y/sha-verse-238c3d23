import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUserInterests = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  // Track interest with incremental score based on watch time
  const trackInterest = useMutation({
    mutationFn: async ({ category, watchTimeSeconds }: { category: string; watchTimeSeconds?: number }) => {
      if (!user || !category) return;
      
      // Calculate score increment: base 1 + watch_time bonus
      const scoreIncrement = 1 + (watchTimeSeconds ? watchTimeSeconds * 0.1 : 0);
      
      // Get current score
      const { data: existing } = await supabase
        .from('user_interests')
        .select('score')
        .eq('user_id', user.id)
        .eq('category', category)
        .maybeSingle();
      
      const newScore = (existing?.score || 0) + scoreIncrement;
      
      const { error } = await supabase
        .from('user_interests')
        .upsert(
          {
            user_id: user.id,
            category,
            score: newScore,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,category' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-interests', user?.id] });
    },
  });

  const topCategories = (interests || []).slice(0, 5).map((i) => i.category);

  return { interests, topCategories, trackInterest };
};
