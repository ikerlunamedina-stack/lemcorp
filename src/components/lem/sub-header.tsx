"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useStore } from "@/lib/store";

function greeting(): string {
  const limaHour = parseInt(new Date().toLocaleTimeString("en-US", { timeZone: "America/Lima", hour: "2-digit", hour12: false }), 10);
  if (limaHour < 12) return "Buenos días";
  if (limaHour < 19) return "Buenas tardes";
  return "Buenas noches";
}

function fmtTime(): string {
  return new Date().toLocaleTimeString("es-PE", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function SubHeader() {
  const usuario = useStore((s) => s.settings.usuario);
  const [now, setNow] = useState("");

  useEffect(() => {
    const tick = () => setNow(fmtTime());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center justify-between border-b border-border/60 bg-card/40 px-4 py-2.5 backdrop-blur lg:px-6">
      <h1 className="text-[15px] font-semibold tracking-tight text-foreground">
        {greeting()}, {usuario || "Iker"}
      </h1>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <RefreshCw className="h-3 w-3" />
        <span className="font-mono font-semibold tabular-nums text-foreground">{now}</span>
      </div>
    </div>
  );
}
