"use client";

import { useEffect, useState } from "react";
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
  Bell,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Monitor,
  Menu,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ROL_META, type Permiso, type Tema } from "@/lib/types";

interface NavItem {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  /** ruta exacta para marcar activo (true) o prefijo (false, default) */
  exact?: boolean;
}

const NAV_ITEMS: (NavItem & { permiso: Permiso })[] = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard", exact: true, permiso: "ver_dashboard" },
  { href: "/inventario", icon: Boxes, label: "Inventario", permiso: "ver_inventario" },
  { href: "/despachos", icon: TrendingDown, label: "Despachos", permiso: "ver_despachos" },
  { href: "/equipos", icon: Cpu, label: "Equipos", permiso: "ver_equipos" },
  { href: "/series", icon: Hash, label: "Series", permiso: "ver_equipos" },
  { href: "/pistolear", icon: ScanLine, label: "Pistolear", permiso: "pistolear" },
  { href: "/horario", icon: Calendar, label: "Horario", permiso: "ver_horario" },
  { href: "/ia", icon: Sparkles, label: "Alana", permiso: "usar_ia" },
  { href: "/bloc", icon: StickyNote, label: "Bloc", permiso: "ver_bloc" },
  { href: "/empresa", icon: Building2, label: "Empresas", permiso: "ver_empresa" },
  { href: "/notificaciones", icon: Bell, label: "Avisos", permiso: "ver_notificaciones" },
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
  const tienePermiso = useStore((s) => s.tienePermiso);
  const miembros = useStore((s) => s.miembros);
  const sesionUsuarioId = useStore((s) => s.sesionUsuarioId);

  const [drawerOpen, setDrawerOpen] = useState(false);

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

  // Miembro actual (sesión)
  const miembroActual = sesionUsuarioId
    ? miembros.find((m) => m.id === sesionUsuarioId)
    : null;
  // Si no hay sesión, el usuario es el "dueño/admin" (settings.usuario)
  const nombreUsuario = miembroActual?.nombre || settings.usuario || "Iker";
  const rolLabel = miembroActual
    ? ROL_META[miembroActual.rol].short
    : "Admin";
  const esAdmin = !miembroActual || miembroActual.rol === "administrador";

  // Filtrar items por permisos
  const navItemsVisibles = NAV_ITEMS.filter((item) => tienePermiso(item.permiso));

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
        {navItemsVisibles.map((item) => {
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

      {/* Botón hamburguesa para móvil */}
      <button
        onClick={() => setDrawerOpen(true)}
        className="press ml-auto flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-accent lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Zona derecha */}
      <div className="flex items-center gap-1.5">
        {/* Tema */}
        <button onClick={cycleTema} title={`Tema: ${settings.tema}`} className="press flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
          <TemaIcon className="h-4 w-4" />
        </button>

        {/* Notificaciones (solo si tiene permiso) */}
        {tienePermiso("ver_notificaciones") && (
          <Link href="/notificaciones" className="press relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
            <Bell className="h-4 w-4" />
            {settings.lowStockAlerts && badgeCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            )}
          </Link>
        )}

        {/* Config (solo si tiene permiso) */}
        {tienePermiso("ver_config") && (
          <Link
            href="/config"
            className={cn(
              "press flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
              pathname?.startsWith("/config") ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <SettingsIcon className="h-4 w-4" />
          </Link>
        )}

        {/* Avatar con rol */}
        <Link
          href="/config"
          className={cn(
            "press relative ml-1 flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold text-primary-foreground shadow-sm",
            esAdmin ? "bg-primary" : "bg-muted-foreground"
          )}
          title={`${nombreUsuario} · ${rolLabel}`}
        >
          {iniciales(nombreUsuario)}
        </Link>
      </div>

      {/* Drawer móvil — menú deslizable desde la izquierda */}
      {drawerOpen && (
        <>
          {/* Overlay oscuro */}
          <div
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm anim-drawer-overlay lg:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Panel deslizable */}
          <aside
            className="fixed left-0 top-0 z-[70] flex h-full w-[280px] max-w-[85vw] flex-col border-r border-border bg-card shadow-2xl anim-drawer-slide lg:hidden"
            style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
          >
            {/* Cabecera del drawer */}
            <div className="flex items-center justify-between border-b border-border p-4">
              <div className="flex items-center gap-2.5">
                <img src="/lemcorp-logo.png" alt="LEMCORP" className="h-9 w-9 rounded-lg object-contain" />
                <div className="flex flex-col leading-none">
                  <span className="text-[15px] font-bold tracking-tight text-foreground">LEMCORP</span>
                  <span className="mt-0.5 text-[9px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">Menú</span>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="press flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Info del usuario */}
            <div className="flex items-center gap-3 border-b border-border p-4">
              <div className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full text-[13px] font-bold",
                esAdmin ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {iniciales(nombreUsuario)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold text-foreground">{nombreUsuario}</p>
                <p className="text-[11px] text-muted-foreground">{rolLabel}</p>
              </div>
            </div>

            {/* Lista de navegación */}
            <nav className="flex-1 overflow-y-auto scroll-thin p-3">
              <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Navegación
              </p>
              {navItemsVisibles.map((item, idx) => {
                const active = isActive(item);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "press anim-drawer-item flex items-center gap-3 rounded-xl px-3 py-3 text-[14px] font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                    {active && (
                      <span className="ml-auto h-2 w-2 rounded-full bg-primary" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Pie del drawer */}
            <div className="border-t border-border p-3" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)" }}>
              <button
                onClick={cycleTema}
                className="press flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[14px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <TemaIcon className="h-5 w-5" />
                <span>Tema: {settings.tema}</span>
              </button>
            </div>
          </aside>
        </>
      )}
    </header>
  );
}
