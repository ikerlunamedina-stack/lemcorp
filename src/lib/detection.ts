// Detección automática de tipo de archivo por nombres de columna
import type { FileTag, SheetFile } from "./types";

const KEYWORDS: Record<Exclude<FileTag, "otro">, string[]> = {
  inventario: [
    "stock",
    "stock minimo",
    "stock mínimo",
    "inventario",
    "existencia",
    "almacen",
    "almacén",
    "ubicacion",
    "ubicación",
    "fisico",
    "físico",
    "disponible",
    "reservado",
    "udm",
  ],
  despachos: [
    "despacho",
    "guia",
    "guía",
    "ot",
    "destino",
    "entrega",
    "salida",
    "movimientos",
    "operacion",
    "operación",
    "nº operacion",
    "tipo (in/out/int)",
    "tipo de operacion",
    "tipo de operación",
    "razon social",
    "razón social",
    "ruc",
    "guia de remision",
    "guía de remisión",
    "orden de compra",
    "fecha traslado",
    "responsable",
    "empleado/tecnico",
    "almacen origen",
    "almacén origen",
    "almacen destino",
    "almacén destino",
    "proyecto macro",
    "codigo pep",
    "código pep",
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
  if (headerSet.has("stock minimo")) scores.inventario += 4;
  if (headerSet.has("fisico") || headerSet.has("disponible")) scores.inventario += 3;
  if (headerSet.has("serie") || headerSet.has("modelo")) scores.equipos += 3;
  // Despachos: columnas típicas de un Excel de control de despachos real
  if (headerSet.has("nº operacion") || headerSet.has("tipo (in/out/int)")) scores.despachos += 6;
  if (headerSet.has("guia de remision") || headerSet.has("guía de remisión")) scores.despachos += 4;
  if (headerSet.has("almacen origen") || headerSet.has("almacén origen")) scores.despachos += 3;
  if (headerSet.has("razon social") || headerSet.has("razón social")) scores.despachos += 3;
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
