import { describe,it,expect,vi,afterEach } from 'vitest';
import { createRealtimeBatch } from './realtimeBatch';
afterEach(()=>vi.useRealTimers());
describe('realtime batching',()=>{
  it('keeps all table invalidations without starving a busy stream',()=>{
    vi.useFakeTimers(); const invalidate=vi.fn(); const batch=createRealtimeBatch(invalidate);
    batch.add(['video']); vi.advanceTimersByTime(200); batch.add(['channel','video']);
    vi.advanceTimersByTime(50);
    expect(invalidate.mock.calls.flat()).toEqual(['video','channel']);
  });
  it('cancels queued work on last unsubscribe',()=>{
    vi.useFakeTimers(); const invalidate=vi.fn(); const batch=createRealtimeBatch(invalidate);
    batch.add(['video']); batch.dispose(); vi.runAllTimers(); expect(invalidate).not.toHaveBeenCalled();
  });
});
