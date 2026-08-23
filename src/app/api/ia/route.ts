// API route para Alana, asistente del almacén Lemcorp (LEMCORP WMS)
// Usa z-ai-web-dev-sdk (GLM) en el backend, con análisis en tiempo real del inventario.
import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";

interface ProductDTO {
  sku: string;
  name: string;
  quantity: number;
  minStock?: number;
  udm?: string;
}

interface DespachoDTO {
  id: string;
  fecha: number;
  sku: string;
  producto?: string;
  cantidad: number;
  tecnico?: string;
  destino?: string;
  observacion?: string;
}

interface EquipmentDTO {
  id: string;
  serie: string;
  modelo: string;
  estado: string;
  ubicacion?: string;
  observacion?: string;
}

interface MiembroDTO {
  id: string;
  nombre: string;
  rol: string;
  correo?: string;
  telefono?: string;
  activo: boolean;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n: number): number {
  return startOfDay(new Date(Date.now() - n * 86400_000)).getTime();
}

/** Computa estadísticas de consumo (despachos) por SKU en los últimos N días. */
function computeConsumo(desps: DespachoDTO[], dias: number) {
  const desde = daysAgo(dias);
  const porSku = new Map<string, { sku: string; nombre: string; unidades: number; eventos: number; udm?: string }>();
  for (const d of desps) {
    if (d.fecha < desde) continue;
    const cur = porSku.get(d.sku) ?? { sku: d.sku, nombre: d.producto || d.sku, unidades: 0, eventos: 0, udm: undefined };
    cur.unidades += Number(d.cantidad) || 0;
    cur.eventos += 1;
    porSku.set(d.sku, cur);
  }
  // Top consumidores
  const top = [...porSku.values()].sort((a, b) => b.unidades - a.unidades);
  return {
    desde,
    totalEventos: top.reduce((s, x) => s + x.eventos, 0),
    totalUnidades: top.reduce((s, x) => s + x.unidades, 0),
    top,
  };
}

