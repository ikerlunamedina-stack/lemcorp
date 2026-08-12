// Store central de LEMCORP Gestor de Excel
// Persistencia en localStorage. Maneja archivos, historial por archivo (undo/redo)
// y la automatización Despachos -> Inventario (ledger separado del undo).

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SheetFile, FileTag, HistorySnapshot, ActiveView } from "./types";
import { emptyFile, importFile as importXlsx, uid } from "./excel";
import { detectTag, getHeaderColumns } from "./detection";
import {
  runAutomation,
  findInventarioFile,
  type AppliedMap,
} from "./automation";

const HISTORY_LIMIT = 50;

interface StoreState {
  files: SheetFile[];
  activeFileId: string | null;
  activeView: ActiveView;
  histories: Record<string, HistorySnapshot[]>;
  redoes: Record<string, HistorySnapshot[]>;
  appliedMap: AppliedMap; // ledger de automatización (persiste, no entra en undo)
  hydrated: boolean;

  // getters
  getActiveFile: () => SheetFile | null;

  // navegación
  setActiveView: (v: ActiveView) => void;
  openFile: (id: string) => void;

  // archivos
  createFile: (name?: string, preset?: FileTag) => string;
  importFile: (file: File) => Promise<string>;
  deleteFile: (id: string) => void;
  renameFile: (id: string, name: string) => void;
  duplicateFile: (id: string) => void;
  setFileTag: (id: string, tag: FileTag) => void;

  // edición de celdas
  setCell: (fileId: string, row: number, col: number, value: string) => void;
  setCells: (fileId: string, updates: { row: number; col: number; value: string }[]) => void;
  addRow: (fileId: string, at?: number) => void;
  addColumn: (fileId: string) => void;
  deleteRow: (fileId: string, row: number) => void;
  deleteColumn: (fileId: string, col: number) => void;

  // historial
  undo: (fileId: string) => void;
  redo: (fileId: string) => void;
  canUndo: (fileId: string) => boolean;
  canRedo: (fileId: string) => boolean;
  snapshot: (fileId: string, label: string) => void;

  // util
  exportFile: (id: string) => void;
  recalcAutomation: () => void;
  setHydrated: () => void;
  seedDemoIfEmpty: () => void;
}

function snapshotOf(file: SheetFile): HistorySnapshot {
  return {
    cells: { ...file.cells },
    rowCount: file.rowCount,
    colCount: file.colCount,
    label: "",
    ts: Date.now(),
  };
}

