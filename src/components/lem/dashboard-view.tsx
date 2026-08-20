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
    { label: "Productos", value: products.length, sub: "en catálogo", icon: Package, view: "inventario" as ActiveView, grad: "kpi-gradient-blue", color: "text-blue-600 dark:text-blue-400", iconBg: "from-blue-500/20 to-blue-500/5" },
    { label: "Unidades", value: fmtNum(totalUnidades), sub: "en stock", icon: Boxes, view: "inventario" as ActiveView, grad: "kpi-gradient-emerald", color: "text-emerald-600 dark:text-emerald-400", iconBg: "from-emerald-500/20 to-emerald-500/5" },
    { label: "Equipos", value: equipos.length, sub: `${equiposDisponibles} disponibles`, icon: Cpu, view: "equipos" as ActiveView, grad: "kpi-gradient-violet", color: "text-violet-600 dark:text-violet-400", iconBg: "from-violet-500/20 to-violet-500/5" },
    { label: "Alertas", value: bajoStock.length, sub: bajoStock.length === 0 ? "Todo OK" : "bajo stock", icon: AlertTriangle, view: "inventario" as ActiveView, grad: "kpi-gradient-red", color: bajoStock.length > 0 ? "text-red-600 dark:text-red-400" : "text-gray-400", iconBg: bajoStock.length > 0 ? "from-red-500/20 to-red-500/5" : "from-gray-500/20 to-gray-500/5" },
  ];

  return (
    <div className="px-6 py-6 lg:px-8">
      {/* Header */}
      <div className="anim-fade-up mb-6 flex items-center justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground capitalize">
            {new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <Button onClick={() => exportInventarioExcel()} className="press rounded-xl bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all">
          <Download className="mr-1.5 h-4 w-4" /> Exportar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <button key={k.label} onClick={go(k.view)}
              className={cn(
                "press-card glow-border anim-fade-up group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 text-left shadow-md",
                k.grad
              )}
              style={{ animationDelay: `${i * 80}ms` }}>
              {/* Glow decorativo */}
              <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-30 blur-2xl transition-opacity group-hover:opacity-50" style={{ backgroundImage: "var(--tw-gradient)" }} />
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3", k.iconBg)}>
                <Icon className={cn("h-6 w-6", k.color)} />
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
          <div className="press-card anim-fade-up glow-border overflow-hidden rounded-2xl border border-border/60 bg-card shadow-md">
            <div className="flex items-center justify-between border-b border-border/40 bg-gradient-to-r from-amber-500/5 to-transparent px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </span>
                Productos con menor stock
              </h2>
              <button onClick={go("inventario")} className="text-xs font-semibold text-primary transition-all hover:gap-2 hover:underline">Ver todo →</button>
            </div>
            <div className="space-y-3 p-5">
              {topBajoStock.map((p, i) => {
                const pct = p.minStock ? Math.min(100, (p.quantity / Math.max(p.minStock * 2, 1)) * 100) : 100;
                const bajo = p.minStock && p.minStock > 0 && p.quantity <= p.minStock;
                return (
                  <div key={p.id} className="anim-fade-up group rounded-xl p-2 transition-colors hover:bg-accent/40" style={{ animationDelay: `${i * 80}ms` }}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] font-bold text-muted-foreground">{p.sku}</span>
                        <span className="font-medium">{p.name}</span>
                      </span>
                      <span className={cn("font-bold tabular-nums transition-transform group-hover:scale-110", bajo ? "text-red-600 dark:text-red-400" : "text-foreground")}>{fmtNum(p.quantity)} <span className="text-[10px] font-normal text-muted-foreground">{p.udm ?? ""}</span></span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full anim-bar-grow shadow-sm", bajo ? "bg-gradient-to-r from-red-500 to-red-400" : pct < 50 ? "bg-gradient-to-r from-amber-500 to-amber-400" : "bg-gradient-to-r from-emerald-500 to-emerald-400")} style={{ width: `${pct}%`, animationDelay: `${i * 120}ms` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Entradas recientes */}
          <div className="press-card anim-fade-up glow-border overflow-hidden rounded-2xl border border-border/60 bg-card shadow-md">
            <div className="flex items-center justify-between border-b border-border/40 bg-gradient-to-r from-emerald-500/5 to-transparent px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15">
                  <Clock className="h-4 w-4 text-emerald-500" />
                </span>
                Entradas recientes
              </h2>
              <button onClick={go("inventario")} className="text-xs font-semibold text-primary transition-all hover:gap-2 hover:underline">Ver todo →</button>
            </div>
            {entradas.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No hay entradas registradas.</p>
            ) : (
              <div className="space-y-2 p-5">
                {entradas.slice(0, 5).map((e, i) => (
                  <div key={e.id} className="anim-fade-up group flex items-center gap-3 rounded-xl border border-border/40 p-3 transition-all hover:border-emerald-500/30 hover:bg-emerald-500/5" style={{ animationDelay: `${i * 70}ms` }}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 text-xs font-bold text-emerald-600 dark:text-emerald-400">+{e.cantidad}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.producto}</p>
                      <p className="font-mono text-xs text-muted-foreground">{e.sku}</p>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{new Date(e.fecha).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit" })}</span>
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
            <div className="press-card anim-fade-up glow-border overflow-hidden rounded-2xl border border-border/60 bg-card shadow-md">
              <div className="flex items-center justify-between border-b border-border/40 bg-gradient-to-r from-violet-500/5 to-transparent px-5 py-4">
                <h2 className="flex items-center gap-2 text-sm font-bold">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15">
                    <Cpu className="h-4 w-4 text-violet-500" />
                  </span>
                  Equipos por estado
                </h2>
                <button onClick={go("equipos")} className="text-xs font-semibold text-primary transition-all hover:gap-2 hover:underline">Ver →</button>
              </div>
              <div className="space-y-3 p-5">
                {(Object.keys(ESTADO_META) as (keyof typeof ESTADO_META)[]).map((est, i) => {
                  const n = equipos.filter((e) => e.estado === est).length;
                  const meta = ESTADO_META[est];
                  const pct = equipos.length > 0 ? (n / equipos.length) * 100 : 0;
                  return (
                    <div key={est} className="anim-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className={cn("flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-bold",
                            (est === "averiado" || est === "en_retiro") ? "bg-red-500/15 text-red-500" : est === "disponible" ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500")}>
                            {meta.icon}
                          </span>
                          <span className="font-medium">{meta.label}</span>
                        </span>
                        <span className="font-bold tabular-nums">{n}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full anim-bar-grow", (est === "averiado" || est === "en_retiro") ? "bg-gradient-to-r from-red-500 to-red-400" : est === "disponible" ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-gradient-to-r from-amber-500 to-amber-400")} style={{ width: `${pct}%`, animationDelay: `${i * 100}ms` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock por unidad */}
          {categorias.length > 0 && (
            <div className="press-card anim-fade-up glow-border overflow-hidden rounded-2xl border border-border/60 bg-card shadow-md">
              <div className="flex items-center justify-between border-b border-border/40 bg-gradient-to-r from-blue-500/5 to-transparent px-5 py-4">
                <h2 className="flex items-center gap-2 text-sm font-bold">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                  </span>
                  Stock por unidad
                </h2>
              </div>
              <div className="space-y-3 p-5">
                {categorias.map(([cat, qty], i) => {
                  const pct = (qty / maxCat) * 100;
                  return (
                    <div key={cat} className="anim-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-medium">{cat}</span>
                        <span className="tabular-nums text-muted-foreground">{fmtNum(qty)}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 anim-bar-grow shadow-sm" style={{ width: `${pct}%`, animationDelay: `${i * 100}ms` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Accesos rápidos */}
          <div className="press-card anim-fade-up glow-border overflow-hidden rounded-2xl border border-border/60 bg-card shadow-md">
            <div className="border-b border-border/40 bg-gradient-to-r from-foreground/5 to-transparent px-5 py-4">
              <h2 className="text-sm font-bold">Accesos rápidos</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4">
              <QuickLink onClick={go("ia")} icon={Sparkles} label="Asistente IA" color="text-violet-600 dark:text-violet-400" bg="from-violet-500/15 to-violet-500/5" />
              <QuickLink onClick={go("series")} icon={Hash} label="Series" color="text-blue-600 dark:text-blue-400" bg="from-blue-500/15 to-blue-500/5" />
              <QuickLink onClick={go("bloc")} icon={StickyNote} label="Bloc" color="text-amber-600 dark:text-amber-400" bg="from-amber-500/15 to-amber-500/5" />
              <QuickLink onClick={go("empresa")} icon={Users} label="Empresas" color="text-emerald-600 dark:text-emerald-400" bg="from-emerald-500/15 to-emerald-500/5" />
            </div>
          </div>

          {/* Notas fijadas */}
          {notas.filter((n) => n.pinned).length > 0 && (
            <div className="press-card anim-fade-up overflow-hidden rounded-2xl border border-amber-200/50 bg-gradient-to-br from-amber-50 to-amber-50/30 p-5 shadow-md dark:from-amber-950/20 dark:to-amber-950/5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-400">
                <StickyNote className="h-4 w-4" />Notas fijadas
              </h2>
              <div className="space-y-2">
                {notas.filter((n) => n.pinned).slice(0, 3).map((n) => (
                  <div key={n.id} className="rounded-xl border border-amber-200/30 bg-white/70 p-3 text-xs leading-relaxed shadow-sm dark:bg-white/5">{n.texto}</div>
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
    <button onClick={onClick} className={cn("press-card group flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-gradient-to-br p-3 transition-all hover:border-primary/30", bg)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/60 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 dark:bg-white/10">
        <Icon className={cn("h-4 w-4", color)} />
      </span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
