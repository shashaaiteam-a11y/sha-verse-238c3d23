import { supabase } from '@/integrations/supabase/client';

export interface WatchReport {
  userId: string; videoId: string; sessionKey: string;
  total: number; position: number; content: number;
}
const fallback = new Map<string, WatchReport[]>();
const storageKey = (userId: string) => `movion:watch-outbox:${userId}`;
function read(userId: string): WatchReport[] {
  try {
    const stored = sessionStorage.getItem(storageKey(userId));
    if (stored === null) return fallback.get(userId) || [];
    const rows = JSON.parse(stored);
    if (!Array.isArray(rows)) return [];
    return rows.filter(r => r.userId === userId && typeof r.videoId === 'string' && typeof r.sessionKey === 'string'
      && Number.isFinite(r.total) && r.total >= 0 && Number.isFinite(r.content) && Number.isFinite(r.position));
  } catch { return fallback.get(userId) || []; }
}
function write(userId: string, reports: WatchReport[]) {
  fallback.set(userId, reports);
  try {
    if (reports.length) sessionStorage.setItem(storageKey(userId), JSON.stringify(reports));
    else sessionStorage.removeItem(storageKey(userId));
  } catch { /* Storage may be disabled; retain the in-memory retry queue. */ }
}

export async function sendWatchReport(report: WatchReport): Promise<number> {
  const reports = read(report.userId);
  const previous = reports.find(r => r.sessionKey === report.sessionKey && r.videoId === report.videoId);
  if (previous && (previous.total > report.total || (previous.total === report.total && previous.content > report.content))) report = previous;
  write(report.userId, [...reports.filter(r => r.sessionKey !== report.sessionKey || r.videoId !== report.videoId), report]);
  // Persistence happens before the first await, including a pagehide flush.
  const { data: auth } = await supabase.auth.getSession();
  if (auth.session?.user.id !== report.userId) throw new Error('Watch session account changed');
  const { data, error } = await supabase.rpc('record_watch_session', {
    _video_id: report.videoId, _session_key: report.sessionKey, _total_seconds: report.total,
    _position_seconds: report.position, _content_seconds: report.content, _viewer_id: report.userId,
  });
  if (error) throw error;
  const accepted = Number((data as { accepted_seconds: number }).accepted_seconds);
  if (!Number.isFinite(accepted)) throw new Error('Invalid watch acknowledgement');
  write(report.userId, read(report.userId).filter(r => r.sessionKey !== report.sessionKey || r.videoId !== report.videoId || r.total > accepted || r.content > report.content));
  return accepted;
}

const retrying = new Set<string>();
export async function retryWatchReports(userId: string) {
  if (retrying.has(userId)) return;
  retrying.add(userId);
  try {
    for (const report of read(userId)) {
      try { await sendWatchReport(report); } catch { break; }
    }
  } finally { retrying.delete(userId); }
}
