// API route para Alana — asistente del almacén VRS con Groq (Llama 3.3 70B) + RAG
// Sistema SIMPLE: system prompt corto + datos del inventario + knowledge base + Groq
import { NextRequest, NextResponse } from "next/server";
import { buscarConocimiento, buscarContextoConocimiento } from "@/lib/warehouse-knowledge";

export const runtime = "nodejs";

// ─── Groq (Llama 3.3 70B) ───
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

interface ProductDTO {
  sku: string;
  name: string;
  quantity: number;
  minStock?: number;
  udm?: string;
  precio?: number;
  categoria?: string;
}

interface EquipmentDTO {
  id: string;
  serie: string;
  modelo: string;
  estado: string;
  ubicacion?: string;
}

interface DespachoDTO {
  id: string;
  fecha: number;
  sku: string;
  producto?: string;
  cantidad: number;
  tecnico?: string;
  destino?: string;
}

interface MiembroDTO {
  id: string;
  nombre: string;
  rol: string;
}

function daysAgo(n: number): number {
  return new Date(Date.now() - n * 86400_000).getTime();
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let requestId = "no-id";

  try {
    const body = await req.json();
    requestId = body.requestId || "no-id";
    const { mensaje, historial, inventario, equipos, miembros, despachos, empresa, usuario } = body;

    const productos: ProductDTO[] = Array.isArray(inventario) ? inventario : [];
    const eqs: EquipmentDTO[] = Array.isArray(equipos) ? equipos : [];
    const pers: MiembroDTO[] = Array.isArray(miembros) ? miembros : [];
    const desps: DespachoDTO[] = Array.isArray(despachos) ? despachos : [];
    const usuarioNombre = typeof usuario === "string" && usuario ? usuario : "operador";
    // memoriaAprendida ELIMINADA — el sistema de [[MEMORIA]] fue borrado.
    // Las memorias viejas del sistema anterior pueden contener datos sensibles
    // (como API keys) que se filtrarían al LLM. No incluir nada.
    const historialMsgs: Array<{ role: string; content: string }> = Array.isArray(historial)
      ? historial.filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      : [];

    // ─── Datos del inventario en texto legible ───
    const totalUnidades = productos.reduce((s, p) => s + p.quantity, 0);
    const bajoStock = productos.filter(p => p.minStock && p.minStock > 0 && p.quantity <= p.minStock);
    const agotados = productos.filter(p => p.quantity === 0);
    const valorTotal = productos.reduce((s, p) => s + (p.precio || 0) * p.quantity, 0);

    const productosTxt = productos.slice(0, 80).map(p =>
      `- ${p.sku} | ${p.name} | Stock: ${p.quantity} ${p.udm || ""} | Mín: ${p.minStock || "N/A"}`
    ).join("\n");

    const bajoStockTxt = bajoStock.length > 0
      ? `\n\nPRODUCTOS CON BAJO STOCK:\n${bajoStock.map(p => `- ${p.name} (${p.sku}): ${p.quantity}/${p.minStock}`).join("\n")}`
      : "";

    const equiposTxt = eqs.length > 0
      ? `\n\nEQUIPOS: ${eqs.length} (${eqs.filter(e => e.estado === "disponible").length} disponibles, ${eqs.filter(e => e.estado === "averiado").length} averiados, ${eqs.filter(e => e.estado === "en_retiro").length} en retiro)`
      : "";

    const despachosHoy = desps.filter(d => {
      try { return new Date(d.fecha).toDateString() === new Date().toDateString(); } catch { return false; }
    });
    const despachosTxt = `\nDESPACHOS HOY: ${despachosHoy.length} (${despachosHoy.reduce((s, d) => s + d.cantidad, 0)} unidades)`;

    // ─── System prompt SIMPLE (sin 872 líneas de instrucciones) ───
    const conocimientoRAG = buscarContextoConocimiento(mensaje);

    const systemPrompt = `Eres Alana, asistente del almacén VRS. Responde en español peruano, claro y directo.

OPERADOR: ${usuarioNombre}
FECHA: ${new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })}

DATOS DEL INVENTARIO:
- ${productos.length} productos en catálogo
- ${totalUnidades} unidades totales
- Valor: S/ ${valorTotal.toLocaleString("es-PE", { maximumFractionDigits: 0 })}
- ${bajoStock.length} productos con bajo stock
- ${agotados.length} productos agotados
${productosTxt}${bajoStockTxt}${equiposTxt}${despachosTxt}

${conocimientoRAG ? `\nCONOCIMIENTO DE LOGÍSTICA RELEVANTE:\n${conocimientoRAG}` : ""}`;

    // ─── Construir mensajes para Groq ───
    const messages = [
      { role: "system" as const, content: systemPrompt },
      // Últimos 8 mensajes del historial
      ...historialMsgs.slice(-8).map(m => ({
        role: (m.role === "assistant" ? "assistant" : "user") as const,
        content: m.content,
      })),
      // Mensaje actual del usuario
      { role: "user" as const, content: mensaje },
    ];

    // ─── Llamar a Groq ───
    let respuesta = "";
    let usarFallback = false;

    try {
      if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY no configurada");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45_000);

      const res = await fetch(GROQ_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages,
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errTxt = await res.text().catch(() => "");
        throw new Error(`Groq HTTP ${res.status}: ${errTxt.slice(0, 300)}`);
      }

      const data = await res.json();
      respuesta = data?.choices?.[0]?.message?.content?.trim() || "";

      if (!respuesta) throw new Error("Respuesta vacía de Groq");

      console.log(`[ALANA-API] ${requestId} ← Groq (${Date.now() - startTime}ms): ${respuesta.slice(0, 100)}...`);
    } catch (err: any) {
      console.error(`[ALANA-API] ${requestId} Groq falló, usando fallback:`, err?.message);
      usarFallback = true;
    }

    // ─── Fallback: usar knowledge base + datos básicos ───
    if (usarFallback) {
      // Buscar en la knowledge base de logística
      const conocimiento = buscarConocimiento(mensaje);
      if (conocimiento) {
        respuesta = conocimiento;
      } else {
        // Respuestas básicas con datos del inventario
        const msg = (mensaje || "").toLowerCase().trim();

        if (/hola|buenas|hey|saludos/i.test(msg)) {
          respuesta = `Hola ${usuarioNombre}. Tienes ${productos.length} productos en catálogo, ${totalUnidades} unidades en stock, ${bajoStock.length} con bajo stock. ¿Qué necesitas?`;
        } else if (/bajo stock|agotad|qu[eé] falta|reponer|pedir/i.test(msg)) {
          if (bajoStock.length === 0 && agotados.length === 0) {
            respuesta = `No hay productos con bajo stock. Todo está por encima del mínimo.`;
          } else {
            respuesta = `Productos que necesitan reposición:\n${bajoStock.concat(agotados).map(p => `• ${p.name} (${p.sku}): ${p.quantity}/${p.minStock || 0}`).join("\n")}`;
          }
        } else if (/stock|inventario|cu[aá]nto tengo/i.test(msg)) {
          respuesta = `Inventario actual:\n• ${productos.length} productos en catálogo\n• ${totalUnidades} unidades totales\n• Valor: S/ ${valorTotal.toLocaleString("es-PE", { maximumFractionDigits: 0 })}\n• ${bajoStock.length} con bajo stock\n• ${agotados.length} agotados`;
        } else if (/equipo/i.test(msg)) {
          respuesta = `Equipos registrados: ${eqs.length} (${eqs.filter(e => e.estado === "disponible").length} disponibles, ${eqs.filter(e => e.estado === "averiado").length} averiados, ${eqs.filter(e => e.estado === "en_retiro").length} en retiro)`;
        } else if (/quien eres|c[oó]mo te llamas|tu nombre/i.test(msg)) {
          respuesta = `Soy Alana, asistente del almacén VRS. Tengo conocimiento de logística, inventario, equipos y despachos. ¿Qué necesitas?`;
        } else {
          respuesta = `No estoy segura de entender. Puedo ayudarte con:\n• Inventario: "qué productos tengo", "qué falta"\n• Equipos: "cómo están los equipos"\n• Logística: "qué es ABC", "cómo recibo mercancía", "qué es FIFO"\n• Matemáticas: "cuánto es 5 por 3"\n\n¿Qué necesitas?`;
        }
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[ALANA-API] ${requestId} ← Respuesta enviada (${elapsed}ms)`);

    return NextResponse.json({ ok: true, respuesta, recordatorios: [], memorias: [], acciones: [] });
  } catch (error: any) {
    console.error(`[ALANA-API] ${requestId} ✗ Error:`, error?.message || error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Error interno" },
      { status: 500 }
    );
  }
}
