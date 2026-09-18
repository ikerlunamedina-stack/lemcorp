// API route /api/import-stock-excel — Parser de Excel de stock masivo (con series)
//
// Recibe un .xlsx con la estructura del reporte "Stock Detalle" de SpaceCom:
//   - Almacen, Ubicacion, SKU, Producto, UdM, Categoria, Propiedad, Serie_Lote
//   - Físico, Reservado, En Tránsito, Disponible, Observaciones
//
// Devuelve:
//   - Lista de productos a crear/actualizar en catálogo
//   - Lista de equipos a registrar (con serie) para items con serie
//   - Lista de items a granel (sin serie) para sumar al stock
//   - Validación de series duplicadas dentro del mismo Excel

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requiereSeriePorNombre } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export interface ItemStock {
  almacen: string;
  ubicacion: string;
  sku: string;
  producto: string;
  udm: string;
  categoria: string;
  propiedad: string;
  serie: string;
  fisico: number;
  reservado: number;
  enTransito: number;
  disponible: number;
  observaciones: string;
  requiereSerie: boolean;
  estado: "ok" | "sin_sku" | "sin_cantidad" | "duplicado_serie";
  observacion?: string;
}

export interface StockParseado {
  almacen: string;
  ubicacionPrincipal: string;
  propiedad: string;
  totalFilas: number;
  items: ItemStock[];
  // Resumen agrupado por SKU
  productosResumen: Array<{
    sku: string;
    producto: string;
    udm: string;
    categoria: string;
    cantidadGranel: number; // sin serie
    conSerie: number; // número de equipos con serie
    total: number;
    requiereSerie: boolean;
  }>;
  totalProductos: number;
  totalEquiposConSerie: number;
  totalItemsGranel: number;
  totalUnidades: number;
  seriesDuplicadas: Array<{ serie: string; fila1: number; fila2: number }>;
  itemsOK: number;
  itemsConError: number;
}

