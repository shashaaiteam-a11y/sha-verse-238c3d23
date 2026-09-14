DROP POLICY IF EXISTS conversation_members_insert ON public.conversation_members;

CREATE POLICY conversation_members_insert
ON public.conversation_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_members.conversation_id
      AND c.created_by = auth.uid()
  )
  AND (
    user_id = auth.uid()
    OR (
      NOT public.is_user_blocked(user_id, auth.uid())
      AND NOT public.is_user_blocked(auth.uid(), user_id)
      AND (
        public.are_friends(auth.uid(), user_id)
        OR EXISTS (
          SELECT 1 FROM public.conversations c2
          WHERE c2.id = conversation_members.conversation_id
            AND c2.requested_by = auth.uid()
            AND c2.request_status = 'pending'
        )
      )
    )
  )
);