function autoDetectPresetColumns(tag: FileTag): { headers: string[]; sample?: string[][] } {
  switch (tag) {
    case "inventario":
      return {
        headers: ["SKU", "Producto", "Cantidad", "Stock mínimo", "Ubicación"],
        sample: [
          ["RT-001", "Router TP-Link WR840N", "120", "20", "Estante A1"],
          ["ONT-002", "ONT Huawei HG8245", "45", "10", "Estante A2"],
          ["CAB-003", "Cable UTP Cat6 (m)", "500", "100", "Rollo B1"],
        ],
      };
    case "despachos":
      return {
        headers: ["Fecha", "Cliente", "Técnico", "Producto", "Cantidad", "Guía"],
        sample: [
          ["2025-01-15", " Corporación ABC", "J. Pérez", "Router TP-Link WR840N", "5", "G001"],
        ],
      };
    case "equipos":
      return {
        headers: ["Serie", "Modelo", "Estado", "Ubicación", "Observación"],
        sample: [
          ["SN10001", "Router", "Averiado", "Taller", "No enciende"],
          ["SN10002", "ONT", "En retiro", "Almacén", "Cliente devolvió"],
        ],
      };
    default:
      return { headers: ["Columna A", "Columna B", "Columna C"] };
  }
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      files: [],
      activeFileId: null,
      activeView: "resumen",
      histories: {},
      redoes: {},
      appliedMap: {},
      hydrated: false,

      getActiveFile: () => {
        const { files, activeFileId } = get();
        return files.find((f) => f.id === activeFileId) ?? null;
      },

      setActiveView: (v) => set({ activeView: v }),

      openFile: (id) =>
        set({ activeFileId: id, activeView: "editor" }),

      createFile: (name, preset) => {
        const tag: FileTag = preset ?? "otro";
        const { headers, sample } = autoDetectPresetColumns(tag);
        const f = emptyFile(name || "Nuevo archivo", Math.max(30, (sample?.length ?? 0) + 5), headers.length);
        f.tag = tag;
        f.tagConfirmed = preset !== undefined;
        // escribir encabezados en fila 0
        headers.forEach((h, c) => {
          f.cells[`0,${c}`] = h;
        });
        if (sample) {
          sample.forEach((row, r) => {
            row.forEach((v, c) => {
              f.cells[`${r + 1},${c}`] = v;
            });
          });
        }
        const files = [...get().files, f];
        set({ files, activeFileId: f.id, activeView: "editor" });
        return f.id;
      },

      importFile: async (file) => {
        const f = await importXlsx(file);
        const detected = detectTag(f);
        f.tag = detected;
        f.tagConfirmed = detected !== "otro"; // si detectamos, lo confirmamos automáticamente
        const files = [...get().files, f];
        set({ files });
        return f.id;
      },

      deleteFile: (id) => {
        const files = get().files.filter((f) => f.id !== id);
        const histories = { ...get().histories };
        const redoes = { ...get().redoes };
        delete histories[id];
        delete redoes[id];
        const appliedMap = { ...get().appliedMap };
        delete appliedMap[id];
        let activeFileId = get().activeFileId;
        let activeView = get().activeView;
        if (activeFileId === id) {
          activeFileId = files[0]?.id ?? null;
          activeView = activeFileId ? "editor" : "resumen";
        }
        set({ files, histories, redoes, appliedMap, activeFileId, activeView });
      },

      renameFile: (id, name) => {
        const files = get().files.map((f) =>
          f.id === id ? { ...f, name, updatedAt: Date.now() } : f
        );
        set({ files });
      },

      duplicateFile: (id) => {
        const src = get().files.find((f) => f.id === id);
        if (!src) return;
        const copy: SheetFile = {
          ...src,
          id: uid(),
          name: src.name + " (copia)",
          cells: { ...src.cells },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        const files = [...get().files, copy];
        set({ files, activeFileId: copy.id, activeView: "editor" });
      },

      setFileTag: (id, tag) => {
        const files = get().files.map((f) =>
          f.id === id ? { ...f, tag, tagConfirmed: true, updatedAt: Date.now() } : f
        );
        set({ files });
        // recalcular automatización por si cambió
        get().recalcAutomation();
      },

      snapshot: (fileId, label) => {
        const f = get().files.find((x) => x.id === fileId);
        if (!f) return;
        const snap = snapshotOf(f);
        snap.label = label;
        const h = { ...get().histories };
        h[fileId] = [...(h[fileId] ?? []), snap].slice(-HISTORY_LIMIT);
        const r = { ...get().redoes };
        r[fileId] = [];
        set({ histories: h, redoes: r });
      },

      setCell: (fileId, row, col, value) => {
        const files = get().files.map((f) => {
          if (f.id !== fileId) return f;
          return f; // handled below
        });
        const target = get().files.find((f) => f.id === fileId);
        if (!target) return;
        get().snapshot(fileId, "Editar celda");
        const newCells = { ...target.cells };
        const key = `${row},${col}`;
        if (value === "") delete newCells[key];
        else newCells[key] = value;
        const updated: SheetFile = {
          ...target,
          cells: newCells,
          updatedAt: Date.now(),
        };
        let nextFiles = get().files.map((f) => (f.id === fileId ? updated : f));
        set({ files: nextFiles });
        // automatización si es despachos
        if (updated.tag === "despachos") {
          const inv = findInventarioFile(get().files);
          const { inventario } = runAutomation(updated, inv, get().appliedMap);
          if (inventario) {
            nextFiles = get().files.map((f) =>
              f.id === inventario.id ? inventario : f
            );
            set({
              files: nextFiles,
              appliedMap: { ...get().appliedMap },
            });
          }
        }
      },

      setCells: (fileId, updates) => {
        const target = get().files.find((f) => f.id === fileId);
        if (!target) return;
        get().snapshot(fileId, "Edición múltiple");
        const newCells = { ...target.cells };
        for (const u of updates) {
          const key = `${u.row},${u.col}`;
          if (u.value === "") delete newCells[key];
          else newCells[key] = u.value;
        }
        const updated: SheetFile = {
          ...target,
          cells: newCells,
          updatedAt: Date.now(),
        };
        let nextFiles = get().files.map((f) => (f.id === fileId ? updated : f));
        set({ files: nextFiles });
        if (updated.tag === "despachos") {
          const inv = findInventarioFile(get().files);
          const { inventario } = runAutomation(updated, inv, get().appliedMap);
          if (inventario) {
            nextFiles = get().files.map((f) =>
              f.id === inventario.id ? inventario : f
            );
            set({
              files: nextFiles,
              appliedMap: { ...get().appliedMap },
            });
          }
        }
      },

      addRow: (fileId, at) => {
        const target = get().files.find((f) => f.id === fileId);
        if (!target) return;
        get().snapshot(fileId, "Agregar fila");
        const insertAt = at ?? target.rowCount;
        const newCells: Record<string, string> = {};
        // desplazar filas hacia abajo si insertamos en medio
        if (insertAt < target.rowCount) {
          for (let r = target.rowCount - 1; r >= insertAt; r--) {
            for (let c = 0; c < target.colCount; c++) {
              const v = target.cells[`${r},${c}`];
              if (v !== undefined) newCells[`${r + 1},${c}`] = v;
            }
          }
          for (let r = 0; r < insertAt; r++) {
            for (let c = 0; c < target.colCount; c++) {
              const v = target.cells[`${r},${c}`];
              if (v !== undefined) newCells[`${r},${c}`] = v;
            }
          }
        } else {
          Object.assign(newCells, target.cells);
        }
        const updated: SheetFile = {
          ...target,
          cells: newCells,
          rowCount: target.rowCount + 1,
          updatedAt: Date.now(),
        };
        const files = get().files.map((f) => (f.id === fileId ? updated : f));
        set({ files });
        if (updated.tag === "despachos") {
          const inv = findInventarioFile(get().files);
          const { inventario } = runAutomation(updated, inv, get().appliedMap);
          if (inventario) {
            set({
              files: get().files.map((f) =>
                f.id === inventario.id ? inventario : f
              ),
              appliedMap: { ...get().appliedMap },
            });
          }
        }
      },

      addColumn: (fileId) => {
        const target = get().files.find((f) => f.id === fileId);
        if (!target) return;
        get().snapshot(fileId, "Agregar columna");
        const updated: SheetFile = {
          ...target,
          colCount: target.colCount + 1,
          updatedAt: Date.now(),
        };
        set({ files: get().files.map((f) => (f.id === fileId ? updated : f)) });
      },

      deleteRow: (fileId, row) => {
        const target = get().files.find((f) => f.id === fileId);
        if (!target) return;
        if (target.rowCount <= 1) return;
        get().snapshot(fileId, "Eliminar fila");
        const newCells: Record<string, string> = {};
        for (let r = 0; r < target.rowCount; r++) {
          for (let c = 0; c < target.colCount; c++) {
            const v = target.cells[`${r},${c}`];
            if (v === undefined) continue;
            if (r === row) continue;
            const nr = r > row ? r - 1 : r;
            newCells[`${nr},${c}`] = v;
          }
        }
        const updated: SheetFile = {
          ...target,
          cells: newCells,
          rowCount: target.rowCount - 1,
          updatedAt: Date.now(),
        };
        set({ files: get().files.map((f) => (f.id === fileId ? updated : f)) });
        if (updated.tag === "despachos") {
          const inv = findInventarioFile(get().files);
          const { inventario } = runAutomation(updated, inv, get().appliedMap);
          if (inventario) {
            set({
              files: get().files.map((f) =>
                f.id === inventario.id ? inventario : f
              ),
              appliedMap: { ...get().appliedMap },
            });
          }
        }
      },

      deleteColumn: (fileId, col) => {
        const target = get().files.find((f) => f.id === fileId);
        if (!target) return;
        if (target.colCount <= 1) return;
        get().snapshot(fileId, "Eliminar columna");
        const newCells: Record<string, string> = {};
        for (let r = 0; r < target.rowCount; r++) {
          for (let c = 0; c < target.colCount; c++) {
            const v = target.cells[`${r},${c}`];
            if (v === undefined) continue;
            if (c === col) continue;
            const nc = c > col ? c - 1 : c;
            newCells[`${r},${nc}`] = v;
          }
        }
        const updated: SheetFile = {
          ...target,
          cells: newCells,
          colCount: target.colCount - 1,
          updatedAt: Date.now(),
        };
        set({ files: get().files.map((f) => (f.id === fileId ? updated : f)) });
      },

      undo: (fileId) => {
        const h = get().histories[fileId] ?? [];
        if (h.length === 0) return;
        const snap = h[h.length - 1];
        const target = get().files.find((f) => f.id === fileId);
        if (!target) return;
        // guardar estado actual en redo
        const r = { ...get().redoes };
        r[fileId] = [...(r[fileId] ?? []), snapshotOf(target)].slice(-HISTORY_LIMIT);
        const restored: SheetFile = {
          ...target,
          cells: { ...snap.cells },
          rowCount: snap.rowCount,
          colCount: snap.colCount,
          updatedAt: Date.now(),
        };
        const files = get().files.map((f) => (f.id === fileId ? restored : f));
        const histories = { ...get().histories };
        histories[fileId] = histories[fileId].slice(0, -1);
        set({ files, histories, redoes: r });
        // re-automatización
        if (restored.tag === "despachos") {
          const inv = findInventarioFile(get().files);
          const { inventario } = runAutomation(restored, inv, get().appliedMap);
          if (inventario) {
            set({
              files: get().files.map((f) =>
                f.id === inventario.id ? inventario : f
              ),
              appliedMap: { ...get().appliedMap },
            });
          }
        }
      },

      redo: (fileId) => {
        const r = get().redoes[fileId] ?? [];
        if (r.length === 0) return;
        const snap = r[r.length - 1];
        const target = get().files.find((f) => f.id === fileId);
        if (!target) return;
        get().snapshot(fileId, "Rehacer");
        const restored: SheetFile = {
          ...target,
          cells: { ...snap.cells },
          rowCount: snap.rowCount,
          colCount: snap.colCount,
          updatedAt: Date.now(),
        };
        const files = get().files.map((f) => (f.id === fileId ? restored : f));
        const redoes = { ...get().redoes };
        redoes[fileId] = redoes[fileId].slice(0, -1);
        set({ files, redoes });
        if (restored.tag === "despachos") {
          const inv = findInventarioFile(get().files);
          const { inventario } = runAutomation(restored, inv, get().appliedMap);
          if (inventario) {
            set({
              files: get().files.map((f) =>
                f.id === inventario.id ? inventario : f
              ),
              appliedMap: { ...get().appliedMap },
            });
          }
        }
      },

      canUndo: (fileId) => (get().histories[fileId] ?? []).length > 0,
      canRedo: (fileId) => (get().redoes[fileId] ?? []).length > 0,

      exportFile: (id) => {
        const f = get().files.find((x) => x.id === id);
        if (!f) return;
        import("@/lib/excel").then(({ exportFile: exp }) => exp(f));
      },

      recalcAutomation: () => {
        const { files, appliedMap } = get();
        const inv = findInventarioFile(files);
        if (!inv) return;
        let currentInv = inv;
        const newApplied = { ...appliedMap };
        let modified = false;
        for (const f of files) {
          if (f.tag !== "despachos") continue;
          const { inventario, result } = runAutomation(f, currentInv, newApplied);
          if (inventario && result.modified) {
            currentInv = inventario;
            modified = true;
          }
        }
        if (modified) {
          set({
            files: files.map((f) => (f.id === currentInv.id ? currentInv : f)),
            appliedMap: newApplied,
          });
        }
      },

      setHydrated: () => set({ hydrated: true }),

      seedDemoIfEmpty: () => {
        const { files } = get();
        if (files.length > 0) return;
        const s = get();
        const invId = s.createFile("Inventario Total", "inventario");
        const despId = s.createFile("Despachos del Día", "despachos");
        const eqId = s.createFile("Equipos Averiados", "equipos");
        // Forzar vista inicial en resumen y ejecutar automatización inicial
        set({ activeFileId: null, activeView: "resumen", histories: {}, redoes: {} });
        // procesar despachos -> inventario con los datos demo
        get().recalcAutomation();
        void invId; void despId; void eqId;
      },
    }),
    {
      name: "lemcorp-excel-v1",
      partialize: (s) => ({
        files: s.files,
        appliedMap: s.appliedMap,
        activeView: s.activeView,
        activeFileId: s.activeFileId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
