/**
 * Lightweight client-side helper for the security_audit_log table.
 *
 * Calls the SECURITY DEFINER `log_security_event` RPC, which whitelists
 * the allowed event types server-side. Fire-and-forget — never throws,
 * never blocks the caller, never affects existing flows.
 *
 * This module is OPTIONAL: existing chat / pages code does not need to
 * import it. It is provided so admin tooling and any new code can record
 * events. Failures are swallowed so audit logging can never break a
 * user-facing action.
 */
import { supabase } from '@/integrations/supabase/client';

export type SecurityAuditEvent =
  | 'chat_media_upload'
  | 'chat_media_download'
  | 'page_contact_view';

export async function logSecurityEvent(
  eventType: SecurityAuditEvent,
  resourceType: string,
  resourceId?: string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    await supabase.rpc('log_security_event', {
      _event_type: eventType,
      _resource_type: resourceType,
      _resource_id: resourceId ?? null,
      _metadata: metadata as never,
    });
  } catch {
    // intentionally swallowed — audit logging must never break UX
  }
}
