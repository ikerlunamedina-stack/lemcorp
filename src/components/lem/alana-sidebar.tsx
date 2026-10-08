"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, AlertCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const ICON_PROPS = { strokeWidth: 1.5 } as const;

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  ts: number;
  recordatorio?: { texto: string; cuando: string };
  aprendido?: string[];
  accionesEjecutadas?: Array<{ tipo: string; descripcion: string; ok: boolean; error?: string }>;
}

interface AlanaSidebarProps {
  open: boolean;
  onClose: () => void;
  selectedText?: string;
  pageContext?: string;
}

export function AlanaSidebar({ open, onClose, selectedText, pageContext }: AlanaSidebarProps) {
  const products = useStore((s) => s.products);
  const equipos = useStore((s) => s.equipos);
  const despachos = useStore((s) => s.despachos);
  const miembros = useStore((s) => s.miembros);
  const empresa = useStore((s) => s.empresa);
  const memoriaIA = useStore((s) => s.memoriaIA);
  const settings = useStore((s) => s.settings);
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const usuario = settings?.usuario || "operador";

  // Mensaje de bienvenida cuando se abre
  useEffect(() => {
    if (open && messages.length === 0) {
      const welcome: ChatMsg = {
        role: "assistant",
        content: selectedText
          ? `Veo que tienes seleccionado "${selectedText.slice(0, 80)}${selectedText.length > 80 ? "…" : ""}".${pageContext ? ` Estás en ${pageContext}.` : ""} ¿Qué necesitas saber sobre esto?`
          : `Hola ${usuario}. ${pageContext ? `Estás viendo ${pageContext}.` : ""} Puedo ayudarte con el inventario, equipos, despachos y más. ¿Qué necesitas?`,
        ts: Date.now(),
      };
      setMessages([welcome]);
    }
  }, [open]);

  // Auto-scroll al final
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus al input cuando se abre
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const enviar = useCallback(async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    const userMsg: ChatMsg = { role: "user", content: msg, ts: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const historial = newMessages.slice(-10).map((m) => ({ role: m.role, content: m.content }));

      // Si hay texto seleccionado, incluirlo en el mensaje
      const mensajeCompleto = selectedText && messages.length <= 1
        ? `${msg}\n\n[Contexto: texto seleccionado: "${selectedText}"]`
        : msg;

      const res = await fetch("/api/ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensaje: mensajeCompleto,
          historial,
          inventario: products,
          equipos,
          miembros,
          despachos,
          empresa,
          usuario,
          memoria: memoriaIA,
          modoContexto: "",
          requestId: `sidebar-${Date.now()}`,
        }),
      });
      const data = await res.json();
      const respuesta = data.ok && data.respuesta ? data.respuesta : "No pude procesar tu consulta.";

      const assistantMsg: ChatMsg = { role: "assistant", content: respuesta, ts: Date.now() };

      // Procesar recordatorios
      if (data.ok && Array.isArray(data.recordatorios) && data.recordatorios.length > 0) {
        const addRecordatorio = useStore.getState().addRecordatorio;
        for (const r of data.recordatorios) {
          const cuando = new Date(r.cuando).getTime();
          if (!isNaN(cuando)) {
            addRecordatorio(r.texto, cuando, "ia");
            assistantMsg.recordatorio = { texto: r.texto, cuando: r.cuando };
          }
        }
      }

      setMessages([...newMessages, assistantMsg]);
    } catch {
      const errorMsg: ChatMsg = {
        role: "assistant",
        content: "No pude conectar con el servidor. Intenta de nuevo.",
        ts: Date.now(),
      };
      setMessages([...newMessages, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, selectedText, products, equipos, miembros, despachos, empresa, usuario, memoriaIA]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay oscuro detrás del sidebar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-background/40 backdrop-blur-[2px]"
          />

          {/* Sidebar que se desliza desde la derecha */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 z-[101] flex h-full w-full max-w-[420px] flex-col border-l border-border bg-background"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-background" {...ICON_PROPS} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-foreground">Alana</p>
                  <p className="text-[10px] text-muted-foreground">
                    {pageContext ? `Viendo: ${pageContext}` : "Asistente del almacén"}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Cerrar Alana"
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" {...ICON_PROPS} />
              </button>
            </div>

            {/* Mensajes scrollable */}
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto scroll-thin px-4 py-4">
              {messages.map((m, i) => {
                const isUser = m.role === "user";
                return (
                  <div key={i} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words",
                        isUser
                          ? "bg-foreground text-background"
                          : "bg-muted text-foreground"
                      )}
                    >
                      {m.content}
                      {/* Recordatorio */}
                      {m.recordatorio && (
                        <div className="mt-2 rounded-lg bg-foreground/10 px-2 py-1 text-[11px]">
                          Recordatorio: {m.recordatorio.texto}
                        </div>
                      )}
                      {/* Acciones ejecutadas */}
                      {m.accionesEjecutadas && m.accionesEjecutadas.length > 0 && (
                        <div className="mt-2 space-y-1 border-t border-border/30 pt-2">
                          {m.accionesEjecutadas.map((a, j) => (
                            <div key={j} className="flex items-center gap-1.5 text-[11px]">
                              <span className={a.ok ? "text-emerald-600" : "text-rose-600"}>
                                {a.ok ? "OK" : "Error"}
                              </span>
                              <span className="text-muted-foreground">{a.descripcion}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Loading */}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-xl bg-muted px-3.5 py-2.5 text-[13px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border px-4 py-3" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)" }}>
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      enviar();
                    }
                  }}
                  placeholder="Pregúntale a Alana…"
                  disabled={loading}
                  className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-[13px] outline-none transition-colors focus:border-foreground/30 disabled:opacity-50"
                  autoComplete="off"
                />
                <button
                  onClick={enviar}
                  disabled={!input.trim() || loading}
                  aria-label="Enviar"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send className="h-4 w-4" {...ICON_PROPS} />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
