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
    <footer className="flex h-8 shrink-0 items-center gap-4 border-t border-border bg-card/70 backdrop-blur-xl px-5 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5"><HardDrive className="h-3 w-3" />{products.length} productos · {totalUnidades.toLocaleString("es-PE")} und</span>
      <span className="flex items-center gap-1.5"><Cpu className="h-3 w-3" />{equipos.length} equipos</span>
      <span className="flex items-center gap-1.5"><StickyNote className="h-3 w-3" />{notas.length} notas</span>
      <span className="ml-auto flex items-center gap-1.5"><Clock className="h-3 w-3" />{now}</span>
      <span className="font-medium tracking-wider">LEMCORP © 2026</span>
    </footer>
  );
}
