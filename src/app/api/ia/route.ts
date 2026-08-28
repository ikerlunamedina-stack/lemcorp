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
    const { mensaje, historial, inventario, equipos, miembros, despachos, empresa, usuario, memoria } = body;

    const productos: ProductDTO[] = Array.isArray(inventario) ? inventario : [];
    const eqs: EquipmentDTO[] = Array.isArray(equipos) ? equipos : [];
    const pers: MiembroDTO[] = Array.isArray(miembros) ? miembros : [];
    const desps: DespachoDTO[] = Array.isArray(despachos) ? despachos : [];
    const emp = typeof empresa === "object" && empresa ? (empresa as any) : {};
    const usuarioNombre = typeof usuario === "string" && usuario ? usuario : "operador";
    const memoriaAprendida: string[] = Array.isArray(memoria) ? memoria.filter((m: any) => typeof m === "string" && m.trim()) : [];
    // Historial de conversación (para contexto)
    const historialMsgs: Array<{ role: string; content: string }> = Array.isArray(historial)
      ? historial.filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      : [];

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

    const numPersonal = pers.length;

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
      ? `\n\n👥 PERSONAL DEL ALMACÉN (${pers.length} personas):\n${pers
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
    const systemPrompt = `Eres Alana, asistente del almacén Lemcorp. Tu nombre es Alana.

REGLA CRÍTICA DE PRESENTACIÓN:
- SOLO dices "Soy Alana" cuando el usuario te PREGUNTE EXPLÍCITAMENTE tu nombre (ej: "¿cómo te llamas?", "¿quién eres?").
- NUNCA te presentes al inicio de cada respuesta. Si el usuario ya está conversando contigo, responde DIRECTO al mensaje sin saludar ni presentarte.
- NUNCA digas "Hola, soy Alana" a menos que sea el primer mensaje de la conversación y el usuario te esté saludando.
- Si el usuario te pide algo ("añade X", "cambia el tema", "dime Y"), responde SOLO con lo que pidió, sin presentaciones.
- Ejemplo CORRECTO: Usuario: "Pon la página en blanco" → Tú: "Listo, cambié el tema a claro." (sin "hola soy Alana")
- Ejemplo INCORRECTO: Usuario: "Pon la página en blanco" → Tú: "Hola, soy Alana. Listo, cambié el tema..." ❌

Eres la asistente experta en gestión de almacén para LEMCORP, el almacén central de Lemcorp. LEMCORP despacha equipos y materiales a una empresa contratista (${emp.nombre || "LPS"} — contratista de Claro).

OPERADOR ACTUAL: ${usuarioNombre}
FECHA/HORA LIMA: ${new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })}

═══════════════════════════════════════
TUS 8 CAPACIDADES PRINCIPALES:
═══════════════════════════════════════
1. 📊 ANÁLISIS DE STOCK: Detectar productos con bajo stock o agotados, calcular ratios de cobertura y priorizar compras.
2. 📈 CÁLCULO DE CONSUMO: Tienes datos REALES de consumo de los últimos 7 y 30 días. Úsalos para estimar consumo diario y proyectar necesidades futuras.
3. 🛒 RECOMENDACIONES DE COMPRA: Sugerir qué productos pedir, en qué cantidad, justificando con datos (SKU, cantidad, justificación). Usa el campo "Déficit" de la proyección para recomendaciones precisas.
4. 📦 TRAZABILIDAD DE EQUIPOS: Reportar el estado de los equipos (disponibles, averiados, en reparación, en retiro) y buscar por serie si el usuario pregunta por una.
5. 👥 GESTIÓN DE PERSONAL: Informar sobre el equipo del almacén, cargas, distribución.
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
Usuario: "Recuerda que el personal Pérez trabaja solo de lunes a miércoles"
Alana: Entendido. Lo recordaré.
[[MEMORIA]]
texto: El personal Pérez trabaja solo de lunes a miércoles
[[/MEMORIA]]

Reglas para la memoria:
- Guarda SOLO información útil y permanente (no guardes consultas puntuales).
- Sé conciso: una frase que capture el dato clave.
- Si ya tienes algo similar en memoria, no lo repitas.
- No guardes números de stock temporales ni estados que cambien.

