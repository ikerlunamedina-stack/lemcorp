// Import/Export de archivos Excel usando SheetJS (xlsx)
import * as XLSX from "xlsx";
import type { SheetFile } from "./types";

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

// Lee un archivo .xlsx/.xls/.csv y devuelve un SheetFile
export async function importFile(file: File): Promise<SheetFile> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellFormula: true });

  // Elegir la hoja con datos de movimientos/despachos (preferir "Movimientos"
  // o la que tenga columnas SKU + Cantidad). Por defecto, la primera.
  const targetSheet = pickBestSheet(wb);
  const ws = wb.Sheets[targetSheet];

  // Construimos array de arrays para conservar fórmulas
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  const rowCount = Math.max(range.e.r - range.s.r + 1, 30);
  const colCount = Math.max(range.e.c - range.s.c + 1, 8);

  const sf: SheetFile = {
    id: uid(),
    name: file.name.replace(/\.(xlsx|xls|csv)$/i, ""),
    tag: "otro",
    tagConfirmed: false,
    rowCount,
    colCount,
    cells: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (!cell) continue;
      let val = "";
      if (cell.f) {
        // fórmula -> la conservamos
        val = "=" + cell.f.toUpperCase();
      } else if (cell.v !== undefined && cell.v !== null) {
        if (cell.t === "n") {
          val = String(cell.v);
        } else if (cell.t === "d") {
          try {
            const d = cell.w || cell.v;
            val = String(d);
          } catch {
            val = String(cell.v);
          }
        } else {
          val = String(cell.v);
        }
      }
      if (val !== "") {
        sf.cells[`${r},${c}`] = val;
      }
    }
  }
  return sf;
}

// Elige la mejor hoja del workbook. Prioriza "Movimientos" o cualquier hoja
// que tenga encabezados SKU + Cantidad (indicador de despachos).
function pickBestSheet(wb: XLSX.WorkBook): string {
  const names = wb.SheetNames;
  // 1. Buscar hoja llamada "Movimientos" o "Despachos"
  const movName = names.find((n) => /movimientos|despachos|salidas/i.test(n));
  if (movName) return movName;
  // 2. Buscar hoja que tenga SKU + Cantidad en encabezados
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
  // 3. Default: primera hoja
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
