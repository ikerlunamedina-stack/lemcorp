// Store central de LEMCORP Gestor de Excel
// Persistencia en localStorage. Maneja archivos, historial por archivo (undo/redo)
// y la automatización Despachos -> Inventario (ledger separado del undo).

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  SheetFile,
  FileTag,
  HistorySnapshot,
  ActiveView,
  Product,
  Mismatch,
  Settings,
  CellStyle,
} from "./types";
import { DEFAULT_SETTINGS } from "./types";
import { emptyFile, importFile as importXlsx, importSheet, importWorkbookMultiSheet, uid } from "./excel";
import * as XLSX from "xlsx";
import { detectTag, getHeaderColumns } from "./detection";
import {
  runAutomation,
  findInventarioFile,
  type AppliedMap,
} from "./automation";
import { validateFiles, suggestProducts } from "./validation";

const HISTORY_LIMIT = 50;

interface StoreState {
  files: SheetFile[];
  products: Product[]; // catálogo maestro de productos (SKU -> nombre + cantidad)
  settings: Settings;
  seenNotificationKeys: string[]; // claves de notificaciones ya vistas (para el badge)
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

  // productos (catálogo maestro)
  addProduct: (sku: string, name: string, quantity?: number) => string | null;
  updateProduct: (id: string, sku: string, name: string, quantity?: number) => void;
  deleteProduct: (id: string) => void;
  importProductsBulk: (items: { sku: string; name: string; quantity?: number }[]) => number;
  findProductBySku: (sku: string) => Product | null;

  // validación
  getMismatches: () => Mismatch[];
  getSuggestions: () => ReturnType<typeof suggestProducts>;

  // configuración
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  markNotificationsSeen: (keys: string[]) => void;
  clearAllData: () => void;

  // edición de celdas
  setCell: (fileId: string, row: number, col: number, value: string) => void;
  setCells: (fileId: string, updates: { row: number; col: number; value: string }[]) => void;
  addRow: (fileId: string, at?: number) => void;
  addColumn: (fileId: string) => void;
  deleteRow: (fileId: string, row: number) => void;
  deleteColumn: (fileId: string, col: number) => void;
  // rellenar serie: copia el valor de (row,col) hacia abajo hasta endRow
  fillSeries: (fileId: string, row: number, col: number, endRow: number) => void;
  // limpiar contenido de un rango
  clearRange: (fileId: string, r1: number, c1: number, r2: number, c2: number) => void;

  // formato de celdas (tipo Excel)
  setCellStyle: (fileId: string, cells: { row: number; col: number }[], style: Partial<CellStyle>) => void;
  clearCellStyle: (fileId: string, cells: { row: number; col: number }[]) => void;
  setColWidth: (fileId: string, col: number, width: number) => void;
  setRowHeight: (fileId: string, row: number, height: number) => void;

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
  seedFromUserExcel: () => Promise<void>;
}

