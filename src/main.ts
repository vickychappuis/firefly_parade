import './style.css';
import { createState } from './state';
import { createTransport } from './transport';
import { createScene } from './scene';
import { buildGrid } from './grid';
import { createAudio } from './audio';

const bg = document.querySelector<HTMLCanvasElement>('#bg')!;
const fx = document.querySelector<HTMLCanvasElement>('#fx')!;
const gridEl = document.querySelector<HTMLElement>('#grid')!;
const playBtn = document.querySelector<HTMLButtonElement>('#play')!;
const muteBtn = document.querySelector<HTMLButtonElement>('#mute')!;
const undoBtn = document.querySelector<HTMLButtonElement>('#undo')!;
const clearBtn = document.querySelector<HTMLButtonElement>('#clear')!;
const tempoInput = document.querySelector<HTMLInputElement>('#tempo')!;
const bpmLabel = document.querySelector<HTMLElement>('#bpm')!;
const toast = document.querySelector<HTMLElement>('#toast')!;

const state = createState();
const transport = createTransport(Number(tempoInput.value));
const scene = createScene(bg, fx, state);
const audio = createAudio();

buildGrid(gridEl, state, (col, row) => {
  scene.pulse(col, row, performance.now());
  audio.preview(row);
});

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__audioDebug = () => audio.debug();
}

muteBtn.addEventListener('click', () => {
  const next = !audio.muted;
  audio.setMuted(next);
  muteBtn.setAttribute('aria-label', next ? 'Unmute' : 'Mute');
  muteBtn.setAttribute('aria-pressed', String(next));
  muteBtn.classList.toggle('muted', next);
});

state.subscribe(() => {
  undoBtn.disabled = !state.canUndo();
});

function layout() {
  scene.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  const rect = gridEl.getBoundingClientRect();
  scene.setGeom({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
}
window.addEventListener('resize', layout);
layout();

function setPlaying(on: boolean) {
  if (on) {
    transport.start(performance.now());
    lastCol = -1;
    playBtn.textContent = '■';
    playBtn.setAttribute('aria-label', 'Stop');
  } else {
    transport.stop();
    playBtn.textContent = '▶';
    playBtn.setAttribute('aria-label', 'Play');
  }
}

playBtn.addEventListener('click', () => setPlaying(!transport.playing));

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return;
  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
  e.preventDefault();
  setPlaying(!transport.playing);
});

tempoInput.addEventListener('input', () => {
  transport.setBpm(Number(tempoInput.value), performance.now());
  bpmLabel.textContent = `${tempoInput.value} BPM`;
});

undoBtn.addEventListener('click', () => state.undo());

let toastTimer = 0;
function showToast(message: string) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2500);
}

clearBtn.addEventListener('click', () => {
  if (state.clear()) showToast('Cleared — Undo to restore');
});

let lastCol = -1;
function frame(now: number) {
  if (transport.playing) {
    const pos = transport.position(now);
    const col = Math.floor(pos);
    if (col !== lastCol) {
      lastCol = col;
      const rows = state.rowsActiveIn(col);
      scene.flashColumn(col, rows, now);
      for (const row of rows) audio.play(row);
    }
    scene.render(now, pos);
  } else {
    scene.render(now, null);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
