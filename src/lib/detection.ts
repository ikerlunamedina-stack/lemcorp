// Detección automática de tipo de archivo por nombres de columna
import type { FileTag, SheetFile } from "./types";

const KEYWORDS: Record<Exclude<FileTag, "otro">, string[]> = {
  inventario: [
    "stock",
    "cantidad",
    "stock minimo",
    "stock mínimo",
    "inventario",
    "sku",
    "existencia",
    "almacen",
    "almacén",
    "ubicacion",
    "ubicación",
  ],
  despachos: [
    "fecha",
    "cliente",
    "tecnico",
    "técnico",
    "despacho",
    "guia",
    "guía",
    "ot",
    "destino",
    "entrega",
    "salida",
  ],
  equipos: [
    "serie",
    "modelo",
    "equipo",
    "mac",
    "imei",
    "averiado",
    "retiro",
    "router",
    "ont",
    "marca",
    "estado",
  ],
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Devuelve las columnas de la fila de encabezado (fila 0)
export function getHeaderColumns(file: SheetFile): string[] {
  const cols: string[] = [];
  for (let c = 0; c < file.colCount; c++) {
    const v = file.cells[`0,${c}`] ?? "";
    cols.push(v.trim());
  }
  return cols;
}

export function detectTag(file: SheetFile): FileTag {
  const headers = getHeaderColumns(file).map(normalize).filter(Boolean);
  if (headers.length === 0) return "otro";

  const scores: Record<string, number> = {
    inventario: 0,
    despachos: 0,
    equipos: 0,
  };

  for (const h of headers) {
    for (const tag of ["inventario", "despachos", "equipos"] as const) {
      for (const kw of KEYWORDS[tag]) {
        const nkw = normalize(kw);
        if (h === nkw) scores[tag] += 3;
        else if (h.includes(nkw)) scores[tag] += 1.5;
      }
    }
  }

  // heuristicas específicas por combinación
  const headerSet = new Set(headers);
  if (headerSet.has("cantidad") && headerSet.has("stock minimo")) scores.inventario += 4;
  if (headerSet.has("serie") || headerSet.has("modelo")) scores.equipos += 3;
  if (headerSet.has("fecha") && (headerSet.has("cliente") || headerSet.has("tecnico"))) scores.despachos += 4;

  let best: FileTag = "otro";
  let bestScore = 0;
  for (const tag of ["inventario", "despachos", "equipos"] as const) {
    if (scores[tag] > bestScore) {
      bestScore = scores[tag];
      best = tag;
    }
  }
  // umbral mínimo
  if (bestScore < 2) return "otro";
  return best;
}
