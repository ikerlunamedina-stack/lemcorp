// Inventario unificado: lee los archivos etiquetados como "inventario" y
// consolida todas las filas en una sola tabla viva (no es una copia, se lee
// directamente del estado de los archivos).
//
// Detecta dinámicamente las columnas disponibles (SKU, Producto, Categoría,
// Físico, Reservado, En Tránsito, Disponible, UdM, Ubicación, Almacén, etc.)
// y las expone de forma unificada.

import type { SheetFile } from "./types";
import { getHeaderColumns } from "./detection";
import { recalcFile } from "./formulas";
import { parseNum } from "./num";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// findCol respeta prioridad de candidatos (exacto antes que substring).
function findCol(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const nc = normalize(c);
    for (let i = 0; i < headers.length; i++) {
      if (normalize(headers[i]) === nc) return i;
    }
  }
  for (const c of candidates) {
    const nc = normalize(c);
    for (let i = 0; i < headers.length; i++) {
      const h = normalize(headers[i]);
      if (h.includes(nc)) return i;
    }
  }
  return -1;
}

const SKU_COLS = [
  "sku", "codigo", "código", "cod", "codigo de producto",
  "codigo producto", "cod. producto", "id producto", "item code",
];
const NAME_COLS = [
  "producto", "descripcion", "descripción", "articulo", "artículo",
  "material", "nombre", "item", "denominacion", "denominación",
];
const CAT_COLS = ["categoria", "categoría", "tipo", "familia", "linea", "línea"];
const FISICO_COLS = [
  "stock inicial",
  "stock actual",
  "fisico",
  "stock fisico",
  "stock físico",
  "total",
  "inventario",
  "stock actual (descontado)",
];
const DISPONIBLE_COLS = ["disponible", "stock disponible", "libre"];
const RESERVADO_COLS = ["reservado", "comprometido", "separado", "averiados"];
const TRANSITO_COLS = ["en transito", "en tránsito", "transito", "tránsito"];
const UDM_COLS = ["udm", "unidad", "unidades", "unidad de medida", "u.m", "um"];
const UBI_COLS = ["ubicacion", "ubicación", "lugar", "sitio", "almacen", "almacén", "posicion", "posición"];
const ALM_COLS = ["almacen", "almacén", "sucursal", "centro", "hub", "base"];
const OBS_COLS = ["observacion", "observación", "nota", "comentario", "detalle"];

export interface InventoryItem {
  fileId: string;
  fileName: string;
  row: number;
  sku: string;
  name: string;
  category?: string;
  fisico?: number;
  disponible?: number;
  reservado?: number;
  enTransito?: number;
  udm?: string;
  ubicacion?: string;
  almacen?: string;
  observacion?: string;
}

export interface InventoryColumns {
  hasCategory: boolean;
  hasFisico: boolean;
  hasDisponible: boolean;
  hasReservado: boolean;
  hasTransito: boolean;
  hasUdm: boolean;
  hasUbicacion: boolean;
  hasAlmacen: boolean;
}

// Lee una celda (calculada si tiene fórmula).
function readCell(file: SheetFile, computed: Record<string, string>, r: number, c: number): string {
  if (c < 0) return "";
  return computed[`${r},${c}`] ?? file.cells[`${r},${c}`] ?? "";
}

// Extrae el inventario consolidado de todos los archivos "inventario".
export function extractUnifiedInventory(files: SheetFile[]): {
  items: InventoryItem[];
  columns: InventoryColumns;
} {
  const items: InventoryItem[] = [];
  const cols: InventoryColumns = {
    hasCategory: false,
    hasFisico: false,
    hasDisponible: false,
    hasReservado: false,
    hasTransito: false,
    hasUdm: false,
    hasUbicacion: false,
    hasAlmacen: false,
  };

  for (const file of files) {
    if (file.tag !== "inventario") continue;
    const headers = getHeaderColumns(file);
    const skuCol = findCol(headers, SKU_COLS);
    const nameCol = findCol(headers, NAME_COLS);
    if (skuCol < 0 && nameCol < 0) continue;

    const catCol = findCol(headers, CAT_COLS);
    const fisicoCol = findCol(headers, FISICO_COLS);
    const dispCol = findCol(headers, DISPONIBLE_COLS);
    const resCol = findCol(headers, RESERVADO_COLS);
    const transCol = findCol(headers, TRANSITO_COLS);
    const udmCol = findCol(headers, UDM_COLS);
    const ubiCol = findCol(headers, UBI_COLS);
    const almCol = findCol(headers, ALM_COLS);
    const obsCol = findCol(headers, OBS_COLS);

    if (catCol >= 0) cols.hasCategory = true;
    if (fisicoCol >= 0) cols.hasFisico = true;
    if (dispCol >= 0) cols.hasDisponible = true;
    if (resCol >= 0) cols.hasReservado = true;
    if (transCol >= 0) cols.hasTransito = true;
    if (udmCol >= 0) cols.hasUdm = true;
    if (ubiCol >= 0) cols.hasUbicacion = true;
    if (almCol >= 0) cols.hasAlmacen = true;

    const computed = recalcFile(file);

    for (let r = 1; r < file.rowCount; r++) {
      const sku = readCell(file, computed, r, skuCol).trim();
      const name = readCell(file, computed, r, nameCol).trim();
      if (!sku && !name) continue;

      const numOrUndef = (c: number): number | undefined => {
        if (c < 0) return undefined;
        const raw = readCell(file, computed, r, c);
        if (!raw) return undefined;
        const n = parseNum(raw);
        return isNaN(n) ? undefined : n;
      };

      items.push({
        fileId: file.id,
        fileName: file.name,
        row: r,
        sku: sku || "—",
        name: name || sku || "—",
        category: catCol >= 0 ? readCell(file, computed, r, catCol).trim() || undefined : undefined,
        fisico: numOrUndef(fisicoCol),
        disponible: numOrUndef(dispCol),
        reservado: numOrUndef(resCol),
        enTransito: numOrUndef(transCol),
        udm: udmCol >= 0 ? readCell(file, computed, r, udmCol).trim() || undefined : undefined,
        ubicacion: ubiCol >= 0 ? readCell(file, computed, r, ubiCol).trim() || undefined : undefined,
        almacen: almCol >= 0 ? readCell(file, computed, r, almCol).trim() || undefined : undefined,
        observacion: obsCol >= 0 ? readCell(file, computed, r, obsCol).trim() || undefined : undefined,
      });
    }
  }

  return { items, columns: cols };
}
