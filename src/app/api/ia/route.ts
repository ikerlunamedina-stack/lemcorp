// API route para el asistente IA de LEMCORP WMS
// Usa z-ai-web-dev-sdk (GLM) en el backend, con análisis en tiempo real del inventario.
import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mensaje, inventario, equipos, miembros, despachos, empresa, usuario } = body;

    const productos = Array.isArray(inventario) ? inventario : [];
    const eqs = Array.isArray(equipos) ? equipos : [];
    const pers = Array.isArray(miembros) ? miembros : [];
    const desps = Array.isArray(despachos) ? despachos : [];
    const emp = typeof empresa === "object" && empresa ? (empresa as any) : {};
    const usuarioNombre = typeof usuario === "string" && usuario ? usuario : "operador";

    // ─── Análisis en tiempo real ───
    const bajoStock = productos.filter(
      (p: any) => p.minStock && p.minStock > 0 && p.quantity <= p.minStock
    );
    const stockAgotado = productos.filter((p: any) => p.quantity <= 0);
    const criticosTop10 = [...bajoStock]
      .sort((a: any, b: any) => (a.quantity / Math.max(a.minStock, 1)) - (b.quantity / Math.max(b.minStock, 1)))
      .slice(0, 10);

    const totalUnidades = productos.reduce((s: number, p: any) => s + (Number(p.quantity) || 0), 0);
    const valorCatalogo = productos.length;

    const equiposPorEstado = {
      disponible: eqs.filter((e: any) => e.estado === "disponible").length,
      averiado: eqs.filter((e: any) => e.estado === "averiado").length,
      en_retiro: eqs.filter((e: any) => e.estado === "en_retiro").length,
      en_reparacion: eqs.filter((e: any) => e.estado === "en_reparacion").length,
    };

    const tecnicos = pers.filter((m: any) => m.rol === "tecnico");
    const numTecnicos = tecnicos.length;

    const despachosHoy = desps.filter((d: any) => {
      try {
        const f = new Date(d.fecha);
        const hoy = new Date();
        return f.toDateString() === hoy.toDateString();
      } catch { return false; }
    });
    const unidadesDespachadasHoy = despachosHoy.reduce((s: number, d: any) => s + (Number(d.cantidad) || 0), 0);

    // ─── Construcción del inventario legible para el LLM ───
    const productosTxt = productos
      .map((p: any) => `- ${p.sku} | ${p.name} | Stock: ${p.quantity} ${p.udm || ""} | Mínimo: ${p.minStock || "N/A"}`)
      .join("\n");

    const bajoStockTxt = bajoStock.length > 0
      ? `\n\n⚠️ PRODUCTOS CON BAJO STOCK (URGENTE):\n${bajoStock
          .map((p: any) => `- ${p.sku} | ${p.name} | Stock actual: ${p.quantity} | Mínimo: ${p.minStock}`)
          .join("\n")}`
      : "\n\n✅ No hay productos con bajo stock actualmente.";

    const agotadoTxt = stockAgotado.length > 0
      ? `\n\n🚨 PRODUCTOS AGOTADOS:\n${stockAgotado.map((p: any) => `- ${p.sku} | ${p.name}`).join("\n")}`
      : "";

    const criticosTxt = criticosTop10.length > 0
      ? `\n\n🔴 TOP 10 PRODUCTOS CRÍTICOS:\n${criticosTop10
          .map((p: any, i: number) => `${i + 1}. ${p.sku} | ${p.name} | Stock: ${p.quantity} | Mín: ${p.minStock} | Ratio: ${(p.quantity / Math.max(p.minStock, 1)).toFixed(2)}`)
          .join("\n")}`
      : "";

    const equiposTxt = eqs.length > 0
      ? `\n\n📦 EQUIPOS REGISTRADOS: ${eqs.length} equipos\n` +
        `   - Disponibles: ${equiposPorEstado.disponible}\n` +
        `   - Averiados: ${equiposPorEstado.averiado}\n` +
        `   - En retiro: ${equiposPorEstado.en_retiro}\n` +
        `   - En reparación: ${equiposPorEstado.en_reparacion}`
      : "\n\n📦 No hay equipos registrados.";

    const miembrosTxt = pers.length > 0
      ? `\n\n👥 EQUIPO DE TRABAJO (${pers.length} personas, ${numTecnicos} técnicos):\n${pers
          .map((m: any) => `- ${m.nombre} | ${m.rol}${m.activo === false ? " (inactivo)" : ""}`)
          .join("\n")}`
      : "";

    const despachosTxt = `\n\n📤 DESPACHOS HOY: ${despachosHoy.length} (${unidadesDespachadasHoy} unidades enviadas)`;

    // ─── System prompt con 7 capacidades ───
    const systemPrompt = `Eres LEMCORP AI, el asistente experto en gestión de almacén para LEMCORP, el almacén central. LEMCORP despacha equipos y materiales a una empresa contratista (${emp.nombre || "LPS"} — contratista de Claro) que tiene técnicos en campo.

OPERADOR ACTUAL: ${usuarioNombre}
FECHA: ${new Date().toLocaleString("es-PE")}

═══════════════════════════════════════
TUS 7 CAPACIDADES PRINCIPALES:
═══════════════════════════════════════
1. 📊 ANÁLISIS DE STOCK: Detectar productos con bajo stock o agotados, calcular ratios de cobertura y priorizar compras.
2. 📈 CÁLCULO DE CONSUMO: Estimar el consumo mensual por técnico (router ONT: 2-3/día, conectores: 10/día, cable: 20m/día, decodificadores: 1-2/día) y proyectar necesidades.
3. 🛒 RECOMENDACIONES DE COMPRA: Sugerir qué productos pedir, en qué cantidad, justificando con datos (SKU, cantidad, justificación).
4. 📦 TRAZABILIDAD DE EQUIPOS: Reportar el estado de los equipos (disponibles, averiados, en reparación, en retiro).
5. 👥 GESTIÓN DE TÉCNICOS: Informar sobre el equipo de trabajo, cargas, distribución.
6. 🚨 ALERTAS TEMPRANAS: Anticipar quiebres de stock basándose en el ritmo de despacho.
7. 📋 REPORTES EJECUTIVOS: Generar resúmenes accionables del estado del almacén.

═══════════════════════════════════════
DATOS DEL INVENTARIO DEL ALMACÉN LEMCORP:
═══════════════════════════════════════
- Productos en catálogo: ${valorCatalogo}
- Total de unidades en stock: ${totalUnidades}
- Productos con bajo stock: ${bajoStock.length}
- Productos agotados: ${stockAgotado.length}
- Equipos registrados: ${eqs.length}

INVENTARIO DETALLADO:
${productosTxt}${bajoStockTxt}${agotadoTxt}${criticosTxt}${equiposTxt}${miembrosTxt}${despachosTxt}

═══════════════════════════════════════
INSTRUCCIONES DE RESPUESTA:
═══════════════════════════════════════
- Responde SIEMPRE en español peruano, claro y directo.
- Usa viñetas (•) y emojis con moderación para mejorar la legibilidad.
- Cuando recomiendes una compra, incluye: SKU del producto, cantidad sugerida, y justificación basada en datos reales del inventario.
- Sé específico con números: no digas "varios", di exactamente cuántos.
- Si detectas un problema urgente (stock crítico, agotado), márcalo con 🚨 al inicio de la línea.
- Si el operador te saluda, salúdalo por su nombre (${usuarioNombre}) y ofrece un resumen rápido del estado.
- Mantén un tono profesional pero cercano. Eres un colega experto, no un robot.
- Si no tienes datos suficientes, pídelos. No inventes cantidades.`;

    const zai = await ZAI.create();
    const response = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: mensaje },
      ],
      thinking: { type: "disabled" },
    });

    const respuesta =
      response.choices[0]?.message?.content ||
      "No pude procesar tu consulta. Por favor intenta de nuevo.";

    return NextResponse.json({ ok: true, respuesta });
  } catch (error: any) {
    console.error("Error en API IA:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Error interno" },
      { status: 500 }
    );
  }
}
