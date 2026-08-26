/* eslint-disable @typescript-eslint/no-require-imports */
// API route para importar pedidos de material (PDF o Excel)
import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import * as fs from "fs";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ ok: false, error: "No se envió ningún archivo" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const buffer = await file.arrayBuffer();

    let pedidos: Array<{ sku: string; nombre: string; cantidad: number; udm?: string }> = [];

    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      // ===== Parsear Excel =====
      const XLSX = await import("xlsx");
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
        nombre: findIdx("nombre", "producto", "descripción", "descripcion", "material"),
        cantidad: findIdx("cantidad", "cant", "qty", "solicitado"),
        udm: findIdx("unidad", "udm", "u.m."),
      };

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        const sku = idx.sku >= 0 ? (row[idx.sku] ?? "").toString().trim() : "";
        const nombre = idx.nombre >= 0 ? (row[idx.nombre] ?? "").toString().trim() : "";
        const cantidadRaw = idx.cantidad >= 0 ? row[idx.cantidad] : 0;
        const cantidad = Number(cantidadRaw);
        const udm = idx.udm >= 0 ? (row[idx.udm] ?? "").toString().trim() : undefined;

        if (sku || nombre) {
          pedidos.push({ sku, nombre, cantidad: isNaN(cantidad) ? 0 : cantidad, udm });
        }
      }
    } else if (fileName.endsWith(".pdf")) {
      // ===== Parsear PDF =====
      let textoPdf = "";
      const tmpFile = `/tmp/pedido-${Date.now()}.pdf`;
      const tmpTxt = `/tmp/pedido-${Date.now()}.txt`;

      fs.writeFileSync(tmpFile, Buffer.from(buffer));

      try {
        // Intentar con pdftotext (poppler-utils)
        execSync(`pdftotext "${tmpFile}" "${tmpTxt}" 2>/dev/null`, { timeout: 10000 });
        textoPdf = fs.readFileSync(tmpTxt, "utf8");
      } catch {
        // Si pdftotext no funciona, intentar con pdf-parse
        try {
          const pdfParse = require("pdf-parse");
          const pdfData = await pdfParse(Buffer.from(buffer));
          textoPdf = pdfData.text;
        } catch {
          // Último recurso: usar VLM del SDK
          textoPdf = "";
        }
      }

      // Limpiar temporales
      try { fs.unlinkSync(tmpFile); } catch {}
      try { fs.unlinkSync(tmpTxt); } catch {}

      if (!textoPdf || textoPdf.trim().length === 0) {
        return NextResponse.json({ ok: false, error: "No se pudo extraer texto del PDF." }, { status: 400 });
      }

      // Enviar el texto a la IA para estructurarlo
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = await ZAI.create();

      const iaResponse = await zai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "Eres un asistente que extrae información de pedidos de material. Devuelves SOLO un array JSON válido, sin texto adicional ni markdown.",
          },
          {
            role: "user",
            content: `Extrae todos los productos de este texto de pedido. Para cada producto devuelve: sku, nombre, cantidad (número) y udm (unidad de medida).

Texto del PDF:
${textoPdf.substring(0, 8000)}

Responde SOLO con un array JSON válido en este formato:
[{"sku": "123456", "nombre": "PRODUCTO EJEMPLO", "cantidad": 100, "udm": "UNIDADES"}]`,
          },
        ],
        thinking: { type: "disabled" },
      });

      const contenido = iaResponse.choices[0]?.message?.content || "";

      const jsonMatch = contenido.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          pedidos = JSON.parse(jsonMatch[0]);
        } catch {
          return NextResponse.json({
            ok: false,
            error: "La IA procesó el PDF pero no pudo estructurar los productos.",
          }, { status: 400 });
        }
      } else {
        return NextResponse.json({
          ok: false,
          error: "No se encontraron productos en el PDF.",
        }, { status: 400 });
      }
    } else {
      return NextResponse.json({ ok: false, error: "Formato no soportado. Usa .xlsx, .xls o .pdf" }, { status: 400 });
    }

    const validos = pedidos.filter((p) => p.sku || p.nombre);

    return NextResponse.json({
      ok: true,
      pedidos: validos,
      total: validos.length,
      fileName: file.name,
    });
  } catch (error: any) {
    console.error("Error importando pedido:", error);
    return NextResponse.json({ ok: false, error: error?.message || "Error al procesar el archivo" }, { status: 500 });
  }
}
