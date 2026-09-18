// API route para importar Excel de despachos (formato SpaceCom/operaciones)
// Recibe un archivo .xlsx, lo parsea y devuelve los despachos en JSON
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ ok: false, error: "No se envió ningún archivo" }, { status: 400 });
    }

    // Cargar xlsx dinámicamente
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convertir a JSON (header en fila 1)
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    if (rows.length < 2) {
      return NextResponse.json({ ok: false, error: "El Excel no tiene datos" }, { status: 400 });
    }

    const headers = rows[0] as string[];
    const normHeaders = headers.map((h) => (h ?? "").toString().trim().toLowerCase());

    const findIdx = (...names: string[]): number => {
      for (const n of names) {
        const idx = normHeaders.findIndex((h) => h === n || h.includes(n));
        if (idx >= 0) return idx;
      }
      return -1;
    };

    const idx = {
      tecnico: findIdx("empleado/técnico", "empleado/tecnico", "técnico", "tecnico", "responsable"),
      razonSocial: findIdx("razón social destino", "razon social destino"),
      sku: findIdx("sku", "código", "codigo"),
      producto: findIdx("producto", "descripción"),
      udm: findIdx("unidad", "udm"),
      cantidad: findIdx("cantidad", "cant"),
      fecha: findIdx("fecha traslado", "fecha"),
      destino: findIdx("razón social destino", "razon social destino", "destino"),
      obra: findIdx("obra"),
    };

    const despachos: any[] = [];
    let skipped = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      const sku = idx.sku >= 0 ? (row[idx.sku] ?? "").toString().trim() : "";
      const cantidadRaw = idx.cantidad >= 0 ? row[idx.cantidad] : 0;
      const cantidad = Number(cantidadRaw);

      if (!sku || !cantidad || isNaN(cantidad) || cantidad <= 0) {
        skipped++;
        continue;
      }

      // Técnico: preferir "Empleado/Técnico", si vacío usar "Razón Social Destino" (nombre del contratista)
      let tecnico = idx.tecnico >= 0 ? (row[idx.tecnico] ?? "").toString().trim() : "";
      if ((!tecnico || tecnico === "," || tecnico.length < 2) && idx.razonSocial >= 0) {
        tecnico = (row[idx.razonSocial] ?? "").toString().trim();
      }
      // Limpiar técnico (quitar comas sueltas)
      tecnico = tecnico.replace(/^[\s,]+|[\s,]+$/g, "").trim();

      const producto = idx.producto >= 0 ? (row[idx.producto] ?? "").toString().trim() : "";
      const udm = idx.udm >= 0 ? (row[idx.udm] ?? "").toString().trim() : "";
      const destino = idx.destino >= 0 ? (row[idx.destino] ?? "").toString().trim() : "";
      const obra = idx.obra >= 0 ? (row[idx.obra] ?? "").toString().trim() : "";

      let fecha: string = "";
      if (idx.fecha >= 0) {
        const fechaRaw = row[idx.fecha];
        if (fechaRaw instanceof Date) {
          fecha = fechaRaw.toISOString();
        } else if (fechaRaw) {
          // Intentar parsear como número (Excel serial date) o string
          const num = Number(fechaRaw);
          if (!isNaN(num) && num > 30000 && num < 60000) {
            // Excel serial date (días desde 1900-01-01)
            const parsed = new Date(Date.UTC(1899, 11, 30) + num * 86400000);
            fecha = parsed.toISOString();
          } else {
            const parsed = new Date(fechaRaw);
            fecha = isNaN(parsed.getTime()) ? "" : parsed.toISOString();
          }
        }
      }

      despachos.push({
        sku,
        cantidad,
        tecnico: tecnico || undefined,
        producto,
        udm,
        destino: destino || obra || undefined,
        fecha,
      });
    }

    return NextResponse.json({
      ok: true,
      despachos,
      total: despachos.length,
      skipped,
    });
  } catch (error: any) {
    console.error("Error parseando Excel:", error);
    return NextResponse.json({ ok: false, error: error?.message || "Error al procesar el Excel" }, { status: 500 });
  }
}
