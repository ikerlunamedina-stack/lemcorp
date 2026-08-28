"use client";

import { useRef, useEffect, useState } from "react";
import {
  Send, User, Trash2,
  TrendingDown, Package, AlertTriangle, Cpu, Users,
  BarChart3, ShoppingCart, Zap, BellRing, Clock,
  Volume2, Square, Brain,
  Check, X as XIcon, FileText, PackagePlus, ClipboardList,
  Sun,
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

const STORAGE_KEY = "nuclon-ia-chat-v2";
const CINCO_HORAS = 5 * 60 * 60 * 1000; // 5 horas en ms

function loadChat(): ChatMsg[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.timestamp !== "number") return [];
    // Auto-clear después de 5 horas
    if (Date.now() - parsed.timestamp > CINCO_HORAS) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    if (Array.isArray(parsed.messages)) return parsed.messages;
    return [];
  } catch {
    return [];
  }
}

function saveChat(msgs: ChatMsg[]) {
  try {
    const toSave = msgs.slice(-60);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ timestamp: Date.now(), messages: toSave }));
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
          content: `¡Hola${usuario ? " " + usuario : ""}! 👋 Soy Alana, asistente del almacén Lemcorp.\n\nPuedo analizar tu inventario, recomendar compras, calcular consumos, **crear recordatorios** que te avisarán en el momento indicado, y **aprender** datos nuevos que me digas para recordarlos siempre.\n\n¿Qué necesitas hoy?`,
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
      // Enviar historial (últimos 10 mensajes) para que Alana tenga contexto
      const historial = newMessages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));
      const res = await fetch("/api/ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensaje: msg,
          historial,
          inventario: products,
          equipos,
          miembros,
          despachos,
          empresa,
          usuario,
          memoria: memoriaIA,
        }),
      });
      const data = await res.json();
      const respuesta = data.ok && data.respuesta
        ? data.respuesta
        : "Lo siento, hubo un error al procesar tu consulta.";

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
              const estado = (a.estado || "disponible") as "disponible" | "averiado" | "en_retiro" | "en_reparacion";
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
    } catch {
      const errorMsg: ChatMsg = {
        role: "assistant",
        content: "No pude conectar con el servidor. Verifica tu conexión e intenta de nuevo.",
        ts: Date.now(),
      };
      const finalMessages = [...newMessages, errorMsg];
      setMessages(finalMessages);
      saveChat(finalMessages);
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
    <div className="flex h-full flex-col">
      {/* Header compacto */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5 sm:px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <AlanaAvatar size={36} glow />
          <div className="min-w-0">
            <h1 className="flex items-center gap-1.5 text-[15px] font-bold tracking-tight">
              <span className="truncate">Alana</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                <span className="hidden sm:inline">ACTIVO</span>
              </span>
              {vozEnabled && (
                <span
                  className="hidden items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary sm:inline-flex"
                  title="Voz activada — Alana leerá sus respuestas en voz alta"
                >
                  <Volume2 className="h-2.5 w-2.5" /> VOZ
                </span>
              )}
            </h1>
            <p className="hidden text-[10px] text-muted-foreground sm:block">
              {messages.length} mensaje(s) · se borra en 5h · {memoriaIA.length} aprendizajes
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={cn(
              "press flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-medium transition-colors sm:px-3",
              showHistory ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-accent"
            )}
            title="Ver conversaciones anteriores"
          >
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Historial</span>
          </button>
          {messages.length > 1 && (
            <button
              onClick={() => {
                stopSpeaking();
                setSpeakingId(null);
                limpiarHistorial();
              }}
              className="press flex h-9 items-center justify-center rounded-lg border border-border bg-card px-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Borrar conversación"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Chat - llena el espacio disponible con scroll interno */}
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto scroll-thin px-4 py-4 lg:px-6"
        >
          <div className="mx-auto max-w-3xl space-y-3">
            {messages.map((m, i) => {
              const msgId = `ts-${m.ts}-${i}`;
              const isSpeaking = speakingId === msgId;
              return (
                <div
                  key={i}
                  className={cn("flex gap-3 anim-fade-in", m.role === "user" && "flex-row-reverse")}
                >
                  {m.role === "assistant"
                    ? <AlanaAvatar size={32} className="shadow-sm" />
                    : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground shadow-sm">
                        <User className="h-4 w-4" />
                      </div>
                    )
                  }
                  <div className={cn("flex max-w-[85%] flex-col", m.role === "user" && "items-end")}>
                    <div
                      className={cn(
                        "rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words shadow-sm",
                        m.role === "assistant"
                          ? "rounded-tl-sm bg-card border border-border text-foreground"
                          : "rounded-tr-sm bg-primary text-primary-foreground"
                      )}
                    >
                      {m.content}
                      {/* Botón de TTS solo en mensajes de la IA */}
                      {m.role === "assistant" && (
                        <button
                          onClick={() => hablar(m.content, msgId)}
                          className={cn(
                            "press ml-2 inline-flex h-6 w-6 items-center justify-center rounded-md border border-border align-middle text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                            isSpeaking && "border-primary text-primary bg-primary/10"
                          )}
                          title={isSpeaking ? "Detener voz" : "Leer en voz alta"}
                        >
                          {isSpeaking ? <Square className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                    {/* Badge de recordatorio creado */}
                    {m.recordatorio && (
                      <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-primary/30 bg-muted px-2.5 py-1.5 text-[10px]">
                        <BellRing className="h-3 w-3 text-primary" />
                        <span className="font-semibold text-primary">Recordatorio creado:</span>
                        <span className="text-muted-foreground">{m.recordatorio.texto}</span>
                        <span className="ml-auto text-primary">
                          {new Date(m.recordatorio.cuando).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    )}
                    {/* Badge de aprendido */}
                    {m.aprendido && m.aprendido.length > 0 && (
                      <div className="mt-1.5 flex flex-col gap-1">
                        {m.aprendido.map((ap, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[10px]"
                          >
                            <Brain className="h-3 w-3 text-emerald-500" />
                            <span className="font-semibold text-emerald-500">Aprendido ✓</span>
                            <span className="text-foreground">{ap}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Acciones del sistema ejecutadas */}
                    {m.accionesEjecutadas && m.accionesEjecutadas.length > 0 && (
                      <div className="mt-1.5 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                          <ClipboardList className="h-2.5 w-2.5" />
                          Acciones ejecutadas
                        </div>
                        {m.accionesEjecutadas.map((a, idx) => {
                          const iconoAccion =
                            a.tipo === "add_product" ? PackagePlus :
                            a.tipo === "update_stock" ? Package :
                            a.tipo === "add_equipment" ? Cpu :
                            a.tipo === "add_despacho" ? Send :
                            a.tipo === "add_note" ? FileText :
                            a.tipo === "add_member" ? Users :
                            a.tipo === "set_theme" ? Sun :
                            ClipboardList;
                          const Icon = iconoAccion;
                          return (
                            <div
                              key={idx}
                              className={cn(
                                "flex items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px]",
                                a.ok
                                  ? "border-primary/30 bg-primary/5"
                                  : "border-red-500/30 bg-red-500/5"
                              )}
                            >
                              <Icon className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                              <div className="min-w-0 flex-1">
                                <p className="text-foreground">{a.descripcion}</p>
                                {a.error && (
                                  <p className="text-red-400">⚠ {a.error}</p>
                                )}
                              </div>
                              {a.ok ? (
                                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                                  <Check className="h-2.5 w-2.5" />
                                </span>
                              ) : (
                                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
                                  <XIcon className="h-2.5 w-2.5" />
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <span className="mt-1 px-1 text-[9px] text-muted-foreground/60">
                      {timeAgo(m.ts)}
                    </span>
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex gap-3">
                <AlanaAvatar size={32} className="shadow-sm" />
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 shadow-sm">
                  <span className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0ms", animationDuration: "0.8s" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "150ms", animationDuration: "0.8s" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "300ms", animationDuration: "0.8s" }} />
                  </span>
                  <span className="text-[13px] text-muted-foreground">Pensando…</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel de historial (overlay lateral) */}
        {showHistory && (
          <div className="absolute right-0 top-0 h-full w-72 border-l border-border bg-card/95 backdrop-blur-xl anim-fade-in">
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[12px] font-bold">
                <Clock className="h-3.5 w-3.5 text-primary" /> Historial
              </p>
              <button onClick={() => setShowHistory(false)} className="press text-muted-foreground hover:text-foreground">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="max-h-[calc(100%-3rem)] overflow-y-auto scroll-thin p-2">
              {messages.length === 0 ? (
                <p className="py-6 text-center text-[11px] text-muted-foreground">Sin conversaciones</p>
              ) : (
                messages.filter((m) => m.role === "user").slice().reverse().map((m, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setShowHistory(false);
                      setInput(m.content);
                    }}
                    className="press mb-1 block w-full rounded-lg border border-transparent px-2.5 py-2 text-left text-[11px] transition-colors hover:border-border hover:bg-accent"
                  >
                    <p className="line-clamp-2 text-foreground">{m.content}</p>
                    <p className="mt-0.5 text-[9px] text-muted-foreground">{timeAgo(m.ts)}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sugerencias - siempre visibles, compactas */}
      <div className="border-t border-border bg-card/50 px-3 py-2 sm:px-4 lg:px-6">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-1.5">
          {SUGERENCIAS.slice(0, 6).map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.text}
                onClick={() => enviar(s.text)}
                disabled={loading}
                className="press flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-all hover:border-primary/40 hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <Icon className={cn("h-3.5 w-3.5 shrink-0", s.color)} />
                <span className="max-w-[200px] truncate sm:max-w-[160px]">{s.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Input fijo abajo — con safe-area para que la barra del celular no lo tape */}
      <div
        className="border-t border-border bg-card px-3 py-3 sm:px-4 lg:px-6"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)" }}
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar();
              }
            }}
            placeholder="Pregúntame, pídeme algo o dime qué recordar…"
            className="h-12 min-h-[48px] flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-[15px] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            disabled={loading}
            rows={1}
          />
          <button
            onClick={() => enviar()}
            disabled={!input.trim() || loading}
            className="btn-spacecom flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
            aria-label="Enviar"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
