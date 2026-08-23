"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Boxes,
  TrendingDown,
  Cpu,
  Hash,
  ScanLine,
  Calendar,
  Sparkles,
  StickyNote,
  Building2,
  Search,
  Bell,
  Settings as SettingsIcon,
  ChevronDown,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ActiveView, Tema } from "@/lib/types";

interface NavItem {
  view: ActiveView;
  icon: typeof LayoutDashboard;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { view: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { view: "inventario", icon: Boxes, label: "Inventario" },
  { view: "despachos", icon: TrendingDown, label: "Despachos" },
  { view: "equipos", icon: Cpu, label: "Equipos" },
  { view: "series", icon: Hash, label: "Series" },
  { view: "pistolear", icon: ScanLine, label: "Pistolear" },
  { view: "horario", icon: Calendar, label: "Horario" },
  { view: "ia", icon: Sparkles, label: "Alana" },
  { view: "bloc", icon: StickyNote, label: "Bloc" },
  { view: "empresa", icon: Building2, label: "Empresas" },
  { view: "notificaciones", icon: Bell, label: "Avisos" },
];

function iniciales(usuario: string): string {
  const u = (usuario || "Iker").trim();
  if (u.length >= 2) return u.slice(0, 2).toUpperCase();
  return u.toUpperCase().padEnd(2, "X");
}

export function Navbar() {
  const activeView = useStore((s) => s.activeView);
  const setActiveView = useStore((s) => s.setActiveView);
  const products = useStore((s) => s.products);
  const empresa = useStore((s) => s.empresa);
  const settings = useStore((s) => s.settings);
  const setSetting = useStore((s) => s.setSetting);

  const [searchOpen, setSearchOpen] = useState(false);

  const bajoStock = products.filter(
    (p) => p.minStock && p.minStock > 0 && p.quantity <= p.minStock
  ).length;

  const cycleTema = () => {
    const order: Tema[] = ["claro", "oscuro", "sistema"];
    const idx = order.indexOf(settings.tema);
    const next = order[(idx + 1) % order.length];
    setSetting("tema", next);
  };

  const TemaIcon =
    settings.tema === "claro" ? Sun : settings.tema === "oscuro" ? Moon : Monitor;

  const go = (v: ActiveView) => () => setActiveView(v);

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 lg:px-6">
      {/* Logo */}
      <button onClick={go("dashboard")} className="press flex shrink-0 items-center gap-2">
        <img src="/lemcorp-logo.png" alt="LEMCORP" className="h-9 w-9 rounded-lg object-contain" />
        <div className="flex flex-col leading-none">
          <span className="text-[15px] font-bold tracking-tight text-foreground">LEMCORP</span>
          <span className="mt-0.5 hidden text-[9px] font-semibold tracking-[0.15em] text-muted-foreground uppercase sm:block">WMS</span>
        </div>
      </button>

      <div className="mx-1 h-7 w-px bg-border" />

      {/* Nav desktop */}
      <nav className="mx-auto hidden items-center gap-0.5 lg:flex">
        {NAV_ITEMS.map((item) => {
          const active = activeView === item.view;
          const Icon = item.icon;
          return (
            <button
              key={item.view}
              onClick={go(item.view)}
              className={cn(
                "press flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors",
                active
                  ? "bg-accent text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Nav móvil (iconos) */}
      <nav className="flex flex-1 items-center gap-0.5 overflow-x-auto scroll-thin lg:hidden">
        {NAV_ITEMS.map((item) => {
          const active = activeView === item.view;
          const Icon = item.icon;
          return (
            <button
              key={item.view}
              onClick={go(item.view)}
              className={cn(
                "press flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                active
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/50"
              )}
              title={item.label}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </nav>

      {/* Zona derecha */}
      <div className="flex items-center gap-1.5">
        {/* Empresa */}
        <button onClick={go("empresa")} className="press hidden items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium hover:bg-accent xl:flex">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="max-w-[100px] truncate">{empresa.nombre}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>

        {/* Tema */}
        <button onClick={cycleTema} title={`Tema: ${settings.tema}`} className="press flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
          <TemaIcon className="h-4 w-4" />
        </button>

        {/* Notificaciones */}
        <button onClick={go("notificaciones")} className="press relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
          <Bell className="h-4 w-4" />
          {settings.lowStockAlerts && bajoStock > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {bajoStock > 99 ? "99+" : bajoStock}
            </span>
          )}
        </button>

        {/* Config */}
        <button
          onClick={go("config")}
          className={cn(
            "press flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
            activeView === "config" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <SettingsIcon className="h-4 w-4" />
        </button>

        {/* Avatar */}
        <button
          onClick={go("config")}
          className="press relative ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow-sm"
          title={settings.usuario || "Iker"}
        >
          {iniciales(settings.usuario)}
        </button>
      </div>
    </header>
  );
}
