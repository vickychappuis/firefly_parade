import { COLS, ROWS, type State } from './state';

/**
 * Builds the DOM cell overlay and wires the paint/erase drag state machine.
 * Starting a drag on an occupied cell flips the whole gesture to erase
 * (borrowed from the Song Maker research); each gesture is one undo unit.
 */
export function buildGrid(
  container: HTMLElement,
  state: State,
  onPaint: (col: number, row: number) => void,
) {
  const cells = new Map<string, HTMLDivElement>();

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (col % 8 >= 4) cell.classList.add('band');
      cell.dataset.col = String(col);
      cell.dataset.row = String(row);
      cells.set(`${col},${row}`, cell);
      container.appendChild(cell);
    }
  }

  state.subscribe(() => {
    for (const [key, cell] of cells) {
      const [col, row] = key.split(',').map(Number);
      const active = state.has(col, row);
      cell.classList.toggle('active', active);
      if (active) cell.dataset.active = 'true';
      else delete cell.dataset.active;
    }
  });

  let mode: 'paint' | 'erase' | null = null;

  function cellFromPoint(x: number, y: number): HTMLElement | null {
    const el = document.elementFromPoint(x, y);
    return el instanceof HTMLElement ? el.closest<HTMLElement>('.cell') : null;
  }

  function apply(cell: HTMLElement) {
    const col = Number(cell.dataset.col);
    const row = Number(cell.dataset.row);
    state.set(col, row, mode === 'paint');
    if (mode === 'paint') onPaint(col, row);
  }

  container.addEventListener('pointerdown', (e) => {
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (!cell) return;
    try {
      container.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic events or already-released pointers can't be captured; the
      // drag still works for any pointer that remains active.
    }
    state.beginGesture();
    const col = Number(cell.dataset.col);
    const row = Number(cell.dataset.row);
    mode = state.has(col, row) ? 'erase' : 'paint';
    apply(cell);
  });

  container.addEventListener('pointermove', (e) => {
    if (!mode) return;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (cell) apply(cell);
  });

  const finish = () => {
    if (!mode) return;
    mode = null;
    state.endGesture();
  };
  container.addEventListener('pointerup', finish);
  container.addEventListener('pointercancel', finish);
}
