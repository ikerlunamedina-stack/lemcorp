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
    <aside className="flex h-full w-[250px] shrink-0 flex-col glass-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <button onClick={go("dashboard")} className="group flex items-center gap-3 px-5 py-5 transition-opacity hover:opacity-80">
        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30 press">
            <span className="text-[18px] font-bold tracking-tight text-primary-foreground">L</span>
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-primary/20 blur-md -z-10 anim-pulse-soft" />
        </div>
        <div className="flex flex-col leading-none text-left">
          <span className="text-[17px] font-bold tracking-tight text-foreground">LEMCORP</span>
          <span className="mt-0.5 text-[10px] font-medium tracking-[0.15em] text-muted-foreground uppercase">WMS · Almacén</span>
        </div>
      </button>

      <div className="lem-divider mx-4" />

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto scroll-thin px-3 py-4">
        {navItems.map((item, i) => {
          const active = activeView === item.view;
          const Icon = item.icon;
          return (
            <button
              key={item.view}
              onClick={go(item.view)}
              className={cn(
                "group relative flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-all duration-300 anim-fade-up press",
                active
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <Icon className={cn("h-[17px] w-[17px] transition-transform duration-300", active ? "scale-110" : "group-hover:scale-105")} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && (
                <span className={cn(
                  "min-w-[18px] rounded-full px-1.5 text-center text-[10px] font-bold transition-colors",
                  active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Alerta bajo stock */}
        {bajoStock > 0 && (
          <button onClick={go("inventario")} className="press anim-fade-up mt-2 flex items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 transition-colors hover:bg-destructive/10">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            </div>
            <div className="flex flex-col leading-tight text-left">
              <span className="text-[12px] font-semibold text-destructive">{bajoStock} bajo stock</span>
              <span className="text-[10px] text-muted-foreground">Requiere reposición</span>
            </div>
          </button>
        )}
      </nav>

      {/* Config */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <button
          onClick={go("config")}
          className={cn(
            "press flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-all",
            activeView === "config"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <SettingsIcon className="h-[17px] w-[17px]" />
          <span className="flex-1 text-left">Configuración</span>
        </button>
        <p className="mt-2.5 px-3 text-[10px] leading-relaxed text-muted-foreground/60">
          LEMCORP WMS · v2.0<br />© 2026
        </p>
      </div>
    </aside>
  );
}
