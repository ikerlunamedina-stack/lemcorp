"use client";

import { useStore } from "@/lib/store";
import {
  Package, Boxes, AlertTriangle, Cpu, Download,
  TrendingUp, Clock, Sparkles, Hash, StickyNote, Users,
} from "lucide-react";
import { fmtNum } from "@/lib/num";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ESTADO_META, type ActiveView } from "@/lib/types";

export function DashboardView() {
  const products = useStore((s) => s.products) ?? [];
  const equipos = useStore((s) => s.equipos) ?? [];
  const entradas = useStore((s) => s.entradas) ?? [];
  const notas = useStore((s) => s.notas) ?? [];
  const exportInventarioExcel = useStore((s) => s.exportInventarioExcel);
  const setActiveView = useStore((s) => s.setActiveView);

  const go = (v: ActiveView) => () => setActiveView(v);

  const totalUnidades = products.reduce((s, p) => s + p.quantity, 0);
  const bajoStock = products.filter((p) => p.minStock && p.minStock > 0 && p.quantity <= p.minStock);
  const equiposDisponibles = equipos.filter((e) => e.estado === "disponible").length;

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

  const kpis = [
    { label: "Productos", value: products.length, sub: "en catálogo", icon: Package, view: "inventario" as ActiveView, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { label: "Unidades", value: fmtNum(totalUnidades), sub: "en stock", icon: Boxes, view: "inventario" as ActiveView, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
    { label: "Equipos", value: equipos.length, sub: `${equiposDisponibles} disponibles`, icon: Cpu, view: "equipos" as ActiveView, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
    { label: "Alertas", value: bajoStock.length, sub: bajoStock.length === 0 ? "Todo OK" : "bajo stock", icon: AlertTriangle, view: "inventario" as ActiveView, color: bajoStock.length > 0 ? "text-red-600" : "text-gray-400", bg: bajoStock.length > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-gray-50 dark:bg-gray-900/30" },
  ];

  return (
    <div className="px-6 py-6 lg:px-8">
      {/* Header */}
      <div className="anim-fade-up mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground capitalize">{new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <Button onClick={() => exportInventarioExcel()} className="press rounded-xl shadow-md shadow-primary/20">
          <Download className="mr-1.5 h-4 w-4" /> Exportar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <button key={k.label} onClick={go(k.view)}
              className="press-card anim-fade-up group rounded-2xl border border-border bg-card p-5 shadow-sm text-left"
              style={{ animationDelay: `${i * 60}ms` }}>
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110", k.bg)}>
                <Icon className={cn("h-5 w-5", k.color)} />
              </div>
              <p className="mt-4 text-3xl font-bold tabular-nums tracking-tight anim-count-up">{k.value}</p>
              <p className="text-sm font-semibold">{k.label}</p>
              <p className="text-xs text-muted-foreground">{k.sub}</p>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Col izquierda */}
        <div className="space-y-6 lg:col-span-2">
          {/* Productos con menos stock */}
          <div className="anim-fade-up rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-amber-500" />Productos con menor stock</h2>
              <button onClick={go("inventario")} className="text-xs font-medium text-primary hover:underline">Ver todo →</button>
            </div>
            <div className="space-y-3">
              {topBajoStock.map((p, i) => {
                const pct = p.minStock ? Math.min(100, (p.quantity / Math.max(p.minStock * 2, 1)) * 100) : 100;
                const bajo = p.minStock && p.minStock > 0 && p.quantity <= p.minStock;
                return (
                  <div key={p.id} className="anim-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-muted-foreground">{p.sku}</span>
                        <span className="font-medium">{p.name}</span>
                      </span>
                      <span className={cn("font-bold tabular-nums", bajo ? "text-red-600" : "text-foreground")}>{fmtNum(p.quantity)} {p.udm ?? ""}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full anim-bar-grow", bajo ? "bg-red-500" : pct < 50 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${pct}%`, animationDelay: `${i * 100}ms` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Entradas recientes */}
          <div className="anim-fade-up rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4 text-muted-foreground" />Entradas recientes</h2>
              <button onClick={go("inventario")} className="text-xs font-medium text-primary hover:underline">Ver todo →</button>
            </div>
            {entradas.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No hay entradas registradas.</p>
            ) : (
              <div className="space-y-2">
                {entradas.slice(0, 5).map((e, i) => (
                  <div key={e.id} className="anim-fade-up flex items-center gap-3 rounded-xl border border-border/50 p-3 hover:bg-accent/30 transition-colors" style={{ animationDelay: `${i * 40}ms` }}>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-600 dark:bg-emerald-950/30">+{e.cantidad}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.producto}</p>
                      <p className="font-mono text-xs text-muted-foreground">{e.sku}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(e.fecha).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit" })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Col derecha */}
        <div className="space-y-6">
          {/* Equipos por estado */}
          {equipos.length > 0 && (
            <div className="anim-fade-up rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold"><Cpu className="h-4 w-4 text-muted-foreground" />Equipos por estado</h2>
                <button onClick={go("equipos")} className="text-xs font-medium text-primary hover:underline">Ver →</button>
              </div>
              <div className="space-y-3">
                {(Object.keys(ESTADO_META) as (keyof typeof ESTADO_META)[]).map((est, i) => {
                  const n = equipos.filter((e) => e.estado === est).length;
                  const meta = ESTADO_META[est];
                  const pct = equipos.length > 0 ? (n / equipos.length) * 100 : 0;
                  return (
                    <div key={est} className="anim-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className={cn("flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold",
                            (est === "averiado" || est === "en_retiro") ? "bg-red-50 text-red-600 dark:bg-red-950/30" : est === "disponible" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30" : "bg-amber-50 text-amber-600 dark:bg-amber-950/30")}>
                            {meta.icon}
                          </span>
                          {meta.label}
                        </span>
                        <span className="font-bold tabular-nums">{n}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full anim-bar-grow", (est === "averiado" || est === "en_retiro") ? "bg-red-500" : est === "disponible" ? "bg-emerald-500" : "bg-amber-500")} style={{ width: `${pct}%`, animationDelay: `${i * 80}ms` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock por unidad */}
          {categorias.length > 0 && (
            <div className="anim-fade-up rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><TrendingUp className="h-4 w-4 text-muted-foreground" />Stock por unidad</h2>
              <div className="space-y-3">
                {categorias.map(([cat, qty], i) => {
                  const pct = (qty / maxCat) * 100;
                  return (
                    <div key={cat} className="anim-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{cat}</span>
                        <span className="tabular-nums text-muted-foreground">{fmtNum(qty)}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary anim-bar-grow" style={{ width: `${pct}%`, animationDelay: `${i * 80}ms` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Accesos rápidos */}
          <div className="anim-fade-up rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold">Accesos rápidos</h2>
            <div className="grid grid-cols-2 gap-2">
              <QuickLink onClick={go("ia")} icon={Sparkles} label="Asistente IA" color="text-violet-600" bg="bg-violet-50 dark:bg-violet-950/30" />
              <QuickLink onClick={go("series")} icon={Hash} label="Series" color="text-blue-600" bg="bg-blue-50 dark:bg-blue-950/30" />
              <QuickLink onClick={go("bloc")} icon={StickyNote} label="Bloc" color="text-amber-600" bg="bg-amber-50 dark:bg-amber-950/30" />
              <QuickLink onClick={go("empresa")} icon={Users} label="Empresas" color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-950/30" />
            </div>
          </div>

          {/* Notas fijadas */}
          {notas.filter((n) => n.pinned).length > 0 && (
            <div className="anim-fade-up rounded-2xl border border-amber-200/50 bg-amber-50/50 p-5 dark:bg-amber-950/10">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
                <StickyNote className="h-4 w-4" />Notas fijadas
              </h2>
              <div className="space-y-2">
                {notas.filter((n) => n.pinned).slice(0, 3).map((n) => (
                  <div key={n.id} className="rounded-xl border border-amber-200/30 bg-white/60 p-3 text-xs leading-relaxed dark:bg-white/5">{n.texto}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickLink({ onClick, icon: Icon, label, color, bg }: { onClick: () => void; icon: any; label: string; color: string; bg: string }) {
  return (
    <button onClick={onClick} className="press-card group flex flex-col items-center gap-2 rounded-xl border border-border p-3 hover:border-primary/30">
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-110", bg)}>
        <Icon className={cn("h-4 w-4", color)} />
      </span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
