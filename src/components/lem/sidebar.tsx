"use client";

import {
  LayoutDashboard,
  Boxes,
  TrendingDown,
  Cpu,
  Settings as SettingsIcon,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const activeView = useStore((s) => s.activeView);
  const setActiveView = useStore((s) => s.setActiveView);
  const products = useStore((s) => s.products);
  const despachos = useStore((s) => s.despachos);
  const equipos = useStore((s) => s.equipos);

  const bajoStock = products.filter(
    (p) => p.minStock !== undefined && p.minStock > 0 && p.quantity <= p.minStock
  ).length;

  const navItems = [
    {
      id: "dashboard" as const,
      icon: <LayoutDashboard className="h-4 w-4" />,
      label: "Dashboard",
    },
    {
      id: "inventario" as const,
      icon: <Boxes className="h-4 w-4" />,
      label: "Inventario",
      badge: products.length || undefined,
    },
    {
      id: "despachos" as const,
      icon: <TrendingDown className="h-4 w-4" />,
      label: "Despachos",
      badge: despachos.length || undefined,
    },
    {
      id: "equipos" as const,
      icon: <Cpu className="h-4 w-4" />,
      label: "Equipos",
      badge: equipos.length || undefined,
    },
  ];

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-border bg-sidebar">
      {/* Marca */}
      <div className="flex items-center gap-2.5 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-primary text-primary-foreground press">
          <span className="text-[15px] font-semibold tracking-tight">L</span>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[15px] font-semibold tracking-[0.14em] text-foreground">
            LEMCORP
          </span>
          <span className="text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Sistema de Inventario
          </span>
        </div>
      </div>

      <div className="lem-divider mx-4" />

      {/* Navegación */}
      <nav className="flex flex-col gap-1 px-3 py-3">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={cn(
              "press flex h-9 items-center gap-2.5 rounded-xl px-3 text-[13px] font-medium transition-colors",
              activeView === item.id
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-accent"
            )}
          >
            {item.icon}
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={cn(
                  "min-w-[18px] rounded-full px-1.5 text-center text-[10px] font-semibold",
                  activeView === item.id
                    ? "bg-primary-foreground/20"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {item.badge}
              </span>
            )}
          </button>
        ))}
        {bajoStock > 0 && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive anim-pulse-soft" />
            <span className="text-[11px] font-medium text-destructive">
              {bajoStock} producto(s) bajo stock
            </span>
          </div>
        )}
      </nav>

      <div className="lem-divider mx-4" />

      {/* Configuración al pie */}
      <div className="mt-auto border-t border-border px-3 py-3">
        <button
          onClick={() => setActiveView("config")}
          className={cn(
            "press flex h-9 w-full items-center gap-2.5 rounded-xl px-3 text-[13px] font-medium transition-colors",
            activeView === "config"
              ? "bg-primary text-primary-foreground"
              : "text-foreground hover:bg-accent"
          )}
        >
          <SettingsIcon className="h-4 w-4" />
          <span className="flex-1 text-left">Configuración</span>
        </button>
        <p className="mt-2 px-3 text-[10px] text-muted-foreground">
          Sistema LEMCORP · Datos guardados en este equipo
        </p>
      </div>
    </aside>
  );
}