function snapshotOf(file: SheetFile): HistorySnapshot {
  return {
    cells: { ...file.cells },
    rowCount: file.rowCount,
    colCount: file.colCount,
    colWidths: file.colWidths ? { ...file.colWidths } : undefined,
    rowHeights: file.rowHeights ? { ...file.rowHeights } : undefined,
    cellStyles: file.cellStyles ? { ...file.cellStyles } : undefined,
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
      products: [],
      settings: { ...DEFAULT_SETTINGS },
      seenNotificationKeys: [],
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
        f.tagConfirmed = detected !== "otro";
        // Si ya existe un archivo con el mismo nombre, lo reemplazamos (actualización)
        const existing = get().files.find(
          (x) => x.name.toLowerCase() === f.name.toLowerCase()
        );
        let files: SheetFile[];
        if (existing) {
          // mantener el id y tag confirmado del anterior si lo tenía
          f.id = existing.id;
          if (existing.tagConfirmed) {
            f.tag = existing.tag;
            f.tagConfirmed = true;
          }
          // limpiar ledger de automatización del anterior para que se recalcule
          const appliedMap = { ...get().appliedMap };
          delete appliedMap[existing.id];
          files = get().files.map((x) => (x.id === existing.id ? f : x));
          set({ files, appliedMap });
          // recalcular automatización con los nuevos datos
          setTimeout(() => get().recalcAutomation(), 0);
        } else {
          files = [...get().files, f];
          set({ files });
        }
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

      // ---------- Catálogo de productos ----------
      findProductBySku: (sku) => {
        const key = sku.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return get().products.find((p) => p.sku.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === key) ?? null;
      },

      addProduct: (sku, name, quantity) => {
        const skuTrim = sku.trim();
        const nameTrim = name.trim();
        if (!skuTrim || !nameTrim) return null;
        // SKU duplicado -> no agregar
        if (get().findProductBySku(skuTrim)) return null;
        const p: Product = {
          id: uid(),
          sku: skuTrim,
          name: nameTrim,
          quantity: typeof quantity === "number" && !isNaN(quantity) ? quantity : undefined,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set({ products: [...get().products, p] });
        return p.id;
      },

      updateProduct: (id, sku, name, quantity) => {
        const skuTrim = sku.trim();
        const nameTrim = name.trim();
        if (!skuTrim || !nameTrim) return;
        // si el SKU nuevo choca con otro producto distinto, no permitir
        const clash = get().findProductBySku(skuTrim);
        if (clash && clash.id !== id) return;
        set({
          products: get().products.map((p) =>
            p.id === id
              ? {
                  ...p,
                  sku: skuTrim,
                  name: nameTrim,
                  quantity: typeof quantity === "number" && !isNaN(quantity) ? quantity : undefined,
                  updatedAt: Date.now(),
                }
              : p
          ),
        });
      },

      deleteProduct: (id) => {
        set({ products: get().products.filter((p) => p.id !== id) });
      },

      importProductsBulk: (items) => {
        let added = 0;
        const current = [...get().products];
        for (const it of items) {
          const skuTrim = it.sku.trim();
          const nameTrim = it.name.trim();
          if (!skuTrim || !nameTrim) continue;
          const key = skuTrim.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          if (current.some((p) => p.sku.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === key)) continue;
          current.push({
            id: uid(),
            sku: skuTrim,
            name: nameTrim,
            quantity: typeof it.quantity === "number" && !isNaN(it.quantity) ? it.quantity : undefined,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          added++;
        }
        if (added > 0) set({ products: current });
        return added;
      },

      getMismatches: () => {
        if (!get().settings.skuDetection) return [];
        return validateFiles(get().files, get().products);
      },

      getSuggestions: () => {
        if (!get().settings.skuDetection) return [];
        return suggestProducts(get().files, get().products);
      },

      // ---------- Configuración ----------
      setSetting: (key, value) => {
        set({ settings: { ...get().settings, [key]: value } });
      },

      markNotificationsSeen: (keys) => {
        const set_ = new Set([...get().seenNotificationKeys, ...keys]);
        // mantener solo las claves que siguen siendo relevantes + un límite
        set({ seenNotificationKeys: Array.from(set_).slice(-500) });
      },

      clearAllData: () => {
        set({
          files: [],
          products: [],
          appliedMap: {},
          histories: {},
          redoes: {},
          seenNotificationKeys: [],
          activeFileId: null,
          activeView: "resumen",
        });
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
        if (updated.tag === "despachos" && get().settings.automation) {
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
        if (updated.tag === "despachos" && get().settings.automation) {
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
        if (updated.tag === "despachos" && get().settings.automation) {
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
        if (updated.tag === "despachos" && get().settings.automation) {
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

      fillSeries: (fileId, row, col, endRow) => {
        const target = get().files.find((f) => f.id === fileId);
        if (!target) return;
        if (endRow <= row) return;
        const source = target.cells[`${row},${col}`] ?? "";
        if (source === "") return;
        get().snapshot(fileId, "Rellenar serie");
        const newCells = { ...target.cells };
        // Si el origen es numérico, rellenar con incremento de 1.
        const numMatch = /^(-?\d+(?:\.\d+)?)$/.exec(source.trim().replace(",", "."));
        if (numMatch) {
          const start = parseFloat(numMatch[1]);
          let step = 1;
          // detectar paso si hay dos valores consecutivos ya en la columna
          const next = target.cells[`${row + 1},${col}`];
          if (next) {
            const nm = /^(-?\d+(?:\.\d+)?)$/.exec(next.trim().replace(",", "."));
            if (nm) step = parseFloat(nm[1]) - start;
          }
          for (let r = row + 1; r <= endRow; r++) {
            const v = start + step * (r - row);
            newCells[`${r},${col}`] = Number.isInteger(v) ? String(v) : String(v);
          }
        } else {
          // no numérico: copiar el valor
          for (let r = row + 1; r <= endRow; r++) {
            newCells[`${r},${col}`] = source;
          }
        }
        const updated: SheetFile = { ...target, cells: newCells, updatedAt: Date.now() };
        let nextFiles = get().files.map((f) => (f.id === fileId ? updated : f));
        set({ files: nextFiles });
        if (updated.tag === "despachos" && get().settings.automation) {
          const inv = findInventarioFile(get().files);
          const { inventario } = runAutomation(updated, inv, get().appliedMap);
          if (inventario) {
            nextFiles = get().files.map((f) =>
              f.id === inventario.id ? inventario : f
            );
            set({ files: nextFiles, appliedMap: { ...get().appliedMap } });
          }
        }
      },

      clearRange: (fileId, r1, c1, r2, c2) => {
        const target = get().files.find((f) => f.id === fileId);
        if (!target) return;
        get().snapshot(fileId, "Limpiar rango");
        const newCells = { ...target.cells };
        for (let r = r1; r <= r2; r++) {
          for (let c = c1; c <= c2; c++) {
            delete newCells[`${r},${c}`];
          }
        }
        const updated: SheetFile = { ...target, cells: newCells, updatedAt: Date.now() };
        let nextFiles = get().files.map((f) => (f.id === fileId ? updated : f));
        set({ files: nextFiles });
        if (updated.tag === "despachos" && get().settings.automation) {
          const inv = findInventarioFile(get().files);
          const { inventario } = runAutomation(updated, inv, get().appliedMap);
          if (inventario) {
            nextFiles = get().files.map((f) =>
              f.id === inventario.id ? inventario : f
            );
            set({ files: nextFiles, appliedMap: { ...get().appliedMap } });
          }
        }
      },

      // ---------- Formato de celdas (tipo Excel) ----------
      setCellStyle: (fileId, cells, style) => {
        const target = get().files.find((f) => f.id === fileId);
        if (!target) return;
        get().snapshot(fileId, "Aplicar formato");
        const newStyles: Record<string, CellStyle> = { ...(target.cellStyles ?? {}) };
        for (const { row, col } of cells) {
          const key = `${row},${col}`;
          const current = newStyles[key] ?? {};
          const merged: CellStyle = { ...current };
          (Object.keys(style) as (keyof CellStyle)[]).forEach((k) => {
            const v = style[k];
            if (v === undefined) {
              delete merged[k];
            } else {
              // toggle para bold/italic: si ya está true y viene true, quítalo
              if (k === "bold" || k === "italic") {
                merged[k] = !current[k];
              } else {
                (merged as Record<string, unknown>)[k] = v;
              }
            }
          });
          const hasAny = (Object.keys(merged) as (keyof CellStyle)[]).some(
            (k) => merged[k] !== undefined && merged[k] !== false
          );
          if (hasAny) newStyles[key] = merged;
          else delete newStyles[key];
        }
        const updated: SheetFile = {
          ...target,
          cellStyles: newStyles,
          updatedAt: Date.now(),
        };
        set({ files: get().files.map((f) => (f.id === fileId ? updated : f)) });
      },

      clearCellStyle: (fileId, cells) => {
        const target = get().files.find((f) => f.id === fileId);
        if (!target) return;
        get().snapshot(fileId, "Quitar formato");
        const newStyles: Record<string, CellStyle> = { ...(target.cellStyles ?? {}) };
        for (const { row, col } of cells) {
          delete newStyles[`${row},${col}`];
        }
        const updated: SheetFile = {
          ...target,
          cellStyles: Object.keys(newStyles).length > 0 ? newStyles : undefined,
          updatedAt: Date.now(),
        };
        set({ files: get().files.map((f) => (f.id === fileId ? updated : f)) });
      },

      setColWidth: (fileId, col, width) => {
        const target = get().files.find((f) => f.id === fileId);
        if (!target) return;
        const w = Math.max(40, Math.min(600, Math.round(width)));
        const newWidths = { ...(target.colWidths ?? {}) };
        if (w === 120) delete newWidths[col];
        else newWidths[col] = w;
        const updated: SheetFile = {
          ...target,
          colWidths: Object.keys(newWidths).length > 0 ? newWidths : undefined,
          updatedAt: Date.now(),
        };
        set({ files: get().files.map((f) => (f.id === fileId ? updated : f)) });
      },

      setRowHeight: (fileId, row, height) => {
        const target = get().files.find((f) => f.id === fileId);
        if (!target) return;
        const h = Math.max(24, Math.min(200, Math.round(height)));
        const newHeights = { ...(target.rowHeights ?? {}) };
        if (h === 30) delete newHeights[row];
        else newHeights[row] = h;
        const updated: SheetFile = {
          ...target,
          rowHeights: Object.keys(newHeights).length > 0 ? newHeights : undefined,
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
          colWidths: snap.colWidths ? { ...snap.colWidths } : undefined,
          rowHeights: snap.rowHeights ? { ...snap.rowHeights } : undefined,
          cellStyles: snap.cellStyles ? { ...snap.cellStyles } : undefined,
          updatedAt: Date.now(),
        };
        const files = get().files.map((f) => (f.id === fileId ? restored : f));
        const histories = { ...get().histories };
        histories[fileId] = histories[fileId].slice(0, -1);
        set({ files, histories, redoes: r });
        // re-automatización
        if (restored.tag === "despachos" && get().settings.automation) {
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
          colWidths: snap.colWidths ? { ...snap.colWidths } : undefined,
          rowHeights: snap.rowHeights ? { ...snap.rowHeights } : undefined,
          cellStyles: snap.cellStyles ? { ...snap.cellStyles } : undefined,
          updatedAt: Date.now(),
        };
        const files = get().files.map((f) => (f.id === fileId ? restored : f));
        const redoes = { ...get().redoes };
        redoes[fileId] = redoes[fileId].slice(0, -1);
        set({ files, redoes });
        if (restored.tag === "despachos" && get().settings.automation) {
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
        const { files, appliedMap, settings } = get();
        if (!settings.automation) return;
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
        const { files, products } = get();
        if (files.length > 0) return;
        const s = get();
        const invId = s.createFile("Inventario Total", "inventario");
        const despId = s.createFile("Despachos del Día", "despachos");
        const eqId = s.createFile("Equipos Averiados", "equipos");
        // Forzar vista inicial en inventario y ejecutar automatización inicial
        set({ activeFileId: null, activeView: "inventario", histories: {}, redoes: {} });
        // procesar despachos -> inventario con los datos demo
        get().recalcAutomation();
        // sembrar catálogo maestro de productos (solo si está vacío)
        if (products.length === 0) {
          const demo: { sku: string; name: string; quantity?: number }[] = [
            { sku: "RT-001", name: "Router TP-Link WR840N", quantity: 120 },
            { sku: "ONT-002", name: "ONT Huawei HG8245", quantity: 45 },
            { sku: "CAB-003", name: "Cable UTP Cat6 (m)", quantity: 500 },
          ];
          get().importProductsBulk(demo);
        }
        void invId; void despId; void eqId;
      },

      seedFromUserExcel: async () => {
        // Si ya hay archivos, no hacer nada (usuario ya tiene datos).
        if (get().files.length > 0) return;
        try {
          // 1. Fetch del Excel oficial de LEMCORP (Control_Stock_Lemcorp.xlsx)
          //    que tiene múltiples hojas: Stock, Pegar Despachos, Equipos, etc.
          const res = await fetch("/stock-lemcorp-inicial.xlsx");
          if (!res.ok) {
            get().seedDemoIfEmpty();
            return;
          }
          const buf = await res.arrayBuffer();
          const wb = XLSX.read(buf, { type: "array", cellFormula: true });
          // 2. Importar como UN archivo multi-hoja (preserva pestañas + fórmulas)
          const multiSheet = importWorkbookMultiSheet(wb, "Control de Stock LEMCORP");
          if (multiSheet) {
            set({ files: [...get().files, multiSheet] });
          } else {
            get().seedDemoIfEmpty();
            return;
          }
          // 3. Generar catálogo de productos automáticamente desde el stock
          const suggestions = get().getSuggestions();
          if (suggestions.length > 0) {
            get().importProductsBulk(
              suggestions.map((sg) => ({
                sku: sg.sku,
                name: sg.name,
                quantity: sg.quantity,
              }))
            );
          }
          // 4. Ejecutar la automatización Despachos -> Inventario.
          get().recalcAutomation();
          // 5. Vista inicial en Inventario.
          set({ activeFileId: null, activeView: "inventario", histories: {}, redoes: {} });
        } catch (err) {
          console.error("No se pudo cargar el Excel inicial:", err);
          get().seedDemoIfEmpty();
        }
      },
    }),
    {
      name: "lemcorp-excel-v1",
      partialize: (s) => ({
        files: s.files,
        products: s.products,
        settings: s.settings,
        appliedMap: s.appliedMap,
        seenNotificationKeys: s.seenNotificationKeys,
        activeView: s.activeView,
        activeFileId: s.activeFileId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
      migrate: (persisted: any) => {
        if (!persisted) return persisted;
        if (!persisted.products) persisted.products = [];
        // v1 -> v2: product.category deja de existir, product.quantity aparece
        persisted.products = persisted.products.map((p: any) => {
          const { category, ...rest } = p;
          void category;
          return { ...rest, quantity: rest.quantity };
        });
        if (!persisted.settings) persisted.settings = { ...DEFAULT_SETTINGS };
        // v2 -> v3: añadir highlightDuplicates + campos de formato en archivos
        if (persisted.settings.highlightDuplicates === undefined) {
          persisted.settings.highlightDuplicates = false;
        }
        if (Array.isArray(persisted.files)) {
          persisted.files = persisted.files.map((f: any) => ({
            ...f,
            colWidths: f.colWidths ?? undefined,
            rowHeights: f.rowHeights ?? undefined,
            cellStyles: f.cellStyles ?? undefined,
          }));
        }
        if (!persisted.seenNotificationKeys) persisted.seenNotificationKeys = [];
        return persisted;
      },
      version: 3,
    }
  )
);
