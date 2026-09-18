// API route /api/import-operaciones — Parser de Excel de operaciones LEMCORP
//
// Recibe un .xlsx con la estructura del reporte "Operaciones" de SpaceCom:
//   - Nº Operación, Tipo (IN/OUT/INT), Tipo de Operación, Proyecto Macro, Obra
//   - Almacén Origen, Ubicación Origen, Almacén Destino, Ubicación Destino
//   - Razón Social Destino, RUC/DNI Destino, Guía de Remisión
//   - Fecha Traslado, Responsable, Empleado/Técnico
//   - SKU, Producto, Unidad, Cantidad, Precio Unitario, Serie
//
// Devuelve las operaciones agrupadas por Nº Operación con todos sus items,
// indicando para cada uno si requiere serie (por nombre de producto) y si
// efectivamente trae series válidas en el Excel.

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requiereSeriePorNombre } from "@/lib/types";

export const runtime = "nodejs";

export interface ItemOperacion {
  sku: string;
  producto: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  requiereSerie: boolean;
  series: string[];
  seriesFaltantes: number; // series que faltan para cubrir la cantidad
  seriesSobrantes: number; // series que sobran (más que la cantidad)
  estado: "ok" | "falta_serie" | "sobran_series" | "sin_cantidad" | "sin_sku";
  observacion?: string;
}

export interface OperacionAgrupada {
  nOperacion: string;
  flujo: "IN" | "OUT" | "INT";
  tipoOperacion: string;
  proyectoMacro?: string;
  obra?: string;
  codigoPep?: string;
  almacenOrigen: string;
  ubicacionOrigen: string;
  almacenDestino: string;
  ubicacionDestino: string;
  razonSocialDestino: string;
  rucDniDestino: string;
  guiaRemision: string;
  responsable: string;
  tecnico: string;
  fechaTraslado: number | null;
  estadoOp: string;
  observaciones: string;
  items: ItemOperacion[];
  totalUnidades: number;
  totalSeries: number;
  totalPrecio: number;
  // Resumen de validación
  itemsOK: number;
  itemsConError: number;
  seriesFaltantesTotal: number;
}

function parseFechaTraslado(value: any): number | null {
  if (!value && value !== 0) return null;
  // Excel numérico (fecha serial)
  if (typeof value === "number") {
    // Excel epoch: 1899-12-30 + value días
    const ms = (value - 25569) * 86400 * 1000;
    if (isFinite(ms) && ms > 0 && ms < Date.now() + 365 * 86400 * 1000) {
      return ms;
    }
  }
  if (value instanceof Date) return value.getTime();
  const s = String(value).trim();
  if (!s) return null;
  // Probar formatos dd/mm/yyyy
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m1) {
    const d = new Date(+m1[3], +m1[2] - 1, +m1[1]);
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.getTime();
}

