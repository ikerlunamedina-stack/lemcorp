"use client";

import {
  LayoutDashboard, Boxes, Cpu, Hash, StickyNote, Sparkles,
  Building2, Settings as SettingsIcon, AlertTriangle,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const activeView = useStore((s) => s.activeView);
  const setActiveView = useStore((s) => s.setActiveView);
  const products = useStore((s) => s.products);
  const equipos = useStore((s) => s.equipos);
  const notas = useStore((s) => s.notas);

  const bajoStock = products.filter((p) => p.minStock && p.minStock > 0 && p.quantity <= p.minStock).length;
  const notasPinned = notas.filter((n) => n.pinned).length;

  const navItems = [
    { id: "dashboard" as const, icon: <LayoutDashboard className="h-[18px] w-[18px]" />, label: "Dashboard" },
    { id: "inventario" as const, icon: <Boxes className="h-[18px] w-[18px]" />, label: "Inventario", badge: products.length },
    { id: "equipos" as const, icon: <Cpu className="h-[18px] w-[18px]" />, label: "Equipos", badge: equipos.length },
    { id: "series" as const, icon: <Hash className="h-[18px] w-[18px]" />, label: "Series", badge: equipos.length },
    { id: "ia" as const, icon: <Sparkles className="h-[18px] w-[18px]" />, label: "Asistente IA" },
    { id: "bloc" as const, icon: <StickyNote className="h-[18px] w-[18px]" />, label: "Bloc", badge: notasPinned || undefined },
    { id: "empresa" as const, icon: <Building2 className="h-[18px] w-[18px]" />, label: "Empresa" },
  ];

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-border bg-sidebar/80 backdrop-blur-xl overflow-y-auto scroll-thin">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20 press">
          <span className="text-[17px] font-bold tracking-tight text-primary-foreground">L</span>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[16px] font-bold tracking-[0.12em] text-foreground">LEMCORP</span>
          <span className="mt-0.5 text-[9px] font-medium tracking-[0.2em] text-muted-foreground uppercase">Almacén</span>
        </div>
      </div>
      <div className="lem-divider mx-4" />

      <nav className="flex flex-col gap-1 px-3 py-3">
        {navItems.map((item) => {
          const active = activeView === item.id;
          return (
            <button key={item.id} onClick={() => setActiveView(item.id)}
              className={cn("press group flex h-10 items-center gap-3 rounded-2xl px-3.5 text-[13px] font-medium transition-all duration-300",
                active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-foreground/70 hover:bg-accent hover:text-foreground")}>
              <span className={cn("transition-transform duration-300", active ? "scale-110" : "group-hover:scale-105")}>{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && (
                <span className={cn("min-w-[20px] rounded-full px-1.5 text-center text-[10px] font-bold",
                  active ? "bg-primary-foreground/25 text-primary-foreground" : "bg-muted text-muted-foreground")}>{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      {bajoStock > 0 && (
        <button onClick={() => setActiveView("inventario")} className="mx-3 mb-2 flex items-center gap-2.5 rounded-2xl border border-destructive/20 bg-destructive/5 px-3.5 py-2 anim-fade-up">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-destructive/10"><AlertTriangle className="h-3.5 w-3.5 text-destructive" /></div>
          <div className="flex flex-col leading-tight">
            <span className="text-[12px] font-semibold text-destructive">{bajoStock} bajo stock</span>
            <span className="text-[10px] text-muted-foreground">Requiere reposición</span>
          </div>
        </button>
      )}

      <div className="mt-auto border-t border-border px-3 py-3">
        <button onClick={() => setActiveView("config")}
          className={cn("press flex h-10 w-full items-center gap-3 rounded-2xl px-3.5 text-[13px] font-medium transition-all duration-300",
            activeView === "config" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-foreground/70 hover:bg-accent hover:text-foreground")}>
          <SettingsIcon className="h-[18px] w-[18px]" />
          <span className="flex-1 text-left">Configuración</span>
        </button>
        <p className="mt-2.5 px-3.5 text-[10px] leading-relaxed text-muted-foreground">Sistema LEMCORP<br />© 2026</p>
      </div>
    </aside>
  );
}
