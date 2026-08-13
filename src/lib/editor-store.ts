// Estado de UI del editor (no persistente): celda activa, edición.
import { create } from "zustand";
import { coordToRef } from "./formulas";

export interface ActiveCell {
  row: number;
  col: number;
  ref: string;
}

interface EditorUI {
  active: ActiveCell | null;
  editing: boolean;
  editValue: string;
  editCell: { row: number; col: number } | null; // celda que se está editando
  setActive: (row: number, col: number) => void;
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
  setActive: (row, col) =>
    set({
      active: { row, col, ref: coordToRef(row, col) },
      editing: false,
      editValue: "",
      editCell: null,
    }),
  clearActive: () =>
    set({ active: null, editing: false, editValue: "", editCell: null }),
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