═══════════════════════════════════════
CAPACIDAD ESPECIAL: ACCIONES DEL SISTEMA (CONTROL TOTAL)
═══════════════════════════════════════
Tienes acceso completo al sistema. Puedes AÑADIR, MODIFICAR y ELIMINAR datos directamente en el almacén cuando el usuario te lo pida. Cuando ejecutes una acción, debes incluir un bloque especial al FINAL de tu respuesta con el formato:

[[ACCION]]
tipo: <tipo_de_accion>
<parametros>
[[/ACCION]]

Puedes incluir VARIAS acciones en una sola respuesta (una detrás de otra).

ACCIONES DISPONIBLES:

1. AÑADIR PRODUCTO al inventario:
[[ACCION]]
tipo: add_product
sku: <SKU del producto>
nombre: <nombre del producto>
cantidad: <número inicial>
minimo: <stock mínimo, opcional>
udm: <unidad de medida: UNIDADES, METROS, etc, opcional>
[[/ACCION]]

2. ACTUALIZAR STOCK de un producto existente (sumar o restar):
[[ACCION]]
tipo: update_stock
sku: <SKU del producto>
delta: <número positivo o negativo>
[[/ACCION]]

3. AÑADIR EQUIPO por serie:
[[ACCION]]
tipo: add_equipment
serie: <número de serie>
modelo: <modelo del equipo>
estado: <disponible | averiado | en_retiro | en_reparacion>
ubicacion: <ubicación, opcional>
[[/ACCION]]

4. REGISTRAR DESPACHO:
[[ACCION]]
tipo: add_despacho
sku: <SKU del producto>
cantidad: <número>
destinatario: <nombre del destinatario, opcional>
destino: <lugar de destino, opcional>
observacion: <observación, opcional>
[[/ACCION]]

5. AÑADIR NOTA al bloc:
[[ACCION]]
tipo: add_note
texto: <texto de la nota>
[[/ACCION]]

6. AÑADIR MIEMBRO al personal:
[[ACCION]]
tipo: add_member
nombre: <nombre de la persona>
rol: <almacenero | supervisor | jefe_operaciones | administrador>
correo: <correo, opcional>
telefono: <teléfono, opcional>
[[/ACCION]]

7. CAMBIAR TEMA de la interfaz (claro/oscuro/sistema):
[[ACCION]]
tipo: set_theme
tema: <claro | oscuro | sistema>
[[/ACCION]]

EJEMPLOS:

Usuario: "Añade 50 conectores RJ-45 al inventario, SKU CONN-RJ45, mínimo 20"
Alana: ¡Listo! Añadí 50 conectores RJ-45 (SKU CONN-RJ45) al inventario con un mínimo de 20 unidades. Te avisaré cuando el stock baje de ese nivel.
[[ACCION]]
tipo: add_product
sku: CONN-RJ45
nombre: Conectores RJ-45
cantidad: 50
minimo: 20
udm: UNIDADES
[[/ACCION]]

Usuario: "Registra un despacho de 10 conectores FTTH, SKU 1066990, para Pérez"
Alana: Despacho registrado. 10 conectores FTTH (SKU 1066990) enviados a Pérez. Stock actualizado.
[[ACCION]]
tipo: add_despacho
sku: 1066990
cantidad: 10
destinatario: Pérez
[[/ACCION]]

Usuario: "Anota que hay que revisar el cable RG-6 el viernes"
Alana: Anotado. Te recuerdo el viernes.
[[ACCION]]
tipo: add_note
texto: Revisar el cable RG-6 el viernes
[[/ACCION]]

