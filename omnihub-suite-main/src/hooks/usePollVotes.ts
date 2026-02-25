import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PollOption {
  id: string;
  post_id: string;
  option_text: string;
  vote_count: number;
  position: number;
}

interface PollVote {
  id: string;
  post_id: string;
  option_id: string;
  user_id: string;
}

export const usePollVotes = (postId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch poll options
  const { data: pollOptions = [], isLoading: optionsLoading } = useQuery({
    queryKey: ['poll-options', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('poll_options')
        .select('*')
        .eq('post_id', postId)
        .order('position', { ascending: true });
      
      if (error) throw error;
      return data as PollOption[];
    },
    enabled: !!postId,
  });

  // Fetch user's vote
  const { data: userVote, isLoading: voteLoading } = useQuery({
    queryKey: ['poll-vote', postId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('poll_votes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as PollVote | null;
    },
    enabled: !!postId && !!user?.id,
  });

  // Vote mutation - uses trigger to automatically update vote_count
  const voteMutation = useMutation({
    mutationFn: async (optionId: string) => {
      if (!user?.id) throw new Error('Must be logged in to vote');
      
      // Insert vote - trigger will automatically increment poll_options.vote_count
      const { error: voteError } = await supabase
        .from('poll_votes')
        .insert({
          post_id: postId,
          option_id: optionId,
          user_id: user.id,
        });
      
      if (voteError) {
        if (voteError.code === '23505') {
          throw new Error('You have already voted on this poll');
        }
        throw voteError;
      }

      return optionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poll-options', postId] });
      queryClient.invalidateQueries({ queryKey: ['poll-vote', postId, user?.id] });
    },
  });

  // Realtime: poll votes live - dusre log vote karte hain to instantly count update
  useEffect(() => {
    if (!postId) return;

    const channel = supabase
      .channel(`poll-votes-${postId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'poll_votes',
        filter: `post_id=eq.${postId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['poll-options', postId] });
        queryClient.invalidateQueries({ queryKey: ['poll-vote', postId] });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'poll_options',
        filter: `post_id=eq.${postId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['poll-options', postId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, queryClient]);

  const totalVotes = pollOptions.reduce((sum, opt) => sum + (opt.vote_count || 0), 0);
  const hasVoted = !!userVote;

  return {
    pollOptions,
    userVote,
    totalVotes,
    hasVoted,
    isLoading: optionsLoading || voteLoading,
    vote: voteMutation,
  };
};

// Create poll options when creating a post
export const createPollOptions = async (
  postId: string, 
  options: { text: string; position: number }[]
) => {
  const { error } = await supabase
    .from('poll_options')
    .insert(
      options.map(opt => ({
        post_id: postId,
        option_text: opt.text,
        position: opt.position,
        vote_count: 0,
      }))
    );
  
  if (error) throw error;
};
