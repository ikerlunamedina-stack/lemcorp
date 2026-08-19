"use client";

import { LayoutDashboard, Boxes, Cpu, Hash, StickyNote, Sparkles, Building2, Settings as SettingsIcon } from "lucide-react";
import { useStore } from "@/lib/store";

export function Topbar() {
  const activeView = useStore((s) => s.activeView);
  const meta: Record<string, { icon: React.ReactNode; title: string }> = {
    dashboard: { icon: <LayoutDashboard className="h-4 w-4" />, title: "Dashboard" },
    inventario: { icon: <Boxes className="h-4 w-4" />, title: "Inventario" },
    equipos: { icon: <Cpu className="h-4 w-4" />, title: "Equipos" },
    series: { icon: <Hash className="h-4 w-4" />, title: "Series" },
    ia: { icon: <Sparkles className="h-4 w-4" />, title: "Asistente IA" },
    bloc: { icon: <StickyNote className="h-4 w-4" />, title: "Bloc" },
    empresa: { icon: <Building2 className="h-4 w-4" />, title: "Empresa" },
    config: { icon: <SettingsIcon className="h-4 w-4" />, title: "Configuración" },
  };
  const m = meta[activeView] ?? meta.dashboard;
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/70 backdrop-blur-xl px-5">
      <span className="text-muted-foreground">{m.icon}</span>
      <h1 className="truncate text-[15px] font-semibold tracking-tight">{m.title}</h1>
    </header>
  );
}
