// API route /api/import-recepcion-pdf — Parser de Guías de Remisión SUNAT (PDF)
//
// Recibe un PDF de Guía de Remisión Electrónica (formato SUNAT) y devuelve:
//   - RUC remitente, RUC destinatario, fecha, motivo, N° de guía
//   - Lista de materiales con SKU, descripción, unidad, cantidad y series (si aplica)
//
// Usa unpdf (serverless-friendly, sin dependencia de 'canvas') para extraer texto.

import { NextRequest, NextResponse } from "next/server";
import { extractTextItems, getDocumentProxy } from "unpdf";
import { requiereSeriePorNombre } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export interface MaterialRecepcion {
  sku: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  requiereSerie: boolean;
  series: string[];
  estado: "ok" | "falta_serie" | "sin_cantidad" | "sin_sku";
  observacion?: string;
}

export interface RecepcionParseada {
  nGuia: string;
  fechaTraslado: string;
  fechaEmision: string;
  motivoTraslado: string;
  descripcionMotivo: string;
  rucRemitente: string;
  nombreRemitente: string;
  puntoPartida: string;
  rucDestinatario: string;
  nombreDestinatario: string;
  puntoLlegada: string;
  observaciones: string;
  materiales: MaterialRecepcion[];
  totalUnidades: number;
  totalSeries: number;
  itemsOK: number;
  itemsConError: number;
}

/**
 * Extrae líneas del PDF agrupando items por su coordenada Y (mismo renglón = mismo Y).
 */
async function extractPdfLines(buf: Buffer): Promise<string[]> {
  const data = new Uint8Array(buf);
  const pdf = await getDocumentProxy(data);
  const result = await extractTextItems(pdf);
  // result.items es StructuredTextItem[][] (una página por sub-array)

  const lines: string[] = [];
  for (const pageItems of result.items) {
    // Agrupar items por Y (redondeado a 2 píxeles para tolerancia)
    const byY = new Map<number, { x: number; str: string }[]>();
    for (const item of pageItems) {
      const str = (item.str || "").trim();
      if (!str) continue;
      // unpdf StructuredTextItem tiene x e y como números directos
      const x = item.x;
      const y = Math.round(item.y);
      const yKey = Math.round(y / 2) * 2;
      if (!byY.has(yKey)) byY.set(yKey, []);
      byY.get(yKey)!.push({ x, str });
    }
    // Ordenar por Y descendente (arriba → abajo en PDF)
    const sortedYs = Array.from(byY.keys()).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const lineItems = byY.get(y)!.sort((a, b) => a.x - b.x);
      const line = lineItems.map((it) => it.str).join(" ").replace(/\s+/g, " ").trim();
      if (line) lines.push(line);
    }
  }
  return lines;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractAfter(allText: string, ...labels: string[]): string {
  for (const label of labels) {
    const re = new RegExp(escapeRegex(label) + "\\s*:?\\s*([^|\\n]{2,200}?)\\s{2,}", "i");
    const m = allText.match(re);
    if (m && m[1]) return m[1].trim();
  }
  return "";
}

function parseNumber(raw: string): number {
  if (!raw) return 0;
  const clean = raw.replace(/[^\d.,-]/g, "").trim();
  if (!clean) return 0;
  if (clean.includes(",") && clean.includes(".")) {
    return Number(clean.replace(/,/g, "")) || 0;
  }
  if (clean.includes(",") && !clean.includes(".")) {
    const parts = clean.split(",");
    if (parts[0].length >= 3) return Number(parts.join("")) || 0;
    return Number(clean.replace(",", ".")) || 0;
  }
  return Number(clean) || 0;
}

const UNIDADES = [
  "UNIDAD \\(NIU\\)", "UNIDAD", "NIU",
  "METRO", "METROS", "MTR", "MTR\\.",
  "KILOGRAMO", "KGM", "KG",
  "LITRO", "LITROS",
  "CAJA", "CAJAS",
  "BOLSA", "BOLSAS",
  "PAQUETE", "PACK",
  "ROLLO", "ROLLIZO",
  "CENTIMETRO", "CM",
  "MILLAR", "DOCENA", "DOC",
  "METRO LINEAL", "M\\.",
  "UNID",
];

/**
 * Detecta si un token es una serie individual (8-25 chars alfanuméricos, no es número ni fecha).
 */
function esSerie(token: string): boolean {
  const clean = token.replace(/[.,;:]+$/, "").trim();
  if (clean.length < 8 || clean.length > 25) return false;
  if (!/\d/.test(clean)) return false;
  if (!/[A-Za-z]/.test(clean)) return false;
  if (/^[\d.,]+$/.test(clean)) return false;
  if (/^\d+$/.test(clean)) return false;
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(clean)) return false;
  return true;
}

