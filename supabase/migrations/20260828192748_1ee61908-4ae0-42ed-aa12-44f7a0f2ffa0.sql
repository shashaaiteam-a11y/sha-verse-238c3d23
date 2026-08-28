DROP POLICY IF EXISTS "Users can update own channel" ON public.channels;

CREATE POLICY "Users can update own channel"
ON public.channels
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      approval_status IS NOT DISTINCT FROM (SELECT c.approval_status FROM public.channels c WHERE c.id = channels.id)
      AND approved_at IS NOT DISTINCT FROM (SELECT c.approved_at FROM public.channels c WHERE c.id = channels.id)
      AND approved_by IS NOT DISTINCT FROM (SELECT c.approved_by FROM public.channels c WHERE c.id = channels.id)
      AND rejection_reason IS NOT DISTINCT FROM (SELECT c.rejection_reason FROM public.channels c WHERE c.id = channels.id)
    )
  )
);