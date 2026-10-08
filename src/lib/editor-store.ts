// Estado de UI del editor (no persistente): celda activa, edición, selección de rango.
import { create } from "zustand";
import { coordToRef } from "./formulas";

export interface ActiveCell {
  row: number;
  col: number;
  ref: string;
}

export interface RangeSelection {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

interface EditorUI {
  active: ActiveCell | null;
  editing: boolean;
  editValue: string;
  editCell: { row: number; col: number } | null; // celda que se está editando
  range: RangeSelection | null; // selección de rango actual (para formato/copiar)
  selecting: boolean; // arrastrando para seleccionar
  setActive: (row: number, col: number) => void;
  setRange: (range: RangeSelection | null) => void;
  startRange: (row: number, col: number) => void;
  extendRange: (row: number, col: number) => void;
  endRange: () => void;
  clearActive: () => void;
  startEdit: (value?: string) => void;
  setEditValue: (v: string) => void;
  commitEdit: () => void;
  cancelEdit: () => void;
}

export const useEditorUI = create<EditorUI>((set, get) => ({
  active: null,
  editing: false,
  editValue: "",
  editCell: null,
  range: null,
  selecting: false,
  setActive: (row, col) =>
    set({
      active: { row, col, ref: coordToRef(row, col) },
      editing: false,
      editValue: "",
      editCell: null,
      range: { startRow: row, startCol: col, endRow: row, endCol: col },
    }),
  setRange: (range) => set({ range }),
  startRange: (row, col) =>
    set({
      active: { row, col, ref: coordToRef(row, col) },
      range: { startRow: row, startCol: col, endRow: row, endCol: col },
      selecting: true,
    }),
  extendRange: (row, col) => {
    const s = get();
    if (!s.selecting || !s.range) return;
    set({
      range: {
        ...s.range,
        endRow: row,
        endCol: col,
      },
    });
  },
  endRange: () => set({ selecting: false }),
  clearActive: () =>
    set({ active: null, editing: false, editValue: "", editCell: null, range: null }),
  startEdit: (value) =>
    set((s) => ({
      editing: true,
      editValue: value !== undefined ? value : "",
      editCell: s.active ? { row: s.active.row, col: s.active.col } : null,
    })),
  setEditValue: (v) => set({ editValue: v }),
  commitEdit: () => set({ editing: false, editCell: null }),
  cancelEdit: () => set({ editing: false, editValue: "", editCell: null }),
}));

// Helper: ¿está una celda dentro del rango seleccionado?
export function isInRange(
  row: number,
  col: number,
  range: RangeSelection | null
): boolean {
  if (!range) return false;
  const r1 = Math.min(range.startRow, range.endRow);
  const r2 = Math.max(range.startRow, range.endRow);
  const c1 = Math.min(range.startCol, range.endCol);
  const c2 = Math.max(range.startCol, range.endCol);
  return row >= r1 && row <= r2 && col >= c1 && col <= c2;
}

// Devuelve todas las celdas de un rango como lista {row, col}.
export function rangeCells(range: RangeSelection): { row: number; col: number }[] {
  const r1 = Math.min(range.startRow, range.endRow);
  const r2 = Math.max(range.startRow, range.endRow);
  const c1 = Math.min(range.startCol, range.endCol);
  const c2 = Math.max(range.startCol, range.endCol);
  const out: { row: number; col: number }[] = [];
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      out.push({ row: r, col: c });
    }
  }
  return out;
}