function esSerieEnLinea(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const tokens = trimmed.split(/\s+/);
  if (tokens.length === 1 && esSerie(tokens[0])) return tokens[0];
  if (tokens.length > 1 && tokens.every(esSerie)) return tokens[0];
  if (esSerie(trimmed) && trimmed.length <= 30) return trimmed;
  return null;
}

function findUnidad(tokens: string[]): { idx: number; matched: string } | null {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i].toUpperCase();
    for (const u of UNIDADES) {
      const re = new RegExp(`^${u}$`, "i");
      if (re.test(t)) return { idx: i, matched: tokens[i] };
    }
  }
  return null;
}

/**
 * Parser robusto:
 *   1. Recorre las líneas en orden.
 *   2. Cuando una línea tiene "NO"/"SI" (bien normalizado) + SKU + unidad + cantidad
 *      → marca el inicio de un item.
 *   3. Las líneas siguientes que sean SOLO series se acumulan como series del item.
 *   4. El item termina cuando se encuentra otra línea item.
 */
function parsearMateriales(lines: string[]): MaterialRecepcion[] {
  const materiales: MaterialRecepcion[] = [];

  let currentItem: Partial<MaterialRecepcion> & { series: string[] } | null = null;
  // Si un SKU aparece solo en su línea (caso: "4007984" solo, seguido de
  // "1 NO DECODIFICADOR... UNIDAD (NIU) 24.00"), lo recordamos para el próximo item.
  let lastSkuStandalone: string | null = null;

  const flush = () => {
    if (!currentItem) return;
    if (currentItem.sku && currentItem.descripcion) {
      const item: MaterialRecepcion = {
        sku: currentItem.sku,
        descripcion: currentItem.descripcion,
        unidad: currentItem.unidad || "UNIDAD",
        cantidad: currentItem.cantidad || 0,
        requiereSerie: (currentItem.requiereSerie ?? requiereSeriePorNombre(currentItem.descripcion)) || ((currentItem.series?.length || 0) > 0),
        series: currentItem.series || [],
        estado: "ok",
      };
      if (item.cantidad <= 0) {
        item.estado = "sin_cantidad";
        item.observacion = "Cantidad inválida o no detectada";
      } else if (item.requiereSerie && item.series.length < item.cantidad) {
        item.estado = "falta_serie";
        item.observacion = `Faltan ${item.cantidad - item.series.length} serie(s) para ${item.cantidad} unidad(es)`;
      }
      materiales.push(item);
    }
    currentItem = null;
  };

  for (const line of lines) {
    if (!line) continue;

    // ¿Es una línea de serie sola?
    const serieUnica = esSerieEnLinea(line);
    if (serieUnica && currentItem) {
      currentItem.series!.push(serieUnica);
      continue;
    }

    const tokens = line.split(/\s+/);
    const noIdx = tokens.findIndex((t) => t === "NO" || t === "SI");
    const skuIdx = tokens.findIndex((t) => /^\d{6,8}$/.test(t));
    const unidadMatch = findUnidad(tokens);
    const lastNumMatch = line.match(/([\d.,]+(?:\s*\.\d+)?)\s*(?:NO|SI)?\s*$/i);

    // Si hay NO/SI o SKU + unidad, es un item
    if ((noIdx >= 0 || skuIdx >= 0) && unidadMatch) {
      flush();
      const sku = skuIdx >= 0 ? tokens[skuIdx] : (lastSkuStandalone || "");
      const unidad = unidadMatch.matched.toUpperCase().replace(/\s+/g, " ");
      const cantidad = lastNumMatch ? parseNumber(lastNumMatch[1]) : 0;

      let descStart: number;
      const descEnd = unidadMatch.idx;

      if (skuIdx >= 0 && noIdx >= 0 && skuIdx > noIdx && skuIdx < descEnd) {
        descStart = skuIdx + 1;
      } else if (noIdx >= 0) {
        descStart = noIdx + 1;
      } else if (skuIdx >= 0) {
        descStart = skuIdx + 1;
      } else {
        descStart = 0;
      }

      const descTokens = tokens.slice(descStart, descEnd).filter((t) =>
        t !== "NO" && t !== "SI" && !/^\d{6,8}$/.test(t)
      );
      const descripcionRaw = descTokens.join(" ").trim() || (sku ? `(SKU ${sku})` : "");

      const seriesEnLinea = descTokens.filter(esSerie);
      let descLimpia = descripcionRaw;
      for (const s of seriesEnLinea) {
        descLimpia = descLimpia.replace(s, "").trim();
      }
      descLimpia = descLimpia.replace(/\s+/g, " ").trim() || descripcionRaw;

      const requiereSerie = requiereSeriePorNombre(descLimpia) || seriesEnLinea.length > 0;

      currentItem = {
        sku,
        descripcion: descLimpia,
        unidad,
        cantidad,
        requiereSerie,
        series: [...seriesEnLinea],
      };
      lastSkuStandalone = null;
    } else if (skuIdx >= 0 && tokens.length === 1) {
      // SKU solo en su línea → recordar para el próximo item
      lastSkuStandalone = tokens[skuIdx];
    }
  }
  flush();

  return materiales;
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

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { ok: false, error: "El archivo debe ser un PDF" },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const lines = await extractPdfLines(buf);
    const allText = lines.join(" ");

    // Extraer metadatos de la cabecera de la guía SUNAT
    const rucRemitente = (allText.match(/RUC\s*N[°º]?\s*(\d{8,11})/i)?.[1] ?? "").trim();
    const fechaTraslado = (allText.match(/Fecha de inicio de Traslado\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i)?.[1] ?? "").trim();
    const fechaEmision = (allText.match(/Fecha y hora de emisión\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4}(?:\s+\d{1,2}:\d{2}\s*[AP]M)?)/i)?.[1] ?? "").trim();
    const motivoTraslado = (allText.match(/Motivo de Traslado\s*:?\s*([A-ZÁÉÍÓÚ\s]+?)(?:Punto|Fecha|Descripción)/i)?.[1] ?? "").trim();
    const descripcionMotivo = (allText.match(/Descripción de Motivo\s*:?\s*([A-ZÁÉÍÓÚ\s]+?)(?:Fecha|Datos|Bienes)/i)?.[1] ?? "").trim();
    const nGuia = (allText.match(/N[°º]\s*((?:[A-Z]{1,4}\d{2}-\s*\d+)|(?:F\d{3}-\s*\d+))/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
    const rucDestinatario = (allText.match(/REGISTRO ÚNICO DE CONTRIBUYENTES\s*N[°º]?\s*(\d{8,11})/i)?.[1] ?? "").trim();
    const nombreDestinatario = (allText.match(/Datos del Destinatario\s*:?\s*([A-ZÁÉÍÓÚ][A-ZÁÉÍÓÚ\s\.]{3,80}?)(?:\s*-\s*REGISTRO)/i)?.[1] ?? "").trim();
    const puntoPartida = (allText.match(/Punto de Partida\s+([A-ZÁÉÍÓÚ0-9\s\.\-]{5,120}?)(?:Fecha|Motivo)/i)?.[1] ?? "").trim();
    const puntoLlegada = (allText.match(/Punto de llegada\s+([A-ZÁÉÍÓÚ0-9\s\.\-]{5,120}?)(?:Fecha|Motivo|Datos)/i)?.[1] ?? "").trim();
    const observaciones = (allText.match(/Observaciones\s*:?\s*([A-ZÁÉÍÓÚ0-9\s\.\-]{3,100}?)(?:Esta es|Modalidad|Indicador)/i)?.[1] ?? "").trim();
    const nombreRemitente = (allText.match(/(?:CORPORACION\s+)([A-ZÁÉÍÓÚ\s\.]{5,80}?)(?:\s+E\.I\.R\.L|\s+S\.A\.C|\s+S\.R\.L|\s+RUC)/i)?.[1] ?? "").trim() || "LEMCORP";

    // Materiales
    const materiales = parsearMateriales(lines);

    const totalUnidades = materiales.reduce((s, m) => s + m.cantidad, 0);
    const totalSeries = materiales.reduce((s, m) => s + m.series.length, 0);
    const itemsOK = materiales.filter((m) => m.estado === "ok").length;
    const itemsConError = materiales.filter((m) => m.estado !== "ok").length;

    const recepcion: RecepcionParseada = {
      nGuia,
      fechaTraslado,
      fechaEmision,
      motivoTraslado,
      descripcionMotivo: descripcionMotivo || motivoTraslado,
      rucRemitente,
      nombreRemitente,
      puntoPartida,
      rucDestinatario,
      nombreDestinatario,
      puntoLlegada,
      observaciones,
      materiales,
      totalUnidades,
      totalSeries,
      itemsOK,
      itemsConError,
    };

    return NextResponse.json({
      ok: true,
      fileName: file.name,
      recepcion,
      resumen: {
        nMateriales: materiales.length,
        totalUnidades,
        totalSeries,
        itemsOK,
        itemsConError,
      },
    });
  } catch (error: any) {
    console.error("Error en /api/import-recepcion-pdf:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Error interno al parsear el PDF" },
      { status: 500 }
    );
  }
}
