import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MovionSearchResult {
  id: string;
  type: 'video' | 'channel' | 'category';
  title: string;
  subtitle: string;
  thumbnail: string | null;
  avatar: string | null;
  category: string | null;
  channelId: string | null;
  videoId: string | null;
}

const DEBOUNCE_MS = 300;

export const useMovionSearch = (query: string) => {
  const [results, setResults] = useState<MovionSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Abort previous request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const term = q.toLowerCase().trim();

      // Search videos (title, description, category)
      const { data: videos } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          thumbnail_url,
          category,
          channel_id,
          is_short,
          channels:channel_id (
            id,
            name,
            avatar_url
          )
        `)
        .or(`title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`)
        .eq('is_short', false)
        .order('views_count', { ascending: false })
        .limit(8);

      // Search channels by name
      const { data: channels } = await supabase
        .from('channels')
        .select('id, name, avatar_url, subscribers_count, description, channel_type')
        .ilike('name', `%${term}%`)
        .eq('channel_type', 'video')
        .order('subscribers_count', { ascending: false })
        .limit(5);

      const searchResults: MovionSearchResult[] = [];

      // Add matching videos
      (videos || []).forEach((v: any) => {
        searchResults.push({
          id: `video-${v.id}`,
          type: 'video',
          title: v.title || 'Untitled',
          subtitle: v.channels?.name || 'Unknown Channel',
          thumbnail: v.thumbnail_url,
          avatar: v.channels?.avatar_url,
          category: v.category,
          channelId: v.channel_id,
          videoId: v.id,
        });
      });

      // Add matching channels (deduplicate channels already appearing in videos)
      const existingChannelIds = new Set((videos || []).map((v: any) => v.channel_id));
      (channels || []).forEach((c: any) => {
        if (!existingChannelIds.has(c.id)) {
          searchResults.push({
            id: `channel-${c.id}`,
            type: 'channel',
            title: c.name,
            subtitle: `${c.subscribers_count?.toLocaleString() || 0} subscribers`,
            thumbnail: null,
            avatar: c.avatar_url,
            category: null,
            channelId: c.id,
            videoId: null,
          });
        }
      });

      // If the query matches a category name, add a category shortcut at top
      const CATEGORIES = [
        'Gaming', 'Music', 'Education', 'Entertainment', 'Sports', 'Technology',
        'Science', 'Comedy', 'News', 'Film', 'Travel', 'Food', 'Fashion', 'Beauty',
        'Health', 'Business', 'Politics', 'Animals', 'Auto', 'Art',
      ];
      const matchedCats = CATEGORIES.filter(cat => cat.toLowerCase().includes(term));
      matchedCats.slice(0, 3).forEach(cat => {
        searchResults.unshift({
          id: `cat-${cat}`,
          type: 'category',
          title: cat,
          subtitle: 'Browse category',
          thumbnail: null,
          avatar: null,
          category: cat,
          channelId: null,
          videoId: null,
        });
      });

      setResults(searchResults);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Search error:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceTimer.current = setTimeout(() => {
      doSearch(query);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query, doSearch]);

  return { results, isLoading };
};
