
-- Add missing columns that code expects
ALTER TABLE public.ai_conversations ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Create missing tables
CREATE TABLE IF NOT EXISTS public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  is_deleted boolean DEFAULT false,
  reply_to uuid,
  media_url text,
  media_type text,
  reactions jsonb DEFAULT '{}',
  edited boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  profiles jsonb
);

CREATE TABLE IF NOT EXISTS public.group_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  reporter_id uuid NOT NULL,
  reported_user_id uuid,
  reported_post_id uuid,
  reason text NOT NULL,
  description text,
  status text DEFAULT 'pending',
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.group_user_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  warned_by uuid NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_user_warnings ENABLE ROW LEVEL SECURITY;

-- RLS policies for group_messages
CREATE POLICY "Group members can view messages" ON public.group_messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_messages.group_id AND gm.user_id = auth.uid()));

CREATE POLICY "Group members can insert messages" ON public.group_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_messages.group_id AND gm.user_id = auth.uid()));

-- RLS policies for group_reports
CREATE POLICY "Group members can create reports" ON public.group_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Group admins can view reports" ON public.group_reports
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_reports.group_id AND gm.user_id = auth.uid() AND gm.role IN ('admin', 'moderator')));

-- RLS policies for group_user_warnings
CREATE POLICY "Admins can manage warnings" ON public.group_user_warnings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_user_warnings.group_id AND gm.user_id = auth.uid() AND gm.role IN ('admin', 'moderator')));