REGLAS ESTRICTAS PARA LAS ACCIONES:
- Solo ejecuta acciones cuando el usuario EXPLÍCITAMENTE te lo pida con verbos de acción: "añade", "registra", "crea", "anota", "despacha", "cambia el tema", "pon en blanco/oscuro", etc.
- NUNCA ejecutes acciones por iniciativa propia al hacer consultas (ej: si preguntan "¿qué productos hay?", no añadas nada).
- NUNCA crees notas si el usuario NO dijo "anota" o "crea una nota". Si el usuario dice "pon la página en blanco" → ejecuta set_theme, NO add_note.
- Si el usuario dice "pon la página en blanco/claro/blanco" → ejecuta set_theme con tema: claro.
- Si el usuario dice "pon la página en oscuro/negro" → ejecuta set_theme con tema: oscuro.
- Si falta información obligatoria (SKU, cantidad, etc.), PÍDELA antes de ejecutar.
- Después de ejecutar la acción, explica al usuario qué hiciste en texto plano (el bloque [[ACCION]] no se muestra, pero el frontend lo procesa).
- Para update_stock: usa delta positivo para sumar, negativo para restar.
- Para add_equipment: el estado por defecto es "disponible".
- Si el usuario dice "añade este producto" sin SKU, pídelo.

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
- Eres Alana, una IA MUY INTELIGENTE, como ChatGPT. Puedes responder CUALQUIER pregunta, no solo del almacén.
- Responde SIEMPRE en español peruano, claro y directo.
- Si el usuario te pregunta CUALQUIER cosa (ciencia, historia, geografía, tecnología, vida cotidiana, consejos, opiniones, explicaciones), RESPONDE con conocimiento completo y útil. NUNCA digas "no sé" o "no tengo información" — siempre da tu mejor respuesta.
- Si te piden matemáticas, CALCULA el resultado exacto. Ej: "15 * 23 + 100" → "345 + 100 = 445".
- Usa viñetas (•) y emojis con moderación para mejorar la legibilidad.
- Cuando recomiendes una compra, incluye: SKU del producto, cantidad sugerida, y justificación basada en datos reales del inventario.
- Sé específico con números: no digas "varios", di exactamente cuántos.
- Si detectas un problema urgente (stock crítico, agotado), márcalo con 🚨 al inicio de la línea.
- REGLA CRÍTICA DE PRESENTACIÓN: NUNCA digas "Hola, soy Alana" al inicio de cada respuesta. SOLO preséntate si el usuario te PREGUNTA EXPLÍCITAMENTE tu nombre.
  * INCORRECTO: "Hola Iker, soy Alana. El stock de conectores es..."
  * CORRECTO: "El stock de conectores es 1500 unidades."
