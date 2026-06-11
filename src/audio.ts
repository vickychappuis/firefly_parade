import { ROWS } from './state';

/**
 * A small original synth voice: triangle fundamental + quiet sine an octave up,
 * a few cents of random detune, soft lowpass, fast attack and a long
 * exponential decay — a glassy "glow" that suits silent fireflies.
 *
 * Rows map to an A-major-ish pentatonic so any pattern sounds consonant;
 * row 0 is the top of the grid and the top of the scale.
 */
const ROW_FREQS: number[] = [880, 783.99, 659.26, 587.33, 523.25, 440];

const NOTE_DURATION = 1.1;

export function createAudio() {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let muted = false;
  let notesPlayed = 0;

  function ensureContext(): AudioContext | null {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }

  // Browsers only allow audio after a user gesture; arm the context on the
  // first one so rAF-driven playback notes can sound.
  const unlock = () => ensureContext();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  function noteOn(row: number, velocity: number) {
    const audio = ensureContext();
    if (!audio || !master || muted) return;
    const freq = ROW_FREQS[Math.max(0, Math.min(ROWS - 1, row))];
    const now = audio.currentTime;

    const envelope = audio.createGain();
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(velocity, now + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + NOTE_DURATION);

    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2400;
    filter.Q.value = 0.6;

    const detune = (Math.random() - 0.5) * 6;

    const fundamental = audio.createOscillator();
    fundamental.type = 'triangle';
    fundamental.frequency.value = freq;
    fundamental.detune.value = detune;

    const shimmer = audio.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.value = freq * 2;
    shimmer.detune.value = -detune;
    const shimmerGain = audio.createGain();
    shimmerGain.gain.value = 0.18;

    fundamental.connect(filter);
    shimmer.connect(shimmerGain).connect(filter);
    filter.connect(envelope).connect(master);

    fundamental.start(now);
    shimmer.start(now);
    fundamental.stop(now + NOTE_DURATION + 0.05);
    shimmer.stop(now + NOTE_DURATION + 0.05);
    notesPlayed++;
  }

  return {
    /** Full-strength note when the playhead crosses an active cell. */
    play(row: number) {
      noteOn(row, 0.28);
    },
    /** Quieter acknowledgment when a cell is painted. */
    preview(row: number) {
      noteOn(row, 0.12);
    },
    get muted() {
      return muted;
    },
    setMuted(next: boolean) {
      muted = next;
      if (master && ctx) {
        // Short ramp avoids a click when cutting active tails.
        master.gain.setTargetAtTime(next ? 0 : 1, ctx.currentTime, 0.02);
      }
    },
    debug() {
      return { state: ctx?.state ?? 'none', notesPlayed };
    },
  };
}

export type Audio = ReturnType<typeof createAudio>;