function parseNum(v: any): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { ok: false, error: "No se recibió ningún archivo" },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().match(/\.(xlsx|xls)$/)) {
      return NextResponse.json(
        { ok: false, error: "El archivo debe ser .xlsx o .xls" },
        { status: 400 }
      );
    }

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json(
        { ok: false, error: "El Excel no tiene hojas" },
        { status: 400 }
      );
    }
    const ws = wb.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

    if (rows.length < 2) {
      return NextResponse.json(
        { ok: false, error: "El Excel está vacío o no tiene filas" },
        { status: 400 }
      );
    }

    // Mapear columnas por nombre (con variantes)
    const header = rows[0].map((h) => String(h || "").trim().toLowerCase());
    const col: Record<string, number> = {};
    header.forEach((h, i) => { col[h] = i; });

    const findCol = (...names: string[]): number => {
      for (const n of names) {
        const idx = col[n.toLowerCase()];
        if (idx !== undefined) return idx;
      }
      return -1;
    };

    const idxAlm = findCol("Almacen", "Almacén");
    const idxUb = findCol("Ubicacion", "Ubicación");
    const idxSku = findCol("SKU", "Codigo", "Código");
    const idxProd = findCol("Producto", "Descripcion", "Descripción");
    const idxUdm = findCol("UdM", "Unidad", "Unidad de medida");
    const idxCat = findCol("Categoria", "Categoría");
    const idxProp = findCol("Propiedad");
    const idxSerie = findCol("Serie_Lote", "Serie", "Serie/Lote", "N° Serie");
    const idxFis = findCol("Físico", "Fisico", "Cantidad");
    const idxRes = findCol("Reservado");
    const idxTrans = findCol("En Tránsito", "En Transito", "EnTránsito");
    const idxDisp = findCol("Disponible");
    const idxObs = findCol("Observaciones", "Obs");

    if (idxSku < 0 && idxProd < 0) {
      return NextResponse.json(
        { ok: false, error: "No se encontraron columnas 'SKU' o 'Producto' en el Excel" },
        { status: 400 }
      );
    }

    const getStr = (r: any[], idx: number): string => {
      if (idx < 0) return "";
      const v = r[idx];
      return v === null || v === undefined ? "" : String(v).trim();
    };
    const getNum = (r: any[], idx: number): number => {
      if (idx < 0) return 0;
      return parseNum(r[idx]);
    };

    const items: ItemStock[] = [];
    const seriesVistas = new Map<string, number>(); // serie normalizada → primera fila
    const seriesDuplicadas: Array<{ serie: string; fila1: number; fila2: number }> = [];

    let almacenComun = "";
    let ubicacionComun = "";
    let propiedadComun = "";

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i] || [];
      const sku = getStr(r, idxSku);
      const producto = getStr(r, idxProd);
      const serie = getStr(r, idxSerie);

      // Saltar filas completamente vacías
      if (!sku && !producto && !serie) continue;

      const almacen = getStr(r, idxAlm);
      const ubicacion = getStr(r, idxUb);
      const propiedad = getStr(r, idxProp);

      if (almacen && !almacenComun) almacenComun = almacen;
      if (ubicacion && !ubicacionComun) ubicacionComun = ubicacion;
      if (propiedad && !propiedadComun) propiedadComun = propiedad;

      const fisico = getNum(r, idxFis);
      const reservado = getNum(r, idxRes);
      const enTransito = getNum(r, idxTrans);
      const disponible = getNum(r, idxDisp);

      // Determinar cantidad efectiva: si disponible > 0 usar disponible, sino fisico
      const cantidad = disponible > 0 ? disponible : fisico;

      const requiereSerie = requiereSeriePorNombre(producto) || !!serie;

      let estado: ItemStock["estado"] = "ok";
      let observacion: string | undefined;

      if (!sku && !producto) {
        estado = "sin_sku";
        observacion = "Sin SKU ni producto";
      } else if (cantidad <= 0 && !serie) {
        estado = "sin_cantidad";
        observacion = "Cantidad = 0";
      } else if (serie) {
        // Validar duplicados
        const serieNorm = serie.trim().toLowerCase();
        const filaPrev = seriesVistas.get(serieNorm);
        if (filaPrev !== undefined) {
          estado = "duplicado_serie";
          observacion = `Serie duplicada (primera aparición en fila ${filaPrev})`;
          seriesDuplicadas.push({ serie, fila1: filaPrev, fila2: i + 1 });
        } else {
          seriesVistas.set(serieNorm, i + 1);
        }
      }

      items.push({
        almacen,
        ubicacion,
        sku,
        producto,
        udm: getStr(r, idxUdm) || "UNIDAD",
        categoria: getStr(r, idxCat),
        propiedad,
        serie,
        fisico,
        reservado,
        enTransito,
        disponible: cantidad,
        observaciones: getStr(r, idxObs),
        requiereSerie,
        estado,
        observacion,
      });
    }

    // Resumen agrupado por SKU
    const prodMap = new Map<string, {
      sku: string; producto: string; udm: string; categoria: string;
      cantidadGranel: number; conSerie: number; requiereSerie: boolean;
    }>();

    for (const it of items) {
      if (it.estado !== "ok") continue;
      const key = it.sku || it.producto;
      if (!prodMap.has(key)) {
        prodMap.set(key, {
          sku: it.sku,
          producto: it.producto,
          udm: it.udm,
          categoria: it.categoria,
          cantidadGranel: 0,
          conSerie: 0,
          requiereSerie: it.requiereSerie,
        });
      }
      const p = prodMap.get(key)!;
      if (it.serie) {
        p.conSerie += 1; // cada serie = 1 equipo
      } else {
        p.cantidadGranel += it.disponible;
      }
      // Si algún item del producto requiere serie, todo el producto lo requiere
      if (it.requiereSerie) p.requiereSerie = true;
    }

    const productosResumen = Array.from(prodMap.values()).map((p) => ({
      ...p,
      total: p.conSerie + p.cantidadGranel,
    }));

    const totalEquiposConSerie = items.filter((it) => it.serie && it.estado === "ok").length;
    const totalItemsGranel = items.filter((it) => !it.serie && it.estado === "ok").reduce((s, it) => s + it.disponible, 0);
    const totalUnidades = totalEquiposConSerie + totalItemsGranel;
    const itemsOK = items.filter((it) => it.estado === "ok").length;
    const itemsConError = items.filter((it) => it.estado !== "ok").length;

    const resultado: StockParseado = {
      almacen: almacenComun,
      ubicacionPrincipal: ubicacionComun,
      propiedad: propiedadComun,
      totalFilas: items.length,
      items,
      productosResumen,
      totalProductos: productosResumen.length,
      totalEquiposConSerie,
      totalItemsGranel,
      totalUnidades,
      seriesDuplicadas,
      itemsOK,
      itemsConError,
    };

    return NextResponse.json({
      ok: true,
      fileName: file.name,
      stock: resultado,
      resumen: {
        totalFilas: items.length,
        totalProductos: productosResumen.length,
        totalEquiposConSerie,
        totalItemsGranel,
        totalUnidades,
        seriesDuplicadas: seriesDuplicadas.length,
        itemsOK,
        itemsConError,
      },
    });
  } catch (error: any) {
    console.error("Error en /api/import-stock-excel:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Error interno al procesar el Excel" },
      { status: 500 }
    );
  }
}
