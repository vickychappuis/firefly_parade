import { COLS, ROWS, cellKey, type State } from './state';

export interface GridGeom {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Light temperature by height band, top row (0) coolest → bottom row warmest. */
const ROW_COLORS: [number, number, number][] = [
  [216, 240, 255], // moon-white
  [196, 238, 210],
  [206, 232, 156],
  [238, 220, 130],
  [255, 198, 113],
  [255, 174, 94], // grass amber
];

const FLASH_ATTACK = 150;
const FLASH_DECAY = 700;
const EMBER_INTENSITY = 0.15;

interface Firefly {
  col: number;
  row: number;
  p1: number;
  p2: number;
  p3: number;
  flashAt: number;
}

interface Ambient {
  fx: number; // fractional position of the viewport
  fy: number;
  p1: number;
  p2: number;
  p3: number;
}

export function createScene(bg: HTMLCanvasElement, fx: HTMLCanvasElement, state: State) {
  const bgCtx = bg.getContext('2d')!;
  const fxCtx = fx.getContext('2d')!;

  let width = 0;
  let height = 0;
  let geom: GridGeom = { x: 0, y: 0, w: 1, h: 1 };

  const fireflies = new Map<string, Firefly>();
  const ambients: Ambient[] = Array.from({ length: 10 }, () => ({
    fx: Math.random(),
    fy: Math.random() * 0.75,
    p1: Math.random() * Math.PI * 2,
    p2: Math.random() * Math.PI * 2,
    p3: Math.random() * Math.PI * 2,
  }));
  const stars = Array.from({ length: 140 }, () => ({
    fx: Math.random(),
    fy: Math.random() * 0.8,
    r: 0.4 + Math.random() * 1.1,
    a: 0.15 + Math.random() * 0.5,
  }));

  function resize(w: number, h: number, dpr: number) {
    width = w;
    height = h;
    for (const [canvas, ctx] of [
      [bg, bgCtx],
      [fx, fxCtx],
    ] as const) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    drawBackground();
  }

  function setGeom(next: GridGeom) {
    geom = next;
  }

  function drawBackground() {
    const sky = bgCtx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#10103a');
    sky.addColorStop(0.55, '#0a0a26');
    sky.addColorStop(1, '#04040f');
    bgCtx.fillStyle = sky;
    bgCtx.fillRect(0, 0, width, height);

    bgCtx.fillStyle = '#ffffff';
    for (const s of stars) {
      bgCtx.globalAlpha = s.a;
      bgCtx.beginPath();
      bgCtx.arc(s.fx * width, s.fy * height, s.r, 0, Math.PI * 2);
      bgCtx.fill();
    }
    bgCtx.globalAlpha = 1;

    // Far hill
    bgCtx.fillStyle = '#0e1830';
    bgCtx.beginPath();
    bgCtx.moveTo(0, height * 0.8);
    bgCtx.quadraticCurveTo(width * 0.35, height * 0.68, width, height * 0.84);
    bgCtx.lineTo(width, height);
    bgCtx.lineTo(0, height);
    bgCtx.closePath();
    bgCtx.fill();

    // Near hill
    bgCtx.fillStyle = '#070d1c';
    bgCtx.beginPath();
    bgCtx.moveTo(0, height * 0.9);
    bgCtx.quadraticCurveTo(width * 0.65, height * 0.78, width, height * 0.92);
    bgCtx.lineTo(width, height);
    bgCtx.lineTo(0, height);
    bgCtx.closePath();
    bgCtx.fill();
  }

  const cellW = () => geom.w / COLS;
  const cellH = () => geom.h / ROWS;

  function anchor(col: number, row: number): [number, number] {
    return [geom.x + (col + 0.5) * cellW(), geom.y + (row + 0.5) * cellH()];
  }

  function syncFireflies(now: number) {
    const keys = state.keys();
    for (const k of keys) {
      if (!fireflies.has(k)) {
        const [col, row] = k.split(',').map(Number);
        fireflies.set(k, {
          col,
          row,
          p1: Math.random() * Math.PI * 2,
          p2: Math.random() * Math.PI * 2,
          p3: Math.random() * Math.PI * 2,
          flashAt: now - FLASH_ATTACK - FLASH_DECAY,
        });
      }
    }
    for (const k of fireflies.keys()) {
      if (!keys.has(k)) fireflies.delete(k);
    }
  }

  function flashEnvelope(now: number, flashAt: number): number {
    const t = now - flashAt;
    if (t < 0) return 0;
    if (t < FLASH_ATTACK) return t / FLASH_ATTACK;
    return Math.max(0, 1 - (t - FLASH_ATTACK) / FLASH_DECAY);
  }

  /** Trigger flashes for every active cell in a column. */
  function flashColumn(col: number, rows: number[], now: number) {
    for (const row of rows) {
      const fly = fireflies.get(cellKey(col, row));
      if (fly) fly.flashAt = now;
    }
  }

  /** Small acknowledgment blink when a cell is painted. */
  function pulse(col: number, row: number, now: number) {
    const fly = fireflies.get(cellKey(col, row));
    if (fly && flashEnvelope(now, fly.flashAt) <= 0) {
      fly.flashAt = now - FLASH_ATTACK - FLASH_DECAY * 0.55;
    }
  }

  function drawGlow(x: number, y: number, radius: number, [r, g, b]: [number, number, number], alpha: number) {
    const grad = fxCtx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
    grad.addColorStop(0.4, `rgba(${r},${g},${b},${alpha * 0.35})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    fxCtx.fillStyle = grad;
    fxCtx.beginPath();
    fxCtx.arc(x, y, radius, 0, Math.PI * 2);
    fxCtx.fill();
  }

  function render(now: number, playhead: number | null) {
    syncFireflies(now);

    // Fade previous frame instead of clearing — leaves glow trails.
    fxCtx.globalCompositeOperation = 'destination-out';
    fxCtx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    fxCtx.fillRect(0, 0, width, height);
    fxCtx.globalCompositeOperation = 'lighter';

    // Playhead: soft moonbeam sweep.
    if (playhead !== null) {
      const x = geom.x + (playhead / COLS) * geom.w;
      const half = cellW() * 0.55;
      const beam = fxCtx.createLinearGradient(x - half, 0, x + half, 0);
      beam.addColorStop(0, 'rgba(170, 195, 255, 0)');
      beam.addColorStop(0.5, 'rgba(170, 195, 255, 0.07)');
      beam.addColorStop(1, 'rgba(170, 195, 255, 0)');
      fxCtx.fillStyle = beam;
      fxCtx.fillRect(x - half, geom.y, half * 2, geom.h);
      fxCtx.fillStyle = 'rgba(190, 210, 255, 0.16)';
      fxCtx.fillRect(x - 1, geom.y, 2, geom.h);
    }

    // Ambient background fireflies — faint blinks so the night feels alive.
    for (const a of ambients) {
      const x = a.fx * width + Math.sin(now * 0.00021 + a.p1) * width * 0.02;
      const y = a.fy * height + Math.sin(now * 0.00017 + a.p2) * height * 0.015;
      const blink = Math.pow((Math.sin(now * 0.0005 + a.p3) + 1) / 2, 8) * 0.3;
      if (blink > 0.01) drawGlow(x, y, 6, [207, 232, 160], blink);
    }

    // Cell fireflies: ember glow + flash envelope, wandering around their anchor.
    for (const fly of fireflies.values()) {
      const [ax, ay] = anchor(fly.col, fly.row);
      const wx =
        Math.sin(now * 0.00037 + fly.p1) * cellW() * 0.26 + Math.sin(now * 0.0011 + fly.p3) * cellW() * 0.07;
      const wy = Math.sin(now * 0.00043 + fly.p2) * cellH() * 0.26;
      const x = ax + wx;
      const y = ay + wy;
      const env = flashEnvelope(now, fly.flashAt);
      const intensity = EMBER_INTENSITY + env * (1 - EMBER_INTENSITY);
      const color = ROW_COLORS[fly.row];
      const radius = cellH() * 0.14 + env * cellH() * 0.55;
      drawGlow(x, y, Math.max(radius, 3), color, intensity);
      // Bright core
      fxCtx.fillStyle = `rgba(255, 255, 240, ${0.25 + env * 0.75})`;
      fxCtx.beginPath();
      fxCtx.arc(x, y, 1.2 + env * 1.6, 0, Math.PI * 2);
      fxCtx.fill();
    }

    fxCtx.globalCompositeOperation = 'source-over';
  }

  return { resize, setGeom, render, flashColumn, pulse };
}

export type Scene = ReturnType<typeof createScene>;
