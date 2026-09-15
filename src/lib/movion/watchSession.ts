export interface PlaybackSample {
  currentTime: number;
  paused: boolean;
  seeking: boolean;
  playbackRate: number;
}

/** Cumulative wall-clock watch time. Seeking and faster playback cannot mint time. */
export class WatchSession {
  readonly key = crypto.randomUUID();
  seconds = 0;
  contentSeconds = 0;
  position = 0;
  acknowledged = -1;
  private previous: { position: number; at: number } | null = null;
  private flight: Promise<void> | null = null;

  constructor(readonly videoId: string, readonly userId: string) {}

  sample(media: PlaybackSample, active: boolean, now = performance.now()) {
    if (!Number.isFinite(media.currentTime) || media.currentTime < 0) return;
    this.position = media.currentTime;
    if (!active || media.paused || media.seeking) { this.reset(); return; }
    const previous = this.previous;
    this.previous = { position: media.currentTime, at: now };
    if (!previous) return;
    const elapsed = (now - previous.at) / 1000;
    const played = media.currentTime - previous.position;
    const rate = media.playbackRate || 1;
    if (elapsed > 0 && elapsed <= 3 && played > 0 && played <= elapsed * rate + 0.5) {
      this.seconds += Math.min(elapsed, played / rate);
      this.contentSeconds += Math.min(played, elapsed * rate);
    }
  }

  reset() { this.previous = null; }

  /** Retry the same cumulative total after failure; a lost response cannot double-count it. */
  flush(send: (total: number, position: number, content: number) => Promise<number>): Promise<void> {
    if (this.flight) return this.flight;
    this.flight = (async () => {
      while (Math.floor(this.seconds) > this.acknowledged) {
        const total = Math.floor(this.seconds);
        const previous = this.acknowledged;
        const acknowledged = await send(total, Math.floor(this.position), Math.floor(this.contentSeconds));
        if (!Number.isFinite(acknowledged) || acknowledged < 0) throw new Error('Invalid watch acknowledgement');
        this.acknowledged = Math.max(previous, Math.min(total, acknowledged));
        if (this.acknowledged <= previous) break;
      }
    })().finally(() => { this.flight = null; });
    return this.flight;
  }
}
