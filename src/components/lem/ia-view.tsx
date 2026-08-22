"use client";

import { useRef, useEffect, useState } from "react";
import {
  Sparkles, Send, Bot, User, Trash2,
  TrendingDown, Package, AlertTriangle, Cpu, Users,
  BarChart3, ShoppingCart, Zap, BellRing, Clock,
  Volume2, Square, Brain,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { speak, stopSpeaking } from "@/lib/tts";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  ts: number;
  recordatorio?: { texto: string; cuando: number };
  aprendido?: string[]; // lista de memorias guardadas desde este mensaje
}

const SUGERENCIAS: { text: string; icon: typeof TrendingDown; color: string }[] = [
  { text: "¿Qué productos necesito pedir urgentemente?", icon: AlertTriangle, color: "text-rose-400" },
  { text: "Calcula el consumo mensual de routers ONT con 3 técnicos", icon: TrendingDown, color: "text-foreground" },
  { text: "¿Cuántos conectores FTTH debo pedir para 30 días?", icon: ShoppingCart, color: "text-foreground" },
  { text: "Dame un reporte ejecutivo del estado del almacén", icon: BarChart3, color: "text-foreground" },
  { text: "¿Qué equipos están averiados o en reparación?", icon: Cpu, color: "text-amber-400" },
  { text: "Recomienda cantidades a comprar para cable RG-6", icon: Package, color: "text-foreground" },
  { text: "Recuérdame pedir conectores en 1 minuto", icon: BellRing, color: "text-primary" },
  { text: "Recuerda que el técnico Pérez trabaja solo de lunes a miércoles", icon: Brain, color: "text-emerald-400" },
  { text: "¿Cómo está el equipo de técnicos hoy?", icon: Users, color: "text-foreground" },
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
      const res = await fetch("/api/ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensaje: msg,
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
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5 lg:px-6">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-[15px] font-bold tracking-tight">
              Alana
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                ACTIVO
              </span>
              {vozEnabled && (
                <span
                  className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary"
                  title="Voz activada — Alana leerá sus respuestas en voz alta"
                >
                  <Volume2 className="h-2.5 w-2.5" /> VOZ
                </span>
              )}
            </h1>
            <p className="text-[10px] text-muted-foreground">
              {messages.length} mensaje(s) · se borra en 5h · {memoriaIA.length} aprendizajes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={cn(
              "press flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-medium transition-colors",
              showHistory ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-accent"
            )}
            title="Ver conversaciones anteriores"
          >
            <Clock className="h-3.5 w-3.5" />
            Historial
          </button>
          {messages.length > 1 && (
            <button
              onClick={() => {
                stopSpeaking();
                setSpeakingId(null);
                limpiarHistorial();
              }}
              className="press flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Borrar
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
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold shadow-sm",
                      m.role === "assistant"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {m.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
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
                    <span className="mt-1 px-1 text-[9px] text-muted-foreground/60">
                      {timeAgo(m.ts)}
                    </span>
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                  <Bot className="h-4 w-4" />
                </div>
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
      <div className="border-t border-border bg-card/50 px-4 py-2 lg:px-6">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-1">
          {SUGERENCIAS.slice(0, 6).map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.text}
                onClick={() => enviar(s.text)}
                disabled={loading}
                className="press flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition-all hover:border-primary/40 hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <Icon className={cn("h-3 w-3", s.color)} />
                <span className="max-w-[160px] truncate">{s.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Input fijo abajo */}
      <div className="border-t border-border bg-card px-4 py-3 lg:px-6">
        <div className="mx-auto flex max-w-3xl gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar();
              }
            }}
            placeholder="Pregúntame sobre el inventario, pídeme un recordatorio, o dime qué recordar…"
            className="h-11 flex-1 rounded-xl border border-border bg-background px-4 text-[14px] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            disabled={loading}
          />
          <button
            onClick={() => enviar()}
            disabled={!input.trim() || loading}
            className="btn-spacecom flex h-11 w-11 items-center justify-center rounded-xl"
            aria-label="Enviar"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
