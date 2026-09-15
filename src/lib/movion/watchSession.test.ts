import { describe, it, expect, vi } from 'vitest';
import { WatchSession } from './watchSession';
const media = (currentTime: number, extra = {}) => ({ currentTime, paused: false, seeking: false, playbackRate: 1, ...extra });

describe('watch accounting', () => {
  it('preserves fractions until a whole second is watched', async () => {
    const session = new WatchSession('video','viewer');
    const send = vi.fn(async total => total);
    session.sample(media(0),true,0);
    session.sample(media(.6),true,600);
    await session.flush(send);
    session.sample(media(1.2),true,1200);
    await session.flush(send);
    expect(send.mock.calls.map(args => args[0])).toEqual([0,1]);
    expect(session.seconds).toBeCloseTo(1.2);
  });
  it('ignores seeks, pauses, hidden playback and suspended timers', () => {
    const s = new WatchSession('v','u');
    s.sample(media(0),true,0);
    s.sample(media(1),true,1000);
    s.sample(media(60, { seeking: true }),true,1200);
    s.sample(media(61),true,2200);
    s.sample(media(62,{ paused: true }),true,3200);
    s.sample(media(63),false,4200);
    s.sample(media(64),true,5200);
    s.sample(media(100),true,41200);
    expect(s.seconds).toBe(1);
  });
  it('counts wall time at 2x playback and rejects unreported seeks', () => {
    const s = new WatchSession('v','u');
    s.sample(media(0,{playbackRate:2}),true,0);
    s.sample(media(2,{playbackRate:2}),true,1000);
    s.sample(media(80),true,1100);
    expect(s.seconds).toBe(1);
    expect(s.contentSeconds).toBe(2);
  });
  it('retries the same total after an ambiguous network failure', async () => {
    const s = new WatchSession('v','u'); s.seconds=12;
    const send = vi.fn().mockRejectedValueOnce(new Error('lost response')).mockResolvedValue(12);
    await expect(s.flush(send)).rejects.toThrow('lost response');
    await s.flush(send); await s.flush(send);
    expect(send.mock.calls.map(args => args[0])).toEqual([12,12]);
  });
  it('drains playback accumulated while a request was in flight', async () => {
    const s = new WatchSession('old-video','u'); s.seconds=5;
    let resolve!: (value:number)=>void;
    const send=vi.fn().mockImplementationOnce(()=>new Promise<number>(r=>{resolve=r;})).mockResolvedValue(7);
    const pending=s.flush(send); s.seconds=7;
    expect(s.flush(send)).toBe(pending);
    resolve(5); await pending;
    expect(send.mock.calls.map(args=>args[0])).toEqual([5,7]);
    expect(s.videoId).toBe('old-video');
  });
  it('stops draining when the server has not accepted more elapsed time', async () => {
    const s = new WatchSession('v','u'); s.seconds=100;
    const send=vi.fn().mockResolvedValue(2);
    await s.flush(send);
    expect(send).toHaveBeenCalledTimes(2);
    expect(s.acknowledged).toBe(2);
  });
});
