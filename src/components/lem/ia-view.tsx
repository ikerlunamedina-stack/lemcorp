"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Bot, User, Loader2, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const SUGERENCIAS = [
  "¿Qué productos necesito pedir urgentemente?",
  "Calcula el consumo mensual de routers ONT con 3 técnicos",
  "¿Cuántos conectores FTTH debo pedir para 30 días?",
  "Dame un reporte del estado del almacén",
  "¿Qué equipos están averiados?",
  "Recomienda cantidades a comprar para cable RG-6",
];

const STORAGE_KEY = "lemcorp-ia-historial";

function loadHistorial(): ChatMsg[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch { return []; }
}

function saveHistorial(msgs: ChatMsg[]) {
  try {
    // Guardar máximo 50 mensajes para no llenar el localStorage
    const toSave = msgs.slice(-50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {}
}

export function IAView() {
  const products = useStore((s) => s.products);
  const equipos = useStore((s) => s.equipos);
  const miembros = useStore((s) => s.miembros);
  const empresa = useStore((s) => s.empresa);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Cargar historial al iniciar
  useEffect(() => {
    const historial = loadHistorial();
    if (historial.length > 0) {
      setMessages(historial);
    } else {
      const bienvenida: ChatMsg[] = [
        { role: "assistant", content: "¡Hola! Soy el asistente IA de LEMCORP. Tengo acceso a tu inventario, equipos y datos del equipo de trabajo. Puedo ayudarte a decidir qué material pedir, calcular consumos, y analizar el estado del almacén. ¿Qué necesitas?" },
      ];
      setMessages(bienvenida);
      saveHistorial(bienvenida);
    }
  }, []);

  // Guardar cuando cambian los mensajes
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
          empresa,
        }),
      });
      const data = await res.json();
      const respuesta = data.ok && data.respuesta
        ? data.respuesta
        : "Lo siento, hubo un error al procesar tu consulta. Intenta de nuevo.";
      const finalMessages = [...newMessages, { role: "assistant" as const, content: respuesta }];
      setMessages(finalMessages);
      saveHistorial(finalMessages);
    } catch {
      const errorMsg = "No pude conectar con el servidor. Verifica tu conexión e intenta de nuevo.";
      const finalMessages = [...newMessages, { role: "assistant" as const, content: errorMsg }];
      setMessages(finalMessages);
      saveHistorial(finalMessages);
    } finally {
      setLoading(false);
    }
  };

  const limpiarHistorial = () => {
    const bienvenida: ChatMsg[] = [
      { role: "assistant", content: "Historial borrado. ¿En qué puedo ayudarte?" },
    ];
    setMessages(bienvenida);
    saveHistorial(bienvenida);
  };

  return (
    <div className="flex h-full flex-col px-6 py-6">
      {/* Header */}
      <div className="anim-fade-up mb-4 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Sparkles className="h-5 w-5 text-primary" />
            Asistente IA
          </h1>
          <p className="text-sm text-muted-foreground">
            El historial se guarda automáticamente
          </p>
        </div>
        {messages.length > 1 && (
          <Button variant="ghost" size="sm" onClick={limpiarHistorial} className="press h-8 rounded-lg text-xs text-muted-foreground">
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Borrar historial
          </Button>
        )}
      </div>

      {/* Chat */}
      <div ref={scrollRef} className="anim-fade-up flex-1 space-y-3 overflow-y-auto scroll-thin rounded-3xl border border-border bg-card p-4">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-3 anim-fade-in", m.role === "user" && "flex-row-reverse")}>
            <div className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold",
              m.role === "assistant" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              {m.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
            </div>
            <div className={cn(
              "max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap",
              m.role === "assistant" ? "bg-muted/40 text-foreground" : "bg-primary text-primary-foreground"
            )}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-muted/40 px-4 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-[13px] text-muted-foreground">Analizando inventario…</span>
            </div>
          </div>
        )}
      </div>

      {/* Sugerencias */}
      {messages.length <= 2 && (
        <div className="anim-fade-up mt-3 flex flex-wrap gap-1.5">
          {SUGERENCIAS.map((s) => (
            <button
              key={s}
              onClick={() => enviar(s)}
              className="press rounded-full border border-border bg-muted/30 px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="anim-fade-up mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
          placeholder="Pregúntame sobre el inventario, qué pedir, consumos…"
          className="h-11 flex-1 rounded-2xl border border-border bg-card px-4 text-[14px] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          disabled={loading}
        />
        <Button
          onClick={() => enviar()}
          disabled={!input.trim() || loading}
          className="press h-11 rounded-2xl px-5"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
