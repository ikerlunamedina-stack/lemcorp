"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import type { Tema } from "@/lib/types";

interface NavItem {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  /** ruta exacta para marcar activo (true) o prefijo (false, default) */
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { href: "/inventario", icon: Boxes, label: "Inventario" },
  { href: "/despachos", icon: TrendingDown, label: "Despachos" },
  { href: "/equipos", icon: Cpu, label: "Equipos" },
  { href: "/series", icon: Hash, label: "Series" },
  { href: "/pistolear", icon: ScanLine, label: "Pistolear" },
  { href: "/horario", icon: Calendar, label: "Horario" },
  { href: "/ia", icon: Sparkles, label: "Alana" },
  { href: "/bloc", icon: StickyNote, label: "Bloc" },
  { href: "/empresa", icon: Building2, label: "Empresas" },
  { href: "/notificaciones", icon: Bell, label: "Avisos" },
];

function iniciales(usuario: string): string {
  const u = (usuario || "Iker").trim();
  if (u.length >= 2) return u.slice(0, 2).toUpperCase();
  return u.toUpperCase().padEnd(2, "X");
}

export function Navbar() {
  const pathname = usePathname();
  const products = useStore((s) => s.products);
  const empresa = useStore((s) => s.empresa);
  const settings = useStore((s) => s.settings);
  const setSetting = useStore((s) => s.setSetting);
  const bajoStockVisto = useStore((s) => s.bajoStockVisto);
  const marcarBajoStockVisto = useStore((s) => s.marcarBajoStockVisto);

  const [searchOpen, setSearchOpen] = useState(false);

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname?.startsWith(item.href);

  const bajoStock = products.filter(
    (p) => p.minStock && p.minStock > 0 && p.quantity <= p.minStock
  ).length;

  // Solo mostrar el badge si hay más productos en bajo stock que los que ya vio
  const badgeCount = Math.max(0, bajoStock - bajoStockVisto);

  // Cuando entra a /notificaciones, marcamos como visto el conteo actual
  useEffect(() => {
    if (pathname === "/notificaciones" && bajoStock > 0) {
      marcarBajoStockVisto(bajoStock);
    }
  }, [pathname, bajoStock, marcarBajoStockVisto]);

  const cycleTema = () => {
    const order: Tema[] = ["claro", "oscuro", "sistema"];
    const idx = order.indexOf(settings.tema);
    const next = order[(idx + 1) % order.length];
    setSetting("tema", next);
  };

  const TemaIcon =
    settings.tema === "claro" ? Sun : settings.tema === "oscuro" ? Moon : Monitor;

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 lg:px-6">
      {/* Logo */}
      <Link href="/" className="press flex shrink-0 items-center gap-2">
        <img src="/lemcorp-logo.png" alt="LEMCORP" className="h-9 w-9 rounded-lg object-contain" />
        <div className="flex flex-col leading-none">
          <span className="text-[15px] font-bold tracking-tight text-foreground">LEMCORP</span>
          <span className="mt-0.5 hidden text-[9px] font-semibold tracking-[0.15em] text-muted-foreground uppercase sm:block">Sistema de Almacén</span>
        </div>
      </Link>

      <div className="mx-1 h-7 w-px bg-border" />

      {/* Nav desktop */}
      <nav className="mx-auto hidden items-center gap-0.5 lg:flex">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "press flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors",
                active
                  ? "bg-accent text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Nav móvil (iconos) */}
      <nav className="flex flex-1 items-center gap-0.5 overflow-x-auto scroll-thin lg:hidden">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "press flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                active
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/50"
              )}
              title={item.label}
            >
              <Icon className="h-4 w-4" />
            </Link>
          );
        })}
      </nav>

      {/* Zona derecha */}
      <div className="flex items-center gap-1.5">
        {/* Empresa */}
        <Link href="/empresa" className="press hidden items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium hover:bg-accent xl:flex">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="max-w-[100px] truncate">{empresa.nombre}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Link>

        {/* Tema */}
        <button onClick={cycleTema} title={`Tema: ${settings.tema}`} className="press flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
          <TemaIcon className="h-4 w-4" />
        </button>

        {/* Notificaciones */}
        <Link href="/notificaciones" className="press relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
          <Bell className="h-4 w-4" />
          {settings.lowStockAlerts && badgeCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
        </Link>

        {/* Config */}
        <Link
          href="/config"
          className={cn(
            "press flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
            pathname?.startsWith("/config") ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <SettingsIcon className="h-4 w-4" />
        </Link>

        {/* Avatar */}
        <Link
          href="/config"
          className="press relative ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow-sm"
          title={settings.usuario || "Iker"}
        >
          {iniciales(settings.usuario)}
        </Link>
      </div>
    </header>
  );
}