/** Proyecta cuántas unidades se necesitan para los próximos `diasFuturos` días, basado en consumo histórico. */
function proyectarNecesidades(
  products: ProductDTO[],
  consumoTop: { sku: string; nombre: string; unidades: number; eventos: number }[],
  diasHistoricos: number,
  diasFuturos: number
) {
  const consumoPorSku = new Map(consumoTop.map((c) => [c.sku, c]));
  return products
    .map((p) => {
      const c = consumoPorSku.get(p.sku);
      const consumoDiario = c ? c.unidades / diasHistoricos : 0;
      const proyectado = Math.ceil(consumoDiario * diasFuturos);
      const deficit = Math.max(0, proyectado - p.quantity);
      return {
        sku: p.sku,
        nombre: p.name,
        stock: p.quantity,
        minimo: p.minStock ?? 0,
        consumoDiario: Number(consumoDiario.toFixed(2)),
        proyectado,
        deficit,
        udm: p.udm ?? "",
      };
    })
    .filter((x) => x.deficit > 0 || x.consumoDiario > 0)
    .sort((a, b) => b.deficit - a.deficit);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mensaje, inventario, equipos, miembros, despachos, empresa, usuario, memoria } = body;

    const productos: ProductDTO[] = Array.isArray(inventario) ? inventario : [];
    const eqs: EquipmentDTO[] = Array.isArray(equipos) ? equipos : [];
    const pers: MiembroDTO[] = Array.isArray(miembros) ? miembros : [];
    const desps: DespachoDTO[] = Array.isArray(despachos) ? despachos : [];
    const emp = typeof empresa === "object" && empresa ? (empresa as any) : {};
    const usuarioNombre = typeof usuario === "string" && usuario ? usuario : "operador";
    const memoriaAprendida: string[] = Array.isArray(memoria) ? memoria.filter((m: any) => typeof m === "string" && m.trim()) : [];

    // ─── Análisis en tiempo real ───
    const bajoStock = productos.filter(
      (p) => p.minStock && p.minStock > 0 && p.quantity <= p.minStock
    );
    const stockAgotado = productos.filter((p) => p.quantity <= 0);
    const criticosTop10 = [...bajoStock]
      .sort((a, b) => (a.quantity / Math.max(a.minStock!, 1)) - (b.quantity / Math.max(b.minStock!, 1)))
      .slice(0, 10);

    const totalUnidades = productos.reduce((s, p) => s + (Number(p.quantity) || 0), 0);
    const valorCatalogo = productos.length;

    const equiposPorEstado = {
      disponible: eqs.filter((e) => e.estado === "disponible").length,
      averiado: eqs.filter((e) => e.estado === "averiado").length,
      en_retiro: eqs.filter((e) => e.estado === "en_retiro").length,
      en_reparacion: eqs.filter((e) => e.estado === "en_reparacion").length,
    };

    const tecnicos = pers.filter((m) => m.rol === "tecnico");
    const numTecnicos = tecnicos.length;

    const despachosHoy = desps.filter((d) => {
      try {
        const f = new Date(d.fecha);
        const hoy = new Date();
        return f.toDateString() === hoy.toDateString();
      } catch {
        return false;
      }
    });
    const unidadesDespachadasHoy = despachosHoy.reduce((s, d) => s + (Number(d.cantidad) || 0), 0);

    // ─── Análisis de consumo histórico (últimos 30 días) ───
    const consumo30 = computeConsumo(desps, 30);
    const consumo7 = computeConsumo(desps, 7);

    // Proyección de necesidades (próximos 14 días)
    const proyecciones = proyectarNecesidades(productos, consumo30.top, 30, 14);
    const necesidadesTop = proyecciones.slice(0, 10);

    // ─── Construcción del inventario legible para el LLM ───
    const productosTxt = productos
      .slice(0, 80)
      .map((p) => `- ${p.sku} | ${p.name} | Stock: ${p.quantity} ${p.udm || ""} | Mínimo: ${p.minStock || "N/A"}`)
      .join("\n");

    const bajoStockTxt = bajoStock.length > 0
      ? `\n\n⚠️ PRODUCTOS CON BAJO STOCK (URGENTE):\n${bajoStock
          .map((p) => `- ${p.sku} | ${p.name} | Stock actual: ${p.quantity} | Mínimo: ${p.minStock}`)
          .join("\n")}`
      : "\n\n✅ No hay productos con bajo stock actualmente.";

    const agotadoTxt = stockAgotado.length > 0
      ? `\n\n🚨 PRODUCTOS AGOTADOS:\n${stockAgotado.map((p) => `- ${p.sku} | ${p.name}`).join("\n")}`
      : "";

    const criticosTxt = criticosTop10.length > 0
      ? `\n\n🔴 TOP 10 PRODUCTOS CRÍTICOS:\n${criticosTop10
          .map((p, i) => `${i + 1}. ${p.sku} | ${p.name} | Stock: ${p.quantity} | Mín: ${p.minStock} | Ratio: ${(p.quantity / Math.max(p.minStock!, 1)).toFixed(2)}`)
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
          .map((m) => `- ${m.nombre} | ${m.rol}${m.activo === false ? " (inactivo)" : ""}`)
          .join("\n")}`
      : "";

    const despachosTxt = `\n\n📤 DESPACHOS HOY: ${despachosHoy.length} (${unidadesDespachadasHoy} unidades enviadas)`;

    const consumoTxt = consumo30.top.length > 0
      ? `\n\n📊 CONSUMO ÚLTIMOS 30 DÍAS (top 12):\n${consumo30.top
          .slice(0, 12)
          .map((c) => `- ${c.sku} | ${c.nombre} | ${c.unidades} und en ${c.eventos} despachos`)
          .join("\n")}`
      : "";
    const consumo7Txt = consumo7.top.length > 0
      ? `\n📊 CONSUMO ÚLTIMOS 7 DÍAS (top 8):\n${consumo7.top
          .slice(0, 8)
          .map((c) => `- ${c.sku} | ${c.nombre} | ${c.unidades} und en ${c.eventos} despachos`)
          .join("\n")}`
      : "";

    const proyeccionTxt = necesidadesTop.length > 0
      ? `\n\n🔮 PROYECCIÓN PRÓXIMOS 14 DÍAS (basado en consumo histórico):\n${necesidadesTop
          .map((n, i) => `${i + 1}. ${n.sku} | ${n.nombre} | Stock: ${n.stock} ${n.udm} | Consumo diario: ${n.consumoDiario} | Proyectado 14d: ${n.proyectado} | Déficit: ${n.deficit}`)
          .join("\n")}`
      : "";

    // ─── System prompt con 8 capacidades ───
    const systemPrompt = `Eres Alana, asistente del almacén Lemcorp. Tu nombre es Alana. Te presentas SIEMPRE como Alana cuando te preguntan tu nombre o cuando el usuario te saluda por primera vez en una conversación. Eres la asistente experta en gestión de almacén para LEMCORP, el almacén central de Lemcorp. LEMCORP despacha equipos y materiales a una empresa contratista (${emp.nombre || "LPS"} — contratista de Claro) que tiene técnicos en campo.

OPERADOR ACTUAL: ${usuarioNombre}
FECHA/HORA LIMA: ${new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })}

═══════════════════════════════════════
TUS 8 CAPACIDADES PRINCIPALES:
═══════════════════════════════════════
1. 📊 ANÁLISIS DE STOCK: Detectar productos con bajo stock o agotados, calcular ratios de cobertura y priorizar compras.
2. 📈 CÁLCULO DE CONSUMO: Tienes datos REALES de consumo de los últimos 7 y 30 días. Úsalos para estimar consumo diario por técnico y proyectar necesidades futuras.
3. 🛒 RECOMENDACIONES DE COMPRA: Sugerir qué productos pedir, en qué cantidad, justificando con datos (SKU, cantidad, justificación). Usa el campo "Déficit" de la proyección para recomendaciones precisas.
4. 📦 TRAZABILIDAD DE EQUIPOS: Reportar el estado de los equipos (disponibles, averiados, en reparación, en retiro) y buscar por serie si el usuario pregunta por una.
5. 👥 GESTIÓN DE TÉCNICOS: Informar sobre el equipo de trabajo, cargas, distribución.
6. 🚨 ALERTAS TEMPRANAS: Anticipar quiebres de stock basándose en el ritmo de despacho y el déficit proyectado.
7. 📋 REPORTES EJECUTIVOS: Generar resúmenes accionables del estado del almacén. Incluye KPIs, tendencias y acciones recomendadas.
8. 📅 PLANIFICACIÓN: Calcular necesidades para un período (ej: "¿cuántos conectores para 30 días?"). Usa consumoDiario * días + stock mínimo de seguridad.

═══════════════════════════════════════
CAPACIDAD ESPECIAL: RECORDATORIOS
═══════════════════════════════════════
Si el usuario te pide un recordatorio (ej: "recuérdame pedir conectores mañana", "avísame el viernes", "en 2 horas revisa el stock"), DEBES responder con un bloque especial al FINAL de tu respuesta, en este formato exacto:

[[RECORDATORIO]]
texto: <descripción del recordatorio>
cuando: <timestamp ISO 8601>
[[/RECORDATORIO]]

Ejemplo:
Usuario: "recuérdame pedir conectores mañana a las 9am"
Tu respuesta normal + al final:
[[RECORDATORIO]]
texto: Pedir conectores FTTH urgente
cuando: 2026-08-22T09:00:00
[[/RECORDATORIO]]

Para calcular el timestamp, usa la fecha actual (${new Date().toISOString()}) como referencia.
- "mañana" = fecha actual + 1 día
- "en X horas" = fecha actual + X horas
- "el viernes" = próximo viernes a las 9:00 si no se especifica hora

═══════════════════════════════════════
CAPACIDAD ESPECIAL: APRENDIZAJE (MEMORIA)
═══════════════════════════════════════
Tienes una memoria de aprendizaje. Estas son las cosas que has aprendido del usuario:${memoriaAprendida.length > 0 ? memoriaAprendida.map((m, i) => `\n  ${i + 1}. ${m}`).join("") : "\n  (Todavía no has aprendido nada del usuario."}

Cuando el usuario te dé información nueva o corrija algo, debes RECORDARLO. Si el usuario dice algo como:
- "recuerda que..."
- "aprende que..."
- "anota que..."
- "a partir de ahora..."
- "ten en cuenta que..."
- o cualquier otra frase que entregue información para guardar
...debes responder con un bloque especial al FINAL de tu respuesta, en este formato exacto:

[[MEMORIA]]
texto: <lo que aprendiste, en una frase clara y concisa>
[[/MEMORIA]]

Ejemplo:
Usuario: "Recuerda que el técnico Pérez trabaja solo de lunes a miércoles"
Alana: Entendido. Lo recordaré.
[[MEMORIA]]
texto: El técnico Pérez trabaja solo de lunes a miércoles
[[/MEMORIA]]

Reglas para la memoria:
- Guarda SOLO información útil y permanente (no guardes consultas puntuales).
- Sé conciso: una frase que capture el dato clave.
- Si ya tienes algo similar en memoria, no lo repitas.
- No guardes números de stock temporales ni estados que cambien.

═══════════════════════════════════════
DATOS DEL INVENTARIO DEL ALMACÉN LEMCORP (propietario: Lemcorp):
═══════════════════════════════════════
- Productos en catálogo: ${valorCatalogo}
- Total de unidades en stock: ${totalUnidades}
- Productos con bajo stock: ${bajoStock.length}
- Productos agotados: ${stockAgotado.length}
- Equipos registrados: ${eqs.length}
- Despachos hoy: ${despachosHoy.length} (${unidadesDespachadasHoy} und)

INVENTARIO DETALLADO:
${productosTxt}${bajoStockTxt}${agotadoTxt}${criticosTxt}${equiposTxt}${miembrosTxt}${despachosTxt}${consumoTxt}${consumo7Txt}${proyeccionTxt}

═══════════════════════════════════════
INSTRUCCIONES DE RESPUESTA:
═══════════════════════════════════════
- Responde SIEMPRE en español peruano, claro y directo.
- Usa viñetas (•) y emojis con moderación para mejorar la legibilidad.
- Cuando recomiendes una compra, incluye: SKU del producto, cantidad sugerida, y justificación basada en datos reales del inventario.
- Sé específico con números: no digas "varios", di exactamente cuántos.
- Si detectas un problema urgente (stock crítico, agotado), márcalo con 🚨 al inicio de la línea.
- Si el operador te saluda, salúdalo por su nombre (${usuarioNombre}) y presenta como Alana: "Soy Alana, asistente del almacén Lemcorp".
- Para preguntas de "¿cuánto pedir para X días?", usa la fórmula: consumoDiario × días + stockMínimo - stockActual. Redondea hacia arriba.
- Para reportes ejecutivos, estructura la respuesta en secciones: 📊 Estado, 📈 Tendencias, 🚨 Alertas, ✅ Acciones.
- Mantén un tono profesional pero cercano. Eres un colega experto, no un robot.
- Si no tienes datos suficientes, pídelos. No inventes cantidades.
- Si el usuario pregunta por un SKU específico, busca en el inventario detallado y responde con sus datos exactos.
- Si el usuario pregunta tu nombre, responde: "Soy Alana".`;

    const zai = await ZAI.create();
    const response = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: String(mensaje ?? "") },
      ],
      thinking: { type: "disabled" },
    });

    let respuesta =
      response.choices[0]?.message?.content ||
      "No pude procesar tu consulta. Por favor intenta de nuevo.";

    // Extraer recordatorios del bloque [[RECORDATORIO]]...[[/RECORDATORIO]]
    const recordatorios: Array<{ texto: string; cuando: string }> = [];
    const regex = /\[\[RECORDATORIO\]\]([\s\S]*?)\[\[\/RECORDATORIO\]\]/g;
    let match;
    while ((match = regex.exec(respuesta)) !== null) {
      const bloque = match[1];
      const textoMatch = bloque.match(/texto:\s*(.+)/);
      const cuandoMatch = bloque.match(/cuando:\s*(.+)/);
      if (textoMatch && cuandoMatch) {
        recordatorios.push({
          texto: textoMatch[1].trim(),
          cuando: cuandoMatch[1].trim(),
        });
      }
    }
    // Limpiar el bloque de la respuesta visible
    if (recordatorios.length > 0) {
      respuesta = respuesta.replace(/\[\[RECORDATORIO\]\][\s\S]*?\[\[\/RECORDATORIO\]\]/g, "").trim();
    }

    // Extraer memoria (cosas aprendidas) del bloque [[MEMORIA]]...[[/MEMORIA]]
    const memorias: string[] = [];
    const regexMemoria = /\[\[MEMORIA\]\]([\s\S]*?)\[\[\/MEMORIA\]\]/g;
    let matchMemoria;
    while ((matchMemoria = regexMemoria.exec(respuesta)) !== null) {
      const bloque = matchMemoria[1];
      const textoMatch = bloque.match(/texto:\s*([\s\S]+?)(?=\n\[\[|$)/);
      if (textoMatch && textoMatch[1].trim()) {
        memorias.push(textoMatch[1].trim());
      }
    }
    // Limpiar el bloque de la respuesta visible
    if (memorias.length > 0) {
      respuesta = respuesta.replace(/\[\[MEMORIA\]\][\s\S]*?\[\[\/MEMORIA\]\]/g, "").trim();
    }

    return NextResponse.json({ ok: true, respuesta, recordatorios, memorias });
  } catch (error: any) {
    console.error("Error en API IA:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Error interno" },
      { status: 500 }
    );
  }
}
