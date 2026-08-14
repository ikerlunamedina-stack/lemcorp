// Import/Export de archivos Excel usando SheetJS (xlsx)
import * as XLSX from "xlsx";
import type { SheetFile, FileTag } from "./types";

export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
  );
}

function emptyFile(name: string, rows = 30, cols = 8): SheetFile {
  return {
    id: uid(),
    name,
    tag: "otro",
    tagConfirmed: false,
    rowCount: rows,
    colCount: cols,
    cells: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function normalize(s: string): string {
  return s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Detecta la fila de encabezados dentro de una hoja. Busca la fila que tenga
// más valores conocidos (SKU, Producto, Cantidad, Stock, etc.) entre las
// primeras 10 filas.
function detectHeaderRow(
  ws: XLSX.WorkSheet,
  maxScan = 10
): number {
  const aoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "", raw: false });
  const knownPatterns = [
    /sku|c[oó]digo/, /producto|descrip/, /cantidad|cant|qty|total/,
    /stock|f[ií]sico|disponible/, /fecha/, /serie/, /modelo/, /udm|unidad/,
  ];
  let bestRow = 0;
  let bestScore = 0;
  for (let r = 0; r < Math.min(aoa.length, maxScan); r++) {
    const row = aoa[r];
    if (!row) continue;
    let score = 0;
    for (const cell of row) {
      const h = normalize(String(cell ?? ""));
      if (!h) continue;
      for (const pat of knownPatterns) {
        if (pat.test(h)) {
          score += 2;
          break;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestRow = r;
    }
  }
  return bestRow;
}

// Lee una hoja específica de un workbook y devuelve un SheetFile.
// Detecta automáticamente la fila de headers y la coloca en row 0.
export function importSheet(
  wb: XLSX.WorkBook,
  sheetName: string,
  fileName: string,
  tag: FileTag = "otro"
): SheetFile | null {
  const ws = wb.Sheets[sheetName];
  if (!ws || !ws["!ref"]) return null;

  const headerRow = detectHeaderRow(ws);
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const dataRowCount = range.e.r - headerRow;
  const rowCount = Math.max(dataRowCount + 1, 30);
  const colCount = Math.max(range.e.c - range.s.c + 1, 8);

  const sf: SheetFile = {
    id: uid(),
    name: fileName,
    tag,
    tagConfirmed: tag !== "otro",
    rowCount,
    colCount,
    cells: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Copiar datos desplazando para que headerRow quede en row 0
  for (let r = headerRow; r <= range.e.r; r++) {
    const targetRow = r - headerRow;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (!cell) continue;
      let val = "";
      if (cell.f) {
        // fórmula -> guardar el valor calculado (no la fórmula, porque las
        // referencias no serían válidas al cambiar de contexto)
        val = cell.w ?? String(cell.v ?? "");
      } else if (cell.v !== undefined && cell.v !== null) {
        if (cell.t === "n") {
          val = String(cell.v);
        } else if (cell.t === "d") {
          val = String(cell.w || cell.v);
        } else {
          val = String(cell.v);
        }
      }
      if (val !== "" && val !== "undefined") {
        sf.cells[`${targetRow},${c}`] = val;
      }
    }
  }
  return sf;
}

// Importa un archivo .xlsx/.xls/.csv y devuelve un solo SheetFile (hoja principal).
export async function importFile(file: File): Promise<SheetFile> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellFormula: true });
  const targetSheet = pickBestSheet(wb);
  const sf = importSheet(wb, targetSheet, file.name.replace(/\.(xlsx|xls|csv)$/i, ""));
  return sf ?? emptyFile(file.name);
}

// Importa todas las hojas relevantes de un workbook.
// Devuelve un SheetFile por cada hoja que tenga datos significativos.
export async function importAllSheets(file: File): Promise<SheetFile[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellFormula: true });
  const sheets: SheetFile[] = [];
  const baseName = file.name.replace(/\.(xlsx|xls|csv)$/i, "");

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws || !ws["!ref"]) continue;
    // Etiqueta automática por nombre de hoja
    let tag: FileTag = "otro";
    if (/stock/i.test(name) && !/base/i.test(name)) tag = "inventario";
    else if (/despacho|pegar/i.test(name)) tag = "despachos";
    else if (/equipo|serie/i.test(name)) tag = "equipos";
    // Solo importar hojas con tag conocido o que tengan datos
    const sf = importSheet(wb, name, `${baseName} — ${name}`, tag);
    if (sf && Object.keys(sf.cells).length > 3) {
      sheets.push(sf);
    }
  }
  return sheets;
}

// Elige la mejor hoja del workbook. Prioriza "Movimientos" o cualquier hoja
// que tenga encabezados SKU + Cantidad (indicador de despachos).
function pickBestSheet(wb: XLSX.WorkBook): string {
  const names = wb.SheetNames;
  // 1. Buscar hoja llamada "Movimientos" o "Despachos"
  const movName = names.find((n) => /movimientos|despachos|salidas/i.test(n));
  if (movName) return movName;
  // 2. Buscar hoja llamada "Stock" (sin "Base")
  const stockName = names.find((n) => /stock/i.test(n) && !/base/i.test(n));
  if (stockName) return stockName;
  // 3. Buscar hoja que tenga SKU + Cantidad en encabezados
  for (const n of names) {
    const ws = wb.Sheets[n];
    if (!ws || !ws["!ref"]) continue;
    const aoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "", raw: false });
    if (!aoa[0]) continue;
    const headers = aoa[0].map((h: any) => String(h ?? "").toLowerCase());
    const hasSku = headers.some((h: string) => /sku|c[oó]digo/.test(h));
    const hasQty = headers.some((h: string) => /cantidad|cant|qty|total/.test(h));
    if (hasSku && hasQty) return n;
  }
  // 4. Default: primera hoja
  return names[0];
}

// Exporta un SheetFile a .xlsx
export function exportFile(file: SheetFile): void {
  const aoa: (string | number)[][] = [];
  for (let r = 0; r < file.rowCount; r++) {
    const row: (string | number)[] = [];
    let hasData = false;
    for (let c = 0; c < file.colCount; c++) {
      const raw = file.cells[`${r},${c}`] ?? "";
      if (raw.startsWith("=")) {
        // escribir como fórmula real
        row[c] = raw as any; // SheetJS detecta el "=" ? No. hay que setear .f
      } else {
        const n = parseFloat(raw.replace(",", "."));
        if (raw !== "" && !isNaN(n) && /^-?[0-9.,]+$/.test(raw)) {
          row[c] = n;
        } else {
          row[c] = raw;
        }
      }
      if (raw !== "") hasData = true;
    }
    if (hasData || r < file.rowCount) aoa.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // volver a poner fórmulas reales
  for (let r = 0; r < file.rowCount; r++) {
    for (let c = 0; c < file.colCount; c++) {
      const raw = file.cells[`${r},${c}`] ?? "";
      if (raw.startsWith("=")) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = ws[addr] || {};
        cell.f = raw.slice(1);
        cell.t = "n";
        // calcular valor aproximado (SheetJS lo recalcula en Excel al abrir)
        ws[addr] = cell;
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, file.name.slice(0, 28) || "Hoja");
  XLSX.writeFile(wb, `${file.name || "lemcorp"}.xlsx`);
}

export { emptyFile };
