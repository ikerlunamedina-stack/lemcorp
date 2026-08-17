"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { HardDrive, Clock, TrendingDown } from "lucide-react";

export function Footer() {
  const products = useStore((s) => s.products);
  const despachos = useStore((s) => s.despachos);
  const activeView = useStore((s) => s.activeView);
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    const tick = () => {
      setNow(
        new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })
      );
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const totalUnidades = products.reduce((s, p) => s + p.quantity, 0);

  const viewLabel =
    activeView === "dashboard" ? "Dashboard"
    : activeView === "inventario" ? "Inventario"
    : activeView === "despachos" ? "Despachos"
    : "Configuración";

  return (
    <footer className="flex h-8 shrink-0 items-center gap-4 border-t border-border bg-card/60 glass px-4 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <HardDrive className="h-3 w-3" />
        {products.length} productos · {totalUnidades.toLocaleString("es-PE")} und
      </span>
      <span className="flex items-center gap-1.5">
        <TrendingDown className="h-3 w-3" />
        {despachos.length} despachos registrados
      </span>
      <span className="ml-auto flex items-center gap-1.5">
        <Clock className="h-3 w-3" />
        {now}
      </span>
      <span className="font-medium tracking-wider">LEMCORP © 2026</span>
    </footer>
  );
}
