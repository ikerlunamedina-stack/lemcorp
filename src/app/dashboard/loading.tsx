"use client";

import { useEffect, useState } from "react";

export default function Loading() {
  const [puntos, setPuntos] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setPuntos((p) => (p.length >= 3 ? "" : p + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        <img src="/lemcorp-logo.png" alt="LEMCORP" className="h-20 w-20 rounded-2xl object-contain" />
        <div className="flex flex-col items-center gap-1">
          <span className="text-[16px] font-bold text-foreground">LEMCORP</span>
          <span className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">WMS · Almacén</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0ms", animationDuration: "0.8s" }} />
          <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "150ms", animationDuration: "0.8s" }} />
          <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "300ms", animationDuration: "0.8s" }} />
        </div>
        <span className="text-[13px] text-muted-foreground">Cargando{puntos}</span>
      </div>
    </div>
  );
}
