"use client";

import { useRef, useEffect, useState } from "react";
import {
  Send, User, Trash2,
  TrendingDown, Package, AlertTriangle, Cpu, Users,
  BarChart3, ShoppingCart, BellRing, Clock,
  Volume2, Square, Brain,
  FileText, PackagePlus, ClipboardList,
  Sun, Menu, X, Hash, Calendar,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { speak, stopSpeaking } from "@/lib/tts";
import { AlanaAvatar } from "@/components/lem/alana-avatar";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  ts: number;
  recordatorio?: { texto: string; cuando: number };
  aprendido?: string[]; // lista de memorias guardadas desde este mensaje
  accionesEjecutadas?: AccionEjecutada[]; // acciones del sistema ejecutadas
}

interface AccionEjecutada {
  tipo: string;
  descripcion: string;
  ok: boolean;
  error?: string;
}

const SUGERENCIAS: { text: string; icon: typeof TrendingDown; color: string }[] = [
  { text: "¿Qué productos necesito pedir urgentemente?", icon: AlertTriangle, color: "text-rose-400" },
  { text: "Calcula el consumo mensual de routers ONT con 3 personas", icon: TrendingDown, color: "text-foreground" },
  { text: "¿Cuántos conectores FTTH debo pedir para 30 días?", icon: ShoppingCart, color: "text-foreground" },
  { text: "Dame un reporte ejecutivo del estado del almacén", icon: BarChart3, color: "text-foreground" },
  { text: "¿Qué equipos están averiados o en reparación?", icon: Cpu, color: "text-amber-400" },
  { text: "Recomienda cantidades a comprar para cable RG-6", icon: Package, color: "text-foreground" },
  { text: "Recuérdame pedir conectores en 1 minuto", icon: BellRing, color: "text-primary" },
  { text: "Recuerda que el personal Pérez trabaja solo de lunes a miércoles", icon: Brain, color: "text-emerald-400" },
  { text: "¿Cómo está el equipo del almacén hoy?", icon: Users, color: "text-foreground" },
  { text: "Añade 50 conectores RJ-45, SKU CONN-RJ45, mínimo 20", icon: PackagePlus, color: "text-primary" },
  { text: "Anota que hay que revisar el cable RG-6 el viernes", icon: FileText, color: "text-foreground" },
];

// Modos de IA con diferentes enfoques (sidebar)
interface ModoIA {
  id: string;
  label: string;
  icon: typeof TrendingDown;
  descripcion: string;
  contexto: string;
  sugerencias: { text: string; icon: typeof TrendingDown }[];
}