- Para preguntas de "¿cuánto pedir para X días?", usa la fórmula: consumoDiario × días + stockMínimo - stockActual. Redondea hacia arriba.
- Para reportes ejecutivos, estructura la respuesta en secciones: 📊 Estado, 📈 Tendencias, 🚨 Alertas, ✅ Acciones.
- Mantén un tono profesional pero cercano. Eres un colega experto, no un robot.
- Si no tienes datos suficientes del almacén, pídelos. Pero para preguntas GENERALES, responde con todo tu conocimiento.
- Si el usuario pregunta por un SKU específico, busca en el inventario detallado y responde con sus datos exactos.
- Mantén el CONTEXTO de la conversación. Si el usuario dice "y ese?", refiérete al último tema del que hablaron.
- Sé concisa pero completa. No respondas con 1 palabra, pero tampoco escribas un ensayo si no es necesario.`;

    // Usar Z.AI (GLM) como motor principal de inteligencia — funciona en sandbox y en Vercel
    let respuesta = "";
    let usarFallback = true;

    try {
      const zai = new ZAI({
        baseUrl: "https://internal-api.z.ai/v1",
        apiKey: "Z.ai",
        chatId: "chat-4fe20023-027a-4694-803d-4bc79d019243",
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMmUzOTNhNDMtYjYxZS00ODM5LWFiOGItZWZkNzc3ZmE3MDdiIiwiY2hhdF9pZCI6ImNoYXQtNGZlMjAwMjMtMDI3YS00Njk0LTgwM2QtNGJjNzlkMDE5MjQzIiwicGxhdGZvcm0iOiJ6YWkifQ.pLa1AlWgguS-P_zBBQxua5eYP64GwOxEq36czXbjtuI",
        userId: "2e393a43-b61e-4839-ab8b-efd777fa707b",
      });

      // Construir mensajes con historial para que Alana tenga contexto de la conversación
      const mensajesZAI: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt },
      ];
      // Añadir historial (excluyendo el último mensaje que es el actual)
      for (const m of historialMsgs.slice(0, -1)) {
        mensajesZAI.push({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        });
      }
      // Añadir el mensaje actual
      mensajesZAI.push({ role: "user", content: String(mensaje ?? "") });

      // Timeout de 15 segundos — tiempo suficiente para respuestas inteligentes
      const response = await Promise.race([
        zai.chat.completions.create({
          messages: mensajesZAI,
          thinking: { type: "disabled" },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 15000)
        ),
      ]);

      respuesta = response.choices[0]?.message?.content || "";
      if (respuesta && respuesta.length >= 5) {
        usarFallback = false;
      }
    } catch (zaiError) {
      // Z.AI falló o tardó mucho — usar fallback
      usarFallback = true;
    }

    // FALLBACK: Generar respuesta con análisis de datos reales (instantáneo)
    if (usarFallback) {
      respuesta = await generarRespuestaFallback(mensaje, {
        products: productos,
        equipos: eqs,
        despachos: desps,
        miembros: pers,
        empresa: emp,
        usuario: usuarioNombre,
        memoria: memoriaAprendida,
      });
    }

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

    // Extraer ACCIONES del sistema del bloque [[ACCION]]...[[/ACCION]]
    const acciones: Array<Record<string, string>> = [];
    const regexAccion = /\[\[ACCION\]\]([\s\S]*?)\[\[\/ACCION\]\]/g;
    let matchAccion;
    while ((matchAccion = regexAccion.exec(respuesta)) !== null) {
      const bloque = matchAccion[1].trim();
      const accion: Record<string, string> = {};
      // Parsear líneas "clave: valor"
      for (const linea of bloque.split("\n")) {
        const m = linea.match(/^(\w+):\s*(.*)$/);
        if (m) {
          accion[m[1].trim()] = m[2].trim();
        }
      }
      if (accion.tipo) acciones.push(accion);
    }
    // Limpiar los bloques de acciones de la respuesta visible
    if (acciones.length > 0) {
      respuesta = respuesta.replace(/\[\[ACCION\]\][\s\S]*?\[\[\/ACCION\]\]/g, "").trim();
    }

    return NextResponse.json({ ok: true, respuesta, recordatorios, memorias, acciones });
  } catch (error: any) {
    console.error("Error en API IA:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Error interno" },
      { status: 500 }
    );
  }
}

// ===== SISTEMA DE RESPUESTAS FALLBACK (sin API externa) =====
// Analiza los datos reales del inventario y responde de forma útil.

interface FallbackData {
  products: ProductDTO[];
  equipos: EquipmentDTO[];
  despachos: DespachoDTO[];
  miembros: MiembroDTO[];
  empresa: { nombre?: string };
  usuario: string;
  memoria: string[];
}

async function generarRespuestaFallback(mensaje: string, data: FallbackData): Promise<string> {
  const msg = (mensaje || "").toLowerCase().trim();
  const { products, equipos, despachos, miembros, empresa, usuario, memoria } = data;
  const nombre = usuario || "Iker";

  // === 1. MATEMÁTICAS (antes que todo) ===
  // Detectar operaciones: "1+1", "5 por 3", "100 entre 5", "cuanto es 10 mas 4"
  const mathMatch = msg.match(/(\d+(?:[.,]\d+)?)\s*(mas|\+|menos|-|por|\*|×|entre|\/|÷|dividido|multiplicado|veces)\s*(\d+(?:[.,]\d+)?)/i);
  const mathDirect = /^(\d+(?:[.,]\d+)?)\s*([+\-*/x×÷])\s*(\d+(?:[.,]\d+)?)/.test(msg);
  const mathCuanto = /cu[aá]nto es\s+/.test(msg);

  if (mathMatch || mathDirect || mathCuanto) {
    try {
      let expr = msg
        .replace(/cu[aá]nto es\s*/i, "")
        .replace(/qu[eé] es\s*/i, "")
        .replace(/resultado de\s*/i, "")
        .replace(/es\s*/i, "")
        .replace(/\bmas\b/gi, "+")
        .replace(/\bmenos\b/gi, "-")
        .replace(/\bpor\b/gi, "*")
        .replace(/\bveces\b/gi, "*")
        .replace(/\bmultiplicado por\b/gi, "*")
        .replace(/\bentre\b/gi, "/")
        .replace(/\bdividido por\b/gi, "/")
        .replace(/\bdividido entre\b/gi, "/")
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/x/g, "*")
        .replace(/,/g, ".")
        .replace(/[^\d+\-*/().\s]/g, "")
        .trim();
      if (expr && /^[\d+\-*/().\s]+$/.test(expr)) {
        const resultado = Function(`"use strict"; return (${expr})`)();
        return `${expr.replace(/\*/g, " × ").replace(/\//g, " ÷ ").replace(/\+/g, " + ").replace(/-/g, " - ")} = ${resultado}`;
      }
    } catch {}
  }

  // Porcentaje: "20% de 500"
  const pctMatch = msg.match(/(\d+(?:[.,]\d+)?)\s*%\s*de\s*(\d+(?:[.,]\d+)?)/i);
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1].replace(",", "."));
    const total = parseFloat(pctMatch[2].replace(",", "."));
    return `${pct}% de ${total} = ${(pct / 100 * total).toLocaleString("es-PE")}`;
  }

  // === 2. SALUDOS Y CONVERSACIÓN ===
  if (/^(hola|buenas|hey|saludos|que tal|holi|alana)/i.test(msg)) {
    return `Hola ${nombre} 👋 ¿Qué necesitas? Puedo responder cualquier pregunta, hacer cálculos, o ayudarte con el almacén.`;
  }
  if (/c[oó]mo est[aá]s|qu[eé] tal|c[oó]mo te va/i.test(msg)) {
    return `Todo bien 😊 ¿Y tú? Dime qué necesitas.`;
  }
  if (/qui[eé]n eres|c[oó]mo te llamas|tu nombre|qu[eé] eres/i.test(msg)) {
    return `Soy Alana. Te ayudo con el almacén y también puedo responder cualquier pregunta que tengas. ¿Qué necesitas?`;
  }
  if (/gracias|thank|genial|buen|perfecto|excelente/i.test(msg)) {
    return `De nada, ${nombre} 👍`;
  }
  if (/chao|adios|adiós|hasta luego|nos vemos|bye/i.test(msg)) {
    return `Chao ${nombre} 👋`;
  }
  if (/est[aá]s ah[ií]|est[aá]s disponible|me oyes/i.test(msg)) {
    return `Sí, aquí estoy, ${nombre}. ¿Qué necesitas?`;
  }

  // === 3. FECHA Y HORA ===
  if (/qu[eé] (d[ií]a|fecha) es|qu[eé] fecha|fecha de hoy|d[ií]a de hoy/i.test(msg)) {
    const fecha = new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima", weekday: "long", day: "numeric", month: "long", year: "numeric" });
    return `Hoy es ${fecha}.`;
  }
  if (/qu[eé] hora|qu[eé] hora es|hora actual|dime la hora/i.test(msg)) {
    const hora = new Date().toLocaleTimeString("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: true });
    return `Son las ${hora} (hora de Lima).`;
  }

  // === 4. ALMACÉN ===
  if (/bajo stock|stock bajo|agotad|qu[eé] falta|qu[eé] necesito|qu[eé] pedir|qu[eé] comprar|reponer|alerta/i.test(msg)) {
    if (products.length === 0) return `No hay productos cargados todavía, ${nombre}.`;
    const bajoStock = products.filter(p => p.minStock && p.minStock > 0 && p.quantity <= p.minStock);
    const agotados = products.filter(p => p.quantity === 0);
    if (bajoStock.length === 0 && agotados.length === 0) return `Todo bien. ${products.length} productos, ninguno con problemas.`;
    let resp = `Ojo con esto:\n`;
    if (agotados.length > 0) { resp += `Sin stock (${agotados.length}):\n${agotados.slice(0, 5).map(p => `• ${p.name} (${p.sku})`).join("\n")}\n`; }
    if (bajoStock.length > 0) { resp += `Bajo del mínimo (${bajoStock.length}):\n${bajoStock.slice(0, 5).map(p => `• ${p.name} — ${p.quantity} de ${p.minStock}`).join("\n")}\n`; }
    resp += `Yo los pediría ya.`;
    return resp;
  }
  if (/cu[aá]ntos productos|cu[aá]nto stock|inventario|cat[aá]logo|qu[eé] productos|qu[eé] hay|qu[eé] tengo/i.test(msg)) {
    if (products.length === 0) return `No hay productos cargados, ${nombre}.`;
    const totalUnidades = products.reduce((s, p) => s + p.quantity, 0);
    return `Tienes ${products.length} productos, ${totalUnidades.toLocaleString("es-PE")} unidades:\n${products.slice(0, 8).map(p => `• ${p.name} — ${p.quantity} ${p.udm || "und"}`).join("\n")}${products.length > 8 ? `\n...y ${products.length - 8} más` : ""}`;
  }
  if (/equipos|aver[ií]ad|reparaci[oó]n|router|ont|decodificador/i.test(msg)) {
    if (equipos.length === 0) return `No hay equipos cargados, ${nombre}. Puedes añadirlos desde la pestaña Equipos.`;
    const disponibles = equipos.filter(e => e.estado === "disponible").length;
    const averiados = equipos.filter(e => e.estado === "averiado").length;
    return `${equipos.length} equipos: ${disponibles} disponibles, ${averiados} averiados.${averiados > 0 ? ` Hay ${averiados} que necesitan revisión.` : " Todo operativo."}`;
  }
  if (/despacho|env[ií]o|entrega/i.test(msg)) {
    const hoy = despachos.filter(d => { try { return new Date(d.fecha).toDateString() === new Date().toDateString(); } catch { return false; } }).length;
    return `${despachos.length} despachos en total, ${hoy} hoy.${despachos.length > 0 ? `\nÚltimos:\n${despachos.slice(0, 3).map(d => `• ${d.cantidad} und — ${d.producto || d.sku}`).join("\n")}` : ""}`;
  }
  if (/personal|gente|personas|miembros/i.test(msg)) {
    return `${miembros.length} personas en el equipo${miembros.length > 0 ? `:\n${miembros.slice(0, 5).map(m => `• ${m.nombre} — ${m.rol}`).join("\n")}` : "."}`;
  }

  // === 5. ACCIONES DEL SISTEMA ===
  if (/a[ñn]ade|agrega|nuevo producto/i.test(msg)) {
    return `Dime: "añade 50 conectores RJ-45, SKU CONN-RJ45, mínimo 20" y lo cargo.`;
  }
  if (/anota|apunta/i.test(msg)) {
    const textoNota = mensaje.replace(/^(anota|apunta)\s*/i, "").trim();
    if (textoNota.length > 3) return `Anotado: "${textoNota}"\n\n[[ACCION]]\ntipo: add_note\ntexto: ${textoNota}\n[[/ACCION]]`;
    return `¿Qué anoto? Dime "anota [texto]".`;
  }
  if (/pon.*blanco|pon.*claro|modo claro/i.test(msg)) return `Listo.\n\n[[ACCION]]\ntipo: set_theme\ntema: claro\n[[/ACCION]]`;
  if (/pon.*oscuro|pon.*negro|modo oscuro/i.test(msg)) return `Listo.\n\n[[ACCION]]\ntipo: set_theme\ntema: oscuro\n[[/ACCION]]`;

  // Recordatorio
  if (/recu[eé]rdame|recuerdo|recordatorio|av[ií]same|hazme recordar/i.test(msg)) {
    let textoRec = mensaje.replace(/^(recuérdame|recuerdame|recuerda que|recordatorio|avísame|avisame|hazme recordar|crea un recordatorio)\s*/i, "").replace(/^(que|de|para)\s+/i, "").trim();
    if (textoRec.length < 3) return `¿Qué quieres que te recuerde? Ej: "recuérdame pedir conectores mañana a las 9".`;
    const ahora = new Date();
    let cuando = new Date(ahora);
    if (/mañana|manana/i.test(msg)) cuando.setDate(cuando.getDate() + 1);
    const matchHoras = msg.match(/en\s+(\d+)\s+horas?/i);
    if (matchHoras) cuando = new Date(ahora.getTime() + parseInt(matchHoras[1]) * 3600000);
    const matchMinutos = msg.match(/en\s+(\d+)\s+minutos?/i);
    if (matchMinutos) cuando = new Date(ahora.getTime() + parseInt(matchMinutos[1]) * 60000);
    const matchHora = msg.match(/a\s*las?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (matchHora) {
      let horas = parseInt(matchHora[1]);
      const minutos = matchHora[2] ? parseInt(matchHora[2]) : 0;
      const ampm = matchHora[3]?.toLowerCase();
      if (ampm === "pm" && horas < 12) horas += 12;
      if (ampm === "am" && horas === 12) horas = 0;
      cuando.setUTCHours(horas + 5, minutos, 0, 0);
      if (cuando <= ahora && !/mañana|manana/i.test(msg)) cuando.setDate(cuando.getDate() + 1);
    }
    if (!matchHora && !matchHoras && !matchMinutos) cuando = new Date(ahora.getTime() + 3600000);
    const cuandoTexto = cuando.toLocaleString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true });
    textoRec = textoRec.replace(/mañana\s+a\s*las?\s*\d{1,2}(?::\d{2})?\s*(am|pm)?/i, "").replace(/a\s*las?\s*\d{1,2}(?::\d{2})?\s*(am|pm)?/i, "").replace(/en\s+\d+\s+(horas|minutos)/i, "").replace(/\s+/g, " ").trim();
    if (textoRec.length < 3) textoRec = "Recordatorio";
    return `Listo, te aviso el ${cuandoTexto}.\n\n[[RECORDATORIO]]\ntexto: ${textoRec}\ncuando: ${cuando.toISOString()}\n[[/RECORDATORIO]]`;
  }

  // Memoria
  if (/recuerda que|aprende que|ten en cuenta que/i.test(msg)) {
    const textoMemo = mensaje.replace(/^(recuerda que|aprende que|ten en cuenta que)\s*/i, "").trim();
    if (textoMemo.length > 3) return `Entendido, lo recuerdo.\n\n[[MEMORIA]]\ntexto: ${textoMemo}\n[[/MEMORIA]]`;
  }

  // Ayuda
  if (/ayuda|qu[eé] puedes|qu[eé] haces|funciones/i.test(msg)) {
    return `Puedo hacer mucho, ${nombre}:

Preguntas: pregúntame lo que sea — geografía, ciencia, historia, matemáticas.
Almacén: "qué productos tengo", "qué falta", "cómo están los equipos".
Acciones: "añade 50 conectores SKU X", "anota revisar cable", "pon la página en blanco".
Recordatorios: "recuérdame pedir conectores mañana a las 9".
Memoria: "recuerda que el técnico Pérez viene los lunes".
Matemáticas: "cuánto es 5 por 3", "20% de 500", "100 entre 5".

Dime qué necesitas.`;
  }

  // Buscar producto por SKU o nombre
  const productoEncontrado = products.find(p =>
    msg.includes(p.sku.toLowerCase()) || (p.name && msg.includes(p.name.toLowerCase()))
  );
  if (productoEncontrado) {
    return `${productoEncontrado.name}\nSKU: ${productoEncontrado.sku}\nStock: ${productoEncontrado.quantity} ${productoEncontrado.udm || "und"}\n${productoEncontrado.minStock && productoEncontrado.quantity <= productoEncontrado.minStock ? "Está bajo del mínimo." : "Stock bien."}`;
  }

  // === 7. CONVERSACIÓN GENERAL (cuando no es almacén ni matemáticas ni Wikipedia) ===
  // Respuestas inteligentes para preguntas comunes de conversación
  
  // Chistes
  if (/chiste|broma|h[aá]zme re[ií]r|divierte/i.test(msg)) {
    const chistes = [
      "¿Por qué los pájaros no usan Facebook? Porque ya tienen Twitter. 😄",
      "¿Qué le dice un jaguar a otro jaguar? ¡Jaguar you! 🐆",
      "¿Por qué el libro de matemáticas estaba triste? Porque tenía muchos problemas. 📚",
      "¿Qué hace una abeja en el gimnasio? ¡Zum-ba! 🐝",
      "¿Por qué los esqueletos no pelean entre ellos? Porque no tienen agallas. 💀",
    ];
    return chistes[Math.floor(Math.random() * chistes.length)];
  }

  // ¿Cómo estás?
  if (/c[oó]mo est[aá]s|qu[eé] tal|c[oó]mo te va|qu[eé] hay de nuevo/i.test(msg)) {
    return `Todo bien, ${nombre} 😊 Listo para ayudarte con lo que necesites. ¿Preguntas del almacén o de algo más?`;
  }

  // ¿Quién eres?
  if (/qui[eé]n eres|c[oó]mo te llamas|tu nombre|qu[eé] eres|qu[eé] eres tú/i.test(msg)) {
    return `Soy Alana, la asistente del almacén Lemcorp. Pero puedo responder cualquier pregunta que tengas, no solo del almacén. ¿Qué necesitas?`;
  }

  // Opinion / consejo
  if (/qu[eé] piensas|tu opini[oó]n|qu[eé] crees|consejo|recomienda|sugiere/i.test(msg)) {
    // Si menciona un producto del almacén, dar opinión basada en datos
    const prodMencionado = products.find(p => msg.includes(p.name.toLowerCase()) || msg.includes(p.sku.toLowerCase()));
    if (prodMencionado) {
      const estado = prodMencionado.minStock && prodMencionado.quantity <= prodMencionado.minStock ? "crítico" : "saludable";
      return `Mi opinión sobre ${prodMencionado.name}: el stock está ${estado} (${prodMencionado.quantity} ${prodMencionado.udm || "und"}). ${prodMencionado.minStock && prodMencionado.quantity <= prodMencionado.minStock ? "Recomendaría reponer pronto." : "Por ahora va bien."}`;
    }
    return `Depende del contexto, ${nombre}. ¿Sobre qué específicamente quieres mi opinión? Mientras más detalle me des, mejor te puedo aconsejar.`;
  }

  // Explicación / definición corta (sin ir a Wikipedia aún)
  if (/expl[ií]came|qu[eé] significa|c[oó]mo funciona|por qu[eé] pasa/i.test(msg)) {
    // Dejar que Wikipedia lo maneje abajo
  }

  // Saludos adicionales
  if (/buenos d[ií]as|buen d[ií]a/i.test(msg)) {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) {
      return `¡Buenos días, ${nombre}! ☀️ ¿Qué planes para hoy?`;
    }
    return `Hola, ${nombre}. Son las ${new Date().toLocaleTimeString("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit" })}. ¿Qué necesitas?`;
  }
  if (/buenas tardes|buena tarde/i.test(msg)) {
    return `¡Buenas tardes, ${nombre}! 👋 ¿Qué hay?`;
  }
  if (/buenas noches|buena noche/i.test(msg)) {
    return `¡Buenas noches, ${nombre}! 🌙 ¿Algo en lo que pueda ayudar?`;
  }

  // === 8. WIKIPEDIA — BUSCAR PARA TODAS LAS PREGUNTAS DE CONOCIMIENTO ===
  // Extraer el tema de búsqueda limpiando palabras de pregunta
  let temaBusqueda = msg
    .replace(/^(qu[eé] es|qu[eé] son|qu[eé] significa|qu[ié]n es|qu[ié]n fue|quien es|quien fue|qu[ié]nes son|d[ií]me|dime qu[eé] es|dime sobre|h[aá]blame de|cu[eé]ntame de|cu[eé]ntame sobre|informaci[oó]n sobre|s[aá]bes de|s[aá]bes sobre|qu[eé] sabes de|qu[eé] sabes sobre|cu[aá]l es la|cu[aá]l es el|d[oó]nde est[aá]|c[oó]mo se|por qu[eé]|cu[aá]ndo|hay)\s*/i, "")
    .replace(/\?/g, "")
    .replace(/^(la|el|los|las|un|una|de|del|al|es|en)\s+/i, "")
    .trim();

  if (temaBusqueda.length > 2) {
    try {
      const wikiUrl = `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(temaBusqueda)}&format=json&utf8=1&srlimit=1`;
      const wikiRes = await fetch(wikiUrl, { headers: { "User-Agent": "Alana-LEMCORP/1.0" } });
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json();
        const searchResults = wikiData?.query?.search;
        if (searchResults && searchResults.length > 0) {
          const pageTitle = searchResults[0].title;
          const summaryUrl = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
          const summaryRes = await fetch(summaryUrl, { headers: { "User-Agent": "Alana-LEMCORP/1.0" } });
          if (summaryRes.ok) {
            const summaryData = await summaryRes.json();
            const extract = summaryData?.extract;
            if (extract && extract.length > 20) {
              let respuesta = extract;
              if (respuesta.length > 400) respuesta = respuesta.slice(0, 400).trim() + "...";
              return `${respuesta}\n\n(Fuente: Wikipedia)`;
            }
          }
        }
      }
    } catch {}
  }

  // === 9. RESPUESTA FINAL ===
  return `Mmm, no tengo información exacta sobre eso, ${nombre}. Pero puedo ayudarte con:

• Matemáticas: "cuánto es 5 por 3", "20% de 500"
• Almacén: "qué productos tengo", "qué falta", "cómo están los equipos"
• Conocimiento: "qué es un router", "quién fue Einstein", "dónde está París"
• Acciones: "añade 50 conectores", "anota revisar cable", "pon la página en blanco"
• Recordatorios: "recuérdame pedir conectores mañana a las 9"

¿Qué necesitas exactamente?`;
}
