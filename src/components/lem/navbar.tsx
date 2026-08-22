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
  Check,
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
  { view: "ia", icon: Sparkles, label: "IA" },
  { view: "bloc", icon: StickyNote, label: "Bloc" },
  { view: "empresa", icon: Building2, label: "Empresas" },
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

  return (
    <header className="glass-topbar sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-border/60 px-4 lg:px-6">
      {/* ─── LEFT: Logo ─── */}
      <button
        onClick={() => setActiveView("dashboard")}
        className="group flex shrink-0 items-center gap-2.5 pr-2"
      >
        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm press">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2 L22 8.5 L22 15.5 L12 22 L2 15.5 L2 8.5 Z" />
              <path d="M12 2 L12 9" />
              <path d="M22 8.5 L12 9 L2 8.5" />
              <path d="M12 9 L12 22" />
              <path d="M12 9 L17 12 L22 8.5" />
              <path d="M12 9 L7 12 L2 8.5" />
              <path d="M17 12 L17 18 L12 22" />
              <path d="M7 12 L7 18 L12 22" />
            </svg>
          </div>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[15px] font-bold tracking-tight text-foreground">Nuclon</span>
          <span className="mt-0.5 hidden text-[9px] font-semibold tracking-[0.15em] text-muted-foreground uppercase sm:block">WMS · Almacén</span>
        </div>
      </button>

      {/* ─── CENTER: Nav ─── */}
      <nav className="mx-auto hidden items-center gap-0.5 lg:flex">
        {NAV_ITEMS.map((item) => {
          const active = activeView === item.view;
          const Icon = item.icon;
          return (
            <button
              key={item.view}
              onClick={() => setActiveView(item.view)}
              className={cn(
                "press group relative flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium transition-all duration-200",
                active
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              title={item.label}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  active ? "scale-110 text-primary" : "group-hover:scale-105"
                )}
              />
              <span>{item.label}</span>
              {active && (
                <span className="absolute -bottom-[1px] left-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full bg-primary anim-scale-in" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Mobile nav scroll (compact, only icons) */}
      <nav className="flex flex-1 items-center gap-0.5 overflow-x-auto scroll-thin lg:hidden">
        {NAV_ITEMS.map((item) => {
          const active = activeView === item.view;
          const Icon = item.icon;
          return (
            <button
              key={item.view}
              onClick={() => setActiveView(item.view)}
              className={cn(
                "press flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent"
              )}
              title={item.label}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </nav>

      {/* ─── RIGHT: actions ─── */}
      <div className="flex shrink-0 items-center gap-1">
        {/* Search (desktop) */}
        <button
          onClick={() => setSearchOpen((v) => !v)}
          className="press hidden h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground sm:flex"
          title="Buscar"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Empresa (desktop) */}
        <button
          onClick={() => setActiveView("empresa")}
          className="press hidden h-9 items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 text-[12px] font-medium hover:border-primary/40 hover:bg-accent/40 md:flex"
          title="Empresa contratista"
        >
          <Building2 className="h-3.5 w-3.5 text-primary" />
          <span className="max-w-[120px] truncate">{empresa.nombre || "Sin empresa"}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={cycleTema}
          className="press flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
          title={`Tema: ${settings.tema}`}
        >
          <TemaIcon className="h-4 w-4" />
        </button>

        {/* Notifications bell */}
        <button
          onClick={() => setActiveView("inventario")}
          className="press relative flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Alertas de bajo stock"
        >
          <Bell className="h-4 w-4" />
          {settings.lowStockAlerts && bajoStock > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-[16px] h-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white anim-pulse-ring">
              {bajoStock > 99 ? "99+" : bajoStock}
            </span>
          )}
        </button>

        {/* Settings */}
        <button
          onClick={() => setActiveView("config")}
          className={cn(
            "press flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground",
            activeView === "config" && "bg-primary/10 text-primary"
          )}
          title="Configuración"
        >
          <SettingsIcon className="h-4 w-4" />
        </button>

        {/* Avatar */}
        <button
          onClick={() => setActiveView("config")}
          className="press relative ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow-md"
          title={settings.usuario || "Iker"}
        >
          {iniciales(settings.usuario)}
        </button>
      </div>

      {/* Search overlay (basic) */}
      {searchOpen && (
        <div className="absolute left-1/2 top-14 z-50 hidden -translate-x-1/2 sm:block">
          <div className="glass anim-fade-up flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-xl">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              placeholder="Buscar producto por SKU o nombre…"
              className="w-72 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearchOpen(false);
                if (e.key === "Enter") {
                  setActiveView("inventario");
                  setSearchOpen(false);
                }
              }}
            />
            <button
              onClick={() => setSearchOpen(false)}
              className="press flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
