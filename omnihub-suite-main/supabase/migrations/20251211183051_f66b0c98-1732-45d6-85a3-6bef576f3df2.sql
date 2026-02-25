-- Create page role enum
CREATE TYPE public.page_role AS ENUM ('admin', 'editor', 'moderator', 'advertiser', 'analyst');

-- Create page_roles table for managing page team members
CREATE TABLE public.page_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role page_role NOT NULL DEFAULT 'editor',
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(page_id, user_id)
);

-- Create page_posts table for content posted by pages
CREATE TABLE public.page_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  posted_by UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  image_url TEXT,
  media_urls TEXT[] DEFAULT '{}',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_published BOOLEAN DEFAULT true,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  reach_count INTEGER DEFAULT 0,
  engagement_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create page_insights table for analytics
CREATE TABLE public.page_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  page_views INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  engagement INTEGER DEFAULT 0,
  new_followers INTEGER DEFAULT 0,
  unfollowers INTEGER DEFAULT 0,
  post_impressions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(page_id, date)
);

-- Create page_blocked_users table
CREATE TABLE public.page_blocked_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_by UUID REFERENCES public.profiles(id),
  reason TEXT,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(page_id, user_id)
);

-- Add more fields to pages table
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS hours TEXT;
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.page_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_blocked_users ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user has page role
CREATE OR REPLACE FUNCTION public.has_page_role(_user_id uuid, _page_id uuid, _roles page_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.page_roles
    WHERE user_id = _user_id
      AND page_id = _page_id
      AND role = ANY(_roles)
  ) OR EXISTS (
    SELECT 1
    FROM public.pages
    WHERE id = _page_id
      AND created_by = _user_id
  )
$$;

-- Helper function to check if user is page admin
CREATE OR REPLACE FUNCTION public.is_page_admin(_user_id uuid, _page_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.page_roles
    WHERE user_id = _user_id
      AND page_id = _page_id
      AND role = 'admin'
  ) OR EXISTS (
    SELECT 1
    FROM public.pages
    WHERE id = _page_id
      AND created_by = _user_id
  )
$$;

-- RLS Policies for page_roles
CREATE POLICY "Page roles viewable by page team" ON public.page_roles
  FOR SELECT USING (
    has_page_role(auth.uid(), page_id, ARRAY['admin', 'editor', 'moderator', 'advertiser', 'analyst']::page_role[])
  );

CREATE POLICY "Only admins can manage page roles" ON public.page_roles
  FOR ALL USING (is_page_admin(auth.uid(), page_id));

-- RLS Policies for page_posts
CREATE POLICY "Page posts viewable by everyone" ON public.page_posts
  FOR SELECT USING (is_published = true OR has_page_role(auth.uid(), page_id, ARRAY['admin', 'editor']::page_role[]));

CREATE POLICY "Page team can create posts" ON public.page_posts
  FOR INSERT WITH CHECK (
    has_page_role(auth.uid(), page_id, ARRAY['admin', 'editor']::page_role[])
  );

CREATE POLICY "Page team can update posts" ON public.page_posts
  FOR UPDATE USING (
    has_page_role(auth.uid(), page_id, ARRAY['admin', 'editor']::page_role[])
  );

CREATE POLICY "Only admins can delete posts" ON public.page_posts
  FOR DELETE USING (is_page_admin(auth.uid(), page_id));

-- RLS Policies for page_insights
CREATE POLICY "Page insights viewable by analysts and above" ON public.page_insights
  FOR SELECT USING (
    has_page_role(auth.uid(), page_id, ARRAY['admin', 'editor', 'analyst']::page_role[])
  );

-- RLS Policies for page_blocked_users
CREATE POLICY "Blocked users visible to moderators and above" ON public.page_blocked_users
  FOR SELECT USING (
    has_page_role(auth.uid(), page_id, ARRAY['admin', 'moderator']::page_role[])
  );

CREATE POLICY "Moderators can block users" ON public.page_blocked_users
  FOR INSERT WITH CHECK (
    has_page_role(auth.uid(), page_id, ARRAY['admin', 'moderator']::page_role[])
  );

CREATE POLICY "Only admins can unblock users" ON public.page_blocked_users
  FOR DELETE USING (is_page_admin(auth.uid(), page_id));

-- Enable realtime for page_posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.page_posts;