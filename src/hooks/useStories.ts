import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Module-level cache: tracks story IDs already marked as viewed in this session.
// Prevents duplicate INSERTs to story_views when users rapidly swipe through stories
// (Issue #4: View Marking Race Condition).
const viewedStoryCache = new Set<string>();

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
  views_count: number;
  background_color: string | null;
  text_content: string | null;
  story_type: string;
  privacy: string;
  user: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export interface StoryView {
  id: string;
  story_id: string;
  viewer_id: string;
  viewed_at: string;
  viewer?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

export interface StoryReaction {
  id: string;
  story_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
  user?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

export interface StoryGroup {
  user: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
  stories: Story[];
  hasUnviewed: boolean;
  latestStoryTime: string;
}

export const useStories = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch stories with viewed status
  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["stories", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get user's friends
      const { data: friendships } = await supabase
        .from("friendships")
        .select("friend_id, user_id")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq("status", "accepted");

      const friendIds = friendships?.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      ) || [];

      // Get all non-expired stories
      const { data, error } = await supabase
        .from("stories")
        .select(`
          *,
          user:profiles!stories_user_id_fkey(id, display_name, avatar_url)
        `)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter stories based on privacy settings
      const filteredStories = (data as Story[]).filter(story => {
        const isOwner = story.user_id === user.id;
        
        // Owner can always see their own stories
        if (isOwner) return true;
        
        // Check privacy setting
        if (story.privacy === "only_me") {
          // Only owner can see
          return false;
        } else if (story.privacy === "friends") {
          // Only friends can see
          return friendIds.includes(story.user_id);
        } else {
          // Public - everyone can see
          return true;
        }
      });

      return filteredStories;
    },
    enabled: !!user?.id,
  });

  // Fetch viewed story IDs for current user
  const { data: viewedStoryIds = [] } = useQuery({
    queryKey: ["viewed-stories", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("story_views")
        .select("story_id")
        .eq("viewer_id", user.id);

      if (error) throw error;
      return data.map(v => v.story_id);
    },
    enabled: !!user?.id,
  });

  // Group stories by user with viewed status
  const storyGroups: StoryGroup[] = stories.reduce((acc: StoryGroup[], story) => {
    const existingGroup = acc.find((g) => g.user.id === story.user_id);
    const isViewed = viewedStoryIds.includes(story.id);
    
    if (existingGroup) {
      existingGroup.stories.push(story);
      if (!isViewed) existingGroup.hasUnviewed = true;
      // Update latest story time
      if (new Date(story.created_at) > new Date(existingGroup.latestStoryTime)) {
        existingGroup.latestStoryTime = story.created_at;
      }
    } else {
      acc.push({
        user: story.user,
        stories: [story],
        hasUnviewed: !isViewed,
        latestStoryTime: story.created_at,
      });
    }
    return acc;
  }, []);

  // Sort: Own stories first, then unseen, then by recency
  storyGroups.sort((a, b) => {
    // Own stories first
    if (a.user.id === user?.id) return -1;
    if (b.user.id === user?.id) return 1;
    
    // Unseen stories next
    if (a.hasUnviewed && !b.hasUnviewed) return -1;
    if (!a.hasUnviewed && b.hasUnviewed) return 1;
    
    // Then by recency
    return new Date(b.latestStoryTime).getTime() - new Date(a.latestStoryTime).getTime();
  });

  // Realtime: keep story rings, view counts, reactions, and story replies fresh across open screens.
  useEffect(() => {
    if (!user?.id) return;

    let timeoutId: NodeJS.Timeout | null = null;
    const DEBOUNCE_MS = 800;

    const invalidateStories = (immediate = false) => {
      if (timeoutId) clearTimeout(timeoutId);
      if (immediate) {
        queryClient.invalidateQueries({ queryKey: ['stories', user.id] });
        queryClient.invalidateQueries({ queryKey: ['viewed-stories', user.id] });
        return;
      }
      timeoutId = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['stories', user.id] });
        queryClient.invalidateQueries({ queryKey: ['viewed-stories', user.id] });
      }, DEBOUNCE_MS);
    };

    const channelId = `stories-realtime-${user.id}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelId)
      // New story posted by anyone
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'stories',
      }, () => {
        invalidateStories();
      })
      // Story deleted
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'stories',
      }, () => {
        invalidateStories(true);
      })
      // Story viewed - update view count live for every open story surface.
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'story_views',
      }, () => {
        invalidateStories(true);
      })
      // Story reactions live (debounced)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'story_reactions',
      }, () => {
        invalidateStories(true);
      })
      // Story replies/messages live
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'story_replies',
      }, () => {
        invalidateStories(true);
      })
      .subscribe();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Create media story
  const createStory = useMutation({
    mutationFn: async ({
      mediaFile,
      caption,
      privacy = 'friends',
    }: {
      mediaFile: File;
      caption?: string;
      privacy?: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Upload media
      const fileExt = mediaFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const mediaType = mediaFile.type.startsWith("video") ? "video" : "image";

      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(fileName, mediaFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("post-images")
        .getPublicUrl(fileName);

      // Create story
      const { data, error } = await supabase
        .from("stories")
        .insert({
          user_id: user.id,
          media_url: urlData.publicUrl,
          media_type: mediaType,
          caption,
          story_type: 'media',
          privacy,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories", user?.id] });
      toast.success("Story posted!");
    },
    onError: (error) => {
      toast.error("Failed to post story");
      console.error(error);
    },
  });

  // Create text story
  const createTextStory = useMutation({
    mutationFn: async ({
      textContent,
      backgroundColor,
      privacy = 'friends',
    }: {
      textContent: string;
      backgroundColor: string;
      privacy?: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("stories")
        .insert({
          user_id: user.id,
          media_url: '', // Empty for text stories
          media_type: 'text',
          text_content: textContent,
          background_color: backgroundColor,
          story_type: 'text',
          privacy,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories", user?.id] });
      toast.success("Text story posted!");
    },
    onError: (error) => {
      toast.error("Failed to post text story");
      console.error(error);
    },
  });

  // Delete story
  const deleteStory = useMutation({
    mutationFn: async (storyId: string) => {
      const { error } = await supabase
        .from("stories")
        .delete()
        .eq("id", storyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories", user?.id] });
      toast.success("Story deleted");
    },
  });

  // View story (mark as seen) — guarded by in-memory cache (Issue #4 fix)
  const viewStory = useMutation({
    mutationFn: async (storyId: string) => {
      if (!user?.id) return;

      const cacheKey = `${user.id}:${storyId}`;
      // Skip if we've already recorded this view in the current session.
      if (viewedStoryCache.has(cacheKey)) return;
      // Optimistically add to cache BEFORE the network call so concurrent
      // rapid taps short-circuit immediately. If the request fails, we remove it.
      viewedStoryCache.add(cacheKey);

      const { error } = await supabase
        .from("story_views")
        .upsert({
          story_id: storyId,
          viewer_id: user.id,
          viewed_at: new Date().toISOString(),
        }, {
          onConflict: 'story_id,viewer_id',
        });

      if (error && !error.message.includes("duplicate")) {
        // Roll back cache so a retry can succeed.
        viewedStoryCache.delete(cacheKey);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["viewed-stories", user?.id] });
    },
  });

  // React to story
  const reactToStory = useMutation({
    mutationFn: async ({
      storyId,
      reactionType,
    }: {
      storyId: string;
      reactionType: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("story_reactions")
        .upsert({
          story_id: storyId,
          user_id: user.id,
          reaction_type: reactionType,
        }, {
          onConflict: 'story_id,user_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["story-reactions"] });
    },
  });

  // Reply to story
  const replyToStory = useMutation({
    mutationFn: async ({
      storyId,
      recipientId,
      message,
    }: {
      storyId: string;
      recipientId: string;
      message: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("story_replies")
        .insert({
          story_id: storyId,
          sender_id: user.id,
          recipient_id: recipientId,
          message,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reply sent!");
    },
    onError: () => {
      toast.error("Failed to send reply");
    },
  });

  // Get story viewers (for story owner)
  const getStoryViewers = async (storyId: string): Promise<StoryView[]> => {
    const { data, error } = await supabase
      .from("story_views")
      .select("*")
      .eq("story_id", storyId)
      .order("viewed_at", { ascending: false });

    if (error) throw error;
    
    // Fetch viewer profiles separately
    const viewerIds = data.map(v => v.viewer_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", viewerIds);
    
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    return data.map(view => ({
      ...view,
      viewer: profileMap.get(view.viewer_id),
    })) as StoryView[];
  };

  // Get story reactions
  const getStoryReactions = async (storyId: string): Promise<StoryReaction[]> => {
    const { data, error } = await supabase
      .from("story_reactions")
      .select("*")
      .eq("story_id", storyId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    // Fetch user profiles separately
    const userIds = data.map(r => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);
    
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    return data.map(reaction => ({
      ...reaction,
      user: profileMap.get(reaction.user_id),
    })) as StoryReaction[];
  };

  return {
    stories,
    storyGroups,
    isLoading,
    viewedStoryIds,
    createStory,
    createTextStory,
    deleteStory,
    viewStory,
    reactToStory,
    replyToStory,
    getStoryViewers,
    getStoryReactions,
  };
};
