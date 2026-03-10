
-- Add missing columns to group_messages
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text';

-- Create user_feedback table
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own feedback" ON public.user_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own feedback" ON public.user_feedback FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Create increment_member_warnings function
CREATE OR REPLACE FUNCTION public.increment_member_warnings(p_group_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Just a placeholder function
  RETURN;
END;
$$;
