// API route para el asistente IA de LEMCORP
// Usa z-ai-web-dev-sdk (GLM) para responder con datos reales del inventario
import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mensaje, inventario, equipos, miembros, empresa } = body;

    const productosTxt = (inventario || [])
      .map((p: any) => `- ${p.sku} | ${p.name} | Stock: ${p.quantity} ${p.udm || ""} | Mínimo: ${p.minStock || "N/A"}`)
      .join("\n");

    const bajoStock = (inventario || []).filter((p: any) => p.minStock && p.minStock > 0 && p.quantity <= p.minStock);
    const bajoStockTxt = bajoStock.length > 0
      ? `\n\nPRODUCTOS CON BAJO STOCK (URGENTE):\n${bajoStock.map((p: any) => `- ${p.sku} | ${p.name} | Stock actual: ${p.quantity} | Mínimo: ${p.minStock}`).join("\n")}`
      : "\n\nNo hay productos con bajo stock actualmente.";

    const equiposTxt = equipos ? `\n\nEQUIPOS REGISTRADOS: ${equipos.length} equipos` : "";
    const numTecnicos = (miembros || []).filter((m: any) => m.rol === "tecnico").length;
    const miembrosTxt = miembros && miembros.length > 0
      ? `\n\nEQUIPO DE TRABAJO (${miembros.length} personas, ${numTecnicos} técnicos):\n${miembros.map((m: any) => `- ${m.nombre} | ${m.rol} | ${m.correo || ""}`).join("\n")}`
      : "";

    const systemPrompt = `Eres un asistente experto en gestión de almacén para LEMCORP, empresa de telecomunicaciones en Perú.

Tu trabajo: ayudar al jefe de operaciones y supervisores a decidir qué productos pedir y gestionar el inventario.

DATOS DEL INVENTARIO:
${productosTxt}${bajoStockTxt}${equiposTxt}${miembrosTxt}

INSTRUCCIONES:
- Analiza stock actual vs mínimos
- Si un producto está bajo el mínimo, recomiéndalo urgente
- Calcula consumo: si hay ${numTecnicos} técnicos, cada uno despacha ~2-3 routers ONT/día, ~10 conectores/día, ~20m cable/día
- Estima consumo mensual y recomienda cantidades a pedir
- Menciona SKU, cantidad sugerida, y justifica
- Responde en español, claro y directo con viñetas`;

    const zai = await ZAI.create();
    const response = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: mensaje },
      ],
      thinking: { type: "disabled" },
    });

    const respuesta = response.choices[0]?.message?.content || "No pude procesar tu consulta.";

    return NextResponse.json({ ok: true, respuesta });
  } catch (error: any) {
    console.error("Error en API IA:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Error interno" },
      { status: 500 }
    );
  }
}
