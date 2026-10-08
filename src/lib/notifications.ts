// Selector de notificaciones: agrega bajo stock, discrepancias de SKU,
// SKUs sin catalogar y avisos operativos en una sola lista.
import type {
  ActiveView,
  Product,
  SheetFile,
  Settings,
} from "./types";
import { getHeaderColumns } from "./detection";
import { recalcFile } from "./formulas";
import { validateFiles, suggestProducts } from "./validation";
import { parseNum } from "./num";

export type NotificationType = "danger" | "warning" | "info";

export interface AppNotification {
  key: string;
  type: NotificationType;
  emoji: string;
  title: string;
  description: string;
  view?: ActiveView;
}

const PRODUCT_COLS = [
  "producto",
  "sku",
  "codigo",
  "código",
  "articulo",
  "artículo",
  "descripcion",
  "descripción",
  "material",
  "item",
];
const QTY_COLS = [
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
const MIN_COLS = ["stock minimo", "stock mínimo", "minimo", "mínimo", "min", "reorder"];

function normalize(s: string): string {
  return s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function findColIdx(headers: string[], candidates: string[]): number {
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

const TYPE_ORDER: Record<NotificationType, number> = {
  danger: 0,
  warning: 1,
  info: 2,
};

export function computeNotifications(
  files: SheetFile[],
  products: Product[],
  settings: Settings
): AppNotification[] {
  const out: AppNotification[] = [];

  // Bajo stock — revisar productos del sistema (no archivos)
  if (settings.lowStockAlerts) {
    for (const p of products) {
      if (
        p.minStock !== undefined &&
        p.minStock > 0 &&
        p.quantity <= p.minStock
      ) {
        out.push({
          key: `low:${p.id}`,
          type: "warning",
          emoji: "⚠️",
          title: `Bajo stock: ${p.name}`,
          description: `${p.quantity} unidades · mínimo ${p.minStock}`,
          view: "inventario",
        });
      }
    }
  }
  // También revisar archivos (compatibilidad)
  if (files && files.length > 0) {
    for (const f of files) {
      if (f.tag !== "inventario") continue;
      const headers = getHeaderColumns(f);
      const prodCol = findColIdx(headers, PRODUCT_COLS);
      const qtyCol = findColIdx(headers, QTY_COLS);
      const minCol = findColIdx(headers, MIN_COLS);
      if (prodCol < 0 || qtyCol < 0 || minCol < 0) continue;
      const computed = recalcFile(f);
      for (let r = 1; r < f.rowCount; r++) {
        const product = (f.cells[`${r},${prodCol}`] ?? "").trim();
        if (!product) continue;
        const qtyRaw =
          computed[`${r},${qtyCol}`] ?? f.cells[`${r},${qtyCol}`] ?? "";
        const qtyNum = parseNum(qtyRaw);
        const qty = isNaN(qtyNum) ? 0 : qtyNum;
        const minRaw = f.cells[`${r},${minCol}`] ?? "";
        const minNum = parseNum(minRaw);
        const min = isNaN(minNum) ? 0 : minNum;
        if (min > 0 && qty <= min) {
          out.push({
            key: `low:${f.id}:${r}`,
            type: "warning",
            emoji: "⚠️",
            title: `Bajo stock: ${product}`,
            description: `${qty} unidades · mínimo ${min} · ${f.name}`,
            view: "inventario",
          });
        }
      }
    }
  }

  // Discrepancias de SKU
  if (settings.skuDetection) {
    const mismatches = validateFiles(files, products);
    for (const m of mismatches) {
      out.push({
        key: `mismatch:${m.fileId}:${m.row}:${m.sku}`,
        type: "danger",
        emoji: "⚠️",
        title: `SKU con nombre distinto: ${m.sku}`,
        description: `«${m.actualName}» ≠ «${m.expectedName}» en ${m.fileName}`,
        view: "inventario",
      });
    }
    // SKUs sin catalogar (una sola notificación resumen)
    const suggestions = suggestProducts(files, products);
    if (suggestions.length > 0) {
      out.push({
        key: "suggestions",
        type: "info",
        emoji: "ℹ️",
        title: `${suggestions.length} SKU(s) sin catalogar`,
        description: `Detectados en tus archivos pero no en el catálogo`,
        view: "inventario",
      });
    }
  }

  // Falta archivo de inventario
  const hasDespachos = files.some((f) => f.tag === "despachos");
  const hasInventario = files.some((f) => f.tag === "inventario");
  if (hasDespachos && !hasInventario) {
    out.push({
      key: "no-inventario",
      type: "warning",
      emoji: "ℹ️",
      title: "Falta archivo de Inventario",
      description:
        "Tienes despachos pero ningún archivo «Inventario total». La automatización no puede ejecutarse.",
      view: "inventario",
    });
  }

  out.sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type]);
  return out;
}
