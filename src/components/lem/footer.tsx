"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

export function Footer() {
  const products = useStore((s) => s.products);
  const equipos = useStore((s) => s.equipos);
  const notas = useStore((s) => s.notas);
  const [now, setNow] = useState("");

  useEffect(() => {
    const tick = () => {
      try {
        setNow(
          new Date().toLocaleTimeString("es-PE", {
            timeZone: "America/Lima",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        );
      } catch {
        setNow(new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false }));
      }
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const totalUnidades = products.reduce((s, p) => s + p.quantity, 0);

  return (
    <footer
      className="flex min-h-8 shrink-0 items-center gap-4 border-t border-border px-4 text-[11px] text-muted-foreground sm:px-6"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <span>
        <span className="font-medium text-foreground">{products.length}</span> productos
        <span className="mx-1.5 text-border">·</span>
        <span className="font-medium text-foreground">{totalUnidades.toLocaleString("es-PE")}</span> und
      </span>
      <span>
        <span className="font-medium text-foreground">{equipos.length}</span> equipos
      </span>
      <span>
        <span className="font-medium text-foreground">{notas.length}</span> notas
      </span>
      <span className="ml-auto font-mono tabular-nums text-foreground">{now}</span>
      <span className="font-medium tracking-wide text-muted-foreground">LEMCORP © 2026</span>
    </footer>
  );
}
