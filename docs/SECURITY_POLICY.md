# Security Policy (short reference)

This document describes two intentional security decisions in the codebase
that have been reviewed and confirmed. Anyone touching the related modules
should read this first.

## 1. Pages — phone & email are intentionally public

- **Where:** `public.pages` table, columns `phone`, `email`, `website`, address fields.
- **Behavior:** All authenticated users can read these columns. They are
  rendered on `src/pages/PageDetail.tsx` (mailto links, phone display).
- **Why this is correct:** Pages are Facebook-style **business pages**.
  Their entire purpose is to let a business publish public contact details
  (just like a Facebook business Page). The Page creator chooses whether to
  populate these fields; there is no expectation of privacy.
- **Audit trail:** When admin tooling reads a page's contact info on behalf
  of a user, call `logSecurityEvent('page_contact_view', 'page', pageId)`
  from `src/lib/security/auditLog.ts`. This writes to
  `public.security_audit_log` (admin-readable only).
- **Do NOT** move `phone`/`email` to a separate gated table — it would
  break the core Pages feature.

## 2. chat-media bucket — RLS, path ownership, MIME & extension limits

The `chat-media` Supabase Storage bucket is **public-read** so attachments
can be displayed inline in WhatsApp-style chat. Writes are tightly scoped.

### Path ownership (RLS, INSERT)

```sql
bucket_id = 'chat-media'
AND (auth.uid())::text = (storage.foldername(name))[1]
```

The first folder segment of the object key MUST equal the uploading
user's `auth.uid()`. Any attempt to write into another user's folder is
rejected. This is exercised by
`src/lib/security/__tests__/chatMediaPathOwnership.test.ts`.

### MIME type allow-list (bucket setting)

Only safe types are accepted:

- Images: `jpeg, png, gif, webp, heic, heif`
- Video:  `mp4, webm, quicktime`
- Audio:  `mpeg, mp4, webm, ogg, wav`
- Docs:   `pdf`

### File extension allow-list (trigger)

A `BEFORE INSERT/UPDATE` trigger on `storage.objects` (scoped to
`chat-media` only — never affects other buckets) rejects any object whose
filename does not end in one of:

```
jpg jpeg png gif webp heic heif mp4 webm mov mp3 m4a ogg wav oga pdf
```

### Size limit

- 50 MB per file (`file_size_limit = 52428800`).

### Audit trail (optional)

Client code that performs an upload/download can call:

```ts
import { logSecurityEvent } from '@/lib/security/auditLog';

logSecurityEvent('chat_media_upload',   'object', objectKey, { size });
logSecurityEvent('chat_media_download', 'object', objectKey);
```

These are fire-and-forget; failures never block UX. Existing chat code
has not been modified — adoption is opt-in per call site.

## 3. Audit log table

`public.security_audit_log`:

- Insert: any authenticated user, only for their own `user_id`, only the
  whitelisted event types (`log_security_event` RPC enforces this).
- Read: admins only (`public.is_admin(auth.uid())`).
- Indexed on `(user_id, created_at desc)` and `(event_type, created_at desc)`.

## 4. Stripe identifiers

`novachat_settings.stripe_customer_id` and `stripe_subscription_id` are
revoked from `authenticated` / `anon` at the column level. They are only
readable by `service_role` (used by the Stripe webhook edge function).
Owners can still read all other settings rows normally.

## 5. `public.media` — owner/admin only (verified 2026-08-03)

SELECT is restricted to `owner = auth.uid()` OR admin. Access is **not**
granted by bucket name: a public storage bucket does not make the media
row (owner id, storage path, metadata) public. The table is currently
empty and is not referenced by any client code.

## 6. Profile PII — column-level lockdown (verified 2026-08-03)

`profiles.phone`, `phone_number`, `birthdate`, `gender` and
`relationship_status` are REVOKEd from `anon` and `authenticated` at the
column level. RLS is row-level only, so the row-visibility policy alone
would have leaked these columns for public profiles. They are served
exclusively by `public.get_profile_private_fields(_profile_id)`, which
applies the owner / friends / privacy-setting rules.
`src/hooks/useProfile.ts` already selects an explicit non-sensitive
column list and merges the RPC result — never use `select('*')` on
`profiles`, it will fail with `42501`.

## 7. `has_role()` — not executable by `anon` (verified 2026-08-03)

Anonymous visitors must never evaluate `public.has_role`. Read policies
on `channels`, `books` and `videos` are therefore split by role:

- `TO anon` — approved/public content only, no admin branch.
- `TO authenticated` — approved content, own content, or admin.

EXECUTE on `has_role` is granted to `authenticated` and `service_role`
only. Do not add an admin branch to an `anon` policy; add a separate
`TO authenticated` policy instead.

## 8. chat-media path structure (verified 2026-08-03)

The INSERT policy assumes the object key is `<auth.uid()>/<filename>`.
Verified against live storage: 23/23 objects have a UUID first segment
matching the uploader. There is **no** conversation-id prefix. If the
upload path scheme ever changes, this policy must change with it.

