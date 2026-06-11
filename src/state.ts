export const COLS = 16;
export const ROWS = 6;

export type CellKey = string;

export const cellKey = (col: number, row: number): CellKey => `${col},${row}`;

type Listener = () => void;

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const k of a) if (!b.has(k)) return false;
  return true;
}

export function createState() {
  let cells = new Set<CellKey>();
  const undoStack: Set<CellKey>[] = [];
  let gestureSnapshot: Set<CellKey> | null = null;
  const listeners: Listener[] = [];
  const emit = () => listeners.forEach((l) => l());

  return {
    subscribe(fn: Listener) {
      listeners.push(fn);
    },
    has(col: number, row: number): boolean {
      return cells.has(cellKey(col, row));
    },
    keys(): ReadonlySet<CellKey> {
      return cells;
    },
    isEmpty(): boolean {
      return cells.size === 0;
    },
    canUndo(): boolean {
      return undoStack.length > 0;
    },
    rowsActiveIn(col: number): number[] {
      const rows: number[] = [];
      for (let row = 0; row < ROWS; row++) {
        if (cells.has(cellKey(col, row))) rows.push(row);
      }
      return rows;
    },
    beginGesture() {
      gestureSnapshot = new Set(cells);
    },
    set(col: number, row: number, on: boolean) {
      const k = cellKey(col, row);
      if (on === cells.has(k)) return;
      if (on) cells.add(k);
      else cells.delete(k);
      emit();
    },
    endGesture() {
      if (gestureSnapshot && !setsEqual(gestureSnapshot, cells)) {
        undoStack.push(gestureSnapshot);
      }
      gestureSnapshot = null;
      emit();
    },
    clear(): boolean {
      if (cells.size === 0) return false;
      undoStack.push(new Set(cells));
      cells = new Set();
      emit();
      return true;
    },
    undo(): boolean {
      const snapshot = undoStack.pop();
      if (!snapshot) return false;
      cells = snapshot;
      emit();
      return true;
    },
  };
}

export type State = ReturnType<typeof createState>;
