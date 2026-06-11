import { COLS } from './state';

const STEPS_PER_BEAT = 2;

export function createTransport(initialBpm: number) {
  let bpm = initialBpm;
  let playing = false;
  let startTime = 0;

  const msPerStep = () => 60000 / bpm / STEPS_PER_BEAT;

  return {
    get playing() {
      return playing;
    },
    get bpm() {
      return bpm;
    },
    /** Fractional column position in [0, COLS). */
    position(now: number): number {
      return ((now - startTime) / msPerStep()) % COLS;
    },
    start(now: number) {
      playing = true;
      startTime = now;
    },
    stop() {
      playing = false;
    },
    /** Rebases the clock so the playhead doesn't jump on live tempo changes. */
    setBpm(next: number, now: number) {
      if (playing) {
        const pos = this.position(now);
        bpm = next;
        startTime = now - pos * msPerStep();
      } else {
        bpm = next;
      }
    },
  };
}

export type Transport = ReturnType<typeof createTransport>;