function splitSeries(value: any): string[] {
  if (!value) return [];
  const s = String(value).trim();
  if (!s) return [];
  // Las series vienen separadas por saltos de línea (\n) o por comas en algunos casos
  return s
    .split(/[\n\r,;]+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
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
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: "",
    });

    if (rows.length < 2) {
      return NextResponse.json(
        { ok: false, error: "El Excel está vacío o no tiene filas" },
        { status: 400 }
      );
    }

    const header = rows[0].map((h) => String(h || "").trim());
    const colIdx: Record<string, number> = {};
    header.forEach((h, i) => {
      colIdx[h.toLowerCase()] = i;
    });

    // Helper para buscar columna por variantes de nombre
    const findCol = (...names: string[]): number => {
      for (const n of names) {
        const idx = colIdx[n.toLowerCase()];
        if (idx !== undefined) return idx;
      }
      return -1;
    };

    const idxOp = findCol("Nº Operación", "N Operación", "Operacion", "N° Operación");
    const idxFlujo = findCol("Tipo (IN/OUT/INT)", "Tipo IN/OUT/INT", "Tipo");
    const idxEstadoOp = findCol("Estado");
    const idxTipoOp = findCol("Tipo de Operación", "Tipo Operación");
    const idxProyecto = findCol("Proyecto Macro");
    const idxObra = findCol("Obra");
    const idxPep = findCol("Código PEP", "Codigo PEP");
    const idxAlmO = findCol("Almacén Origen", "Almacen Origen");
    const idxUbO = findCol("Ubicación Origen", "Ubicacion Origen");
    const idxAlmD = findCol("Almacén Destino", "Almacen Destino");
    const idxUbD = findCol("Ubicación Destino", "Ubicacion Destino");
    const idxRazon = findCol("Razón Social Destino", "Razon Social Destino");
    const idxRuc = findCol("RUC/DNI Destino", "RUC DNI Destino");
    const idxGuia = findCol("Guía de Remisión", "Guia de Remision");
    const idxFecha = findCol("Fecha Traslado");
    const idxResp = findCol("Responsable");
    const idxTec = findCol("Empleado/Técnico", "Empleado Tecnico", "Tecnico");
    const idxInstr = findCol("Instrucciones");
    const idxObs = findCol("Observaciones");
    const idxSku = findCol("SKU");
    const idxProd = findCol("Producto");
    const idxUni = findCol("Unidad");
    const idxCant = findCol("Cantidad");
    const idxPrecio = findCol("Precio Unitario");
    const idxSerie = findCol("Serie");
    const idxNotas = findCol("Notas por línea");

    const getStr = (row: any[], idx: number): string => {
      if (idx < 0) return "";
      const v = row[idx];
      if (v === null || v === undefined) return "";
      return String(v).trim();
    };
    const getNum = (row: any[], idx: number): number => {
      if (idx < 0) return 0;
      const v = row[idx];
      if (v === null || v === undefined || v === "") return 0;
      const n = Number(v);
      return isFinite(n) ? n : 0;
    };

    // Agrupar por Nº Operación
    const operacionesMap = new Map<string, OperacionAgrupada>();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const nOp = getStr(row, idxOp);
      // Si la fila no tiene nada, saltar
      if (!nOp && !getStr(row, idxSku) && !getStr(row, idxProd)) continue;

      const sku = getStr(row, idxSku);
      const producto = getStr(row, idxProd);
      const cantidad = getNum(row, idxCant);
      const series = idxSerie >= 0 ? splitSeries(row[idxSerie]) : [];
      const requiereSerie = requiereSeriePorNombre(producto) || series.length > 0;

      // Validación por item
      let estado: ItemOperacion["estado"] = "ok";
      let observacion: string | undefined;
      let seriesFaltantes = 0;
      let seriesSobrantes = 0;

      if (!sku && !producto) {
        estado = "sin_sku";
        observacion = "Sin SKU ni producto";
      } else if (cantidad <= 0) {
        estado = "sin_cantidad";
        observacion = "Cantidad = 0 o inválida";
      } else if (requiereSerie) {
        if (series.length < cantidad) {
          seriesFaltantes = cantidad - series.length;
          estado = "falta_serie";
          observacion = `Faltan ${seriesFaltantes} serie(s) para cubrir ${cantidad} unidad(es)`;
        } else if (series.length > cantidad) {
          seriesSobrantes = series.length - cantidad;
          estado = "sobran_series";
          observacion = `Hay ${seriesSobrantes} serie(s) de más para ${cantidad} unidad(es)`;
        } else {
          estado = "ok";
        }
      }

      const item: ItemOperacion = {
        sku,
        producto,
        unidad: getStr(row, idxUni),
        cantidad,
        precioUnitario: getNum(row, idxPrecio),
        requiereSerie,
        series,
        seriesFaltantes,
        seriesSobrantes,
        estado,
        observacion,
      };

      // Buscar o crear operación
      let op = operacionesMap.get(nOp);
      if (!op) {
        op = {
          nOperacion: nOp,
          flujo: (() => {
            const f = getStr(row, idxFlujo).toUpperCase().trim();
            if (f === "OUT" || f.startsWith("OUT")) return "OUT";
            if (f === "INT" || f.startsWith("INT")) return "INT";
            if (f === "IN" || f.startsWith("IN")) return "IN";
            return "INT";
          })() as "IN" | "OUT" | "INT",
          tipoOperacion: getStr(row, idxTipoOp),
          proyectoMacro: getStr(row, idxProyecto),
          obra: getStr(row, idxObra),
          codigoPep: getStr(row, idxPep),
          almacenOrigen: getStr(row, idxAlmO),
          ubicacionOrigen: getStr(row, idxUbO),
          almacenDestino: getStr(row, idxAlmD),
          ubicacionDestino: getStr(row, idxUbD),
          razonSocialDestino: getStr(row, idxRazon),
          rucDniDestino: getStr(row, idxRuc),
          guiaRemision: getStr(row, idxGuia),
          responsable: getStr(row, idxResp),
          tecnico: getStr(row, idxTec) || getStr(row, idxRazon),
          fechaTraslado: idxFecha >= 0 ? parseFechaTraslado(row[idxFecha]) : null,
          estadoOp: getStr(row, idxEstadoOp),
          observaciones: getStr(row, idxObs) || getStr(row, idxNotas) || getStr(row, idxInstr),
          items: [],
          totalUnidades: 0,
          totalSeries: 0,
          totalPrecio: 0,
          itemsOK: 0,
          itemsConError: 0,
          seriesFaltantesTotal: 0,
        };
        operacionesMap.set(nOp, op);
      }

      op.items.push(item);
      op.totalUnidades += cantidad;
      op.totalSeries += series.length;
      op.totalPrecio += cantidad * item.precioUnitario;
      if (estado === "ok") op.itemsOK++;
      else op.itemsConError++;
      op.seriesFaltantesTotal += seriesFaltantes;
    }

    const operaciones = Array.from(operacionesMap.values());

    return NextResponse.json({
      ok: true,
      fileName: file.name,
      operaciones,
      resumen: {
        totalOperaciones: operaciones.length,
        totalItems: operaciones.reduce((s, o) => s + o.items.length, 0),
        totalUnidades: operaciones.reduce((s, o) => s + o.totalUnidades, 0),
        totalSeries: operaciones.reduce((s, o) => s + o.totalSeries, 0),
        itemsOK: operaciones.reduce((s, o) => s + o.itemsOK, 0),
        itemsConError: operaciones.reduce((s, o) => s + o.itemsConError, 0),
        seriesFaltantesTotal: operaciones.reduce((s, o) => s + o.seriesFaltantesTotal, 0),
      },
    });
  } catch (error: any) {
    console.error("Error en /api/import-operaciones:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Error interno" },
      { status: 500 }
    );
  }
}
