"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useEditorUI } from "@/lib/editor-store";
import { HardDrive, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Footer() {
  const files = useStore((s) => s.files);
  const activeView = useStore((s) => s.activeView);
  const active = useEditorUI((s) => s.active);
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(
        d.toLocaleTimeString("es-PE", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const totalCells = files.reduce(
    (s, f) => s + Object.keys(f.cells).length,
    0
  );

  return (
    <footer className="flex h-8 shrink-0 items-center gap-4 border-t border-border bg-card/60 glass px-4 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <HardDrive className="h-3 w-3" />
        Guardado local · {files.length} archivo(s) · {totalCells} celdas
      </span>
      <span className="flex items-center gap-1.5">
        <Zap className="h-3 w-3" />
        {activeView === "editor"
          ? active
            ? `Celda ${active.ref}`
            : "Editor"
          : activeView === "resumen"
          ? "Vista resumen"
          : "Vista equipos"}
      </span>
      <span className="ml-auto flex items-center gap-1.5">
        <Clock className="h-3 w-3" />
        {now}
      </span>
      <span className={cn("font-medium tracking-wider")}>LEMCORP © 2025</span>
    </footer>
  );
}
