"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { HardDrive, Clock, Cpu, StickyNote } from "lucide-react";

export function Footer() {
  const products = useStore((s) => s.products);
  const equipos = useStore((s) => s.equipos);
  const notas = useStore((s) => s.notas);
  const [now, setNow] = useState("");

  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const totalUnidades = products.reduce((s, p) => s + p.quantity, 0);

  return (
    <footer className="glass-topbar flex h-9 shrink-0 items-center gap-4 border-t border-border/60 px-6 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <HardDrive className="h-3 w-3 text-primary" />
        <span className="font-medium text-foreground">{products.length}</span> productos
        <span className="text-muted-foreground/60">·</span>
        <span className="font-medium text-foreground">{totalUnidades.toLocaleString("es-PE")}</span> und
      </span>
      <span className="flex items-center gap-1.5">
        <Cpu className="h-3 w-3 text-primary" />
        <span className="font-medium text-foreground">{equipos.length}</span> equipos
      </span>
      <span className="flex items-center gap-1.5">
        <StickyNote className="h-3 w-3 text-amber-500" />
        <span className="font-medium text-foreground">{notas.length}</span> notas
      </span>
      <span className="ml-auto flex items-center gap-1.5">
        <Clock className="h-3 w-3 text-emerald-500" />
        <span className="font-medium text-foreground tabular-nums">{now}</span>
      </span>
      <span className="font-bold tracking-wide text-primary">LEMCORP © 2026</span>
    </footer>
  );
}
