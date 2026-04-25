-- Add deactivation columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_deactivated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_is_deactivated ON public.profiles(is_deactivated) WHERE is_deactivated = true;

-- Add session token column for tracking current session per device
ALTER TABLE public.user_sessions
  ADD COLUMN IF NOT EXISTS session_token TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS os TEXT;

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);

-- Function to deactivate own account
CREATE OR REPLACE FUNCTION public.deactivate_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  UPDATE public.profiles
  SET is_deactivated = true,
      deactivated_at = now()
  WHERE id = auth.uid();
  
  -- Remove all active sessions for this user
  DELETE FROM public.user_sessions WHERE user_id = auth.uid();
END;
$$;

-- Function to upsert current session (called on login)
CREATE OR REPLACE FUNCTION public.upsert_current_session(
  p_session_token TEXT,
  p_browser TEXT DEFAULT NULL,
  p_os TEXT DEFAULT NULL,
  p_device_info TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Mark all other sessions as not current
  UPDATE public.user_sessions
  SET is_current = false
  WHERE user_id = auth.uid() AND session_token IS DISTINCT FROM p_session_token;
  
  -- Upsert this session
  INSERT INTO public.user_sessions (
    user_id, session_token, browser, os, device_info, user_agent, is_current, last_active
  ) VALUES (
    auth.uid(), p_session_token, p_browser, p_os, p_device_info, p_user_agent, true, now()
  )
  ON CONFLICT (session_token) DO UPDATE SET
    last_active = now(),
    is_current = true,
    browser = COALESCE(EXCLUDED.browser, user_sessions.browser),
    os = COALESCE(EXCLUDED.os, user_sessions.os),
    device_info = COALESCE(EXCLUDED.device_info, user_sessions.device_info),
    user_agent = COALESCE(EXCLUDED.user_agent, user_sessions.user_agent)
  RETURNING id INTO v_session_id;
  
  RETURN v_session_id;
END;
$$;

-- Add unique constraint for session_token (needed for ON CONFLICT)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_sessions_session_token_unique'
  ) THEN
    ALTER TABLE public.user_sessions ADD CONSTRAINT user_sessions_session_token_unique UNIQUE (session_token);
  END IF;
END $$;

-- Enable realtime on user_sessions
ALTER TABLE public.user_sessions REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;