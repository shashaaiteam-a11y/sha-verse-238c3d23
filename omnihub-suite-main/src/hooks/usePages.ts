import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Page {
  id: string;
  name: string;
  slug: string | null;
  about: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  category: string | null;
  created_by: string | null;
  followers_count: number | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  hours: string | null;
  verified: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PageRole {
  id: string;
  page_id: string;
  user_id: string;
  role: 'admin' | 'editor' | 'moderator' | 'advertiser' | 'analyst';
  assigned_by: string | null;
  assigned_at: string | null;
  profile?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export interface PagePost {
  id: string;
  page_id: string;
  posted_by: string;
  content: string;
  image_url: string | null;
  media_urls: string[] | null;
  scheduled_at: string | null;
  published_at: string | null;
  is_published: boolean;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  reach_count: number;
  engagement_count: number;
  created_at: string;
  page?: Page;
  poster?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export interface PageInsight {
  id: string;
  page_id: string;
  date: string;
  page_views: number;
  reach: number;
  engagement: number;
  new_followers: number;
  unfollowers: number;
  post_impressions: number;
}

export const usePages = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all pages
  const { data: pages, isLoading: pagesLoading } = useQuery({
    queryKey: ['pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Page[];
    }
  });

  // Fetch pages owned/managed by current user
  const { data: myPages, isLoading: myPagesLoading } = useQuery({
    queryKey: ['my-pages', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Get pages created by user
      const { data: ownedPages, error: ownedError } = await supabase
        .from('pages')
        .select('*')
        .eq('created_by', user.id);
      
      if (ownedError) throw ownedError;
      
      // Get pages where user has a role
      const { data: rolePages, error: roleError } = await supabase
        .from('page_roles')
        .select('page_id, role, pages(*)')
        .eq('user_id', user.id);
      
      if (roleError) throw roleError;
      
      const allPages = [...(ownedPages || [])];
      rolePages?.forEach(rp => {
        if (rp.pages && !allPages.find(p => p.id === (rp.pages as any).id)) {
          allPages.push(rp.pages as any);
        }
      });
      
      return allPages as Page[];
    },
    enabled: !!user
  });

  // Fetch pages user follows
  const { data: followedPages, isLoading: followedLoading } = useQuery({
    queryKey: ['followed-pages', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('page_followers')
        .select('page_id, pages(*)')
        .eq('user_id', user.id);
      if (error) throw error;
      return data?.map(f => f.pages).filter(Boolean) as Page[];
    },
    enabled: !!user
  });

  // Create page mutation
  const createPage = useMutation({
    mutationFn: async (pageData: Partial<Page>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('pages')
        .insert({
          name: pageData.name || '',
          category: pageData.category,
          about: pageData.about,
          avatar_url: pageData.avatar_url,
          website: pageData.website,
          email: pageData.email,
          phone: pageData.phone,
          created_by: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      queryClient.invalidateQueries({ queryKey: ['my-pages'] });
      toast.success('Page created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create page');
      console.error(error);
    }
  });

  // Update page mutation
  const updatePage = useMutation({
    mutationFn: async ({ pageId, updates }: { pageId: string; updates: Partial<Page> }) => {
      const { data, error } = await supabase
        .from('pages')
        .update(updates)
        .eq('id', pageId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      queryClient.invalidateQueries({ queryKey: ['page', variables.pageId] });
      toast.success('Page updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update page');
      console.error(error);
    }
  });

  // Follow page mutation
  const followPage = useMutation({
    mutationFn: async (pageId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('page_followers')
        .insert({ page_id: pageId, user_id: user.id });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followed-pages'] });
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      toast.success('Now following this page!');
    }
  });

  // Unfollow page mutation
  const unfollowPage = useMutation({
    mutationFn: async (pageId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('page_followers')
        .delete()
        .eq('page_id', pageId)
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followed-pages'] });
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      toast.success('Unfollowed page');
    }
  });

  return {
    pages,
    pagesLoading,
    myPages,
    myPagesLoading,
    followedPages,
    followedLoading,
    createPage,
    updatePage,
    followPage,
    unfollowPage
  };
};

export const usePage = (pageId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch single page
  const { data: page, isLoading: pageLoading } = useQuery({
    queryKey: ['page', pageId],
    queryFn: async () => {
      if (!pageId) return null;
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('id', pageId)
        .single();
      if (error) throw error;
      return data as Page;
    },
    enabled: !!pageId
  });

  // Check if user is following this page
  const { data: isFollowing } = useQuery({
    queryKey: ['page-following', pageId, user?.id],
    queryFn: async () => {
      if (!pageId || !user) return false;
      const { data } = await supabase
        .from('page_followers')
        .select('id')
        .eq('page_id', pageId)
        .eq('user_id', user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!pageId && !!user
  });

  // Check user's role on this page
  const { data: userRole } = useQuery({
    queryKey: ['page-role', pageId, user?.id],
    queryFn: async () => {
      if (!pageId || !user) return null;
      
      // Check if user is creator (admin)
      if (page?.created_by === user.id) return 'admin';
      
      const { data } = await supabase
        .from('page_roles')
        .select('role')
        .eq('page_id', pageId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      return data?.role || null;
    },
    enabled: !!pageId && !!user && !!page
  });

  // Fetch page roles/team
  const { data: pageTeam, isLoading: teamLoading } = useQuery({
    queryKey: ['page-team', pageId],
    queryFn: async () => {
      if (!pageId) return [];
      const { data, error } = await supabase
        .from('page_roles')
        .select('*, profiles!page_roles_user_id_fkey(id, display_name, avatar_url)')
        .eq('page_id', pageId);
      if (error) throw error;
      return data?.map(d => ({
        ...d,
        profile: (d as any).profiles
      })) as PageRole[];
    },
    enabled: !!pageId && (userRole === 'admin' || userRole === 'editor')
  });

  // Fetch page posts
  const { data: pagePosts, isLoading: postsLoading } = useQuery({
    queryKey: ['page-posts', pageId],
    queryFn: async () => {
      if (!pageId) return [];
      const { data, error } = await supabase
        .from('page_posts')
        .select('*, poster:profiles(id, display_name, avatar_url)')
        .eq('page_id', pageId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PagePost[];
    },
    enabled: !!pageId
  });

  // Fetch page insights (last 30 days)
  const { data: pageInsights, isLoading: insightsLoading } = useQuery({
    queryKey: ['page-insights', pageId],
    queryFn: async () => {
      if (!pageId) return [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from('page_insights')
        .select('*')
        .eq('page_id', pageId)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: true });
      if (error) throw error;
      return data as PageInsight[];
    },
    enabled: !!pageId && (userRole === 'admin' || userRole === 'analyst')
  });

  // Add team member mutation
  const addTeamMember = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: PageRole['role'] }) => {
      if (!pageId || !user) throw new Error('Invalid request');
      
      const { error } = await supabase
        .from('page_roles')
        .insert({
          page_id: pageId,
          user_id: userId,
          role,
          assigned_by: user.id
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-team', pageId] });
      toast.success('Team member added!');
    },
    onError: (error) => {
      toast.error('Failed to add team member');
      console.error(error);
    }
  });

  // Remove team member mutation
  const removeTeamMember = useMutation({
    mutationFn: async (userId: string) => {
      if (!pageId) throw new Error('Invalid request');
      
      const { error } = await supabase
        .from('page_roles')
        .delete()
        .eq('page_id', pageId)
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-team', pageId] });
      toast.success('Team member removed');
    }
  });

  // Create page post mutation
  const createPost = useMutation({
    mutationFn: async (postData: { content: string; image_url?: string; scheduled_at?: string }) => {
      if (!pageId || !user) throw new Error('Invalid request');
      
      const { data, error } = await supabase
        .from('page_posts')
        .insert({
          page_id: pageId,
          posted_by: user.id,
          content: postData.content,
          image_url: postData.image_url,
          scheduled_at: postData.scheduled_at,
          is_published: !postData.scheduled_at,
          published_at: postData.scheduled_at ? null : new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-posts', pageId] });
      toast.success('Post published!');
    },
    onError: (error) => {
      toast.error('Failed to create post');
      console.error(error);
    }
  });

  // Delete page post mutation
  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('page_posts')
        .delete()
        .eq('id', postId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-posts', pageId] });
      toast.success('Post deleted');
    }
  });

  return {
    page,
    pageLoading,
    isFollowing,
    userRole,
    pageTeam,
    teamLoading,
    pagePosts,
    postsLoading,
    pageInsights,
    insightsLoading,
    addTeamMember,
    removeTeamMember,
    createPost,
    deletePost,
    isAdmin: userRole === 'admin',
    isEditor: userRole === 'admin' || userRole === 'editor',
    isModerator: userRole === 'admin' || userRole === 'moderator',
    canViewInsights: userRole === 'admin' || userRole === 'analyst'
  };
};
