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
} from "./types";
import { DEFAULT_SETTINGS } from "./types";
import { emptyFile, importFile as importXlsx, uid } from "./excel";
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
          // 1. Hacer fetch del Excel precargado en public/
          const res = await fetch("/stock-lemcorp-inicial.xlsx");
          if (!res.ok) {
            // Si no está disponible, caer al seed demo.
            get().seedDemoIfEmpty();
            return;
          }
          const blob = await res.blob();
          const file = new File(
            [blob],
            "Stock HUB ALTAS - LIMA NORTE.xlsx",
            { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
          );
          // 2. Importar el Excel (importFile detecta tag + tagConfirmed)
          const fileId = await get().importFile(file);
          // 3. Asegurar que se vea como inventario
          get().setFileTag(fileId, "inventario");
          // 4. Crear un archivo de Despachos vacío (para que la automatización
          //    tenga dónde registrarse si el usuario agrega despachos).
          const s = get();
          s.createFile("Despachos del Día", "despachos");
          s.createFile("Equipos Averiados", "equipos");
          // 5. Generar el catálogo de productos automáticamente desde el Excel
          //    (sugiere los SKUs detectados y los añade todos con su cantidad).
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
          // 6. Vista inicial en Inventario (los datos del Excel ya están en el sistema).
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
        if (!persisted.seenNotificationKeys) persisted.seenNotificationKeys = [];
        return persisted;
      },
      version: 2,
    }
  )
);
