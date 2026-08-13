// Validación cruzada: detecta el SKU en los archivos y verifica que el
// nombre coincida con el catálogo maestro de LEMCORP.
//
// El SKU es el "DNI" del producto. Si dos archivos usan el mismo SKU
// pero con nombres distintos, lanzamos una advertencia para que el
// operador corrija el dato.

import type { FileTag, Mismatch, Product, SheetFile } from "./types";
import { getHeaderColumns } from "./detection";
import { recalcFile } from "./formulas";
import { parseNum } from "./num";

// Candidatos para la columna SKU (en orden de prioridad).
export const SKU_COLS = [
  "sku",
  "codigo",
  "código",
  "cod",
  "codigo de producto",
  "codigo producto",
  "cod. producto",
  "id producto",
  "item code",
  "codigo interno",
  "código interno",
];

// Candidatos para la columna de nombre del producto.
export const NAME_COLS = [
  "producto",
  "descripcion",
  "descripción",
  "articulo",
  "artículo",
  "material",
  "nombre",
  "item",
  "denominacion",
  "denominación",
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// findCol respeta la prioridad de candidatos (exacto antes que substring).
export function findCol(headers: string[], candidates: string[]): number {
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

// Normaliza nombres para comparación tolerante: quita espacios múltiples,
// pasa a mayúsculas, quita signos de puntuación sobrantes.
function normName(s: string): string {
  return normalize(s)
    .replace(/\s+/g, " ")
    .replace(/[^\w\s/-]/g, "")
    .trim();
}

// Ejecuta la validación de todos los archivos contra el catálogo maestro.
// Devuelve la lista de discrepancias (SKU presente en catálogo pero con
// nombre distinto en el archivo).
export function validateFiles(
  files: SheetFile[],
  products: Product[]
): Mismatch[] {
  const catalogBySku = new Map<string, Product>();
  for (const p of products) {
    const key = normalize(p.sku);
    if (key && !catalogBySku.has(key)) catalogBySku.set(key, p);
  }

  const mismatches: Mismatch[] = [];

  for (const file of files) {
    // Solo validamos archivos que puedan tener SKU + nombre
    if (file.tag === "otro") continue;
    const headers = getHeaderColumns(file);
    const skuCol = findCol(headers, SKU_COLS);
    const nameCol = findCol(headers, NAME_COLS);
    if (skuCol < 0 || nameCol < 0) continue;

    // pre-calcular fórmulas por si hay celdas calculadas
    const computed = recalcFile(file);

    for (let r = 1; r < file.rowCount; r++) {
      const skuRaw = file.cells[`${r},${skuCol}`] ?? "";
      const sku = skuRaw.trim();
      if (!sku) continue;
      const key = normalize(sku);
      const product = catalogBySku.get(key);
      if (!product) continue; // SKU no está en catálogo -> no validamos

      const nameRaw = computed[`${r},${nameCol}`] ?? file.cells[`${r},${nameCol}`] ?? "";
      const actualName = nameRaw.trim();
      if (!actualName) continue;

      if (normName(actualName) !== normName(product.name)) {
        mismatches.push({
          fileId: file.id,
          fileName: file.name,
          fileTag: file.tag,
          row: r,
          sku,
          expectedName: product.name,
          actualName,
        });
      }
    }
  }

  return mismatches;
}

// Sugiere nuevos productos a partir de archivos que aún no están en el catálogo.
// Devuelve SKU -> { name, quantity, fromFiles } para los SKUs no registrados.
// La cantidad se detecta de la columna de stock del archivo (prioriza Físico,
// luego Disponible, luego Cantidad/Stock/Existencia).
export interface SuggestedProduct {
  sku: string;
  name: string;
  quantity?: number;
  count: number;
  fromFiles: string[];
}

// Columnas candidatas a "cantidad" en orden de prioridad para inventario real.
const QTY_COLS_SUGGEST = [
  "fisico",
  "disponible",
  "cantidad",
  "stock",
  "existencia",
  "saldo",
  "stock actual",
  "cant",
  "qty",
];

export function suggestProducts(
  files: SheetFile[],
  products: Product[]
): SuggestedProduct[] {
  const known = new Set(products.map((p) => normalize(p.sku)));
  const map = new Map<string, SuggestedProduct>();

  for (const file of files) {
    if (file.tag === "otro") continue;
    const headers = getHeaderColumns(file);
    const skuCol = findCol(headers, SKU_COLS);
    const nameCol = findCol(headers, NAME_COLS);
    if (skuCol < 0 || nameCol < 0) continue;
    const qtyCol = findCol(headers, QTY_COLS_SUGGEST);
    const computed = recalcFile(file);
    for (let r = 1; r < file.rowCount; r++) {
      const sku = (file.cells[`${r},${skuCol}`] ?? "").trim();
      if (!sku) continue;
      const key = normalize(sku);
      if (known.has(key)) continue;
      const name = (computed[`${r},${nameCol}`] ?? file.cells[`${r},${nameCol}`] ?? "").trim();
      // cantidad detectada en el archivo (si hay columna)
      let qty: number | undefined;
      if (qtyCol >= 0) {
        const qRaw = computed[`${r},${qtyCol}`] ?? file.cells[`${r},${qtyCol}`] ?? "";
        const q = parseNum(qRaw);
        if (!isNaN(q)) qty = q;
      }
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        if (!existing.fromFiles.includes(file.name)) {
          existing.fromFiles.push(file.name);
        }
        if (!existing.name && name) existing.name = name;
        // si el archivo actual es de inventario, su cantidad es la más fiable
        if (qty !== undefined && (file.tag === "inventario" || existing.quantity === undefined)) {
          existing.quantity = qty;
        }
      } else {
        map.set(key, {
          sku,
          name: name || sku,
          quantity: qty,
          count: 1,
          fromFiles: [file.name],
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}
