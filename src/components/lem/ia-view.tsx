"use client";

import { useRef, useEffect, useState } from "react";
import {
  Sparkles,
  Send,
  Bot,
  User,
  Loader2,
  Trash2,
  TrendingDown,
  Package,
  AlertTriangle,
  Cpu,
  Users,
  BarChart3,
  ShoppingCart,
  Zap,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const SUGERENCIAS: { text: string; icon: typeof TrendingDown; color: string }[] = [
  { text: "¿Qué productos necesito pedir urgentemente?", icon: AlertTriangle, color: "text-red-400" },
  { text: "Calcula el consumo mensual de routers ONT con 3 técnicos", icon: TrendingDown, color: "text-cyan-400" },
  { text: "¿Cuántos conectores FTTH debo pedir para 30 días?", icon: ShoppingCart, color: "text-emerald-400" },
  { text: "Dame un reporte ejecutivo del estado del almacén", icon: BarChart3, color: "text-violet-400" },
  { text: "¿Qué equipos están averiados o en reparación?", icon: Cpu, color: "text-amber-400" },
  { text: "Recomienda cantidades a comprar para cable RG-6", icon: Package, color: "text-blue-400" },
  { text: "¿Cómo está el equipo de técnicos hoy?", icon: Users, color: "text-pink-400" },
  { text: "Anticipa quiebres de stock esta semana", icon: Zap, color: "text-orange-400" },
];

const STORAGE_KEY = "lemcorp-ia-historial-v3";

function loadHistorial(): ChatMsg[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

function saveHistorial(msgs: ChatMsg[]) {
  try {
    const toSave = msgs.slice(-60);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    /* ignore */
  }
}

export function IAView() {
  const products = useStore((s) => s.products);
  const equipos = useStore((s) => s.equipos);
  const miembros = useStore((s) => s.miembros);
  const despachos = useStore((s) => s.despachos);
  const empresa = useStore((s) => s.empresa);
  const usuario = useStore((s) => s.settings.usuario);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const historial = loadHistorial();
    if (historial.length > 0) {
      setMessages(historial);
    } else {
      const bienvenida: ChatMsg[] = [
        {
          role: "assistant",
          content:
            `¡Hola${usuario ? " " + usuario : ""}! Soy LEMCORP AI 🤖. Tengo acceso en tiempo real a tu inventario, equipos, despachos y equipo de trabajo. Puedo analizar stock, calcular consumos, recomendar compras y generar reportes. ¿Qué necesitas hoy?`,
        },
      ];
      setMessages(bienvenida);
      saveHistorial(bienvenida);
    }
  }, [usuario]);

  useEffect(() => {
    if (messages.length > 0) saveHistorial(messages);
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const enviar = async (texto?: string) => {
    const msg = (texto ?? input).trim();
    if (!msg || loading) return;

    const newMessages = [...messages, { role: "user" as const, content: msg }];
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
        }),
      });
      const data = await res.json();
      const respuesta =
        data.ok && data.respuesta
          ? data.respuesta
          : "Lo siento, hubo un error al procesar tu consulta. Intenta de nuevo.";
      const finalMessages = [...newMessages, { role: "assistant" as const, content: respuesta }];
      setMessages(finalMessages);
      saveHistorial(finalMessages);
    } catch {
      const errorMsg =
        "No pude conectar con el servidor. Verifica tu conexión e intenta de nuevo.";
      const finalMessages = [
        ...newMessages,
        { role: "assistant" as const, content: errorMsg },
      ];
      setMessages(finalMessages);
      saveHistorial(finalMessages);
    } finally {
      setLoading(false);
    }
  };

  const limpiarHistorial = () => {
    const bienvenida: ChatMsg[] = [
      {
        role: "assistant",
        content: `Historial borrado. ¿En qué puedo ayudarte${usuario ? ", " + usuario : ""}?`,
      },
    ];
    setMessages(bienvenida);
    saveHistorial(bienvenida);
  };

  return (
    <div className="flex h-full flex-col px-4 py-6 lg:px-8">
      {/* Header */}
      <div className="anim-fade-up mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30">
            <Sparkles className="h-5 w-5 text-white" />
            <div className="absolute -inset-1 rounded-2xl bg-violet-500/30 blur-md -z-10 anim-pulse-soft" />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              Asistente IA
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                ACTIVO
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Historial persistente · {messages.length} mensaje(s)
            </p>
          </div>
        </div>
        {messages.length > 1 && (
          <button
            onClick={limpiarHistorial}
            className="press flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Borrar historial
          </button>
        )}
      </div>

      {/* Chat */}
      <div
        ref={scrollRef}
        className="anim-fade-up flex-1 space-y-3 overflow-y-auto scroll-thin rounded-3xl border border-border bg-card p-4"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn("flex gap-3 anim-fade-in", m.role === "user" && "flex-row-reverse")}
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[14px] font-bold shadow-sm",
                m.role === "assistant"
                  ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {m.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
            </div>
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words",
                m.role === "assistant"
                  ? "bg-muted/40 text-foreground"
                  : "bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-500/20"
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-muted/40 px-4 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
              <span className="text-[13px] text-muted-foreground">Analizando inventario…</span>
            </div>
          </div>
        )}
      </div>

      {/* Sugerencias */}
      {messages.length <= 2 && (
        <div className="anim-fade-up mt-3 flex flex-wrap gap-1.5">
          {SUGERENCIAS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.text}
                onClick={() => enviar(s.text)}
                disabled={loading}
                className="press flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-all hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-foreground disabled:opacity-50"
              >
                <Icon className={cn("h-3.5 w-3.5", s.color)} />
                {s.text}
              </button>
            );
          })}
        </div>
      )}

      {/* Input */}
      <div className="anim-fade-up mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar();
            }
          }}
          placeholder="Pregúntame sobre el inventario, qué pedir, consumos…"
          className="h-11 flex-1 rounded-2xl border border-border bg-card px-4 text-[14px] outline-none transition-colors focus:border-violet-500 focus:shadow-[0_0_0_4px_oklch(0.58_0.22_295/0.15)]"
          disabled={loading}
        />
        <button
          onClick={() => enviar()}
          disabled={!input.trim() || loading}
          className="btn-spacecom flex h-11 w-11 items-center justify-center rounded-2xl"
          aria-label="Enviar"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
