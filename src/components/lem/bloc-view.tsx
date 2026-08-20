"use client";

import { useState } from "react";
import {
  StickyNote, Plus, Pin, Trash2, PinOff,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
    <div className="px-6 py-6">
      <div className="anim-fade-up mb-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <StickyNote className="h-5 w-5" /> Bloc
        </h1>
        <p className="text-sm text-muted-foreground">Recordatorios y apuntes rápidos del almacén</p>
      </div>

      {/* Añadir nota */}
      <div className="anim-fade-up mb-4 rounded-2xl border border-border bg-card p-4">
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ej: Traer 50 conectores FTTH para mañana. Router serie 48575443365E42D1 no enciende, llevar a taller."
          className="min-h-[80px] rounded-xl text-[13px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleAdd();
            }
          }}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Ctrl+Enter para guardar</span>
          <Button onClick={handleAdd} disabled={!texto.trim()} size="sm" className="press rounded-xl">
            <Plus className="mr-1.5 h-3.5 w-3.5" />Añadir nota
          </Button>
        </div>
      </div>

      {/* Lista de notas */}
      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
          No hay notas. Escribe arriba y presiona "Añadir nota".
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {sorted.map((n, i) => (
            <div
              key={n.id}
              className={cn(
                "anim-fade-up group rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md",
                n.pinned ? "border-primary/30 bg-primary/5" : "border-border bg-card"
              )}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="flex items-start gap-2">
                <p className="flex-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed">{n.texto}</p>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => togglePinNota(n.id)}
                    className={cn(
                      "press rounded-md p-1 transition-colors",
                      n.pinned ? "text-primary hover:bg-primary/10" : "text-muted-foreground opacity-0 hover:bg-accent group-hover:opacity-100"
                    )}
                    title={n.pinned ? "Desfijar" : "Fijar"}
                  >
                    {n.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => deleteNota(n.id)}
                    className="press rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                {new Date(n.fecha).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
