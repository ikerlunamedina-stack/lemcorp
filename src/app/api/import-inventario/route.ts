// API route para importar inventario completo desde Excel
// Recibe un archivo .xlsx, lo parsea y devuelve los productos en JSON
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ ok: false, error: "No se envió ningún archivo" }, { status: 400 });
    }

    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    if (rows.length < 2) {
      return NextResponse.json({ ok: false, error: "El Excel no tiene datos" }, { status: 400 });
    }

    const headers = (rows[0] || []).map((h: any) => (h ?? "").toString().trim().toLowerCase());
    const findIdx = (...names: string[]): number => {
      for (const n of names) {
        const idx = headers.findIndex((h: string) => h === n || h.includes(n));
        if (idx >= 0) return idx;
      }
      return -1;
    };

    const idx = {
      sku: findIdx("sku", "código", "codigo", "item"),
      nombre: findIdx("producto", "nombre", "descripción", "descripcion", "material"),
      cantidad: findIdx("físico", "fisico", "stock", "cantidad", "cant"),
      minimo: findIdx("mínimo", "minimo", "min", "stock mínimo"),
      udm: findIdx("unidad", "udm", "u.m."),
      categoria: findIdx("categoría", "categoria"),
      ubicacion: findIdx("ubicación", "ubicacion"),
      almacen: findIdx("almacén", "almacen"),
    };

    const productos: Array<{
      sku: string;
      nombre: string;
      cantidad: number;
      minStock?: number;
      udm?: string;
      categoria?: string;
      ubicacion?: string;
      almacen?: string;
    }> = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      const sku = idx.sku >= 0 ? (row[idx.sku] ?? "").toString().trim() : "";
      const nombre = idx.nombre >= 0 ? (row[idx.nombre] ?? "").toString().trim() : "";

      if (!sku && !nombre) continue;

      const cantidadRaw = idx.cantidad >= 0 ? row[idx.cantidad] : 0;
      const cantidad = Number(cantidadRaw) || 0;

      const minStockRaw = idx.minimo >= 0 ? row[idx.minimo] : null;
      const minStock = minStockRaw !== null && minStockRaw !== undefined ? Number(minStockRaw) || undefined : undefined;

      const udm = idx.udm >= 0 ? (row[idx.udm] ?? "").toString().trim() || undefined : undefined;
      const categoria = idx.categoria >= 0 ? (row[idx.categoria] ?? "").toString().trim() || undefined : undefined;
      const ubicacion = idx.ubicacion >= 0 ? (row[idx.ubicacion] ?? "").toString().trim() || undefined : undefined;
      const almacen = idx.almacen >= 0 ? (row[idx.almacen] ?? "").toString().trim() || undefined : undefined;

      productos.push({ sku, nombre, cantidad, minStock, udm, categoria, ubicacion, almacen });
    }

    return NextResponse.json({
      ok: true,
      productos,
      total: productos.length,
      fileName: file.name,
    });
  } catch (error: any) {
    console.error("Error importando inventario:", error);
    return NextResponse.json({ ok: false, error: error?.message || "Error al procesar el archivo" }, { status: 500 });
  }
}
