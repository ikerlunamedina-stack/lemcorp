"use client";

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import {
  Package, Boxes, AlertTriangle, Cpu, Download,
  TrendingUp, Clock, Users, ArrowRight, DollarSign,
  Activity, Calendar, Warehouse, UserCheck, BarChart3,
} from "lucide-react";
import { fmtNum } from "@/lib/num";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ESTADO_META, type ActiveView, type EstadoEquipo } from "@/lib/types";

const VIEW_PATH: Record<ActiveView, string> = {
  dashboard: "/", inventario: "/inventario", despachos: "/despachos",
  equipos: "/equipos", series: "/series", pistolear: "/pistolear",
  horario: "/horario", bloc: "/bloc", ia: "/ia", empresa: "/empresa",
  notificaciones: "/notificaciones", config: "/config",
};

function fmtSoles(n: number): string {
  return "S/ " + n.toLocaleString("es-PE", { maximumFractionDigits: 0 });
}

function useCountUp(target: number, duration = 800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(start + (target - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

function StatCard({ label, value, sub, icon: Icon, tone, onClick }: {
  label: string; value: string; sub?: string;
  icon: typeof Package; tone: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="press-card anim-slide-up group rounded-2xl bg-card p-5 text-left shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", tone)}>
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={1.5} />
      </div>
      <p className="text-[28px] font-bold tabular-nums tracking-tight text-foreground">{value}</p>
      <p className="mt-0.5 text-[12px] font-medium text-foreground">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </button>
  );
}

export function DashboardView() {
  const products = useStore((s) => s.products) ?? [];
  const equipos = useStore((s) => s.equipos) ?? [];
  const entradas = useStore((s) => s.entradas) ?? [];
  const despachos = useStore((s) => s.despachos) ?? [];
  const notas = useStore((s) => s.notas) ?? [];
  const miembros = useStore((s) => s.miembros) ?? [];
  const horario = useStore((s) => s.horario) ?? [];
  const exportInventarioExcel = useStore((s) => s.exportInventarioExcel);
  const router = useRouter();
  const go = (v: ActiveView) => () => router.push(VIEW_PATH[v]);

  const stats = useMemo(() => {
    const totalUnidades = products.reduce((s, p) => s + p.quantity, 0);
    const valorTotal = products.reduce((s, p) => s + (p.precio || 0) * p.quantity, 0);
    const bajoStock = products.filter((p) => p.minStock && p.minStock > 0 && p.quantity <= p.minStock);
    const agotados = products.filter((p) => p.quantity === 0);

    // Valor por categoría
    const catMap: Record<string, { valor: number; cantidad: number }> = {};
    for (const p of products) {
      const k = p.categoria || "Sin categoría";
      if (!catMap[k]) catMap[k] = { valor: 0, cantidad: 0 };
      catMap[k].valor += (p.precio || 0) * p.quantity;
      catMap[k].cantidad += p.quantity;
    }
    const categorias = Object.entries(catMap).sort((a, b) => b[1].valor - a[1].valor).slice(0, 5);
    const maxCatVal = categorias[0]?.[1].valor ?? 1;

    // Despachos por técnico
    const tecMap: Record<string, { count: number; total: number }> = {};
    for (const d of despachos) {
      const t = d.tecnico || d.destino || "Sin asignar";
      if (!tecMap[t]) tecMap[t] = { count: 0, total: 0 };
      tecMap[t].count++;
      tecMap[t].total += d.cantidad;
    }
    const topTecnicos = Object.entries(tecMap).sort((a, b) => b[1].total - a[1].total).slice(0, 5);

    // Equipos por estado
    const eqEstado = {
      disponible: equipos.filter((e) => e.estado === "disponible").length,
      averiado: equipos.filter((e) => e.estado === "averiado").length,
      en_retiro: equipos.filter((e) => e.estado === "en_retiro").length,
      en_reparacion: equipos.filter((e) => e.estado === "en_reparacion").length,
    };

    // Despachos de hoy
    const hoy = despachos.filter(d => {
      try { return new Date(d.fecha).toDateString() === new Date().toDateString(); }
      catch { return false; }
    }).length;

    // Antigüedad de stock (basado en updatedAt)
    const ahora = Date.now();
    const antiguedad = { "0-45d": 0, "46-90d": 0, "91-360d": 0, "+360d": 0, "Sin fecha": 0 };
    for (const p of products) {
      const dias = Math.floor((ahora - (p.updatedAt || p.createdAt)) / 86400000);
      if (!p.updatedAt && !p.createdAt) antiguedad["Sin fecha"]++;
      else if (dias <= 45) antiguedad["0-45d"]++;
      else if (dias <= 90) antiguedad["46-90d"]++;
      else if (dias <= 360) antiguedad["91-360d"]++;
      else antiguedad["+360d"]++;
    }
    const totalProd = products.length || 1;

    // Clasificación ABC (por valor)
    const sortedByVal = [...products].sort((a, b) =>
      ((b.precio || 0) * b.quantity) - ((a.precio || 0) * a.quantity)
    );
    const valTotal = sortedByVal.reduce((s, p) => s + (p.precio || 0) * p.quantity, 0) || 1;
    let acum = 0;
    let claseA = 0, claseB = 0, claseC = 0;
    for (const p of sortedByVal) {
      acum += (p.precio || 0) * p.quantity;
      const pct = acum / valTotal;
      if (pct <= 0.7) claseA++;
      else if (pct <= 0.9) claseB++;
      else claseC++;
    }

    // Tasa de devolución (entradas que son devoluciones vs despachos)
    const tasaDev = despachos.length > 0
      ? Math.round((entradas.length / (despachos.length + entradas.length)) * 100 * 10) / 10
      : 0;

    // Programación de hoy (horario)
    const dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
    const diaHoy = dias[new Date().getDay()];
    const horarioHoy = horario.filter(h => h.dia === diaHoy).length;

    // Horas de operación
    const horaStr = new Date().toLocaleTimeString("es-PE", {
      timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false
    });

    // Saludo
    const limaHour = parseInt(new Date().toLocaleTimeString("en-US",
      { timeZone: "America/Lima", hour: "2-digit", hour12: false }), 10);
    const saludo = limaHour < 12 ? "Buenos días" : limaHour < 19 ? "Buenas tardes" : "Buenas noches";

    return {
      totalUnidades, valorTotal, bajoStock, agotados,
      categorias, maxCatVal, topTecnicos, eqEstado, hoy,
      antiguedad, totalProd, claseA, claseB, claseC, tasaDev,
      horarioHoy, horaStr, saludo,
    };
  }, [products, equipos, despachos, entradas, horario]);

  const c = useCountUp(stats.valorTotal);
  const u = useCountUp(stats.totalUnidades);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-10">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {stats.horaStr} · {new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima", weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight text-foreground sm:text-[32px]">
            {stats.saludo}, Iker
          </h1>
        </div>
        <Button
          onClick={() => exportInventarioExcel()}
          variant="outline"
          className="press h-9 rounded-lg border-border bg-card px-3 text-[13px] font-medium shadow-sm hover:bg-muted"
        >
          <Download className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Exportar
        </Button>
      </div>

      {/* KPIs principales con animación */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Valor Stock"
          value={fmtSoles(c)}
          sub={`${products.length} productos`}
          icon={DollarSign}
          tone="bg-primary/10 text-primary"
          onClick={go("inventario")}
        />
        <StatCard
          label="Unidades"
          value={fmtNum(u)}
          sub="en stock total"
          icon={Boxes}
          tone="bg-emerald-500/10 text-emerald-500"
          onClick={go("inventario")}
        />
        <StatCard
          label="Equipos"
          value={fmtNum(equipos.length)}
          sub={`${stats.eqEstado.disponible} disponibles`}
          icon={Cpu}
          tone="bg-violet-500/10 text-violet-500"
          onClick={go("equipos")}
        />
        <StatCard
          label="Alertas"
          value={String(stats.bajoStock.length)}
          sub={`${stats.agotados.length} agotados`}
          icon={AlertTriangle}
          tone="bg-amber-500/10 text-amber-500"
          onClick={go("inventario")}
        />
      </div>

      {/* Segunda fila de KPIs */}
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Despachos Hoy"
          value={String(stats.hoy)}
          sub={`${despachos.length} totales`}
          icon={TrendingUp}
          tone="bg-blue-500/10 text-blue-500"
          onClick={go("despachos")}
        />
        <StatCard
          label="Entradas"
          value={String(entradas.length)}
          sub="registradas"
          icon={Package}
          tone="bg-cyan-500/10 text-cyan-500"
          onClick={go("inventario")}
        />
        <StatCard
          label="Tasa Devolución"
          value={`${stats.tasaDev}%`}
          sub="entradas vs salidas"
          icon={Activity}
          tone="bg-orange-500/10 text-orange-500"
        />
        <StatCard
          label="Personal"
          value={String(miembros.length)}
          sub={`${notas.length} notas`}
          icon={Users}
          tone="bg-pink-500/10 text-pink-500"
          onClick={go("empresa")}
        />
      </div>

      {/* Grid principal */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Col izquierda */}
        <div className="space-y-4 lg:col-span-2">
          {/* Top Contratistas / Técnicos */}
          <section className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
                <UserCheck className="h-4 w-4 text-primary" strokeWidth={1.5} />
                Top Técnicos (Despachos)
              </h2>
              <button onClick={go("despachos")} className="press flex items-center gap-1 text-[12px] font-medium text-primary hover:text-primary/80">
                Ver todo <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
              </button>
            </div>
            {stats.topTecnicos.length === 0 ? (
              <p className="py-4 text-[13px] text-muted-foreground">Sin despachos registrados</p>
            ) : (
              <div className="space-y-3">
                {stats.topTecnicos.map(([tecnico, data], i) => {
                  const maxTotal = stats.topTecnicos[0]?.[1].total ?? 1;
                  const pct = (data.total / maxTotal) * 100;
                  return (
                    <div key={tecnico}>
                      <div className="mb-1 flex items-baseline justify-between">
                        <span className="truncate text-[13px] font-medium text-foreground">
                          {i + 1}. {tecnico.length > 35 ? tecnico.slice(0, 35) + "…" : tecnico}
                        </span>
                        <span className="ml-2 shrink-0 text-[12px] font-bold tabular-nums text-foreground">
                          {data.total} und · {data.count} desp.
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="anim-draw-in h-full rounded-full bg-primary/60"
                          style={{ width: `${pct}%`, transformOrigin: "left" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Clasificación ABC */}
          <section className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-foreground">
              <BarChart3 className="h-4 w-4 text-primary" strokeWidth={1.5} />
              Clasificación ABC
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-primary/10 p-4 text-center">
                <p className="text-[24px] font-bold tabular-nums text-primary">{stats.claseA}</p>
                <p className="text-[11px] font-medium uppercase tracking-wide text-primary/70">Clase A</p>
                <p className="mt-1 text-[10px] text-muted-foreground">70% del valor</p>
              </div>
              <div className="rounded-xl bg-amber-500/10 p-4 text-center">
                <p className="text-[24px] font-bold tabular-nums text-amber-500">{stats.claseB}</p>
                <p className="text-[11px] font-medium uppercase tracking-wide text-amber-500/70">Clase B</p>
                <p className="mt-1 text-[10px] text-muted-foreground">20% del valor</p>
              </div>
              <div className="rounded-xl bg-muted p-4 text-center">
                <p className="text-[24px] font-bold tabular-nums text-muted-foreground">{stats.claseC}</p>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">Clase C</p>
                <p className="mt-1 text-[10px] text-muted-foreground">10% del valor</p>
              </div>
            </div>
          </section>

          {/* Antigüedad de Stock */}
          <section className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-foreground">
              <Clock className="h-4 w-4 text-primary" strokeWidth={1.5} />
              Antigüedad de Stock
            </h2>
            <div className="space-y-2.5">
              {[
                { label: "0-45 días", val: stats.antiguedad["0-45d"], tone: "bg-emerald-500" },
                { label: "46-90 días", val: stats.antiguedad["46-90d"], tone: "bg-blue-500" },
                { label: "91-360 días", val: stats.antiguedad["91-360d"], tone: "bg-amber-500" },
                { label: "+360 días", val: stats.antiguedad["+360d"], tone: "bg-red-500" },
                { label: "Sin fecha", val: stats.antiguedad["Sin fecha"], tone: "bg-muted-foreground" },
              ].map(item => {
                const pct = (item.val / stats.totalProd) * 100;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-[12px] text-muted-foreground">{item.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className={cn("anim-draw-in h-full rounded-full", item.tone)}
                        style={{ width: `${pct}%`, transformOrigin: "left" }} />
                    </div>
                    <span className="w-20 shrink-0 text-right text-[12px] font-semibold tabular-nums text-foreground">
                      {item.val} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Col derecha */}
        <div className="space-y-4">
          {/* Equipos por Estado */}
          <section className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-foreground">
              <Cpu className="h-4 w-4 text-primary" strokeWidth={1.5} />
              Equipos por Estado
            </h2>
            <div className="space-y-3">
              {(Object.keys(ESTADO_META) as EstadoEquipo[]).map((est) => {
                const n = stats.eqEstado[est];
                const total = equipos.length || 1;
                const pct = (n / total) * 100;
                const tone = ESTADO_META[est].tone === "danger" ? "bg-red-500"
                  : ESTADO_META[est].tone === "warn" ? "bg-amber-500"
                  : ESTADO_META[est].tone === "ok" ? "bg-emerald-500" : "bg-primary";
                return (
                  <div key={est}>
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="text-[12px] text-muted-foreground">{ESTADO_META[est].label}</span>
                      <span className="text-[13px] font-bold tabular-nums text-foreground">{n}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className={cn("anim-draw-in h-full rounded-full", tone)}
                        style={{ width: `${pct}%`, transformOrigin: "left" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Valor por Categoría */}
          <section className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-foreground">
              <Boxes className="h-4 w-4 text-primary" strokeWidth={1.5} />
              Valor por Categoría
            </h2>
            {stats.categorias.length === 0 ? (
              <p className="py-4 text-[13px] text-muted-foreground">Sin precios asignados</p>
            ) : (
              <div className="space-y-3">
                {stats.categorias.map(([cat, data]) => {
                  const pct = (data.valor / stats.maxCatVal) * 100;
                  return (
                    <div key={cat}>
                      <div className="mb-1 flex items-baseline justify-between">
                        <span className="truncate text-[12px] font-medium text-foreground">{cat}</span>
                        <span className="ml-2 shrink-0 text-[11px] font-bold tabular-nums text-primary">
                          {fmtSoles(data.valor)}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className="anim-draw-in h-full rounded-full bg-primary/50"
                          style={{ width: `${pct}%`, transformOrigin: "left" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Programación de Hoy */}
          <section className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-foreground">
              <Calendar className="h-4 w-4 text-primary" strokeWidth={1.5} />
              Programación de Hoy
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                <span className="text-[22px] font-bold tabular-nums text-primary">{stats.horarioHoy}</span>
              </div>
              <div>
                <p className="text-[13px] font-medium text-foreground">actividades programadas</p>
                <p className="text-[11px] text-muted-foreground">
                  {stats.horaStr} · {new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima", weekday: "long" })}
                </p>
              </div>
              <button onClick={go("horario")} className="press ml-auto rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          </section>

          {/* Productos con menor stock */}
          <section className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
                <AlertTriangle className="h-4 w-4 text-amber-500" strokeWidth={1.5} />
                Stock Crítico
              </h2>
              <button onClick={go("inventario")} className="press flex items-center gap-1 text-[12px] font-medium text-primary hover:text-primary/80">
                Ver <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
              </button>
            </div>
            {stats.bajoStock.length === 0 ? (
              <p className="py-4 text-[13px] text-muted-foreground">Todo bien ✅</p>
            ) : (
              <div className="space-y-3">
                {stats.bajoStock.slice(0, 5).map((p) => {
                  const pct = p.minStock ? Math.min(100, (p.quantity / Math.max(p.minStock * 2, 1)) * 100) : 100;
                  const bajo = p.minStock && p.minStock > 0 && p.quantity <= p.minStock;
                  return (
                    <div key={p.id}>
                      <div className="mb-1.5 flex items-baseline justify-between">
                        <span className="truncate text-[13px] font-medium text-foreground">{p.name}</span>
                        <span className="text-[13px] font-bold tabular-nums text-foreground">
                          {fmtNum(p.quantity)}
                          {p.minStock ? <span className="ml-1 text-[11px] font-normal text-muted-foreground">/ {fmtNum(p.minStock)}</span> : null}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full transition-all duration-700",
                          bajo ? "bg-destructive/70" : "bg-foreground/30")}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
