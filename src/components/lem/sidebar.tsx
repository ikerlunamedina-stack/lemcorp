"use client";

import {
  LayoutDashboard, Boxes, Cpu, Hash, StickyNote, Sparkles,
  Building2, Settings as SettingsIcon, AlertTriangle,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ActiveView } from "@/lib/types";

export function Sidebar() {
  const activeView = useStore((s) => s.activeView);
  const setActiveView = useStore((s) => s.setActiveView);
  const products = useStore((s) => s.products);
  const equipos = useStore((s) => s.equipos);
  const notas = useStore((s) => s.notas);

  const bajoStock = products.filter((p) => p.minStock && p.minStock > 0 && p.quantity <= p.minStock).length;
  const notasPinned = notas.filter((n) => n.pinned).length;

  const navItems: { view: ActiveView; icon: typeof LayoutDashboard; label: string; badge?: number }[] = [
    { view: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { view: "inventario", icon: Boxes, label: "Inventario", badge: products.length },
    { view: "equipos", icon: Cpu, label: "Equipos", badge: equipos.length },
    { view: "series", icon: Hash, label: "Series", badge: equipos.length },
    { view: "ia", icon: Sparkles, label: "Asistente IA" },
    { view: "bloc", icon: StickyNote, label: "Bloc", badge: notasPinned || undefined },
    { view: "empresa", icon: Building2, label: "Empresas" },
  ];

  const go = (v: ActiveView) => () => setActiveView(v);

  return (
    <aside className="glass-sidebar relative flex h-full w-[260px] shrink-0 flex-col border-r border-white/10">
      {/* Glow decorativo arriba */}
      <div className="pointer-events-none absolute -top-20 -left-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 -right-10 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl" />

      {/* Logo */}
      <button onClick={go("dashboard")} className="group relative flex items-center gap-3 px-5 py-5 transition-all hover:opacity-90">
        <div className="relative">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-500 shadow-lg shadow-primary/40 press">
            <span className="text-[19px] font-bold tracking-tight text-white">L</span>
          </div>
          <div className="absolute -inset-1.5 rounded-2xl bg-primary/30 blur-md -z-10 anim-pulse-soft" />
          <div className="absolute inset-0 rounded-2xl anim-pulse-ring -z-10" />
        </div>
        <div className="flex flex-col leading-none text-left">
          <span className="text-[18px] font-bold tracking-tight text-white">LEMCORP</span>
          <span className="mt-1 text-[9px] font-semibold tracking-[0.2em] text-white/40 uppercase">WMS · Almacén</span>
        </div>
      </button>

      <div className="lem-divider mx-4 opacity-30" />

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto scroll-thin px-3 py-4">
        <p className="mb-2 px-3 text-[9px] font-bold tracking-[0.2em] text-white/30 uppercase">Módulos</p>
        {navItems.map((item, i) => {
          const active = activeView === item.view;
          const Icon = item.icon;
          return (
            <button
              key={item.view}
              onClick={go(item.view)}
              className={cn(
                "group relative flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-all duration-300 anim-fade-up press",
                active
                  ? "bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/30"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {active && <div className="absolute -left-3 h-6 w-1 rounded-full bg-white anim-scale-in" />}
              <Icon className={cn("h-[18px] w-[18px] transition-all duration-300", active ? "scale-110 text-white" : "text-white/50 group-hover:scale-105 group-hover:text-white")} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && (
                <span className={cn(
                  "min-w-[20px] rounded-full px-1.5 text-center text-[10px] font-bold transition-colors",
                  active ? "bg-white/25 text-white" : "bg-white/10 text-white/60"
                )}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Alerta bajo stock */}
        {bajoStock > 0 && (
          <button onClick={go("inventario")} className="press anim-fade-up mt-3 flex items-center gap-2.5 rounded-xl border border-red-400/20 bg-gradient-to-r from-red-500/15 to-red-500/5 px-3 py-3 transition-all hover:from-red-500/25 hover:to-red-500/10">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/25">
              <AlertTriangle className="h-4 w-4 text-red-300" />
              <div className="absolute inset-0 rounded-lg anim-pulse-ring" />
            </div>
            <div className="flex flex-col leading-tight text-left">
              <span className="text-[12px] font-bold text-red-300">{bajoStock} bajo stock</span>
              <span className="text-[10px] text-white/40">Requiere reposición</span>
            </div>
          </button>
        )}
      </nav>

      {/* Config */}
      <div className="border-t border-white/10 px-3 py-3">
        <button
          onClick={go("config")}
          className={cn(
            "press flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-all",
            activeView === "config"
              ? "bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/30"
              : "text-white/60 hover:bg-white/5 hover:text-white"
          )}
        >
          <SettingsIcon className="h-[18px] w-[18px]" />
          <span className="flex-1 text-left">Configuración</span>
        </button>
        <p className="mt-3 px-3 text-[10px] leading-relaxed text-white/25">
          LEMCORP WMS · v3.0<br />© 2026
        </p>
      </div>
    </aside>
  );
}
