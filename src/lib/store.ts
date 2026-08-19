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
  Despacho,
  Equipment,
  EstadoEquipo,
  Mismatch,
  Settings,
  CellStyle,
} from "./types";
import { DEFAULT_SETTINGS } from "./types";
import { emptyFile, importFile as importXlsx, importSheet, importWorkbookMultiSheet, uid } from "./excel";
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
  products: Product[];
  despachos: Despacho[];
  equipos: Equipment[];
  settings: Settings;
  seenNotificationKeys: string[];
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

  // productos (catálogo + stock)
  addProduct: (sku: string, name: string, quantity: number, minStock?: number, category?: string, udm?: string) => string | null;
  updateProduct: (id: string, data: Partial<Omit<Product, "id" | "createdAt">>) => void;
  deleteProduct: (id: string) => void;
  findProductBySku: (sku: string) => Product | null;

  // despachos
  addDespacho: (d: Omit<Despacho, "id" | "fecha">) => string | null;
  deleteDespacho: (id: string) => void;
  getDespachosDelDia: (fecha?: number) => Despacho[];

  // equipos (rastreo por número de serie)
  addEquipment: (e: Omit<Equipment, "id" | "createdAt" | "updatedAt">) => string | null;
  updateEquipment: (id: string, data: Partial<Omit<Equipment, "id" | "createdAt">>) => void;
  deleteEquipment: (id: string) => void;
  findEquipmentBySerie: (serie: string) => Equipment | null;

  // exportar inventario a Excel
  exportInventarioExcel: () => void;

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
      despachos: [],
      equipos: [],
      settings: { ...DEFAULT_SETTINGS },
      seenNotificationKeys: [],
      activeFileId: null,
      activeView: "dashboard",
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
        set({ activeFileId: id, activeView: "inventario" }),

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
        set({ files, activeFileId: f.id, activeView: "inventario" });
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
          activeView = activeFileId ? "inventario" : "dashboard";
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
        set({ files, activeFileId: copy.id, activeView: "inventario" });
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

      addProduct: (sku, name, quantity, minStock, category, udm) => {
        const skuTrim = sku.trim();
        const nameTrim = name.trim();
        if (!skuTrim || !nameTrim) return null;
        if (get().findProductBySku(skuTrim)) return null;
        const p: Product = {
          id: uid(),
          sku: skuTrim,
          name: nameTrim,
          quantity: quantity || 0,
          minStock: minStock,
          category: category?.trim() || undefined,
          udm: udm?.trim() || undefined,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set({ products: [...get().products, p] });
        return p.id;
      },

      updateProduct: (id, data) => {
        set({
          products: get().products.map((p) =>
            p.id === id ? { ...p, ...data, updatedAt: Date.now() } : p
          ),
        });
      },

      deleteProduct: (id) => {
        set({ products: get().products.filter((p) => p.id !== id) });
      },

      // ---------- Despachos ----------
      addDespacho: (d) => {
        const product = get().findProductBySku(d.sku);
        if (!product) return null;
        if (product.quantity < d.cantidad) return null; // no hay stock suficiente
        const desp: Despacho = {
          id: uid(),
          fecha: Date.now(),
          ...d,
        };
        // 1. Guardar el despacho en el historial
        set({ despachos: [desp, ...get().despachos] });
        // 2. Descontar del inventario
        set({
          products: get().products.map((p) =>
            p.id === product.id
              ? { ...p, quantity: p.quantity - d.cantidad, updatedAt: Date.now() }
              : p
          ),
        });
        return desp.id;
      },

      deleteDespacho: (id) => {
        // al eliminar un despacho, devolver el stock al producto
        const desp = get().despachos.find((d) => d.id === id);
        if (!desp) return;
        const product = get().findProductBySku(desp.sku);
        set({
          despachos: get().despachos.filter((d) => d.id !== id),
          products: product
            ? get().products.map((p) =>
                p.id === product.id
                  ? { ...p, quantity: p.quantity + desp.cantidad, updatedAt: Date.now() }
                  : p
              )
            : get().products,
        });
      },

      getDespachosDelDia: (fecha) => {
        const f = fecha ?? Date.now();
        const inicioDia = new Date(f);
        inicioDia.setHours(0, 0, 0, 0);
        const finDia = new Date(f);
        finDia.setHours(23, 59, 59, 999);
        return get().despachos.filter(
          (d) => d.fecha >= inicioDia.getTime() && d.fecha <= finDia.getTime()
        );
      },

      // ---------- Equipos (rastreo por serie) ----------
      findEquipmentBySerie: (serie) => {
        const norm = serie.trim().toLowerCase();
        return get().equipos.find((e) => e.serie.trim().toLowerCase() === norm) ?? null;
      },

      addEquipment: (e) => {
        const serieTrim = e.serie.trim();
        const modeloTrim = e.modelo.trim();
        if (!serieTrim || !modeloTrim) return null;
        if (get().findEquipmentBySerie(serieTrim)) return null; // serie duplicada
        const eq: Equipment = {
          id: uid(),
          ...e,
          serie: serieTrim,
          modelo: modeloTrim,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set({ equipos: [eq, ...get().equipos] });
        return eq.id;
      },

      updateEquipment: (id, data) => {
        set({
          equipos: get().equipos.map((e) =>
            e.id === id ? { ...e, ...data, updatedAt: Date.now() } : e
          ),
        });
      },

      deleteEquipment: (id) => {
        set({ equipos: get().equipos.filter((e) => e.id !== id) });
      },

      // ---------- Exportar inventario a Excel ----------
      exportInventarioExcel: () => {
        const products = get().products;
        import("xlsx").then((XLSX) => {
          const data = [
            ["INVENTARIO LEMCORP", "", "", "", "", ""],
            ["Exportado:", new Date().toLocaleString("es-PE"), "", "", "", ""],
            [],
            ["SKU", "PRODUCTO", "CATEGORÍA", "STOCK ACTUAL", "STOCK MÍNIMO", "UDM"],
            ...products.map((p) => [
              p.sku,
              p.name,
              p.category ?? "",
              p.quantity,
              p.minStock ?? "",
              p.udm ?? "",
            ]),
          ];
          const ws = XLSX.utils.aoa_to_sheet(data);
          ws["!cols"] = [{ wch: 14 }, { wch: 40 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Inventario");
          XLSX.writeFile(wb, `Inventario_LEMCORP_${new Date().toISOString().slice(0, 10)}.xlsx`);
        });
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
          despachos: [],
          equipos: [],
          appliedMap: {},
          histories: {},
          redoes: {},
          seenNotificationKeys: [],
          activeFileId: null,
          activeView: "dashboard",
          hydrated: true,
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
        const { products, equipos } = get();
        // Si hay productos pero NO equipos, sembrar equipos
        if (products.length > 0 && equipos.length === 0) {
          const demoEq: Omit<Equipment, "id" | "createdAt" | "updatedAt">[] = [
            { serie: "48575443365E42B7", sku: "4076358", modelo: "ROUTER ONT HG8145X6-13 HUAWEI", estado: "disponible", ubicacion: "Almacén HUB" },
            { serie: "48575443365E42C8", sku: "4076358", modelo: "ROUTER ONT HG8145X6-13 HUAWEI", estado: "asignado", ubicacion: "Cliente: Corporación ABC", cliente: "Corporación ABC" },
            { serie: "48575443365E42D1", sku: "4076358", modelo: "ROUTER ONT HG8145X6-13 HUAWEI", estado: "averiado", ubicacion: "Taller", observacion: "No enciende" },
            { serie: "SN10002ABC", sku: "4072704", modelo: "DECODIFICADOR IPTV ZXV10 B866V2-H ZTE", estado: "disponible", ubicacion: "Almacén HUB" },
            { serie: "SN10003DEF", sku: "4072704", modelo: "DECODIFICADOR IPTV ZXV10 B866V2-H ZTE", estado: "en_retiro", ubicacion: "Taller", observacion: "Cliente devolvió" },
            { serie: "MACA0B1C2D3E", sku: "4048528", modelo: "MODEM ARRIS TG2482 24X8 3.0 S/BAT", estado: "disponible", ubicacion: "Almacén HUB" },
            { serie: "MACA0B1C2D3F", sku: "4048528", modelo: "MODEM ARRIS TG2482 24X8 3.0 S/BAT", estado: "en_reparacion", ubicacion: "Taller", observacion: "Sin señal" },
          ];
          for (const e of demoEq) {
            get().addEquipment(e);
          }
          return;
        }
        if (products.length > 0) return;
        // Sembrar productos demo del sistema
        const demo: { sku: string; name: string; quantity: number; minStock?: number; category?: string; udm?: string }[] = [
          { sku: "1002900", name: "CONECTOR PLUG RJ-45", quantity: 2768, minStock: 100, category: "Conector", udm: "UNIDADES" },
          { sku: "1002950", name: "ATADOR DE IDENTIFICACION DE ABONADO", quantity: 1475, minStock: 50, category: "Accesorio", udm: "UNIDADES" },
          { sku: "1003101", name: "CABLE COAXIAL RG-6 AUTOSOPORTADO", quantity: 6794, minStock: 200, category: "Cable", udm: "METROS" },
          { sku: "1004705", name: "CABLE COAXIAL BLANCO RG-6 S/MENSAJERO", quantity: 3121, minStock: 100, category: "Cable", udm: "METROS" },
          { sku: "1004692", name: "CABLE UTP CAT5E FTP 4PR/24AWG", quantity: 15921, minStock: 500, category: "Cable", udm: "METROS" },
          { sku: "4076358", name: "ROUTER ONT HG8145X6-13 50088770 HUAWEI", quantity: 29, minStock: 5, category: "Router", udm: "UNIDADES" },
          { sku: "4048528", name: "MODEM ARRIS TG2482 24X8 3.0 S/BAT", quantity: 12, minStock: 3, category: "Modem", udm: "UNIDADES" },
          { sku: "4073653", name: "ROUTER K562E-10 50087708 HUAWEI", quantity: 16, minStock: 3, category: "Router", udm: "UNIDADES" },
          { sku: "4072704", name: "DECODIFICADOR IPTV ZXV10 B866V2-H ZTE", quantity: 67, minStock: 5, category: "Decodificador", udm: "UNIDADES" },
          { sku: "1042681", name: "ROSETA ATB3101 SIN PIGTAIL", quantity: 188, minStock: 20, category: "Accesorio", udm: "UNIDADES" },
        ];
        for (const p of demo) {
          get().addProduct(p.sku, p.name, p.quantity, p.minStock, p.category, p.udm);
        }
        // Sembrar equipos demo con series (si no hay)
        if (equipos.length === 0) {
          const demoEq: Omit<Equipment, "id" | "createdAt" | "updatedAt">[] = [
            { serie: "48575443365E42B7", sku: "4076358", modelo: "ROUTER ONT HG8145X6-13 HUAWEI", estado: "disponible", ubicacion: "Almacén HUB" },
            { serie: "48575443365E42C8", sku: "4076358", modelo: "ROUTER ONT HG8145X6-13 HUAWEI", estado: "asignado", ubicacion: "Cliente: Corporación ABC", cliente: "Corporación ABC" },
            { serie: "48575443365E42D1", sku: "4076358", modelo: "ROUTER ONT HG8145X6-13 HUAWEI", estado: "averiado", ubicacion: "Taller", observacion: "No enciende" },
            { serie: "SN10002ABC", sku: "4072704", modelo: "DECODIFICADOR IPTV ZXV10 B866V2-H ZTE", estado: "disponible", ubicacion: "Almacén HUB" },
            { serie: "SN10003DEF", sku: "4072704", modelo: "DECODIFICADOR IPTV ZXV10 B866V2-H ZTE", estado: "en_retiro", ubicacion: "Taller", observacion: "Cliente devolvió" },
            { serie: "MACA0B1C2D3E", sku: "4048528", modelo: "MODEM ARRIS TG2482 24X8 3.0 S/BAT", estado: "disponible", ubicacion: "Almacén HUB" },
            { serie: "MACA0B1C2D3F", sku: "4048528", modelo: "MODEM ARRIS TG2482 24X8 3.0 S/BAT", estado: "en_reparacion", ubicacion: "Taller", observacion: "Sin señal" },
          ];
          for (const e of demoEq) {
            get().addEquipment(e);
          }
        }
        set({ activeView: "dashboard" });
      },

      seedFromUserExcel: async () => {
        // En modo sistema, solo sembramos productos demo si no hay datos.
        get().seedDemoIfEmpty();
      },
    }),
    {
      name: "lemcorp-excel-v1",
      partialize: (s) => ({
        products: s.products,
        despachos: s.despachos ?? [],
        equipos: s.equipos ?? [],
        settings: s.settings,
        activeView: s.activeView,
      }),
      migrate: (persisted: any) => {
        if (!persisted) return persisted;
        // Asegurar todos los campos del estado
        if (!persisted.products || !Array.isArray(persisted.products)) persisted.products = [];
        if (!persisted.despachos || !Array.isArray(persisted.despachos)) persisted.despachos = [];
        if (!persisted.equipos || !Array.isArray(persisted.equipos)) persisted.equipos = [];
        if (!persisted.files || !Array.isArray(persisted.files)) persisted.files = [];
        if (!persisted.settings) persisted.settings = { ...DEFAULT_SETTINGS };
        // Asegurar quantity numérica
        persisted.products = persisted.products.map((p: any) => ({
          ...p,
          quantity: typeof p.quantity === "number" ? p.quantity : 0,
        }));
        return persisted;
      },
      version: 6,
    }
  )
);
