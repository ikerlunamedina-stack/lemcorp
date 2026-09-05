"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

function greeting(): string {
  const limaHour = parseInt(
    new Date().toLocaleTimeString("en-US", { timeZone: "America/Lima", hour: "2-digit", hour12: false }),
    10
  );
  if (limaHour < 12) return "Buenos días";
  if (limaHour < 19) return "Buenas tardes";
  return "Buenas noches";
}

function fmtTime(): string {
  return new Date().toLocaleTimeString("es-PE", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function SubHeader() {
  const usuario = useStore((s) => s.settings.usuario);
  const miembros = useStore((s) => s.miembros);
  const sesionUsuarioId = useStore((s) => s.sesionUsuarioId);
  const [now, setNow] = useState("");

  const miembroActual = sesionUsuarioId
    ? miembros.find((m) => m.id === sesionUsuarioId)
    : null;
  const nombre = miembroActual?.nombre || usuario || "Iker";

  useEffect(() => {
    const tick = () => setNow(fmtTime());
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center justify-between px-4 py-2.5 lg:px-6">
      <p className="text-[13px] font-medium tracking-tight text-muted-foreground">
        {greeting()}, <span className="text-foreground">{nombre}</span>
      </p>
      <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
        {now}
      </p>
    </div>
  );
}
