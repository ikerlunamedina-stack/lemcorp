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
      <img src="/lemcorp-logo.png" alt="LEMCORP" className="h-20 w-20 object-contain animate-pulse" />
      <span className="mt-6 text-[14px] text-muted-foreground">Cargando{puntos}</span>
    </div>
  );
}
