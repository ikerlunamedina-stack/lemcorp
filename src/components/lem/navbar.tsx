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

  const badgeCount = Math.max(0, bajoStock - bajoStockVisto);

  useEffect(() => {
    if (pathname === "/notificaciones" && bajoStock > 0) {
      marcarBajoStockVisto(bajoStock);
    }
  }, [pathname, bajoStock, marcarBajoStockVisto]);

  const miembroActual = sesionUsuarioId
    ? miembros.find((m) => m.id === sesionUsuarioId)
    : null;
  const nombreUsuario = miembroActual?.nombre || settings.usuario || "Iker";
  const rolLabel = miembroActual ? ROL_META[miembroActual.rol].short : "Admin";
  const esAdmin = !miembroActual || miembroActual.rol === "administrador";

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
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-12 max-w-[1400px] items-center gap-1 px-4 lg:px-6">
        {/* Logo minimalista: texto, no imagen llamativa */}
        <Link href="/" className="press flex shrink-0 items-center gap-2.5">
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            LEMCORP
          </span>
          <span className="hidden text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase sm:inline">
            WMS
          </span>
        </Link>

        {/* Nav desktop — texto simple, sin iconos en relleno, activo subrayado */}
        <nav className="mx-auto hidden items-center gap-1 lg:flex">
          {navItemsVisibles.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "press relative flex h-9 items-center px-3 text-[13px] font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>{item.label}</span>
                {active && (
                  <span className="absolute inset-x-3 -bottom-px h-px bg-foreground" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Botón menú móvil */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="press ml-auto flex h-9 w-9 items-center justify-center text-foreground lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" strokeWidth={1.5} />
        </button>

        {/* Zona derecha minimalista */}
        <div className="flex items-center gap-0.5 lg:ml-0 ml-auto lg:ml-0">
          {/* Tema */}
          <button
            onClick={cycleTema}
            title={`Tema: ${settings.tema}`}
            className="press flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <TemaIcon className="h-4 w-4" strokeWidth={1.5} />
          </button>

          {/* Notificaciones */}
          {tienePermiso("ver_notificaciones") && (
            <Link
              href="/notificaciones"
              className="press relative flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <Bell className="h-4 w-4" strokeWidth={1.5} />
              {settings.lowStockAlerts && badgeCount > 0 && (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Link>
          )}

          {/* Config */}
          {tienePermiso("ver_config") && (
            <Link
              href="/config"
              className={cn(
                "press flex h-9 w-9 items-center justify-center transition-colors",
                pathname?.startsWith("/config")
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <SettingsIcon className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          )}

          {/* Avatar — círculo con line-art, sin relleno */}
          <Link
            href="/config"
            className={cn(
              "press ml-1.5 flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
              esAdmin
                ? "border-foreground/30 text-foreground"
                : "border-muted-foreground/30 text-muted-foreground"
            )}
            title={`${nombreUsuario} · ${rolLabel}`}
          >
            {iniciales(nombreUsuario)}
          </Link>
        </div>
      </div>

      {/* Drawer móvil minimalista */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm anim-overlay-in lg:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            className="fixed left-0 top-0 z-[70] flex h-full w-[280px] max-w-[85vw] flex-col border-r border-border bg-background anim-drawer-in lg:hidden"
            style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
              <span className="text-[15px] font-semibold tracking-tight text-foreground">
                LEMCORP
              </span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="press flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-foreground/25 text-[12px] font-semibold text-foreground">
                {iniciales(nombreUsuario)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-foreground">{nombreUsuario}</p>
                <p className="text-[11px] text-muted-foreground">{rolLabel}</p>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto scroll-thin px-2 py-2">
              <p className="mb-1 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Navegación
              </p>
              {navItemsVisibles.map((item) => {
                const active = isActive(item);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "press flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors",
                      active
                        ? "text-foreground bg-muted/50"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                    <span>{item.label}</span>
                    {active && (
                      <span className="ml-auto h-1 w-1 rounded-full bg-foreground" />
                    )}
                  </Link>
                );
              })}
            </nav>

            <div
              className="border-t border-border px-2 py-2"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)" }}
            >
              <button
                onClick={cycleTema}
                className="press flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30"
              >
                <TemaIcon className="h-4 w-4" strokeWidth={1.5} />
                <span>Tema: {settings.tema}</span>
              </button>
            </div>
          </aside>
        </>
      )}
    </header>
  );
}
