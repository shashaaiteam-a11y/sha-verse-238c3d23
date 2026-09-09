// send-push — delivers an in-app notification row to the user's devices via FCM HTTP v1.
//
// Invoked automatically by the `trigger_dispatch_push_notification` trigger on
// public.notifications (pg_net). Also safe to call manually with { notification_id }.
//
// Credentials never leave the server: the Firebase service account JSON lives in
// the FIREBASE_SERVICE_ACCOUNT_JSON secret and is exchanged for a short-lived
// OAuth access token here.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
  token_uri?: string;
}

// ---------------------------------------------------------------- oauth token
let cachedToken: { token: string; expiresAt: number } | null = null;

const b64url = (input: Uint8Array | string): string => {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const importPrivateKey = async (pem: string): Promise<CryptoKey> => {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const raw = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    'pkcs8',
    raw.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
};

const getAccessToken = async (sa: ServiceAccount): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.token;

  const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token';
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: FCM_SCOPE,
      aud: tokenUri,
      iat: now,
      exp: now + 3600,
    }),
  );
  const key = await importPrivateKey(sa.private_key);
  const signature = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claim}`)),
  );
  const assertion = `${header}.${claim}.${b64url(signature)}`;

  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const bodyText = await res.text();
  if (!res.ok) throw new Error(`Google token exchange failed [${res.status}]: ${bodyText}`);
  const json = JSON.parse(bodyText) as { access_token: string; expires_in: number };
  cachedToken = { token: json.access_token, expiresAt: now + (json.expires_in ?? 3600) };
  return json.access_token;
};

// ------------------------------------------------------------- deep link path
const pathForNotification = (type: string, data: Record<string, unknown> | null): string => {
  const d = data ?? {};
  if (d.conversation_id) return `/messages?c=${d.conversation_id}`;
  if (d.group_post_id) return `/group-post/${d.group_post_id}`;
  if (d.post_id) return `/post/${d.post_id}`;
  if (d.video_id) return `/video/${d.video_id}`;
  if (d.book_id) return `/bookshelf/book/${d.book_id}`;
  if (d.group_id) return `/groups/${d.group_id}`;
  if (d.channel_id) return `/channel/${d.channel_id}`;
  if (type === 'friend_request' || type === 'friend_accepted') return '/friends';
  if (d.user_id) return `/profile/${d.user_id}`;
  return '/notifications';
};

// A 400 from FCM is NOT automatically a dead token — only drop it when the
// error explicitly blames the registration token.
const tokenIsDead = (status: number, body: string): boolean => {
  if (status === 404) return true;
  if (status !== 400) return false;
  const lower = body.toLowerCase();
  return lower.includes('registration token') || lower.includes('not a valid fcm');
};

const sendWithRetry = async (
  url: string,
  init: RequestInit,
): Promise<{ status: number; body: string }> => {
  let last = { status: 0, body: '' };
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, init);
    const body = await res.text();
    last = { status: res.status, body };
    if (res.ok) return last;
    // Retry only transient failures with exponential backoff.
    if (res.status !== 429 && res.status < 500) return last;
    await new Promise((r) => setTimeout(r, 400 * Math.pow(2, attempt)));
  }
  return last;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (!raw) return json({ error: 'FIREBASE_SERVICE_ACCOUNT_JSON is not configured' }, 500);
    const sa = JSON.parse(raw) as ServiceAccount;

    let body: { notification_id?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }
    const notificationId = body?.notification_id;
    if (typeof notificationId !== 'string' || !/^[0-9a-f-]{36}$/i.test(notificationId)) {
      return json({ error: 'notification_id must be a uuid' }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );

    const { data: notification, error: nErr } = await admin
      .from('notifications')
      .select('id, user_id, type, title, body, data')
      .eq('id', notificationId)
      .maybeSingle();
    if (nErr) return json({ error: nErr.message }, 500);
    if (!notification) return json({ error: 'Notification not found' }, 404);

    // Per-user preference: in-app notifications stay untouched, this only gates devices.
    const { data: settings } = await admin
      .from('user_settings')
      .select('push_enabled')
      .eq('user_id', notification.user_id)
      .maybeSingle();
    if (settings && settings.push_enabled === false) {
      return json({ skipped: 'push disabled by user' });
    }

    const { data: tokens } = await admin
      .from('push_tokens')
      .select('token, platform, device_id')
      .eq('user_id', notification.user_id)
      .eq('enabled', true);

    if (!tokens?.length) return json({ skipped: 'no devices registered' });

    const accessToken = await getAccessToken(sa);
    const endpoint = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
    const path = pathForNotification(notification.type, notification.data as Record<string, unknown>);

    const results: Array<{ token: string; status: string }> = [];

    for (const t of tokens) {
      // Idempotency: claim (notification_id, token) first — a duplicate dispatch
      // loses the race here and never sends a second push.
      const { error: claimErr } = await admin.from('push_delivery_log').insert({
        notification_id: notification.id,
        user_id: notification.user_id,
        token: t.token,
        device_id: t.device_id,
        status: 'skipped',
      });
      if (claimErr) {
        results.push({ token: t.token.slice(-8), status: 'duplicate' });
        continue;
      }

      const message = {
        message: {
          token: t.token,
          notification: {
            title: notification.title,
            body: notification.body ?? '',
          },
          data: { path, notification_id: notification.id, type: notification.type ?? '' },
          android: {
            priority: 'HIGH',
            notification: { channel_id: 'sha_verse_default', default_sound: true },
          },
          webpush: {
            fcm_options: { link: path },
          },
        },
      };

      const { status, body: resBody } = await sendWithRetry(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (status >= 200 && status < 300) {
        await admin
          .from('push_delivery_log')
          .update({ status: 'delivered' })
          .eq('notification_id', notification.id)
          .eq('token', t.token);
        results.push({ token: t.token.slice(-8), status: 'delivered' });
        continue;
      }

      console.error(`FCM send failed [${status}]: ${resBody}`);
      await admin
        .from('push_delivery_log')
        .update({ status: 'failed', error_code: String(status), error_detail: resBody.slice(0, 500) })
        .eq('notification_id', notification.id)
        .eq('token', t.token);

      if (tokenIsDead(status, resBody)) {
        await admin.from('push_tokens').delete().eq('token', t.token);
        results.push({ token: t.token.slice(-8), status: 'unregistered-removed' });
      } else {
        results.push({ token: t.token.slice(-8), status: `failed-${status}` });
      }
    }

    return json({ notification_id: notification.id, results });
  } catch (err) {
    console.error('send-push crashed:', err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