const MODOS_IA: ModoIA[] = [
  {
    id: "general",
    label: "General",
    icon: Brain,
    descripcion: "Asistente general de almacén",
    contexto: "",
    sugerencias: [
      { text: "Dame un reporte ejecutivo del estado del almacén", icon: BarChart3 },
      { text: "¿Cómo está el equipo del almacén hoy?", icon: Users },
      { text: "Recuerda que el personal Pérez trabaja lunes a miércoles", icon: Brain },
      { text: "Anota que hay que revisar el cable RG-6 el viernes", icon: FileText },
    ],
  },
  {
    id: "inventario",
    label: "Inventario",
    icon: Package,
    descripcion: "Enfoque en stock, productos y precios",
    contexto: "Enfócate exclusivamente en el INVENTARIO. Responde sobre stock disponible, productos con bajo stock, valores de inventario, precios, categorías y clasificación ABC. Si la pregunta no es sobre inventario, redirige amablemente al modo correcto.",
    sugerencias: [
      { text: "¿Qué productos tienen el stock más bajo?", icon: AlertTriangle },
      { text: "¿Cuál es el valor total del inventario?", icon: BarChart3 },
      { text: "Lista los productos de la Clase A (alto valor)", icon: Package },
      { text: "¿Qué productos no tienen precio asignado?", icon: FileText },
    ],
  },
  {
    id: "pedidos",
    label: "Pedidos",
    icon: ShoppingCart,
    descripcion: "Enfoque en compras y reposición",
    contexto: "Enfócate exclusivamente en PEDIDOS y COMPRAS. Responde sobre qué productos pedir, cantidades recomendadas, consumo proyectado, reposición urgente y planificación de compras. Si la pregunta no es sobre pedidos, redirige amablemente al modo correcto.",
    sugerencias: [
      { text: "¿Qué productos necesito pedir urgentemente?", icon: AlertTriangle },
      { text: "¿Cuántos conectores FTTH debo pedir para 30 días?", icon: ShoppingCart },
      { text: "Recomienda cantidades a comprar para cable RG-6", icon: Package },
      { text: "Calcula el consumo mensual de routers ONT", icon: TrendingDown },
    ],
  },
  {
    id: "equipos",
    label: "Equipos",
    icon: Cpu,
    descripcion: "Enfoque en trazabilidad de series",
    contexto: "Enfócate exclusivamente en EQUIPOS con serie (routers, modems, decodificadores). Responde sobre trazabilidad por serie, estado de equipos (disponible/averiado/en retiro), antigüedad de equipos en almacén y validación de series. Si la pregunta no es sobre equipos, redirige amablemente al modo correcto.",
    sugerencias: [
      { text: "¿Qué equipos están averiados?", icon: Cpu },
      { text: "¿Cuántos routers ONT hay disponibles?", icon: Package },
      { text: "Lista los equipos que llevan más de 60 días en almacén", icon: Clock },
      { text: "Busca la serie MV2152VR6880", icon: Hash },
    ],
  },
  {
    id: "despachos",
    label: "Despachos",
    icon: TrendingDown,
    descripcion: "Enfoque en salidas y transferencias",
    contexto: "Enfócate exclusivamente en DESPACHOS y TRANSFERENCIAS. Responde sobre despachos realizados, transferencias pendientes, técnicos que recibieron materiales, valor despachado por período y historial de operaciones. Si la pregunta no es sobre despachos, redirige amablemente al modo correcto.",
    sugerencias: [
      { text: "¿Cuántos despachos se hicieron hoy?", icon: Calendar },
      { text: "¿Cuál es el valor total despachado este mes?", icon: BarChart3 },
      { text: "Lista los despachos al técnico Carlos", icon: Users },
      { text: "¿Qué productos se despachan más?", icon: TrendingDown },
    ],
  },
];

const STORAGE_KEY = "nuclon-ia-chat-v3"; // v3: invalida cache viejo que tenía respuestas de Wikipedia
const STORAGE_VERSION = 3; // bump si cambiamos el formato o queremos forzar reset
const CINCO_HORAS = 5 * 60 * 60 * 1000; // 5 horas en ms

/**
 * Cleanup agresivo de caches viejos.
 * Elimina TODOS los localStorage keys con el prefijo "nuclon-ia-chat" que NO sean la versión actual.
 * Esto asegura que aun si el navegador tiene el JS cacheado, los datos viejos se eliminan.
 * Se ejecuta al cargar el módulo (no solo al montar el componente) para ser más robusto.
 */
function cleanupOldCaches(): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      // Eliminar versiones anteriores del chat (nuclon-ia-chat-v1, nuclon-ia-chat-v2, etc.)
      if (/^nuclon-ia-chat-v\d+$/.test(k) && k !== STORAGE_KEY) {
        keysToRemove.push(k);
      }
      // Eliminar cualquier key que contenga "ia-chat" y no sea la v3 (variantes tipo lemcorp-ia-chat, etc.)
      if (k.includes("ia-chat") && k !== STORAGE_KEY && !keysToRemove.includes(k)) {
        keysToRemove.push(k);
      }
    }
    if (keysToRemove.length > 0) {
      console.info(
        "[ALANA-CHAT] Eliminando caches viejos:",
        keysToRemove,
        "— estas conversaciones tenían respuestas de Wikipedia obsoletas"
      );
      for (const k of keysToRemove) localStorage.removeItem(k);
    }
  } catch {
    /* localStorage no disponible */
  }
}

// Ejecutar al cargar el módulo (efecto inmediato en el browser)
if (typeof window !== "undefined") {
  cleanupOldCaches();
}

