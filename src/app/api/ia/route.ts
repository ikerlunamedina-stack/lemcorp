// API route para Alana, asistente del almacén VRS (VRS WMS)
// Usa Google Gemini API en el backend, con análisis en tiempo real del inventario.
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// ─── Cliente Gemini (REST oficial de Google AI Studio) ───
// Usamos fetch directo para evitar dependencias externas y poder cambiar de modelo fácil.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
// Lista de modelos a probar en orden; el primero que funcione se cachea en runtime.
const MODELOS_CANDIDATOS = [
  "gemini-3.6-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-flash-latest",
  "gemini-1.5-flash",
];
let MODELO_ACTIVO: string | null = null;
const GEMINI_ENDPOINT = (modelo: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;

interface MensajeLLM {
  role: "user" | "assistant";
  content: string;
}

/**
 * Llama a la API de Google Gemini con un historial de mensajes y devuelve el texto generado.
 * - Usa el header `x-goog-api-key` (más confiable que el query param ?key= para evitar
 *   bloqueos por región/cors en algunos entornos).
 * - Si el modelo activo falla, prueba con los demás candidatos.
 * Lanza error si todos los modelos fallan o si no hay contenido útil.
 */
async function llamarGemini(mensajes: MensajeLLM[]): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY no configurada en .env");
  }

  // Gemini usa roles "user" y "model" (mapeamos "assistant" -> "model")
  const contents = mensajes.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body = JSON.stringify({
    contents,
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 2048,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  });

  // Si ya conocemos un modelo que funcionó antes, intentamos ese primero.
  const orden = MODELO_ACTIVO
    ? [MODELO_ACTIVO, ...MODELOS_CANDIDATOS.filter((m) => m !== MODELO_ACTIVO)]
    : MODELOS_CANDIDATOS;

  let ultimoError: Error | null = null;
  for (const modelo of orden) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45_000); // 45s max

    try {
      const res = await fetch(`${GEMINI_ENDPOINT(modelo)}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY, // header oficial de Google
        },
        signal: controller.signal,
        body,
      });

      if (!res.ok) {
        const errTxt = await res.text().catch(() => "");
        const lower = errTxt.toLowerCase();
        // Errores que NO dependen del modelo: cortamos el bucle y propagamos inmediatamente.
        // Ej: "user location is not supported", "API key not valid", "permission denied", rate limit global.
        const esErrorEstructural =
          lower.includes("user location") ||
          lower.includes("api key not valid") ||
          lower.includes("api_key_invalid") ||
          lower.includes("permission denied") ||
          lower.includes("quota") ||
          lower.includes("unauthorized") ||
          lower.includes("resource has been exhausted");
        if (esErrorEstructural) {
          throw new Error(`Gemini HTTP ${res.status} (${modelo}): ${errTxt.slice(0, 300)}`);
        }
        // Errores de modelo (404, 400 por modelo inválido) → probar siguiente
        if (res.status === 404 || res.status === 400) {
          ultimoError = new Error(`Gemini HTTP ${res.status} (${modelo}): ${errTxt.slice(0, 200)}`);
          continue;
        }
        // Otros errores (5xx) → cortar y propagar
        throw new Error(`Gemini HTTP ${res.status} (${modelo}): ${errTxt.slice(0, 300)}`);
      }

      const data = await res.json();
      const texto =
        data?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p?.text || "")
          .join("")
          .trim() || "";

      if (!texto) {
        const blockReason = data?.promptFeedback?.blockReason;
        if (blockReason) {
          ultimoError = new Error(`Gemini bloqueado (${modelo}): ${blockReason}`);
          continue;
        }
        ultimoError = new Error(`Respuesta vacía de Gemini (${modelo})`);
        continue;
      }

      // Éxito — cachamos el modelo para no volver a probar todos en la próxima llamada
      MODELO_ACTIVO = modelo;
      return texto;
    } catch (err: any) {
      if (err?.name === "AbortError") {
        ultimoError = new Error(`Timeout llamando a Gemini (${modelo})`);
        continue;
      }
      // Errores no relacionados con el modelo (401, 429, 5xx, red) → propagar
      if (ultimoError === null) ultimoError = err;
      // No continuamos con otros modelos si es un error de red/autenticación
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw ultimoError || new Error("No se pudo obtener respuesta de Gemini");
}

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
  // === LOG BACKEND 1: Request recibido ===
  const startTime = Date.now();
  let requestId = "no-id";
  let userMsg = "(vacío)";
  let historialLength = 0;
  try {
    const body = await req.json();
    requestId = body.requestId || "no-id";
    userMsg = body.mensaje || "(vacío)";
    historialLength = Array.isArray(body.historial) ? body.historial.length : 0;
    console.log(`[ALANA-API] ${requestId} → Recibido:`, {
      mensaje: String(userMsg).slice(0, 200),
      historialLength,
      inventarioCount: Array.isArray(body.inventario) ? body.inventario.length : 0,
      equiposCount: Array.isArray(body.equipos) ? body.equipos.length : 0,
      miembrosCount: Array.isArray(body.miembros) ? body.miembros.length : 0,
      despachosCount: Array.isArray(body.despachos) ? body.despachos.length : 0,
      memoriaCount: Array.isArray(body.memoria) ? body.memoria.length : 0,
      usuario: body.usuario,
      modoContexto: body.modoContexto,
    });

    // Desestructurar (manteniendo la lógica original)
    const { mensaje, historial, inventario, equipos, miembros, despachos, empresa, usuario, memoria, modoContexto } = body;

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
      ? `\n\nPRODUCTOS CON BAJO STOCK (URGENTE):\n${bajoStock
          .map((p) => `- ${p.sku} | ${p.name} | Stock actual: ${p.quantity} | Mínimo: ${p.minStock}`)
          .join("\n")}`
      : "\n\nNo hay productos con bajo stock actualmente.";

    const agotadoTxt = stockAgotado.length > 0
      ? `\n\nPRODUCTOS AGOTADOS:\n${stockAgotado.map((p) => `- ${p.sku} | ${p.name}`).join("\n")}`
      : "";

    const criticosTxt = criticosTop10.length > 0
      ? `\n\n TOP 10 PRODUCTOS CRÍTICOS:\n${criticosTop10
          .map((p, i) => `${i + 1}. ${p.sku} | ${p.name} | Stock: ${p.quantity} | Mín: ${p.minStock} | Ratio: ${(p.quantity / Math.max(p.minStock!, 1)).toFixed(2)}`)
          .join("\n")}`
      : "";

    const equiposTxt = eqs.length > 0
      ? `\n\nEQUIPOS REGISTRADOS: ${eqs.length} equipos\n` +
        `   - Disponibles: ${equiposPorEstado.disponible}\n` +
        `   - Averiados: ${equiposPorEstado.averiado}\n` +
        `   - En retiro: ${equiposPorEstado.en_retiro}`
      : "\n\nNo hay equipos registrados.";

    const miembrosTxt = pers.length > 0
      ? `\n\n👥 PERSONAL DEL ALMACÉN (${pers.length} personas):\n${pers
          .map((m) => `- ${m.nombre} | ${m.rol}${m.activo === false ? " (inactivo)" : ""}`)
          .join("\n")}`
      : "";

    const despachosTxt = `\n\n DESPACHOS HOY: ${despachosHoy.length} (${unidadesDespachadasHoy} unidades enviadas)`;

    const consumoTxt = consumo30.top.length > 0
      ? `\n\nCONSUMO ÚLTIMOS 30 DÍAS (top 12):\n${consumo30.top
          .slice(0, 12)
          .map((c) => `- ${c.sku} | ${c.nombre} | ${c.unidades} und en ${c.eventos} despachos`)
          .join("\n")}`
      : "";
    const consumo7Txt = consumo7.top.length > 0
      ? `\nCONSUMO ÚLTIMOS 7 DÍAS (top 8):\n${consumo7.top
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
    const systemPrompt = `Eres Alana, asistente del almacén VRS. Tu nombre es Alana.

REGLA CRÍTICA DE PRESENTACIÓN:
- SOLO dices "Soy Alana" cuando el usuario te PREGUNTE EXPLÍCITAMENTE tu nombre (ej: "¿cómo te llamas?", "¿quién eres?").
- NUNCA te presentes al inicio de cada respuesta. Si el usuario ya está conversando contigo, responde DIRECTO al mensaje sin saludar ni presentarte.
- NUNCA digas "Hola, soy Alana" a menos que sea el primer mensaje de la conversación y el usuario te esté saludando.
- Si el usuario te pide algo ("añade X", "cambia el tema", "dime Y"), responde SOLO con lo que pidió, sin presentaciones.
- Ejemplo CORRECTO: Usuario: "Pon la página en blanco" → Tú: "Listo, cambié el tema a claro." (sin "hola soy Alana")
- Ejemplo INCORRECTO: Usuario: "Pon la página en blanco" → Tú: "Hola, soy Alana. Listo, cambié el tema..." 

Eres la asistente experta en gestión de almacén para VRS, el sistema de gestión del almacén. VRS despacha equipos y materiales a una empresa contratista (${emp.nombre || "LPS"} — contratista de Claro).

OPERADOR ACTUAL: ${usuarioNombre}
FECHA/HORA LIMA: ${new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })}

═══════════════════════════════════════
TUS 8 CAPACIDADES PRINCIPALES:
═══════════════════════════════════════
1. ANÁLISIS DE STOCK: Detectar productos con bajo stock o agotados, calcular ratios de cobertura y priorizar compras.
2. CÁLCULO DE CONSUMO: Tienes datos REALES de consumo de los últimos 7 y 30 días. Úsalos para estimar consumo diario y proyectar necesidades futuras.
3. 🛒 RECOMENDACIONES DE COMPRA: Sugerir qué productos pedir, en qué cantidad, justificando con datos (SKU, cantidad, justificación). Usa el campo "Déficit" de la proyección para recomendaciones precisas.
4. TRAZABILIDAD DE EQUIPOS: Reportar el estado de los equipos (disponibles, averiados, en reparación, en retiro) y buscar por serie si el usuario pregunta por una.
5. 👥 GESTIÓN DE PERSONAL: Informar sobre el equipo del almacén, cargas, distribución.
6. ALERTAS TEMPRANAS: Anticipar quiebres de stock basándose en el ritmo de despacho y el déficit proyectado.
7. REPORTES EJECUTIVOS: Generar resúmenes accionables del estado del almacén. Incluye KPIs, tendencias y acciones recomendadas.
8. PLANIFICACIÓN: Calcular necesidades para un período (ej: "¿cuántos conectores para 30 días?"). Usa consumoDiario * días + stock mínimo de seguridad.

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
estado: <disponible | averiado | en_retiro>
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
DATOS DEL INVENTARIO DEL ALMACÉN VRS (propietario: ${emp.nombre || "VRS"}):
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
${modoContexto ? `MODO ACTIVO: ${modoContexto}\n` : ""}- Eres Alana, asistente del almacén VRS. Tu ÚNICA función es ayudar con el sistema y el almacén: inventario, stock, productos, equipos, despachos, personal, recordatorios, notas y acciones del sistema.
- Responde SIEMPRE en español peruano, claro y directo.
- SOLO respondes sobre el sistema/almacén. Tienes acceso a los DATOS REALES del inventario que te proporciona el sistema. Úsalos SIEMPRE para responder: stock actual, productos agotados, bajo stock, equipos, despachos, personal, consumo histórico, proyecciones.
- NUNCA uses información de internet, Wikipedia, ni conocimiento general externo. Toda tu información sobre el almacén viene del sistema.
- Si te preguntan sobre temas FUERA del almacén/sistema (deportes, política, ciencia general, cultura general, personalidades, geografía, etc.), RESPONDE: "Solo puedo ayudarte con temas del almacén y el sistema VRS: inventario, stock, equipos, despachos, personal, recordatorios y notas. ¿Qué necesitas del almacén?"
- Excepción: las MATEMÁTICAS sí las resuelves (ej: "15 * 23 + 100" → "345 + 100 = 445"). Y cálculos directos como "20% de 500". Estas son útiles para el almacén.
- Para preguntas de "¿cuánto pedir para X días?", usa la fórmula: consumoDiario × días + stockMínimo - stockActual. Redondea hacia arriba. USA LOS DATOS REALES del inventario.
- Para reportes ejecutivos del almacén, estructura la respuesta en secciones: Estado, Tendencias, Alertas, Acciones.
- Usa viñetas (•) para mejorar la legibilidad.
- Cuando recomiendes una compra, incluye: SKU del producto, cantidad sugerida, y justificación basada en datos reales del inventario.
- Sé específica con números: no digas "varios", di exactamente cuántos.
- Si detectas un problema urgente (stock crítico, agotado), márcalo con 🚨 al inicio de la línea.
- REGLA CRÍTICA DE PRESENTACIÓN: NUNCA digas "Hola, soy Alana" al inicio de cada respuesta. SOLO preséntate si el usuario te PREGUNTA EXPLÍCITAMENTE tu nombre.
- Mantén un tono profesional pero cercano. Eres un colega experta del almacén, no un robot.
- Si el usuario pregunta por un SKU específico, busca en el inventario detallado y responde con sus datos exactos (stock, mínimo, ubicación, estado).
- Mantén el CONTEXTO de la conversación del almacén. Si el usuario dice "y ese?", refiérete al último producto o tema del almacén del que hablaron.
- Sé concisa pero completa. No respondas con 1 palabra, pero tampoco escribas un ensayo si no es necesario.`;

    // ─── Construir historial de mensajes para el LLM ───
    const mensajesLLM: Array<{ role: "user" | "assistant"; content: string }> = [];
    // Sistema: lo inyectamos como primer mensaje "user" con el system prompt
    mensajesLLM.push({ role: "user", content: systemPrompt });
    mensajesLLM.push({ role: "assistant", content: "Entendido. Soy Alana, asistente del almacén VRS. Estoy lista para ayudarte con el inventario, stock, equipos, despachos y personal." });
    // Últimos 8 mensajes del historial real (para mantener contexto sin saturar tokens)
    const historialRecortado = historialMsgs.slice(-8);
    for (const m of historialRecortado) {
      mensajesLLM.push({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      });
    }
    // Mensaje actual del usuario
    mensajesLLM.push({ role: "user", content: mensaje });

    // ─── Llamar a la API real de Google Gemini ───
    let respuesta = "";
    let usarFallback = false;
    try {
      respuesta = await llamarGemini(mensajesLLM);
      if (!respuesta || !respuesta.trim()) {
        usarFallback = true;
      }
    } catch (err) {
      console.error("Error llamando a Gemini, usando fallback:", err);
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
        historial: historialMsgs,
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

    // === LOG BACKEND 2: Respuesta generada y enviada ===
    const elapsed = Date.now() - startTime;
    console.log(`[ALANA-API] ${requestId} ← Respuesta enviada (${elapsed}ms):`, {
      respuestaLength: respuesta.length,
      respuestaPreview: respuesta.slice(0, 300),
      recordatoriosCount: recordatorios.length,
      memoriasCount: memorias.length,
      accionesCount: acciones.length,
      userMessageRecibido: userMsg,
      historialLength,
    });

    return NextResponse.json({ ok: true, respuesta, recordatorios, memorias, acciones });
  } catch (error: any) {
    console.error(`[ALANA-API] ${requestId} ✗ Error:`, error?.message || error);
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
  historial: Array<{ role: string; content: string }>;
}

async function generarRespuestaFallback(mensaje: string, data: FallbackData): Promise<string> {
  const msg = (mensaje || "").toLowerCase().trim();
  const { products, equipos, despachos, miembros, empresa, usuario, memoria, historial } = data;
  const nombre = usuario || "Iker";

  // === CONTEXTO: buscar el último mensaje del usuario en el historial ===
  const ultimoMsgUsuario = historial.filter(m => m.role === "user").slice(-1)[0]?.content || "";
  const segundoUltimoMsgUsuario = historial.filter(m => m.role === "user").slice(-2)[0]?.content || "";

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
    return `Hola ${nombre} ¿Qué necesitas? Puedo ayudarte con el almacén: inventario, stock, equipos, despachos, personal, y también hacer cálculos.`;
  }
  if (/c[oó]mo est[aá]s|qu[eé] tal|c[oó]mo te va/i.test(msg)) {
    return `Todo bien 😊 ¿Y tú? Dime qué necesitas del almacén.`;
  }
  if (/qui[eé]n eres|c[oó]mo te llamas|tu nombre|qu[eé] eres/i.test(msg)) {
    return `Soy Alana, asistente del almacén VRS. Te ayudo con inventario, stock, equipos, despachos y personal. ¿Qué necesitas?`;
  }
  if (/gracias|thank|genial|buen|perfecto|excelente/i.test(msg)) {
    return `De nada, ${nombre} 👍`;
  }
  if (/chao|adios|adiós|hasta luego|nos vemos|bye/i.test(msg)) {
    return `Chao ${nombre}`;
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
    if (products.length === 0) return `No hay productos cargados todavia, ${nombre}. Ve a /recepciones y sube un Excel de stock para empezar.`;
    const bajoStock = products.filter(p => p.minStock && p.minStock > 0 && p.quantity <= p.minStock);
    const agotados = products.filter(p => p.quantity === 0);
    if (bajoStock.length === 0 && agotados.length === 0) {
      const totalUnd = products.reduce((s, p) => s + p.quantity, 0);
      return `Todo bien, ${nombre}. Tienes ${products.length} productos y ${totalUnd.toLocaleString("es-PE")} unidades en stock. Ningun producto esta bajo del minimo. El almacen esta saludable.`;
    }
    let resp = `Ojo con esto, ${nombre}:\n\n`;
    if (agotados.length > 0) {
      resp += `SIN STOCK (${agotados.length} productos agotados):\n`;
      resp += agotados.map(p => `  • ${p.name} (SKU: ${p.sku}) — 0 ${p.udm || "und"}\n`).join("");
      resp += `\n`;
    }
    if (bajoStock.length > 0) {
      resp += `BAJO DEL MINIMO (${bajoStock.length} productos):\n`;
      resp += bajoStock.map(p => {
        const sugerido = (p.minStock! * 2) - p.quantity;
        return `  • ${p.name} (SKU: ${p.sku})\n    Stock: ${p.quantity} / Min: ${p.minStock} ${p.udm || "und"}\n    Sugerido pedir: ${sugerido > 0 ? sugerido : p.minStock!} ${p.udm || "und"}\n`;
      }).join("");
    }
    resp += `\nRecomendacion: Haz el pedido urgente para los productos agotados y los que estan bajo del minimo.`;
    return resp;
  }

  // ¿Cuánto material necesito para X días?
  if (/(cu[aá]nto|cu[aá]ntos|cu[aá]ntas).*(material|producto|necesito|pedir|comprar|reponer).*(d[ií]a|semana|mes)/i.test(msg) || /pedir.*para.*d/i.test(msg) || /calcu.*pedido/i.test(msg)) {
    if (products.length === 0) return `No hay productos cargados, ${nombre}.`;
    const diasMatch = msg.match(/(\d+)\s*(d[ií]as|d[ií]a)/i);
    const dias = diasMatch ? parseInt(diasMatch[1]) : 30;
    const bajoStock = products.filter(p => p.minStock && p.minStock > 0 && p.quantity <= p.minStock);
    if (bajoStock.length === 0) return `No hay productos con bajo stock. Todo esta bien por ahora. Vuelve a preguntarme en unos dias.`;

    let resp = `Calculo de pedido para ${dias} dias:\n\n`;
    resp += `Productos que necesitas reponer urgente:\n\n`;
    resp += bajoStock.map(p => {
      const consumoDiario = p.minStock! / 30; // estimo consumo = minStock/30
      const necesario = Math.ceil(consumoDiario * dias);
      const sugerido = Math.max(necesario + p.minStock! - p.quantity, p.minStock! * 2 - p.quantity);
      const valorPedido = ((p.precio || 0) * sugerido).toLocaleString("es-PE", { maximumFractionDigits: 0 });
      return `• ${p.name} (SKU: ${p.sku})\n  Stock actual: ${p.quantity} ${p.udm || "und"}\n  Minimo: ${p.minStock} ${p.udm || "und"}\n  Consumo estimado: ${consumoDiario.toFixed(1)} und/dia\n  Sugerido pedir: ${sugerido} ${p.udm || "und"}\n  Valor pedido: S/ ${valorPedido}\n`;
    }).join("");
    const valorTotal = bajoStock.reduce((s, p) => {
      const sugerido = Math.max(Math.ceil((p.minStock! / 30) * dias) + p.minStock! - p.quantity, p.minStock! * 2 - p.quantity);
      return s + ((p.precio || 0) * sugerido);
    }, 0);
    resp += `\nTotal del pedido: S/ ${valorTotal.toLocaleString("es-PE", { maximumFractionDigits: 0 })}\n`;
    resp += `Productos a reponer: ${bajoStock.length}`;
    return resp;
  }

  // Reporte ejecutivo
  if (/reporte|resumen|estado.*almac[eé]n|c[oó]mo est[aá].*almac/i.test(msg)) {
    const totalUnd = products.reduce((s, p) => s + p.quantity, 0);
    const valorTotal = products.reduce((s, p) => s + (p.precio || 0) * p.quantity, 0);
    const bajoStock = products.filter(p => p.minStock && p.minStock > 0 && p.quantity <= p.minStock);
    const agotados = products.filter(p => p.quantity === 0);
    const sinPrecio = products.filter(p => !p.precio || p.precio === 0);
    const disp = equipos.filter(e => e.estado === "disponible").length;
    const aver = equipos.filter(e => e.estado === "averiado").length;
    const ret = equipos.filter(e => e.estado === "en_retiro").length;
    const despachosHoy = despachos.filter(d => { try { return new Date(d.fecha).toDateString() === new Date().toDateString(); } catch { return false; } }).length;

    return `REPORTE EJECUTIVO DEL ALMACEN\n
ESTADO GENERAL:
  • ${products.length} productos en catalogo
  • ${totalUnd.toLocaleString("es-PE")} unidades totales
  • Valor del stock: S/ ${valorTotal.toLocaleString("es-PE", { maximumFractionDigits: 0 })}
  • ${equipos.length} equipos con serie registrados
  • ${despachos.length} despachos historicos (${despachosHoy} hoy)

ALERTAS:
  • ${bajoStock.length} producto(s) con bajo stock
  • ${agotados.length} producto(s) agotados
  • ${sinPrecio.length} producto(s) sin precio
  • ${aver} equipo(s) averiado(s)

EQUIPOS:
  • Disponibles: ${disp}
  • Averiados: ${aver}
  • En retiro: ${ret}

${bajoStock.length > 0 ? `PRODUCTOS CRITICOS:\n${bajoStock.slice(0, 5).map(p => `  • ${p.name} — ${p.quantity}/${p.minStock} ${p.udm || "und"}`).join("\n")}${bajoStock.length > 5 ? `\n  ...y ${bajoStock.length - 5} mas` : ""}` : "Sin productos criticos."}

${agotados.length > 0 ? `PRODUCTOS AGOTADOS:\n${agotados.slice(0, 5).map(p => `  • ${p.name} (SKU: ${p.sku})`).join("\n")}` : ""}`;
  }

  if (/cu[aá]ntos productos|cu[aá]nto stock|inventario|cat[aá]logo|qu[eé] productos|qu[eé] hay|qu[eé] tengo/i.test(msg)) {
    if (products.length === 0) return `No hay productos cargados, ${nombre}. Ve a /recepciones y sube un Excel de stock.`;
    const totalUnidades = products.reduce((s, p) => s + p.quantity, 0);
    const valorTotal = products.reduce((s, p) => s + (p.precio || 0) * p.quantity, 0);
    const bajoStock = products.filter(p => p.minStock && p.minStock > 0 && p.quantity <= p.minStock);
    return `Tienes ${products.length} productos, ${totalUnidades.toLocaleString("es-PE")} unidades.\nValor total: S/ ${valorTotal.toLocaleString("es-PE", { maximumFractionDigits: 0 })}\n${bajoStock.length > 0 ? `${bajoStock.length} productos con bajo stock.` : "Sin productos con bajo stock."}\n\nProductos:\n${products.slice(0, 20).map(p => `• ${p.name} (SKU: ${p.sku}) — ${p.quantity} ${p.udm || "und"}${p.precio ? ` — S/ ${(p.precio * p.quantity).toLocaleString("es-PE", { maximumFractionDigits: 0 })}` : ""}`).join("\n")}${products.length > 20 ? `\n...y ${products.length - 20} mas` : ""}`;
  }
  // Si el mensaje es una ACCIÓN (anota, apunta, despachando, recordatorio, bloc) — NO entrar a consultas de equipos
  const esAccion = /anot[ae]s?|apunt[ae]s?|ponlo en bloc|pon en bloc|despachando|despacho|haceme recordar|hazme recordar|recu[eé]rdame|yo dije|acaso te dije/i.test(msg);

  if (/equipos|aver[ií]ad|reparaci[oó]n|router|ont|decodificador/i.test(msg) && !esAccion) {
    if (equipos.length === 0) return `No hay equipos cargados, ${nombre}. Puedes añadirlos desde la pestaña Equipos.`;
    const disponibles = equipos.filter(e => e.estado === "disponible").length;
    const averiados = equipos.filter(e => e.estado === "averiado").length;
    return `${equipos.length} equipos: ${disponibles} disponibles, ${averiados} averiados.${averiados > 0 ? ` Hay ${averiados} que necesitan revisión.` : " Todo operativo."}`;
  }
  if (/despacho|env[ií]o|entrega/i.test(msg) && !esAccion) {
    const hoy = despachos.filter(d => { try { return new Date(d.fecha).toDateString() === new Date().toDateString(); } catch { return false; } }).length;
    return `${despachos.length} despachos en total, ${hoy} hoy.${despachos.length > 0 ? `\nÚltimos:\n${despachos.slice(0, 3).map(d => `• ${d.cantidad} und — ${d.producto || d.sku}`).join("\n")}` : ""}`;
  }
  if (/personal|gente|personas|miembros/i.test(msg)) {
    return `${miembros.length} personas en el equipo${miembros.length > 0 ? `:\n${miembros.slice(0, 20).map(m => `• ${m.nombre} — ${m.rol}`).join("\n")}` : "."}`;
  }

  // === 5. ACCIONES DEL SISTEMA ===
  if (/a[ñn]ade|agrega|nuevo producto/i.test(msg)) {
    return `Dime: "añade 50 conectores RJ-45, SKU CONN-RJ45, mínimo 20" y lo cargo.`;
  }

  // === ANOTA / APUNTA — con contexto de conversación ===
  if (/anot[ae]s?|apunt[ae]s?|ponlo en bloc|pon en bloc|registrar|despachando|despacho|yo dije|acaso te dije/i.test(msg)) {
    // Extraer el texto a anotar del mensaje actual
    let textoNota = mensaje
      .replace(/^(anota|anotes|apunta|apuntes|ponlo en bloc|pon en bloc|registrar)\s*(que)?\s*/i, "")
      .replace(/^(acaso te dije que anotes eso|yo dije que anotes? que|yo dije que apuntes? que)\s*/i, "")
      .replace(/^(haceme recordar|hazme recordar|recuérdame|recuerdame)\s*/i, "")
      .trim();

    // Si el mensaje es solo "tu solo apunta" o "solo anota" — usar el contexto anterior
    if (/^(tu solo apunta|solo apunta|tu solo anota|solo anota|solo ponlo|ponlo nada mas|apunta nada mas)$/i.test(msg) || textoNota.length < 5) {
      // Buscar en el historial el último mensaje sustantivo del usuario
      const msgsUsuario = historial.filter(m => m.role === "user" && m.content.trim().length > 10);
      const ultimoSustantivo = msgsUsuario.slice(-1)[0]?.content || "";
      if (ultimoSustantivo && !/^(tu solo|solo apunta|solo anota)/i.test(ultimoSustantivo)) {
        textoNota = ultimoSustantivo;
      }
    }

    // Si el usuario está corrigiendo: "yo dije que anotes que al tecnico padilla le di 4 equipos"
    if (/yo dije|acaso te dije|te dije que/i.test(msg)) {
      // Buscar el último "que anotes que" o "que apuntes que" y extraer lo que sigue
      const matchCorreccion = mensaje.match(/(?:anotes?|apuntes?)\s+que\s+(.+)$/i);
      if (matchCorreccion) {
        // Si hay múltiples "que", tomar solo la parte después del último
        const textoExtraido = matchCorreccion[1].trim();
        // Si el texto extraído tiene "yo dije" o "acaso" al inicio, buscar más profundamente
        const matchProfundo = textoExtraido.match(/(?:anotes?|apuntes?)\s+que\s+(.+)$/i);
        if (matchProfundo) {
          textoNota = matchProfundo[1].trim();
        } else {
          textoNota = textoExtraido;
        }
      }
    }

    // Limpiar el texto de comandos residuales
    textoNota = textoNota
      .replace(/^(que|de|para|en)\s+/i, "")
      .replace(/haceme recordar|hazme recordar/gi, "")
      .replace(/o ponlo en bloc|o pon en bloc/gi, "")
      .trim();

    if (textoNota.length > 3) {
      return `Anotado: "${textoNota}"\n\n[[ACCION]]\ntipo: add_note\ntexto: ${textoNota}\n[[/ACCION]]`;
    }
    return `¿Qué anoto? Dime "anota [texto]".`;
  }

  // Si el usuario dice "tu solo apunta" o similar sin más, usar contexto
  if (/^(tu solo|solo|apunta|anota|ponlo)/i.test(msg) && msg.length < 25) {
    const msgsUsuario = historial.filter(m => m.role === "user" && m.content.trim().length > 10);
    const ultimoSustantivo = msgsUsuario.slice(-1)[0]?.content || "";
    if (ultimoSustantivo && !/^(tu solo|solo|apunta|anota|ponlo)/i.test(ultimoSustantivo)) {
      return `Anotado: "${ultimoSustantivo}"\n\n[[ACCION]]\ntipo: add_note\ntexto: ${ultimoSustantivo}\n[[/ACCION]]`;
    }
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

  // === 6.5. RESPONDER preguntas de almacén con DATOS REALES ===
  const palabrasAlmacen = ["equipo", "almacen", "stock", "inventario", "pedido", "despacho", "producto", "router", "modem", "decodificador", "repetidor", "ont", "conector", "cable", "splitter", "rosa", "serie", "tecnico", "personal", "guia", "remision", "recepcion", "transferencia", "comprar", "reponer", "pedir", "consumo", "rotacion", "averiado", "disponible", "retiro", "precio", "valor", "categoria", "abc", "antig", "bajo stock", "agotado", "acabarse", "acabando", "acabandoce", "agotando", "agotandose", "escaseando", "quedan", "quedan poco", "poco stock", "falta", "faltan", "critico", "critica", "minimo", "minima"];
  const esPreguntaAlmacen = palabrasAlmacen.some(p => msg.includes(p));

  if (esPreguntaAlmacen) {
    // Responder con datos reales del almacén

    // Pregunta específica: "qué cosas están a punto de acabarse" / "qué se está agotando" / "qué falta"
    if (/acab|agot|escas|punto de|quedan poco|poco stock|faltan? .*(material|producto|stock)|que falta|que necesito|que comprar|que pedir|que reponer|por agotar|cerca de agot/i.test(msg) || /\b(terminando|finalizando|cerca de)\b.*\b(stock|cantidad|inventario)/i.test(msg)) {
      // Caso 1: NO hay productos cargados en el sistema
      if (products.length === 0) {
        return `No tienes productos cargados en el inventario, ${nombre}. 

Para que pueda decirte qué está a punto de acabarse, necesito productos con su stock mínimo definido.

Puedes:
• Subir un Excel de inventario desde la página Inventario (botón Importar)
• O pedirme: "añade 50 conectores RJ-45, SKU CONN-RJ45, mínimo 20"

En cuanto tengas productos cargados, dime de nuevo "qué cosas están a punto de acabarse" y te listé los críticos.`;
      }

      const agotados = products.filter(p => p.quantity === 0);
      const bajoStock = products.filter(p => p.minStock && p.minStock > 0 && p.quantity <= p.minStock && p.quantity > 0);
      const sinMinimo = products.filter(p => !p.minStock || p.minStock === 0);

      // Caso 2: hay productos pero NINGUNO tiene mínimo definido
      if (sinMinimo.length === products.length) {
        // Sin mínimos, no podemos saber qué está a punto de acabarse.
        // Mostrar los 10 productos con MENOR stock como referencia.
        const ordenados = [...products].sort((a, b) => a.quantity - b.quantity).slice(0, 10);
        return `Tienes ${products.length} productos en el inventario, ${nombre}, pero NINGUNO tiene stock mínimo definido, así que no puedo saber qué está a punto de acabarse.

Productos con MENOR stock actualmente:
${ordenados.map((p, i) => `  ${i + 1}. ${p.name} — SKU ${p.sku} — Stock: ${p.quantity} ${p.udm || "und"}`).join("\n")}

Para que pueda avisarte correctamente, configura el mínimo de cada producto desde la página Inventario (editar producto). Mientras más bajo el stock respecto al mínimo, más urgente la reposición.`;
      }

      // Caso 3: hay productos pero no hay ni agotados ni bajo stock
      if (agotados.length === 0 && bajoStock.length === 0) {
        return `No hay productos a punto de acabarse, ${nombre}. ✅ Todo tu inventario está por encima del mínimo configurado${sinMinimo.length > 0 ? ` (${sinMinimo.length} productos no tienen mínimo definido, no los monitoreo)` : ""}.

Resumen actual:
• ${products.length} productos en catálogo
• ${agotados.length} agotados
• ${bajoStock.length} con bajo stock

Sigue así. Si quieres ver el stock completo, dime "muéstrame el inventario".`;
      }

      // Caso 4: hay productos agotados o bajo stock → listarlos
      const secciones: string[] = [`Productos a punto de acabarse, ${nombre}:`, ``];
      if (agotados.length > 0) {
        secciones.push(`🚨 AGOTADOS (${agotados.length}) — Hay que reponer YA:`);
        secciones.push(...agotados.map(p => `  • ${p.name} — SKU ${p.sku} — Stock: 0 ${p.udm || "und"}${p.minStock ? ` (mínimo ${p.minStock})` : ""}`));
        secciones.push(``);
      }
      if (bajoStock.length > 0) {
        secciones.push(`⚠️ BAJO STOCK (${bajoStock.length}) — Están al límite:`);
        secciones.push(...bajoStock.map(p => `  • ${p.name} — SKU ${p.sku} — Stock: ${p.quantity}/${p.minStock} ${p.udm || "und"}`));
        secciones.push(``);
      }
      const totalReponer = agotados.length + bajoStock.length;
      secciones.push(`Recomendación: reponer ${totalReponer > 1 ? `los ${totalReponer} productos listados` : "el producto listado"} cuanto antes para evitar quiebre de stock.`);
      return secciones.join("\n");
    }

    if (msg.includes("equipo") && (msg.includes("como esta") || msg.includes("como estan") || msg.includes("estado") || msg.includes("hoy"))) {
      const disp = equipos.filter(e => e.estado === "disponible").length;
      const aver = equipos.filter(e => e.estado === "averiado").length;
      const ret = equipos.filter(e => e.estado === "en_retiro").length;
      return `Estado de equipos del almacén hoy:

• Disponibles: ${disp} equipos
• Averiados: ${aver} equipos
• En retiro: ${ret} equipos
• Total: ${equipos.length} equipos registrados

${aver > 0 ? `Tienes ${aver} equipo(s) averiado(s) que necesitan atencion.` : "Todos los equipos estan operativos."}
${ret > 0 ? `Hay ${ret} equipo(s) en retiro que ya salieron del almacen.` : ""}`;
    }

    if (msg.includes("stock") || msg.includes("inventario")) {
      const totalUnd = products.reduce((s, p) => s + p.quantity, 0);
      const bajoStock = products.filter(p => p.minStock && p.minStock > 0 && p.quantity <= p.minStock);
      const agotados = products.filter(p => p.quantity === 0);
      const valorTotal = products.reduce((s, p) => s + (p.precio || 0) * p.quantity, 0);
      return `Inventario actual:

• ${products.length} productos en catalogo
• ${totalUnd} unidades totales
• Valor: S/ ${valorTotal.toLocaleString("es-PE", { maximumFractionDigits: 0 })}
${bajoStock.length > 0 ? `• ${bajoStock.length} producto(s) con bajo stock` : "• Sin productos con bajo stock"}
${agotados.length > 0 ? `• ${agotados.length} producto(s) agotado(s)` : "• Sin productos agotados"}

${bajoStock.length > 0 ? "Productos que necesitan reposicion:" : ""}
${bajoStock.slice(0, 20).map(p => `  - ${p.name}: ${p.quantity}/${p.minStock} ${p.udm || "und"}`).join("\n")}`;
    }

    if (msg.includes("pedido") || msg.includes("pedir") || msg.includes("comprar") || msg.includes("reponer") || msg.includes("reposicion")) {
      const bajoStock = products.filter(p => p.minStock && p.minStock > 0 && p.quantity <= p.minStock);
      if (bajoStock.length === 0) {
        return `No hay productos con bajo stock. Todo el inventario esta por encima del minimo. No necesitas hacer pedidos urgentes.`;
      }
      return `Productos que necesitas pedir urgente:

${bajoStock.map(p => `• ${p.name} (SKU: ${p.sku})
  Stock actual: ${p.quantity} ${p.udm || "und"}
  Minimo: ${p.minStock} ${p.udm || "und"}
  Sugerido pedir: ${(p.minStock * 2) - p.quantity} ${p.udm || "und"}`).join("\n")}

Total de productos a reponer: ${bajoStock.length}`;
    }

    // Respuesta generica de almacen con datos reales
    const totalUnd = products.reduce((s, p) => s + p.quantity, 0);
    const bajoStock = products.filter(p => p.minStock && p.minStock > 0 && p.quantity <= p.minStock);
    return `Aqui tienes un resumen del almacen:

• ${products.length} productos en catalogo
• ${totalUnd} unidades totales
• ${equipos.length} equipos con serie
• ${despachos.length} despachos registrados
• ${bajoStock.length} productos con bajo stock

Preguntame especificamente: "que productos tienen bajo stock?", "como estan los equipos?", "cuanto material necesito pedir?"`;
  }

  // === 7. SALUDOS BÁSICOS (lo único fuera del almacén que se permite) ===
  // ¿Cómo estás?
  if (/c[oó]mo est[aá]s|qu[eé] tal|c[oó]mo te va/i.test(msg)) {
    return `Todo bien, ${nombre} 😊 Lista para ayudarte con el almacén. ¿Qué necesitas?`;
  }

  // ¿Quién eres?
  if (/qui[eé]n eres|c[oó]mo te llamas|tu nombre|qu[eé] eres|qu[eé] eres tú/i.test(msg)) {
    return `Soy Alana, la asistente del almacén VRS. Te puedo ayudar con: inventario, stock, productos, equipos, despachos, personal, recordatorios, notas y acciones del sistema. ¿Qué necesitas?`;
  }

  // Saludos adicionales
  if (/buenos d[ií]as|buen d[ií]a/i.test(msg)) {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) {
      return `¡Buenos días, ${nombre}! ☀️ ¿Qué necesitas del almacén?`;
    }
    return `Hola, ${nombre}. Son las ${new Date().toLocaleTimeString("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit" })}. ¿Qué necesitas del almacén?`;
  }
  if (/buenas tardes|buena tarde/i.test(msg)) {
    return `¡Buenas tardes, ${nombre}! ¿Qué necesitas del almacén?`;
  }
  if (/buenas noches|buena noche/i.test(msg)) {
    return `¡Buenas noches, ${nombre}! 🌙 ¿Qué necesitas del almacén?`;
  }

  // Opinion / consejo sobre un producto del almacén
  if (/qu[eé] piensas|tu opini[oó]n|qu[eé] crees|consejo|recomienda|sugiere/i.test(msg)) {
    // Si menciona un producto del almacén, dar opinión basada en datos
    const prodMencionado = products.find(p => msg.includes(p.name.toLowerCase()) || msg.includes(p.sku.toLowerCase()));
    if (prodMencionado) {
      const estado = prodMencionado.minStock && prodMencionado.quantity <= prodMencionado.minStock ? "crítico" : "saludable";
      return `Mi opinión sobre ${prodMencionado.name}: el stock está ${estado} (${prodMencionado.quantity} ${prodMencionado.udm || "und"}). ${prodMencionado.minStock && prodMencionado.quantity <= prodMencionado.minStock ? "Recomendaría reponer pronto." : "Por ahora va bien."}`;
    }
    return `Solo puedo darte opiniones sobre productos del almacén, ${nombre}. ¿Sobre qué producto específico quieres mi opinión?`;
  }

  // === 8. RECHAZAR TEMAS FUERA DEL ALMACÉN ===
  // No somos ChatGPT, no buscamos en Wikipedia, no respondemos conocimiento general.
  // Temas típicos que el usuario podría intentar: ciencia, cultura, geografía, historia, personalidades, deportes, etc.
  const temaFueraDelAlmacen = /^(quien|qu[ií]en) (fue|es|era|eres|naci|naci[oó])|qu[eé] es (un|una|el|la) |qu[eé] significa|d[oó]nde est[aá] |cu[aá]ndo (naci[oó]|fue|se)|historia de|biograf|deporte|equipo de f[uú]tbol|pel[ií]cula|cantante|actor|actriz|presidente|pa[ií]s|capital|canciones|receta|astrolog|hor[oó]scopo|chiste|broma|h[aá]zme re[ií]r|divierte|c[oó]mo se hace|por qu[eé] el cielo/i.test(msg);

  if (temaFueraDelAlmacen) {
    return `Solo puedo ayudarte con temas del almacén y el sistema VRS: inventario, stock, equipos, despachos, personal, recordatorios y notas. ¿Qué necesitas del almacén?`;
  }

  // === 9. RESPUESTA FINAL (cuando no se reconoce la intención) ===
  return `No estoy segura de entender, ${nombre}. Solo puedo ayudarte con el almacén y el sistema VRS:

• Inventario: "qué productos tengo", "qué falta", "cómo está el stock"
• Equipos: "cómo están los equipos", "busca la serie X"
• Pedidos: "qué necesito pedir", "cuánto pedir para 30 días"
• Personal: "quién trabaja hoy"
• Acciones: "añade 50 conectores", "anota revisar cable", "pon la página en blanco"
• Recordatorios: "recuérdame pedir conectores mañana a las 9"
• Matemáticas: "cuánto es 5 por 3", "20% de 500"

¿Qué necesitas del almacén?`;
}
