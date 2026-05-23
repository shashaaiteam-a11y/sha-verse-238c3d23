-- 1) Drop overly-permissive policies on messages
DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can send broadcasts" ON public.messages;

-- 2) Drop public shared-read policy on ai_messages (use RPC instead)
DROP POLICY IF EXISTS "ai_messages_public_shared_read" ON public.ai_messages;

-- 3) Admin RPCs for channel approval/rejection
CREATE OR REPLACE FUNCTION public.admin_approve_channel(_channel_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.channels
  SET approval_status = 'approved',
      approved_at = now(),
      approved_by = auth.uid()
  WHERE id = _channel_id;

  INSERT INTO public.channel_approval_logs (channel_id, action, performed_by, notes)
  VALUES (_channel_id, 'approved', auth.uid(), 'Channel approved');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_channel(_channel_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.channels
  SET approval_status = 'rejected',
      rejection_reason = _reason
  WHERE id = _channel_id;

  INSERT INTO public.channel_approval_logs (channel_id, action, performed_by, notes)
  VALUES (_channel_id, 'rejected', auth.uid(), _reason);
END;
$$;