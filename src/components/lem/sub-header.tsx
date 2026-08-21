"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Boxes,
  TrendingDown,
  Cpu,
  Hash,
  ScanLine,
  Sparkles,
  StickyNote,
  Building2,
  Settings as SettingsIcon,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { ActiveView } from "@/lib/types";

const META: Record<ActiveView, { icon: LucideIcon; title: string; sub: string }> = {
  dashboard: { icon: LayoutDashboard, title: "Dashboard", sub: "Resumen general del almacén" },
  inventario: { icon: Boxes, title: "Inventario", sub: "Catálogo y entradas de stock" },
  despachos: { icon: TrendingDown, title: "Despachos", sub: "Salidas de mercadería a técnicos" },
  equipos: { icon: Cpu, title: "Equipos", sub: "Trazabilidad por modelo" },
  series: { icon: Hash, title: "Series", sub: "Trazabilidad individual por número de serie" },
  pistolear: { icon: ScanLine, title: "Pistolear", sub: "Captura rápida de series con lector óptico" },
  ia: { icon: Sparkles, title: "Asistente IA", sub: "Recomendaciones inteligentes de reposición" },
  bloc: { icon: StickyNote, title: "Bloc", sub: "Notas y recordatorios del almacén" },
  empresa: { icon: Building2, title: "Empresas", sub: "Empresa contratista y equipo de trabajo" },
  config: { icon: SettingsIcon, title: "Configuración", sub: "Ajustes del sistema y personalización" },
};

function greeting(d: Date): string {
  const h = d.getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function SubHeader() {
  const activeView = useStore((s) => s.activeView);
  const usuario = useStore((s) => s.settings.usuario);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const m = META[activeView] ?? META.dashboard;
  const Icon = m.icon;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-card/40 px-4 py-3 backdrop-blur lg:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/10 text-violet-300 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex flex-col leading-tight">
          <h1 className="flex items-center gap-2 text-[15px] font-bold tracking-tight">
            <span>{m.title}</span>
            <span className="hidden text-[12px] font-normal text-muted-foreground sm:inline">
              · {now ? greeting(now) : "Hola"}, {usuario || "Admin"}
            </span>
          </h1>
          <p className="text-[11px] text-muted-foreground">{m.sub}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/60 px-2.5 py-1 text-[11px] text-muted-foreground">
        <RefreshCw className="h-3 w-3 text-violet-400" />
        <span className="hidden sm:inline">Actualizado:</span>
        <span className="font-mono font-semibold tabular-nums text-foreground">
          {now ? fmtTime(now) : "--:--:--"}
        </span>
      </div>
    </div>
  );
}
