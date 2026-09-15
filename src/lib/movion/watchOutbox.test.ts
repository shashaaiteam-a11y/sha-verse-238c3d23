import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: mocks.auth }, rpc: mocks.rpc } }));
import { retryWatchReports, sendWatchReport, WatchReport } from './watchOutbox';
const report = (userId: string, total=5): WatchReport => ({ userId, total, position: total, content: total, sessionKey:'session-key', videoId:'video-id' });
const login = (id: string) => mocks.auth.mockResolvedValue({ data: { session: { user: { id } } } });
afterEach(() => { sessionStorage.clear(); vi.restoreAllMocks(); mocks.auth.mockReset(); mocks.rpc.mockReset(); });
describe('watch report outbox', () => {
  it('persists failed reports and retries the identical cumulative total', async () => {
    login('retry-user'); mocks.rpc.mockResolvedValueOnce({ error: new Error('offline') });
    await expect(sendWatchReport(report('retry-user'))).rejects.toThrow('offline');
    expect(sessionStorage.getItem('movion:watch-outbox:retry-user')).toContain('session-key');
    mocks.rpc.mockResolvedValue({ data: { accepted_seconds: 5 } });
    await retryWatchReports('retry-user');
    expect(mocks.rpc.mock.calls.map(call => call[1]._total_seconds)).toEqual([5,5]);
    expect(sessionStorage.getItem('movion:watch-outbox:retry-user')).toBeNull();
  });
  it('never replays one account’s reports as another account', async () => {
    login('different-user');
    await expect(sendWatchReport(report('original-user'))).rejects.toThrow('account changed');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('does not discard a newer queued total when an older response arrives', async () => {
    login('concurrent-user'); let first!: (value: unknown) => void; let second!: (value: unknown) => void;
    mocks.rpc.mockImplementationOnce(() => new Promise(resolve => { first=resolve; }))
      .mockImplementationOnce(() => new Promise(resolve => { second=resolve; }));
    const old=sendWatchReport(report('concurrent-user',5));
    await Promise.resolve();
    const current=sendWatchReport(report('concurrent-user',8));
    await Promise.resolve();
    first({ data: { accepted_seconds:5 } }); await old;
    expect(JSON.parse(sessionStorage.getItem('movion:watch-outbox:concurrent-user')!)[0].total).toBe(8);
    second({ data: { accepted_seconds:8 } }); await current;
    expect(sessionStorage.getItem('movion:watch-outbox:concurrent-user')).toBeNull();
  });
  it('retains an in-memory retry when browser storage is unavailable', async () => {
    login('storage-user'); vi.spyOn(Storage.prototype,'setItem').mockImplementation(() => { throw new Error('disabled'); });
    mocks.rpc.mockResolvedValueOnce({ error:new Error('offline') }).mockResolvedValue({ data:{accepted_seconds:5} });
    await expect(sendWatchReport(report('storage-user'))).rejects.toThrow('offline');
    await retryWatchReports('storage-user');
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });
});
