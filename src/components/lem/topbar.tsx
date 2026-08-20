"use client";

import { useStore } from "@/lib/store";
import { LayoutDashboard, Boxes, Cpu, Hash, StickyNote, Sparkles, Building2, Settings as SettingsIcon } from "lucide-react";
import type { ActiveView } from "@/lib/types";

const META: Record<ActiveView, { icon: React.ReactNode; title: string; sub: string }> = {
  dashboard: { icon: <LayoutDashboard className="h-4 w-4" />, title: "Dashboard", sub: "Resumen general del almacén" },
  inventario: { icon: <Boxes className="h-4 w-4" />, title: "Inventario", sub: "Catálogo y entradas de stock" },
  equipos: { icon: <Cpu className="h-4 w-4" />, title: "Equipos", sub: "Trazabilidad por modelo" },
  series: { icon: <Hash className="h-4 w-4" />, title: "Series", sub: "Trazabilidad individual por serie" },
  ia: { icon: <Sparkles className="h-4 w-4" />, title: "Asistente IA", sub: "Recomendaciones inteligentes" },
  bloc: { icon: <StickyNote className="h-4 w-4" />, title: "Bloc", sub: "Notas y recordatorios" },
  empresa: { icon: <Building2 className="h-4 w-4" />, title: "Empresas", sub: "Info y equipo de trabajo" },
  config: { icon: <SettingsIcon className="h-4 w-4" />, title: "Configuración", sub: "Ajustes del sistema" },
};

export function Topbar() {
  const activeView = useStore((s) => s.activeView);
  const m = META[activeView] ?? META.dashboard;
  return (
    <header className="glass-topbar relative flex h-16 shrink-0 items-center gap-3 border-b border-border/60 px-6">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-violet-500/10 text-primary">
        {m.icon}
      </div>
      <div className="flex flex-col leading-tight">
        <h1 className="text-[16px] font-bold tracking-tight">{m.title}</h1>
        <p className="text-[11px] text-muted-foreground">{m.sub}</p>
      </div>
    </header>
  );
}