function loadChat(): ChatMsg[] {
  try {
    // Safety: si por algún motivo quedan caches viejos, eliminarlos ahora
    cleanupOldCaches();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.timestamp !== "number") return [];
    // Validar versión del schema — si cambió, descartar el cache viejo
    if (parsed.version !== STORAGE_VERSION) {
      console.info("[ALANA-CHAT] Cache descartado por cambio de versión:", parsed.version, "→", STORAGE_VERSION);
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    // Auto-clear después de 5 horas
    if (Date.now() - parsed.timestamp > CINCO_HORAS) {
      console.info("[ALANA-CHAT] Cache descartado por antigüedad (>5h)");
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    if (Array.isArray(parsed.messages)) {
      // Limpiar mensajes residuales que contengan respuestas de Wikipedia
      // (safety net para cachés viejos que pasaran por alto el cambio de versión)
      const limpios = parsed.messages.filter(
        (m: ChatMsg) => !/(Fuente: Wikipedia)/i.test(m.content || "")
      );
      if (limpios.length !== parsed.messages.length) {
        console.info("[ALANA-CHAT] Filtrados", parsed.messages.length - limpios.length, "mensajes con Wikipedia del cache");
        // Re-guardar la versión limpia inmediatamente
        saveChat(limpios);
      }
      return limpios;
    }
    return [];
  } catch {
    return [];
  }
}

function saveChat(msgs: ChatMsg[]) {
  try {
    const toSave = msgs.slice(-60);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, timestamp: Date.now(), messages: toSave })
    );
  } catch {
    /* ignore */
  }
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return new Date(ts).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit" });
}

const ICON_PROPS = { strokeWidth: 1.5 } as const;

