DROP POLICY IF EXISTS "Realtime scoped subscribe" ON realtime.messages;
DROP POLICY IF EXISTS "Realtime scoped broadcast" ON realtime.messages;

CREATE POLICY "Realtime scoped subscribe"
ON realtime.messages FOR SELECT TO authenticated
USING (
  (realtime.topic() ~~ ('user:' || (auth.uid())::text || '%'))
  OR (realtime.topic() ~~ 'conversation:%' AND is_conversation_member(auth.uid(), (NULLIF(split_part(realtime.topic(), ':', 2), ''))::uuid))
  OR (realtime.topic() ~~ 'group:%' AND is_group_member(auth.uid(), (NULLIF(split_part(realtime.topic(), ':', 2), ''))::uuid))
  OR (realtime.topic() = 'public:subscriptions')
);

CREATE POLICY "Realtime scoped broadcast"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  (realtime.topic() ~~ ('user:' || (auth.uid())::text || '%'))
  OR (realtime.topic() ~~ 'conversation:%' AND is_conversation_member(auth.uid(), (NULLIF(split_part(realtime.topic(), ':', 2), ''))::uuid))
  OR (realtime.topic() ~~ 'group:%' AND is_group_member(auth.uid(), (NULLIF(split_part(realtime.topic(), ':', 2), ''))::uuid))
  OR (realtime.topic() = 'public:subscriptions')
);