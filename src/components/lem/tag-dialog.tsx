"use client";

import { useState, useMemo } from "react";
import { Tag as TagIcon, Sparkles, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { TAG_META, type FileTag } from "@/lib/types";
import { detectTag } from "@/lib/detection";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

const TAG_ORDER: FileTag[] = ["inventario", "despachos", "equipos", "otro"];

export function TagDialog({ fileId }: { fileId: string }) {
  const file = useStore((s) => s.files.find((f) => f.id === fileId));
  const setFileTag = useStore((s) => s.setFileTag);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<FileTag>(file?.tag ?? "otro");

  const suggested = useMemo<FileTag | null>(() => {
    if (!file) return null;
    const det = detectTag(file);
    return det !== file.tag ? det : null;
  }, [file]);

  if (!file) return null;

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) setSelected(file.tag);
  };

  const handleConfirm = () => {
    setFileTag(fileId, selected);
    setOpen(false);
  };

  const needsConfirm = !file.tagConfirmed;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "press h-8 gap-1.5 rounded-lg px-2.5",
          needsConfirm && "bg-accent"
        )}
        onClick={() => setOpen(true)}
        title="Etiquetar archivo"
      >
        <TagIcon className="h-3.5 w-3.5" />
        <span className="emoji">{TAG_META[file.tag].icon}</span>
        {needsConfirm && (
          <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-foreground anim-pulse-soft" />
        )}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TagIcon className="h-4 w-4" />
              Tipo de archivo
            </DialogTitle>
            <DialogDescription>
              Selecciona la categoría de «{file.name}». Esta etiqueta queda fija
              para este archivo.
            </DialogDescription>
          </DialogHeader>

          {suggested && (
            <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/50 p-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="text-xs">
                <p className="font-medium text-foreground">
                  Sugerencia automática: {TAG_META[suggested].label}
                </p>
                <p className="text-muted-foreground">
                  Detectamos columnas que coinciden con esta categoría. Puedes
                  confirmarla o elegir otra.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="press ml-auto h-7 shrink-0 rounded-lg text-xs"
                onClick={() => setSelected(suggested)}
              >
                Usar sugerencia
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 py-1">
            {TAG_ORDER.map((t) => (
              <button
                key={t}
                onClick={() => setSelected(t)}
                className={cn(
                  "press flex items-center gap-2.5 rounded-xl border p-3 text-left transition-colors",
                  selected === t
                    ? "border-primary bg-accent"
                    : "border-border hover:bg-accent/50"
                )}
              >
                <span className="emoji text-lg">{TAG_META[t].icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium">{TAG_META[t].label}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {TAG_META[t].hint}
                  </p>
                </div>
                {selected === t && (
                  <Check className="h-4 w-4 shrink-0 text-foreground" />
                )}
              </button>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirm} className="rounded-xl">
              Confirmar etiqueta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
