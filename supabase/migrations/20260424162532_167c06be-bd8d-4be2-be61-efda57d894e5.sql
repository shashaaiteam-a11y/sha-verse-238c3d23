-- Calls module: 1-on-1 voice/video call history & metadata
CREATE TABLE IF NOT EXISTS public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL CHECK (call_type IN ('voice', 'video')),
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing','active','ended','missed','declined','failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  end_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calls_caller ON public.calls(caller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_receiver ON public.calls(receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_status ON public.calls(status);

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Participants can view their own calls
CREATE POLICY "Participants can view their calls"
ON public.calls FOR SELECT TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Caller can create call entries
CREATE POLICY "Caller can create calls"
ON public.calls FOR INSERT TO authenticated
WITH CHECK (auth.uid() = caller_id);

-- Either participant can update status (answer/decline/end)
CREATE POLICY "Participants can update their calls"
ON public.calls FOR UPDATE TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = receiver_id)
WITH CHECK (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Either participant can delete (clear history on their side via filter in app)
CREATE POLICY "Participants can delete their calls"
ON public.calls FOR DELETE TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Enable realtime for live status updates (call ringing -> answered -> ended)
ALTER TABLE public.calls REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;