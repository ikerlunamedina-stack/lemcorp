"use client";

import { useStore } from "@/lib/store";
import {
  Package, Boxes, AlertTriangle, Cpu, Download, TrendingUp, Clock,
  Sparkles, Hash, StickyNote, Users, ArrowRight, Check, X, Undo2, Wrench,
} from "lucide-react";
import { fmtNum } from "@/lib/num";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ESTADO_META, type ActiveView, type EstadoEquipo } from "@/lib/types";
import {
  fmtFechaCortaLima, fmtHoraLima, fmtDiaSemanaLima,
  esMismoDiaLima, tiempoRelativoLima,
} from "@/lib/lima-time";

const ESTADO_ICONS = { check: Check, x: X, undo: Undo2, wrench: Wrench } as const;

export function DashboardView() {
  const products = useStore((s) => s.products) ?? [];
  const equipos = useStore((s) => s.equipos) ?? [];
  const entradas = useStore((s) => s.entradas) ?? [];
  const notas = useStore((s) => s.notas) ?? [];
  const miembros = useStore((s) => s.miembros) ?? [];
  const exportInventarioExcel = useStore((s) => s.exportInventarioExcel);
  const setActiveView = useStore((s) => s.setActiveView);
  const despachos = useStore((s) => s.despachos) ?? [];

  const go = (v: ActiveView) => () => setActiveView(v);

  const totalUnidades = products.reduce((s, p) => s + p.quantity, 0);
  const bajoStock = products.filter((p) => p.minStock && p.minStock > 0 && p.quantity <= p.minStock);
  const equiposDisponibles = equipos.filter((e) => e.estado === "disponible").length;
  const numTecnicos = miembros.filter((m) => m.rol === "tecnico").length;

  const catMap: Record<string, number> = {};
  for (const p of products) {
    const k = p.udm ?? "Sin UDM";
    catMap[k] = (catMap[k] ?? 0) + p.quantity;
  }
  const categorias = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxCat = categorias[0]?.[1] ?? 1;

  const topBajoStock = [...products].sort((a, b) => {
    const aPct = a.minStock ? a.quantity / a.minStock : 999;
    const bPct = b.minStock ? b.quantity / b.minStock : 999;
    return aPct - bPct;
  }).slice(0, 5);

  const estadoBarColor = (est: EstadoEquipo) => {
    const t = ESTADO_META[est].tone;
    return t === "danger" ? "bg-red-500"
      : t === "warn" ? "bg-amber-500"
      : t === "ok" ? "bg-emerald-500"
      : "bg-primary";
  };

  const kpis = [
    { label: "Productos", value: products.length, sub: "en catálogo", icon: Package, view: "inventario" as ActiveView },
    { label: "Unidades", value: fmtNum(totalUnidades), sub: "en stock", icon: Boxes, view: "inventario" as ActiveView },
    { label: "Equipos", value: equipos.length, sub: `${equiposDisponibles} disponibles`, icon: Cpu, view: "equipos" as ActiveView },
    { label: "Alertas", value: bajoStock.length, sub: bajoStock.length === 0 ? "Todo OK" : "bajo stock", icon: AlertTriangle, view: "inventario" as ActiveView },
  ];

  return (
    <div className="px-6 py-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground capitalize">
            {new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima", weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <Button onClick={() => exportInventarioExcel()} className="press btn-spacecom rounded-lg">
          <Download className="mr-1.5 h-4 w-4" /> Exportar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <button key={k.label} onClick={go(k.view)}
              className="anim-fade-up group rounded-lg border border-border bg-card p-4 text-left shadow-sm transition-transform hover:-translate-y-0.5"
              style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-5 w-5 text-foreground" />
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums text-foreground">{k.value}</p>
              <p className="text-sm font-semibold text-foreground">{k.label}</p>
              <p className="text-xs text-muted-foreground">{k.sub}</p>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Col izquierda */}
        <div className="space-y-4 lg:col-span-2">
          {/* Productos con menor stock */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">Productos con menor stock</h2>
              <button onClick={go("inventario")} className="text-xs font-medium text-primary hover:underline">Ver todo →</button>
            </div>
            <div className="space-y-2">
              {topBajoStock.map((p, i) => {
                const pct = p.minStock ? Math.min(100, (p.quantity / Math.max(p.minStock * 2, 1)) * 100) : 100;
                const bajo = p.minStock && p.minStock > 0 && p.quantity <= p.minStock;
                return (
                  <div key={p.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="truncate font-medium text-foreground">{p.name}</span>
                      <span className="font-bold tabular-nums text-foreground">{fmtNum(p.quantity)}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full", bajo ? "bg-red-500" : pct < 50 ? "bg-amber-500" : "bg-primary")} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Entradas recientes */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">Entradas recientes</h2>
              <button onClick={go("inventario")} className="text-xs font-medium text-primary hover:underline">Ver →</button>
            </div>
            <div className="space-y-1.5">
              {entradas.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">No hay entradas registradas</p>
              ) : (
                entradas.slice(0, 5).map((e) => (
                  <div key={e.id} className="flex items-center gap-3 rounded-md border border-border/40 p-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-xs font-bold text-foreground">+{e.cantidad}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">{e.producto}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{e.sku}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{new Date(e.fecha).toLocaleDateString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit" })}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Col derecha */}
        <div className="space-y-4">
          {/* Equipos por estado */}
          {equipos.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground">Equipos por estado</h2>
                <button onClick={go("equipos")} className="text-xs font-medium text-primary hover:underline">Ver →</button>
              </div>
              <div className="space-y-2">
                {(Object.keys(ESTADO_META) as EstadoEquipo[]).map((est) => {
                  const n = equipos.filter((e) => e.estado === est).length;
                  const meta = ESTADO_META[est];
                  const pct = equipos.length > 0 ? (n / equipos.length) * 100 : 0;
                  const IE = ESTADO_ICONS[meta.icon];
                  return (
                    <div key={est}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">{meta.label}</span>
                        <span className="font-bold tabular-nums text-foreground">{n}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full", estadoBarColor(est))} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Accesos rápidos */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-foreground">Accesos rápidos</h2>
            <div className="grid grid-cols-2 gap-2">
              <QuickLink onClick={go("ia")} icon={Sparkles} label="Asistente IA" />
              <QuickLink onClick={go("series")} icon={Hash} label="Series" />
              <QuickLink onClick={go("bloc")} icon={StickyNote} label="Bloc" />
              <QuickLink onClick={go("empresa")} icon={Users} label="Empresas" />
            </div>
          </div>

          {/* Notas fijadas */}
          {notas.filter((n) => n.pinned).length > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h2 className="mb-2 text-sm font-bold text-foreground">Notas fijadas</h2>
              <div className="space-y-1.5">
                {notas.filter((n) => n.pinned).slice(0, 3).map((n) => (
                  <div key={n.id} className="rounded-md border border-border/40 bg-card p-2 text-xs text-foreground">{n.texto}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickLink({ onClick, icon: Icon, label }: { onClick: () => void; icon: any; label: string }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-3 transition-transform hover:-translate-y-0.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-foreground" />
      </span>
      <span className="text-xs font-medium text-foreground">{label}</span>
    </button>
  );
}
