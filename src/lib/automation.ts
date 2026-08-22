// Automatización: cuando se agrega/edita una fila en "Despachos diarios",
// se resta automáticamente la cantidad del producto en "Inventario total".
//
// Estrategia con ledger (appliedMap) que persiste fuera del undo:
// - Por cada archivo despachos guardamos el último estado aplicado (producto, qty) por fila.
// - Al ejecutar la automatización:
//     1. Revertimos TODO lo aplicado anteriormente por este archivo (sumando de vuelta).
//     2. Aplicamos el estado actual de despachos (restando).
//     3. Guardamos el nuevo estado en appliedMap.
// - Así el inventario siempre refleja exactamente el estado actual de despachos,
//   incluso si se eliminan/editan filas, y funciona correctamente con Ctrl+Z
//   porque al revertir despachos la automatización reajusta el inventario.

import type { SheetFile } from "./types";
import { getHeaderColumns } from "./detection";
import { parseNum } from "./num";

export interface AppliedRow {
  product: string;
  qty: number;
}

// appliedMap[fileId][rowIndex] = {product, qty}
export type AppliedMap = Record<string, Record<number, AppliedRow>>;

const PRODUCT_COLS = [
  "producto",
  "descripcion",
  "descripción",
  "articulo",
  "artículo",
  "material",
  "item",
  "sku",
  "codigo",
  "código",
];
// SKU separado para priorizar cruce por código (más fiable que por nombre).
const SKU_COLS_DESP = [
  "sku",
  "codigo",
  "código",
  "cod",
  "codigo de producto",
  "codigo producto",
  "cod. producto",
  "id producto",
  "item code",
];
// Columna de tipo de operación (IN/OUT/INT).
const TYPE_COLS = [
  "tipo (in/out/int)",
  "tipo (in / out / int)",
  "tipo",
  "tipo de operacion",
  "tipo de operación",
  "movimiento",
  "operacion",
  "operación",
  "in/out/int",
];
const QTY_COLS_DESPACHO = ["cantidad", "cant", "qty", "salida", "despachado", "total", "total contabilizado", "cantidad despachada"];
// Para inventario priorizamos "Stock Actual" (el Excel oficial de Nuclon usa
// ese nombre), luego "Físico" (reportes de almacén HUB), luego Disponible.
const QTY_COLS_INVENTARIO = [
  "stock inicial",
  "stock actual",
  "fisico",
  "físico",
  "disponible",
  "cantidad",
  "stock",
  "existencia",
  "saldo",
  "stock actual (descontado)",
  "cant",
  "qty",
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Encuentra la columna respetando la prioridad de candidatos:
// primero busca coincidencia exacta por candidato (en orden), luego por substring.
function findCol(headers: string[], candidates: string[]): number {
  // 1. coincidencia exacta por prioridad
  for (const c of candidates) {
    const nc = normalize(c);
    for (let i = 0; i < headers.length; i++) {
      if (normalize(headers[i]) === nc) return i;
    }
  }
  // 2. substring por prioridad
  for (const c of candidates) {
    const nc = normalize(c);
    for (let i = 0; i < headers.length; i++) {
      const h = normalize(headers[i]);
      if (h.includes(nc)) return i;
    }
  }
  return -1;
}

export interface AutomationResult {
  modified: boolean;
  inventoryFileId: string | null;
  adjustments: { product: string; delta: number; matched: boolean }[];
  missingColumns: boolean;
  reason?: string;
}

function getQty(file: SheetFile, r: number, col: number): number {
  const raw = file.cells[`${r},${col}`] ?? "";
  if (raw.startsWith("=")) return 0; // no automatizamos celdas con fórmula
  const n = parseNum(raw);
  return isNaN(n) ? 0 : n;
}

// Ejecuta la automatización para un archivo despachos dado.
export function runAutomation(
  despachosFile: SheetFile,
  inventarioFile: SheetFile | null,
  appliedMap: AppliedMap
): { inventario: SheetFile | null; result: AutomationResult } {
  const result: AutomationResult = {
    modified: false,
    inventoryFileId: inventarioFile?.id ?? null,
    adjustments: [],
    missingColumns: false,
  };

  if (!inventarioFile) {
    return { inventario: inventarioFile, result };
  }

  const despHeaders = getHeaderColumns(despachosFile);
  const invHeaders = getHeaderColumns(inventarioFile);

  // Columnas de despacho: SKU (preferido) + Producto + Cantidad + Tipo
  const despSkuCol = findCol(despHeaders, SKU_COLS_DESP);
  const despProductCol = findCol(despHeaders, PRODUCT_COLS);
  const despQtyCol = findCol(despHeaders, QTY_COLS_DESPACHO);
  const despTypeCol = findCol(despHeaders, TYPE_COLS);
  // Columnas de inventario: SKU (preferido) + Producto + Cantidad
  const invSkuCol = findCol(invHeaders, SKU_COLS_DESP);
  const invProductCol = findCol(invHeaders, PRODUCT_COLS);
  const invQtyCol = findCol(invHeaders, QTY_COLS_INVENTARIO);

  // Necesitamos al menos: cantidad en despacho + (SKU o producto) en despacho
  // + (SKU o producto) en inventario + cantidad en inventario
  const despKeyCol = despSkuCol >= 0 ? despSkuCol : despProductCol;
  const invKeyCol = invSkuCol >= 0 ? invSkuCol : invProductCol;
  if (
    despKeyCol < 0 ||
    despQtyCol < 0 ||
    invKeyCol < 0 ||
    invQtyCol < 0
  ) {
    result.missingColumns = true;
    return { inventario: inventarioFile, result };
  }

  // copia del inventario para modificar
  const newInv: SheetFile = {
    ...inventarioFile,
    cells: { ...inventarioFile.cells },
  };

  const oldApplied = appliedMap[despachosFile.id] || {};

  // indexar inventario por clave normalizada (SKU si hay, si no producto)
  const invIndex: Record<string, number> = {};
  for (let r = 1; r < newInv.rowCount; r++) {
    const key = (newInv.cells[`${r},${invKeyCol}`] ?? "").trim();
    if (key) {
      const nk = normalize(key);
      if (invIndex[nk] === undefined) invIndex[nk] = r;
    }
  }

  const adjust = (
    invRow: number,
    delta: number
  ): { matched: boolean; product: string } | null => {
    const curRaw = newInv.cells[`${invRow},${invQtyCol}`] ?? "0";
    const curNum = parseNum(curRaw);
    const cur = isNaN(curNum) ? 0 : curNum;
    newInv.cells[`${invRow},${invQtyCol}`] = String(cur + delta);
    return null;
  };

  // Lee el tipo de operación de una fila de despacho.
  // OUT -> resta del inventario, IN -> suma al inventario, INT -> no afecta.
  const typeDelta = (r: number): number => {
    if (despTypeCol < 0) return -1; // sin columna de tipo: asumir salida
    const t = (despachosFile.cells[`${r},${despTypeCol}`] ?? "")
      .trim()
      .toUpperCase();
    if (t === "IN" || t === "ENTRADA" || t === "ENTRANTE") return 1;
    if (t === "INT" || t === "INTERNO" || t === "TRASLADO") return 0;
    if (t === "OUT" || t === "SALIDA" || t === "SALIENTE" || t === "DESPACHO")
      return -1;
    return -1; // default: salida
  };

  // 1. Revertir TODO lo aplicado anteriormente por este archivo.
  // qty es negativo (ej: -137), así que -qty es positivo (+137) para sumar de vuelta.
  for (const rowStr of Object.keys(oldApplied)) {
    const { product, qty } = oldApplied[Number(rowStr)];
    if (product) {
      const key = normalize(product);
      const invRow = invIndex[key];
      if (invRow !== undefined) {
        adjust(invRow, -qty); // sumar de vuelta (qty es negativo, -qty es positivo)
        result.modified = true;
      }
    }
  }

  // 2. Aplicar estado actual de despachos
  const newApplied: Record<number, AppliedRow> = {};
  for (let r = 1; r < despachosFile.rowCount; r++) {
    const key = (despachosFile.cells[`${r},${despKeyCol}`] ?? "").trim();
    if (!key) continue;
    const qty = getQty(despachosFile, r, despQtyCol);
    if (qty <= 0) continue;
    const delta = typeDelta(r);
    if (delta === 0) continue; // INT no afecta stock
    const nk = normalize(key);
    const invRow = invIndex[nk];
    if (invRow !== undefined) {
      adjust(invRow, delta * qty);
      newApplied[r] = { product: key, qty: delta * qty };
      result.adjustments.push({ product: key, delta: delta * qty, matched: true });
      result.modified = true;
    } else {
      result.adjustments.push({ product: key, delta: delta * qty, matched: false });
    }
  }

  appliedMap[despachosFile.id] = newApplied;
  newInv.updatedAt = Date.now();

  return { inventario: newInv, result };
}

export function findInventarioFile(files: SheetFile[]): SheetFile | null {
  return files.find((f) => f.tag === "inventario") ?? null;
}

export function findDespachosFiles(files: SheetFile[]): SheetFile[] {
  return files.filter((f) => f.tag === "despachos");
}