export function IAView() {
  const products = useStore((s) => s.products);
  const equipos = useStore((s) => s.equipos);
  const miembros = useStore((s) => s.miembros);
  const despachos = useStore((s) => s.despachos);
  const empresa = useStore((s) => s.empresa);
  const usuario = useStore((s) => s.settings.usuario);
  const vozEnabled = useStore((s) => s.settings.voz);
  const memoriaIA = useStore((s) => s.memoriaIA);
  const addRecordatorio = useStore((s) => s.addRecordatorio);
  const addNotificacion = useStore((s) => s.addNotificacion);
  const addMemoria = useStore((s) => s.addMemoria);
  // Acciones del sistema (control total de Alana)
  const addProduct = useStore((s) => s.addProduct);
  const updateProduct = useStore((s) => s.updateProduct);
  const findProductBySku = useStore((s) => s.findProductBySku);
  const addEquipment = useStore((s) => s.addEquipment);
  const registrarDespacho = useStore((s) => s.registrarDespacho);
  const addNota = useStore((s) => s.addNota);
  const addMiembro = useStore((s) => s.addMiembro);
  const setSetting = useStore((s) => s.setSetting);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [modoActual, setModoActual] = useState("general");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const historial = loadChat();
    if (historial.length > 0) {
      setMessages(historial);
    } else {
      const bienvenida: ChatMsg[] = [
        {
          role: "assistant",
          content: `¡Hola${usuario ? " " + usuario : ""}! Soy Alana, asistente del almacén VRS.\n\nPuedo analizar tu inventario, recomendar compras, calcular consumos, **crear recordatorios** que te avisarán en el momento indicado, y **aprender** datos nuevos que me digas para recordarlos siempre.\n\n¿Qué necesitas hoy?`,
          ts: Date.now(),
        },
      ];
      setMessages(bienvenida);
      saveChat(bienvenida);
    }
  }, [usuario]);

  useEffect(() => {
    if (messages.length > 0) saveChat(messages);
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Cargar voces TTS si hace falta (algunos navegadores las cargan async)
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => window.speechSynthesis.getVoices();
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const hablar = (texto: string, msgId: string) => {
    if (speakingId === msgId) {
      stopSpeaking();
      setSpeakingId(null);
      return;
    }
    setSpeakingId(msgId);
    speak(texto);
    // Resetear el estado cuando termine (aproximado, no hay hook fácil aquí)
    const words = texto.split(/\s+/).length;
    const duracion = Math.max(2500, (words / 2.5) * 1000);
    setTimeout(() => {
      setSpeakingId((cur) => (cur === msgId ? null : cur));
    }, duracion);
  };

  const enviar = async (texto?: string) => {
    const msg = (texto ?? input).trim();
    if (!msg || loading) return;

    const userMsg: ChatMsg = { role: "user", content: msg, ts: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // === LOG 1: Mensaje que escribe el usuario ===
      const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      console.groupCollapsed(`[ALANA-CHAT] enviar() ${requestId}`);
      console.log("[ALANA-CHAT] 1. Usuario escribió:", msg);

      // Fix bug duplicado: enviar el historial SIN el último mensaje (que es el actual).
      // Antes enviábamos newMessages.slice(-10) que incluía el userMsg actual, lo que hacía
      // que el backend recibiera el mensaje duplicado (en `historial` y en `mensaje`).
      const historialSinActual = newMessages.slice(0, -1).slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      // === LOG 2: Mensaje enviado a la API (incluye historial sin duplicar) ===
      console.log("[ALANA-CHAT] 2. Enviado a /api/ia:", {
        requestId,
        mensaje: msg,
        historialLength: historialSinActual.length,
        historial: historialSinActual,
        inventarioCount: products.length,
        equiposCount: equipos.length,
        despachosCount: despachos.length,
        memoriaCount: memoriaIA.length,
        modoContexto: MODOS_IA.find(m => m.id === modoActual)?.contexto || "",
      });

      const res = await fetch("/api/ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensaje: msg,
          historial: historialSinActual,
          inventario: products,
          equipos,
          miembros,
          despachos,
          empresa,
          usuario,
          memoria: memoriaIA,
          modoContexto: MODOS_IA.find(m => m.id === modoActual)?.contexto || "",
          requestId, // se loguea en el backend para correlación
        }),
      });
      const data = await res.json();

      // === LOG 3: Respuesta exacta de la API ===
      console.log("[ALANA-CHAT] 3. Respuesta de /api/ia:", {
        requestId,
        ok: data.ok,
        respuesta: data.respuesta,
        respuestaLength: data.respuesta?.length ?? 0,
        recordatorios: data.recordatorios,
        memorias: data.memorias,
        acciones: data.acciones,
        error: data.error,
      });

      const respuesta = data.ok && data.respuesta
        ? data.respuesta
        : "Lo siento, hubo un error al procesar tu consulta.";

      // Auto-abrir vista previa si la respuesta es larga (como Claude/ChatGPT canvas)
      if (respuesta.length > 200) {
        setPreviewContent(respuesta);
        setPreviewOpen(true);
      }

      const assistantMsg: ChatMsg = { role: "assistant", content: respuesta, ts: Date.now() };

      // Procesar recordatorios de la IA
      if (data.ok && Array.isArray(data.recordatorios) && data.recordatorios.length > 0) {
        for (const r of data.recordatorios) {
          const cuando = new Date(r.cuando).getTime();
          if (!isNaN(cuando)) {
            addRecordatorio(r.texto, cuando, "ia");
            assistantMsg.recordatorio = { texto: r.texto, cuando };
          }
        }
      }

      // Procesar memoria (cosas aprendidas) de la IA
      if (data.ok && Array.isArray(data.memorias) && data.memorias.length > 0) {
        for (const m of data.memorias) {
          if (typeof m === "string" && m.trim()) {
            addMemoria(m.trim());
          }
        }
        assistantMsg.aprendido = data.memorias.filter(
          (m: unknown) => typeof m === "string" && (m as string).trim()
        );
      }

      // Procesar ACCIONES del sistema (control total)
      if (data.ok && Array.isArray(data.acciones) && data.acciones.length > 0) {
        const ejecutadas: AccionEjecutada[] = [];
        for (const a of data.acciones) {
          const tipo = a.tipo;
          try {
            if (tipo === "add_product") {
              const sku = (a.sku || "").trim();
              const nombre = (a.nombre || "").trim();
              const cantidad = parseInt(a.cantidad || "0", 10) || 0;
              const minimo = a.minimo ? parseInt(a.minimo, 10) : undefined;
              const udm = a.udm || undefined;
              if (!sku || !nombre) {
                ejecutadas.push({ tipo, descripcion: `Añadir producto ${sku || "(sin SKU)"}`, ok: false, error: "Faltan datos (SKU o nombre)" });
                continue;
              }
              const existente = findProductBySku(sku);
              if (existente) {
                // Si ya existe, sumar la cantidad
                updateProduct(existente.id, { quantity: existente.quantity + cantidad });
                ejecutadas.push({ tipo, descripcion: `Sumé ${cantidad} a "${existente.name}" (SKU ${sku})`, ok: true });
              } else {
                const id = addProduct(sku, nombre, cantidad, minimo, udm);
                if (id) {
                  ejecutadas.push({ tipo, descripcion: `Añadí producto "${nombre}" (SKU ${sku}) con ${cantidad} unidades`, ok: true });
                } else {
                  ejecutadas.push({ tipo, descripcion: `Añadir producto ${sku}`, ok: false, error: "Ya existe un producto con ese SKU" });
                }
              }
            } else if (tipo === "update_stock") {
              const sku = (a.sku || "").trim();
              const delta = parseInt(a.delta || "0", 10);
              if (!sku) {
                ejecutadas.push({ tipo, descripcion: "Actualizar stock", ok: false, error: "Falta el SKU" });
                continue;
              }
              const p = findProductBySku(sku);
              if (!p) {
                ejecutadas.push({ tipo, descripcion: `Actualizar stock de ${sku}`, ok: false, error: "El producto no existe" });
                continue;
              }
              const nuevaCant = Math.max(0, p.quantity + delta);
              updateProduct(p.id, { quantity: nuevaCant });
              ejecutadas.push({ tipo, descripcion: `Actualicé stock de "${p.name}": ${p.quantity} → ${nuevaCant} (${delta > 0 ? "+" : ""}${delta})`, ok: true });
            } else if (tipo === "add_equipment") {
              const serie = (a.serie || "").trim();
              const modelo = (a.modelo || "").trim();
              const estado = (a.estado || "disponible") as "disponible" | "averiado" | "en_retiro";
              const ubicacion = a.ubicacion || undefined;
              if (!serie || !modelo) {
                ejecutadas.push({ tipo, descripcion: "Añadir equipo", ok: false, error: "Faltan datos (serie o modelo)" });
                continue;
              }
              const id = addEquipment({ serie, modelo, estado, ubicacion });
              if (id) {
                ejecutadas.push({ tipo, descripcion: `Registré equipo ${serie} (${modelo})`, ok: true });
              } else {
                ejecutadas.push({ tipo, descripcion: `Añadir equipo ${serie}`, ok: false, error: "Ya existe un equipo con esa serie" });
              }
            } else if (tipo === "add_despacho") {
              const sku = (a.sku || "").trim();
              const cantidad = parseInt(a.cantidad || "0", 10) || 0;
              const destinatario = a.destinatario || undefined;
              const destino = a.destino || undefined;
              const observacion = a.observacion || undefined;
              if (!sku || cantidad <= 0) {
                ejecutadas.push({ tipo, descripcion: "Registrar despacho", ok: false, error: "Faltan datos (SKU o cantidad)" });
                continue;
              }
              const r = registrarDespacho({ sku, cantidad, tecnico: destinatario, destino, observacion });
              if (r.ok) {
                ejecutadas.push({ tipo, descripcion: `Despachadas ${cantidad} unidades de ${sku}${destinatario ? ` para ${destinatario}` : ""}`, ok: true });
              } else {
                ejecutadas.push({ tipo, descripcion: `Despachar ${cantidad} de ${sku}`, ok: false, error: r.msg });
              }
            } else if (tipo === "add_note") {
              const texto = (a.texto || "").trim();
              if (!texto) {
                ejecutadas.push({ tipo, descripcion: "Añadir nota", ok: false, error: "Falta el texto" });
                continue;
              }
              addNota(texto);
              ejecutadas.push({ tipo, descripcion: `Nota creada: "${texto.slice(0, 40)}${texto.length > 40 ? "…" : ""}"`, ok: true });
            } else if (tipo === "add_member") {
              const nombre = (a.nombre || "").trim();
              const rol = (a.rol || "almacenero") as "almacenero" | "supervisor" | "jefe_operaciones" | "administrador";
              const correo = a.correo || undefined;
              const telefono = a.telefono || undefined;
              if (!nombre) {
                ejecutadas.push({ tipo, descripcion: "Añadir miembro", ok: false, error: "Falta el nombre" });
                continue;
              }
              addMiembro(nombre, rol, correo, telefono);
              ejecutadas.push({ tipo, descripcion: `Añadí a "${nombre}" como ${rol}`, ok: true });
            } else if (tipo === "set_theme") {
              const tema = (a.tema || "oscuro") as "claro" | "oscuro" | "sistema";
              setSetting("tema", tema);
              ejecutadas.push({ tipo, descripcion: `Tema cambiado a "${tema}"`, ok: true });
            } else {
              ejecutadas.push({ tipo, descripcion: `Acción desconocida: ${tipo}`, ok: false, error: "Tipo no reconocido" });
            }
          } catch (err: any) {
            ejecutadas.push({ tipo, descripcion: `Ejecutar ${tipo}`, ok: false, error: err?.message || "Error" });
          }
        }
        if (ejecutadas.length > 0) {
          assistantMsg.accionesEjecutadas = ejecutadas;
        }
      }

      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      saveChat(finalMessages);

      // === LOG 4: Respuesta mostrada en pantalla ===
      console.log("[ALANA-CHAT] 4. Mostrado en pantalla:", {
        requestId,
        userMsg,
        assistantMsg: { role: assistantMsg.role, content: assistantMsg.content.slice(0, 300), ts: assistantMsg.ts },
        totalMensajes: finalMessages.length,
        guardadoEnLocalStorage: true,
      });
      console.groupEnd();

      // Si la voz está activada, leer la respuesta automáticamente
      if (vozEnabled) {
        const lastIdx = finalMessages.length - 1;
        const autoMsgId = `ts-${assistantMsg.ts}-${lastIdx}`;
        speak(respuesta);
        setSpeakingId(autoMsgId);
        const words = respuesta.split(/\s+/).length;
        const duracion = Math.max(2500, (words / 2.5) * 1000);
        setTimeout(() => {
          setSpeakingId((cur) => (cur === autoMsgId ? null : cur));
        }, duracion);
      }
    } catch (err) {
      console.error("[ALANA-CHAT] ERROR en enviar():", err);
      const errorMsg: ChatMsg = {
        role: "assistant",
        content: "No pude conectar con el servidor. Verifica tu conexión e intenta de nuevo.",
        ts: Date.now(),
      };
      const finalMessages = [...newMessages, errorMsg];
      setMessages(finalMessages);
      saveChat(finalMessages);
      console.groupEnd();
    } finally {
      setLoading(false);
    }
  };

  const limpiarHistorial = () => {
    localStorage.removeItem(STORAGE_KEY);
    const bienvenida: ChatMsg[] = [
      {
        role: "assistant",
        content: `Historial borrado. Soy Alana. ¿En qué puedo ayudarte${usuario ? ", " + usuario : ""}?`,
        ts: Date.now(),
      },
    ];
    setMessages(bienvenida);
    saveChat(bienvenida);
  };

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* SIDEBAR IZQUIERDO — como ChatGPT/Claude */}
      <aside className={cn(
        "shrink-0 border-r border-border bg-card overflow-hidden transition-all duration-300",
        sidebarOpen ? "w-60" : "w-0"
      )}>
        <div className="flex h-full w-60 flex-col">
          <div className="flex items-center justify-between border-b border-border px-3 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Modos de IA</p>
            <button onClick={() => setSidebarOpen(false)} className="text-muted-foreground hover:text-foreground lg:hidden">
              <X className="h-4 w-4" {...ICON_PROPS} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scroll-thin p-2">
            {MODOS_IA.map((modo) => {
              const Icon = modo.icon;
              const isActive = modoActual === modo.id;
              return (
                <button
                  key={modo.id}
                  onClick={() => {
                    setModoActual(modo.id);
                    if (messages.length > 1) {
                      const bienvenida: ChatMsg[] = [{
                        role: "assistant",
                        content: `Modo **${modo.label}** activado. ${modo.descripcion}. ¿En qué puedo ayudarte?`,
                        ts: Date.now(),
                      }];
                      setMessages(bienvenida);
                      saveChat(bienvenida);
                    }
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors mb-0.5",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" {...ICON_PROPS} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium">{modo.label}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{modo.descripcion}</p>
                  </div>
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>
          <div className="border-t border-border p-2">
            <button
              onClick={() => { stopSpeaking(); setSpeakingId(null); limpiarHistorial(); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" {...ICON_PROPS} />
              Nueva conversación
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <div className="flex min-w-0 flex-1 flex-col">
      {/* Header — minimal, like ChatGPT/Claude */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="press flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Ver modos de IA"
          >
            <Menu className="h-4 w-4" {...ICON_PROPS} />
          </button>
          <AlanaAvatar size={28} />
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-[14px] font-semibold tracking-tight text-foreground">
              Alana
              <span className="relative flex h-1.5 w-1.5" aria-label="Activo">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/50" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
            </h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {vozEnabled && (
            <button
              onClick={() => { stopSpeaking(); setSpeakingId(null); }}
              className="press flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Detener voz"
            >
              <Volume2 className="h-4 w-4" {...ICON_PROPS} />
            </button>
          )}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="press flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Historial"
          >
            <Clock className="h-4 w-4" {...ICON_PROPS} />
          </button>
          {messages.length > 1 && (
            <button
              onClick={() => { stopSpeaking(); setSpeakingId(null); limpiarHistorial(); }}
              className="press flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Nueva conversacion"
            >
              <Trash2 className="h-4 w-4" {...ICON_PROPS} />
            </button>
          )}
        </div>
      </div>

      {/* Chat — centered like ChatGPT/Claude */}
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto scroll-thin"
        >
          <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6">
            {/* Empty state — welcome message + suggestion cards */}
            {messages.length <= 1 && !loading && (
              <div className="flex flex-col items-center justify-center py-12 anim-fade-in">
                <AlanaAvatar size={48} glow className="mb-4" />
                <h2 className="text-[22px] font-semibold tracking-tight text-foreground">
                  Hola, soy Alana
                </h2>
                <p className="mt-1 text-[14px] text-muted-foreground">
                  Tu asistente de almacén. Pregúntame lo que necesites.
                </p>
                <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 w-full max-w-lg">
                  {(MODOS_IA.find(m => m.id === modoActual)?.sugerencias || MODOS_IA[0].sugerencias).map((s) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.text}
                        onClick={() => enviar(s.text)}
                        className="flex items-start gap-2.5 rounded-xl border border-border bg-card p-3 text-left transition-all hover:shadow-md hover:border-foreground/20"
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" {...ICON_PROPS} />
                        <span className="text-[12px] font-medium text-foreground">{s.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.length > 1 && (
              <div className="space-y-6 select-text">
                {messages.map((m, i) => {
                  const msgId = `ts-${m.ts}-${i}`;
                  const isSpeaking = speakingId === msgId;
                  const isUser = m.role === "user";
                  return (
                    <div key={i} className="anim-fade-in">
                      {/* Role label */}
                      <p className={cn("mb-1 text-[11px] font-bold uppercase tracking-wider select-none", isUser ? "text-foreground" : "text-primary")}>
                        {isUser ? (usuario || "Tu") : "Alana"}
                      </p>
                      {/* Message content */}
                      <div
                        className={cn(
                          "select-text cursor-text rounded-xl px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap break-words",
                          isUser
                            ? "bg-muted text-foreground"
                            : "bg-card border border-border text-foreground"
                        )}
                      >
                        {m.content}
                        {/* Acciones ejecutadas */}
                        {m.accionesEjecutadas && m.accionesEjecutadas.length > 0 && (
                          <div className="mt-3 space-y-1 border-t border-border pt-2">
                            {m.accionesEjecutadas.map((a, j) => (
                              <div key={j} className="flex items-center gap-1.5 text-[11px]">
                                {a.ok ? (
                                  <span className="text-emerald-600">OK</span>
                                ) : (
                                  <span className="text-rose-600">Error</span>
                                )}
                                <span className="text-muted-foreground">{a.descripcion}</span>
                                {a.error && <span className="text-rose-600">({a.error})</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Recordatorio */}
                        {m.recordatorio && (
                          <div className="mt-2 rounded-lg bg-primary/5 px-2 py-1 text-[11px] text-primary">
                            Recordatorio creado: {m.recordatorio.texto}
                          </div>
                        )}
                        {/* Aprendido */}
                        {m.aprendido && m.aprendido.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {m.aprendido.map((ap, j) => (
                              <span key={j} className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-600">
                                Aprendido: {ap}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Footer: timestamp + speak */}
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground/60">{timeAgo(m.ts)}</span>
                        {!isUser && (
                          <button
                            onClick={() => {
                              if (isSpeaking) { stopSpeaking(); setSpeakingId(null); }
                              else { setSpeakingId(msgId); speak(m.content, vozEnabled); }
                            }}
                            className="text-[10px] text-muted-foreground hover:text-foreground"
                          >
                            {isSpeaking ? "Detener" : "Escuchar"}
                          </button>
                        )}
                        {!isUser && m.content.length > 100 && (
                          <button
                            onClick={() => { setPreviewContent(m.content); setPreviewOpen(true); }}
                            className="text-[10px] text-primary hover:text-primary/80"
                          >
                            Ver detalle
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Loading — dots like ChatGPT */}
            {loading && (
              <div className="anim-fade-in">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-primary">Alana</p>
                <div className="rounded-xl bg-card border border-border px-4 py-3">
                  <span className="flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0ms", animationDuration: "0.8s" }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "150ms", animationDuration: "0.8s" }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "300ms", animationDuration: "0.8s" }} />
                    </span>
                    <span className="text-[13px] text-muted-foreground">Pensando...</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel de historial */}
        {showHistory && (
          <div className="absolute right-0 top-0 h-full w-72 border-l border-border bg-background/95 backdrop-blur-sm anim-fade-in">
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" {...ICON_PROPS} /> Historial
              </p>
              <button onClick={() => setShowHistory(false)} className="press text-muted-foreground hover:text-foreground" title="Cerrar">
                <Trash2 className="h-3.5 w-3.5" {...ICON_PROPS} />
              </button>
            </div>
            <div className="max-h-[calc(100%-3rem)] overflow-y-auto scroll-thin p-2">
              {messages.filter((m) => m.role === "user").slice().reverse().map((m, i) => (
                <button
                  key={i}
                  onClick={() => { setShowHistory(false); setInput(m.content); }}
                  className="press mb-0.5 block w-full rounded-lg px-2.5 py-2 text-left text-[11px] transition-colors hover:bg-muted"
                >
                  <p className="select-text line-clamp-2 text-foreground">{m.content}</p>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">{timeAgo(m.ts)}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input — centered like ChatGPT */}
      <div
        className="border-t border-border bg-background"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)" }}
      >
        <div className="mx-auto max-w-3xl px-4 py-3 lg:px-6">
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-sm focus-within:border-foreground/20">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
              }}
              placeholder="Escribe un mensaje a Alana..."
              className="min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2 text-[14px] text-foreground outline-none placeholder:text-muted-foreground/60"
              disabled={loading}
              rows={1}
            />
            <button
              onClick={() => enviar()}
              disabled={!input.trim() || loading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background transition-all hover:opacity-90 disabled:opacity-30"
              aria-label="Enviar"
            >
              <Send className="h-4 w-4" {...ICON_PROPS} />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground/50">
            Alana puede cometer errores. Verifica datos importantes de tu inventario.
          </p>
        </div>
      </div>
      </div>

      {/* PANEL DE VISTA PREVIA — como Claude/ChatGPT canvas */}
      <aside className={cn(
        "shrink-0 border-l border-border bg-card overflow-hidden transition-all duration-300",
        previewOpen ? "w-96" : "w-0"
      )}>
        <div className="flex h-full w-96 flex-col">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Vista Previa</p>
            <button onClick={() => { setPreviewOpen(false); setPreviewContent(null); }} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" {...ICON_PROPS} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scroll-thin p-4">
            {previewContent ? (
              <div className="select-text cursor-text text-[13px] leading-relaxed whitespace-pre-wrap break-words text-foreground">
                {previewContent}
              </div>
            ) : (
              <p className="py-8 text-center text-[12px] text-muted-foreground">
                La vista previa aparece cuando Alana genera calculos, reportes o tablas.
              </p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
