CREATE OR REPLACE FUNCTION public.protect_channel_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.channel_metrics_trusted', true) = 'on'
     OR current_setting('role', true) = 'service_role'
     OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  NEW.subscribers_count := OLD.subscribers_count;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.subscribe_to_channel(target_channel_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO subscriptions (user_id, channel_id)
  VALUES (auth.uid(), target_channel_id)
  ON CONFLICT DO NOTHING;
  PERFORM set_config('app.channel_metrics_trusted', 'on', true);
  UPDATE channels
  SET subscribers_count = (SELECT COUNT(*) FROM subscriptions WHERE channel_id = target_channel_id)
  WHERE id = target_channel_id;
  PERFORM set_config('app.channel_metrics_trusted', 'off', true);
END; $function$;

CREATE OR REPLACE FUNCTION public.unsubscribe_from_channel(target_channel_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  DELETE FROM subscriptions
  WHERE user_id = auth.uid() AND channel_id = target_channel_id;
  PERFORM set_config('app.channel_metrics_trusted', 'on', true);
  UPDATE channels
  SET subscribers_count = (SELECT COUNT(*) FROM subscriptions WHERE channel_id = target_channel_id)
  WHERE id = target_channel_id;
  PERFORM set_config('app.channel_metrics_trusted', 'off', true);
END; $function$;

-- Reconcile existing (non-destructive) counts with real subscription rows
DO $$
BEGIN
  PERFORM set_config('app.channel_metrics_trusted', 'on', true);
  UPDATE public.channels c
  SET subscribers_count = COALESCE(s.cnt, 0)
  FROM (SELECT ch.id, (SELECT COUNT(*) FROM public.subscriptions su WHERE su.channel_id = ch.id) AS cnt FROM public.channels ch) s
  WHERE c.id = s.id AND COALESCE(c.subscribers_count,0) IS DISTINCT FROM COALESCE(s.cnt,0);
  PERFORM set_config('app.channel_metrics_trusted', 'off', true);
END $$;