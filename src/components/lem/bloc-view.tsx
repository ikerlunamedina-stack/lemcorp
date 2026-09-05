"use client";

import { useState } from "react";
import { Plus, Pin, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

const ICON_PROPS = { strokeWidth: 1.5 } as const;

export function BlocView() {
  const notas = useStore((s) => s.notas);
  const addNota = useStore((s) => s.addNota);
  const togglePinNota = useStore((s) => s.togglePinNota);
  const deleteNota = useStore((s) => s.deleteNota);

  const [texto, setTexto] = useState("");

  const handleAdd = () => {
    if (!texto.trim()) return;
    addNota(texto);
    setTexto("");
  };

  const sorted = [...notas].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.fecha - a.fecha;
  });

  return (
    <div className="anim-fade-in mx-auto w-full max-w-[680px] px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="anim-slide-up mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Apuntes
          </p>
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground">
            Bloc
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Recordatorios y apuntes rápidos del almacén
          </p>
        </div>
      </div>

      {/* Añadir nota */}
      <div className="anim-slide-up mb-6 rounded-lg border border-border bg-background">
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ej: Traer 50 conectores FTTH para mañana. Router serie 48575443365E42D1 no enciende, llevar a taller."
          className="min-h-[88px] rounded-b-none border-0 bg-transparent text-[13px] leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleAdd();
            }
          }}
        />
        <div className="flex items-center justify-between border-t border-border px-3 py-2.5">
          <span className="text-[11px] text-muted-foreground">Ctrl+Enter para guardar</span>
          <button
            onClick={handleAdd}
            disabled={!texto.trim()}
            className={cn(
              "press inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              "bg-foreground text-background hover:bg-foreground/90"
            )}
          >
            <Plus className="h-3.5 w-3.5" {...ICON_PROPS} />
            Añadir nota
          </button>
        </div>
      </div>

      {/* Lista de notas — hairline list */}
      {sorted.length === 0 ? (
        <div className="anim-fade-in rounded-lg border border-dashed border-border bg-background px-4 py-16 text-center text-[13px] text-muted-foreground">
          No hay notas. Escribe arriba y presiona “Añadir nota”.
        </div>
      ) : (
        <div className="anim-fade-in overflow-hidden rounded-lg border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {sorted.length} {sorted.length === 1 ? "nota" : "notas"}
            </span>
            {sorted.some((n) => n.pinned) && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                Fijadas primero
              </span>
            )}
          </div>
          <ul className="divide-y divide-border">
            {sorted.map((n, i) => (
              <li
                key={n.id}
                className="group anim-slide-up flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                style={{ animationDelay: `${Math.min(i * 24, 240)}ms` }}
              >
                {/* Pinned indicator: small dot */}
                <span
                  className={cn(
                    "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                    n.pinned ? "bg-foreground" : "bg-transparent"
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-foreground">
                    {n.texto}
                  </p>
                  <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                    {new Date(n.fecha).toLocaleString("es-PE", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => togglePinNota(n.id)}
                    className={cn(
                      "press rounded-md p-1.5 transition-colors hover:bg-muted",
                      n.pinned
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title={n.pinned ? "Desfijar" : "Fijar"}
                  >
                    <Pin className="h-3.5 w-3.5" {...ICON_PROPS} />
                  </button>
                  <button
                    onClick={() => deleteNota(n.id)}
                    className="press rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" {...ICON_PROPS} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
