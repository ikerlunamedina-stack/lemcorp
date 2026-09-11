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
  ChevronDown,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ROL_META, type Permiso, type Tema } from "@/lib/types";
import { RmpLogo } from "@/components/lem/rmp-logo";

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

// Categorías para el navbar desplegable
const NAV_CATEGORIES = [
  {
    label: "Inicio",
    items: NAV_ITEMS.filter(i => i.href === "/"),
  },
  {
    label: "Almacén",
    items: NAV_ITEMS.filter(i => ["/inventario", "/equipos", "/series", "/pistolear"].includes(i.href)),
  },
  {
    label: "Operaciones",
    items: NAV_ITEMS.filter(i => ["/despachos", "/horario"].includes(i.href)),
  },
  {
    label: "Herramientas",
    items: NAV_ITEMS.filter(i => ["/ia", "/bloc", "/empresa"].includes(i.href)),
  },
  {
    label: "Sistema",
    items: NAV_ITEMS.filter(i => i.href === "/config"),
  },
];

// Items directos en la barra (sin desplegable)
const NAV_DIRECT = NAV_ITEMS.filter(i => i.href === "/");

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
  const empresa = useStore((s) => s.empresa);

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
    <>
    <header
      className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-xl shadow-sm"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="flex h-12 items-center gap-1 px-4 lg:px-6">
        {/* Logo RMP + nombre */}
        <Link href="/" className="press flex shrink-0 items-center gap-2">
          <RmpLogo size={22} className="text-foreground" />
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            RMP
          </span>
        </Link>

        {/* Nav desktop — Dashboard directo + categorías desplegables */}
        <nav className="mx-auto hidden items-center gap-1 lg:flex">
          {/* Dashboard directo */}
          {NAV_DIRECT.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "press relative flex h-9 items-center px-3 text-[13px] font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
                {active && <span className="absolute inset-x-3 -bottom-px h-px bg-foreground" />}
              </Link>
            );
          })}
          {/* Categorías desplegables */}
          {NAV_CATEGORIES.filter(c => c.label !== "Inicio").map((cat) => {
            const visibleItems = cat.items.filter(i => tienePermiso(i.permiso));
            if (visibleItems.length === 0) return null;
            const hasActive = visibleItems.some(i => isActive(i));
            return (
              <div key={cat.label} className="group relative">
                <button
                  className={cn(
                    "press relative flex h-9 items-center gap-1 px-3 text-[13px] font-medium transition-colors",
                    hasActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cat.label}
                  <ChevronDown className="h-3 w-3 opacity-50 transition-transform group-hover:opacity-100 group-hover:rotate-180" strokeWidth={1.5} />
                  {hasActive && (
                    <span className="absolute inset-x-3 -bottom-px h-px bg-foreground" />
                  )}
                </button>
                {/* Dropdown */}
                <div className="invisible absolute left-0 top-full z-50 min-w-[200px] pt-1 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 translate-y-1">
                  <div className="overflow-hidden rounded-xl bg-card shadow-lg ring-1 ring-border/50">
                    {visibleItems.map((item) => {
                      const active = isActive(item);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center px-3 py-2.5 text-[13px] font-medium transition-colors",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Zona derecha — siempre visible, alineada a la derecha */}
        <div className="ml-auto flex items-center gap-1">
          {/* Nombre de la empresa */}
          {empresa?.nombre && (
            <span className="hidden text-[12px] font-semibold tracking-tight text-foreground sm:inline">
              {empresa.nombre}
            </span>
          )}
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
              "press ml-1 flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
              esAdmin
                ? "border-foreground/30 text-foreground"
                : "border-muted-foreground/30 text-muted-foreground"
            )}
            title={`${nombreUsuario} · ${rolLabel}`}
          >
            {iniciales(nombreUsuario)}
          </Link>

          {/* Botón menú móvil — al final, solo visible en móvil */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="press ml-1 flex h-9 w-9 items-center justify-center text-foreground lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </header>

      {/* Drawer móvil minimalista — fuera del header para z-index correcto */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm anim-overlay-in lg:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            className="fixed left-0 top-0 z-[100] flex h-full w-[300px] max-w-[85vw] flex-col border-r border-border bg-card shadow-2xl anim-drawer-in lg:hidden"
            style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
              <div className="flex items-center gap-2">
                <RmpLogo size={20} className="text-foreground" />
                <span className="text-[15px] font-semibold tracking-tight text-foreground">
                  RMP
                </span>
              </div>
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
    </>
  );
}
