"use client";

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import {
  Package, Boxes, AlertTriangle, Cpu, Download,
  TrendingUp, Clock, Users, ArrowRight, DollarSign,
  Activity, Calendar, Warehouse, UserCheck, BarChart3,
  ArrowDownToLine, ArrowLeftRight, FileText, ChevronRight,
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

/** Mini gráfico de línea SVG */
function MiniChart({ data, color = "var(--primary)", height = 40 }: {
  data: number[]; color?: string; height?: number;
}) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * 100;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  const areaPoints = `0,${height} ${points} 100,${height}`;
  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <polygon points={areaPoints} fill={color} opacity={0.1} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Donut chart con conic-gradient */
function Donut({ segments, size = 100 }: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const gradParts: string[] = [];
  segments.reduce((acc, s) => {
    const pct = (s.value / total) * 100;
    const start = acc;
    const end = acc + pct;
    gradParts.push(`${s.color} ${start}% ${end}%`);
    return end;
  }, 0);
  const grad = gradParts.join(", ");
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="rounded-full" style={{
        width: size, height: size,
        background: `conic-gradient(${grad})`,
      }} />
      <div className="absolute inset-[20%] rounded-full bg-card flex items-center justify-center">
        <span className="text-[14px] font-bold tabular-nums text-foreground">{total}</span>
      </div>
    </div>
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
  const [velocidadTab, setVelocidadTab] = useState<"7D" | "30D" | "3M" | "1A">("7D");

  const stats = useMemo(() => {
    const totalUnidades = products.reduce((s, p) => s + p.quantity, 0);
    const valorTotal = products.reduce((s, p) => s + (p.precio || 0) * p.quantity, 0);
    const valorPropio = products.filter(p => !p.categoria || p.categoria !== "consignado").reduce((s, p) => s + (p.precio || 0) * p.quantity, 0);
    const valorConsignado = products.filter(p => p.categoria === "consignado").reduce((s, p) => s + (p.precio || 0) * p.quantity, 0);
    const bajoStock = products.filter((p) => p.minStock && p.minStock > 0 && p.quantity <= p.minStock);
    const agotados = products.filter((p) => p.quantity === 0);

    // Categorías
    const catMap: Record<string, { valor: number; cantidad: number }> = {};
    for (const p of products) {
      const k = p.categoria || "Sin categoría";
      if (!catMap[k]) catMap[k] = { valor: 0, cantidad: 0 };
      catMap[k].valor += (p.precio || 0) * p.quantity;
      catMap[k].cantidad += p.quantity;
    }
    const categorias = Object.entries(catMap).sort((a, b) => b[1].valor - a[1].valor).slice(0, 5);

    // Despachos por técnico
    const tecMap: Record<string, { count: number; total: number; valor: number }> = {};
    for (const d of despachos) {
      const t = d.tecnico || d.destino || "Sin asignar";
      if (!tecMap[t]) tecMap[t] = { count: 0, total: 0, valor: 0 };
      tecMap[t].count++;
      tecMap[t].total += d.cantidad;
      const prod = products.find(p => p.sku === d.sku);
      tecMap[t].valor += (prod?.precio || 0) * d.cantidad;
    }
    const topTecnicos = Object.entries(tecMap).sort((a, b) => b[1].valor - a[1].valor).slice(0, 5);

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

    // Velocidad operativa (datos para gráfico)
    const ahora = Date.now();
    const dias7 = Array.from({ length: 14 }, (_, i) => {
      const desde = ahora - (13 - i) * 86400000;
      const hasta = desde + 86400000;
      return despachos.filter(d => d.fecha >= desde && d.fecha < hasta).reduce((s, d) => s + d.cantidad, 0);
    });
    const dias30 = Array.from({ length: 14 }, (_, i) => {
      const desde = ahora - (13 - i) * 2 * 86400000;
      const hasta = desde + 2 * 86400000;
      return despachos.filter(d => d.fecha >= desde && d.fecha < hasta).reduce((s, d) => s + d.cantidad, 0);
    });
    const meses3 = Array.from({ length: 14 }, (_, i) => {
      const desde = ahora - (13 - i) * 6.5 * 86400000;
      const hasta = desde + 6.5 * 86400000;
      return despachos.filter(d => d.fecha >= desde && d.fecha < hasta).reduce((s, d) => s + d.cantidad, 0);
    });
    const ano1 = Array.from({ length: 14 }, (_, i) => {
      const desde = ahora - (13 - i) * 26 * 86400000;
      const hasta = desde + 26 * 86400000;
      return despachos.filter(d => d.fecha >= desde && d.fecha < hasta).reduce((s, d) => s + d.cantidad, 0);
    });

    // Antigüedad de stock
    const antig = { "0-45d": 0, "46-90d": 0, "91-360d": 0, "+360d": 0, "sf": 0 };
    for (const p of products) {
      const dias = Math.floor((ahora - (p.updatedAt || p.createdAt)) / 86400000);
      if (!p.updatedAt && !p.createdAt) antig.sf++;
      else if (dias <= 45) antig["0-45d"]++;
      else if (dias <= 90) antig["46-90d"]++;
      else if (dias <= 360) antig["91-360d"]++;
      else antig["+360d"]++;
    }
    const totalProd = products.length || 1;

    // Clasificación ABC
    const sortedByVal = [...products].sort((a, b) =>
      ((b.precio || 0) * b.quantity) - ((a.precio || 0) * a.quantity)
    );
    const valTotal = sortedByVal.reduce((s, p) => s + (p.precio || 0) * p.quantity, 0) || 1;
    let acum = 0, claseA = 0, claseB = 0, claseC = 0;
    for (const p of sortedByVal) {
      acum += (p.precio || 0) * p.quantity;
      const pct = acum / valTotal;
      if (pct <= 0.7) claseA++;
      else if (pct <= 0.9) claseB++;
      else claseC++;
    }

    // Tasa devolución
    const tasaDev = despachos.length > 0
      ? Math.round((entradas.length / (despachos.length + entradas.length)) * 100 * 10) / 10
      : 0;

    // Programación hoy
    const dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
    const diaHoy = dias[new Date().getDay()];
    const horarioHoy = horario.filter(h => h.dia === diaHoy);
    const horaStr = new Date().toLocaleTimeString("es-PE", {
      timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false
    });
    const limaHour = parseInt(new Date().toLocaleTimeString("en-US",
      { timeZone: "America/Lima", hour: "2-digit", hour12: false }), 10);
    const saludo = limaHour < 12 ? "Buenos días" : limaHour < 19 ? "Buenas tardes" : "Buenas noches";

    // Total liquidado (valor despachado histórico)
    const totalLiquidado = despachos.reduce((s, d) => {
      const prod = products.find(p => p.sku === d.sku);
      return s + (prod?.precio || 0) * d.cantidad;
    }, 0);

    // Operaciones pendientes
    const recepcionesPend = entradas.filter(e => !e.albaran).length;
    const transferenciasPend = despachos.filter(d => d.tipo === "transferencia").length;

    // Top productos despachados (proyectos)
    const prodMap: Record<string, { count: number; valor: number }> = {};
    for (const d of despachos) {
      const k = d.producto || d.sku;
      if (!prodMap[k]) prodMap[k] = { count: 0, valor: 0 };
      prodMap[k].count += d.cantidad;
      const prod = products.find(p => p.sku === d.sku);
      prodMap[k].valor += (prod?.precio || 0) * d.cantidad;
    }
    const topProyectos = Object.entries(prodMap).sort((a, b) => b[1].valor - a[1].valor).slice(0, 5);

    return {
      totalUnidades, valorTotal, valorPropio, valorConsignado,
      bajoStock, agotados, categorias, topTecnicos, eqEstado, hoy,
      antig, totalProd, claseA, claseB, claseC, tasaDev,
      horarioHoy, horaStr, saludo, totalLiquidado,
      recepcionesPend, transferenciasPend, topProyectos,
      dias7, dias30, meses3, ano1,
    };
  }, [products, equipos, despachos, entradas, horario]);

  const c = useCountUp(stats.valorTotal);
  const u = useCountUp(stats.totalUnidades);
  const liq = useCountUp(stats.totalLiquidado);

  const velocidadData = velocidadTab === "7D" ? stats.dias7
    : velocidadTab === "30D" ? stats.dias30
    : velocidadTab === "3M" ? stats.meses3
    : stats.ano1;

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
          <p className="mt-0.5 text-[13px] text-muted-foreground">Centro de Control Logístico</p>
        </div>
        <Button
          onClick={() => exportInventarioExcel()}
          variant="outline"
          className="press h-9 rounded-lg border-border bg-card px-3 text-[13px] font-medium shadow-sm hover:bg-muted"
        >
          <Download className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Exportar
        </Button>
      </div>

      {/* Fila 1: Valor Stock + Total Liquidado + Operaciones */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Valor Total Stock */}
        <div className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <DollarSign className="h-4 w-4 text-primary" strokeWidth={1.5} />
            </div>
            <span className="text-[12px] font-medium text-muted-foreground">Valor Stock</span>
          </div>
          <p className="text-[24px] font-bold tabular-nums tracking-tight text-foreground anim-fade-in">{fmtSoles(c)}</p>
          <div className="mt-2 flex gap-3 text-[11px]">
            <span className="text-muted-foreground">Propio: <strong className="text-foreground">{fmtSoles(stats.valorPropio)}</strong></span>
          </div>
          <div className="text-[11px]">
            <span className="text-muted-foreground">Consignado: <strong className="text-foreground">{fmtSoles(stats.valorConsignado)}</strong></span>
          </div>
        </div>

        {/* Total Liquidado */}
        <div className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm" style={{ animationDelay: "60ms" }}>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
              <TrendingUp className="h-4 w-4 text-emerald-500" strokeWidth={1.5} />
            </div>
            <span className="text-[12px] font-medium text-muted-foreground">Total Liquidado</span>
          </div>
          <p className="text-[24px] font-bold tabular-nums tracking-tight text-foreground">{fmtSoles(liq)}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">Acumulado histórico consumido</p>
        </div>

        {/* Operaciones Pendientes */}
        <div className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm" style={{ animationDelay: "120ms" }}>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
              <Clock className="h-4 w-4 text-amber-500" strokeWidth={1.5} />
            </div>
            <span className="text-[12px] font-medium text-muted-foreground">Operaciones</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <ArrowDownToLine className="h-3 w-3" strokeWidth={1.5} /> Recepciones
              </span>
              <span className="font-bold tabular-nums text-foreground">{stats.recepcionesPend}</span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <ArrowLeftRight className="h-3 w-3" strokeWidth={1.5} /> Transferencias
              </span>
              <span className="font-bold tabular-nums text-foreground">{stats.transferenciasPend}</span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <FileText className="h-3 w-3" strokeWidth={1.5} /> Albaranes
              </span>
              <span className="font-bold tabular-nums text-foreground">{despachos.length}</span>
            </div>
          </div>
        </div>

        {/* KPIs rápidos */}
        <div className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm" style={{ animationDelay: "180ms" }}>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
              <BarChart3 className="h-4 w-4 text-violet-500" strokeWidth={1.5} />
            </div>
            <span className="text-[12px] font-medium text-muted-foreground">Resumen</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[18px] font-bold tabular-nums text-foreground">{fmtNum(u)}</p>
              <p className="text-[10px] text-muted-foreground">unidades</p>
            </div>
            <div>
              <p className="text-[18px] font-bold tabular-nums text-foreground">{equipos.length}</p>
              <p className="text-[10px] text-muted-foreground">equipos</p>
            </div>
            <div>
              <p className="text-[18px] font-bold tabular-nums text-foreground">{stats.hoy}</p>
              <p className="text-[10px] text-muted-foreground">desp. hoy</p>
            </div>
            <div>
              <p className="text-[18px] font-bold tabular-nums text-foreground">{stats.tasaDev}%</p>
              <p className="text-[10px] text-muted-foreground">devolución</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fila 2: Velocidad Operativa + Distribución Logística */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Velocidad Operativa */}
        <section className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
              <Activity className="h-4 w-4 text-primary" strokeWidth={1.5} />
              Velocidad Operativa
            </h2>
            <div className="flex gap-1">
              {(["7D", "30D", "3M", "1A"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setVelocidadTab(tab)}
                  className={cn(
                    "press rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
                    velocidadTab === tab
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <MiniChart data={velocidadData} />
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Despachado · {velocidadTab === "7D" ? "últimos 7 días" : velocidadTab === "30D" ? "últimos 30 días" : velocidadTab === "3M" ? "últimos 3 meses" : "último año"}</span>
            <span className="font-bold tabular-nums text-foreground">
              Total: {velocidadData.reduce((s, v) => s + v, 0)} und
            </span>
          </div>
        </section>

        {/* Distribución Logística */}
        <section className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm" style={{ animationDelay: "60ms" }}>
          <h2 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-foreground">
            <Warehouse className="h-4 w-4 text-primary" strokeWidth={1.5} />
            Distribución Logística
          </h2>
          {stats.topTecnicos.length === 0 ? (
            <p className="py-4 text-[13px] text-muted-foreground">Sin despachos registrados</p>
          ) : (
            <div className="space-y-2.5">
              {stats.topTecnicos.map(([tecnico, data], i) => {
                const maxVal = stats.topTecnicos[0]?.[1].valor ?? 1;
                const pct = (data.valor / maxVal) * 100;
                return (
                  <div key={tecnico}>
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="truncate text-[12px] font-medium text-foreground">
                        {i + 1}. {tecnico.length > 30 ? tecnico.slice(0, 30) + "…" : tecnico}
                      </span>
                      <span className="ml-2 shrink-0 text-[11px] font-bold tabular-nums text-primary">
                        {fmtSoles(data.valor)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="anim-draw-in h-full rounded-full bg-primary/50"
                        style={{ width: `${pct}%`, transformOrigin: "left" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Fila 3: Antigüedad (donut) + Clasificación ABC + Tasa Devolución */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Antigüedad Stock */}
        <section className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-foreground">
            <Clock className="h-4 w-4 text-primary" strokeWidth={1.5} />
            Antigüedad de Stock
          </h2>
          <div className="flex items-center gap-4">
            <Donut
              size={90}
              segments={[
                { label: "0-45d", value: stats.antig["0-45d"], color: "oklch(0.7 0.15 150)" },
                { label: "46-90d", value: stats.antig["46-90d"], color: "oklch(0.65 0.15 200)" },
                { label: "91-360d", value: stats.antig["91-360d"], color: "oklch(0.7 0.15 60)" },
                { label: "+360d", value: stats.antig["+360d"], color: "oklch(0.6 0.2 25)" },
                { label: "S/F", value: stats.antig.sf, color: "oklch(0.5 0 0)" },
              ]}
            />
            <div className="flex-1 space-y-1.5">
              {[
                { label: "0-45 días", val: stats.antig["0-45d"], color: "oklch(0.7 0.15 150)" },
                { label: "46-90 días", val: stats.antig["46-90d"], color: "oklch(0.65 0.15 200)" },
                { label: "91-360 días", val: stats.antig["91-360d"], color: "oklch(0.7 0.15 60)" },
                { label: "+360 días", val: stats.antig["+360d"], color: "oklch(0.6 0.2 25)" },
                { label: "Sin fecha", val: stats.antig.sf, color: "oklch(0.5 0 0)" },
              ].map(item => {
                const pct = (item.val / stats.totalProd) * 100;
                return (
                  <div key={item.label} className="flex items-center gap-2 text-[11px]">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
                    <span className="flex-1 text-muted-foreground">{item.label}</span>
                    <span className="font-bold tabular-nums text-foreground">{item.val} · {pct.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Clasificación ABC */}
        <section className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm" style={{ animationDelay: "60ms" }}>
          <h2 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-foreground">
            <BarChart3 className="h-4 w-4 text-primary" strokeWidth={1.5} />
            Clasificación ABC
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-primary/10 p-4 text-center">
              <p className="text-[22px] font-bold tabular-nums text-primary">{stats.claseA}</p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-primary/70">Clase A</p>
              <p className="mt-1 text-[9px] text-muted-foreground">70% valor</p>
            </div>
            <div className="rounded-xl bg-amber-500/10 p-4 text-center">
              <p className="text-[22px] font-bold tabular-nums text-amber-500">{stats.claseB}</p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-amber-500/70">Clase B</p>
              <p className="mt-1 text-[9px] text-muted-foreground">20% valor</p>
            </div>
            <div className="rounded-xl bg-muted p-4 text-center">
              <p className="text-[22px] font-bold tabular-nums text-muted-foreground">{stats.claseC}</p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">Clase C</p>
              <p className="mt-1 text-[9px] text-muted-foreground">10% valor</p>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground">
            {products.length} productos analizados por valor monetario
          </div>
        </section>

        {/* Tasa Devolución + Equipos Estado */}
        <section className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm" style={{ animationDelay: "120ms" }}>
          <h2 className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-foreground">
            <Activity className="h-4 w-4 text-primary" strokeWidth={1.5} />
            Tasa de Devolución
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
              <span className="text-[20px] font-bold tabular-nums text-orange-500">{stats.tasaDev}%</span>
            </div>
            <div className="flex-1">
              <p className="text-[12px] text-muted-foreground">Entradas vs Salidas</p>
              <p className="text-[11px] text-muted-foreground">{entradas.length} entradas · {despachos.length} despachos</p>
            </div>
          </div>
          <div className="mt-4 border-t border-border pt-3">
            <p className="mb-2 text-[12px] font-medium text-muted-foreground">Equipos por Estado</p>
            <div className="space-y-1.5">
              {(Object.keys(ESTADO_META) as EstadoEquipo[]).map((est) => {
                const n = stats.eqEstado[est];
                const total = equipos.length || 1;
                const pct = (n / total) * 100;
                const tone = ESTADO_META[est].tone === "danger" ? "bg-red-500"
                  : ESTADO_META[est].tone === "warn" ? "bg-amber-500"
                  : ESTADO_META[est].tone === "ok" ? "bg-emerald-500" : "bg-primary";
                return (
                  <div key={est} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-[11px] text-muted-foreground">{ESTADO_META[est].short}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className={cn("anim-draw-in h-full rounded-full", tone)}
                        style={{ width: `${pct}%`, transformOrigin: "left" }} />
                    </div>
                    <span className="w-8 shrink-0 text-right text-[11px] font-bold tabular-nums text-foreground">{n}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Fila 4: Top Proyectos + Valor por Categoría + Programación */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Top Proyectos */}
        <section className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-foreground">
            <FileText className="h-4 w-4 text-primary" strokeWidth={1.5} />
            Top Productos Despachados
          </h2>
          {stats.topProyectos.length === 0 ? (
            <p className="py-4 text-[13px] text-muted-foreground">Sin despachos</p>
          ) : (
            <div className="space-y-2">
              {stats.topProyectos.map(([prod, data], i) => (
                <div key={prod} className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] font-bold text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">{prod}</span>
                  <span className="shrink-0 text-[11px] font-bold tabular-nums text-primary">{fmtSoles(data.valor)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Valor por Categoría */}
        <section className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm" style={{ animationDelay: "60ms" }}>
          <h2 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-foreground">
            <Boxes className="h-4 w-4 text-primary" strokeWidth={1.5} />
            Valor por Categoría
          </h2>
          {stats.categorias.length === 0 ? (
            <p className="py-4 text-[13px] text-muted-foreground">Sin precios asignados</p>
          ) : (
            <div className="space-y-2.5">
              {stats.categorias.map(([cat, data]) => {
                const maxVal = stats.categorias[0]?.[1].valor ?? 1;
                const pct = (data.valor / maxVal) * 100;
                return (
                  <div key={cat}>
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="truncate text-[12px] font-medium text-foreground">{cat}</span>
                      <span className="ml-2 shrink-0 text-[11px] font-bold tabular-nums text-primary">{fmtSoles(data.valor)}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="anim-draw-in h-full rounded-full bg-primary/40"
                        style={{ width: `${pct}%`, transformOrigin: "left" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Programación de Hoy */}
        <section className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm" style={{ animationDelay: "120ms" }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
              <Calendar className="h-4 w-4 text-primary" strokeWidth={1.5} />
              Programación Hoy
            </h2>
            <button onClick={go("horario")} className="press rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <span className="text-[22px] font-bold tabular-nums text-primary">{stats.horarioHoy.length}</span>
            </div>
            <div>
              <p className="text-[13px] font-medium text-foreground">actividades</p>
              <p className="text-[11px] text-muted-foreground">{stats.horaStr} · {new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima", weekday: "long" })}</p>
            </div>
          </div>
          {stats.horarioHoy.length > 0 && (
            <div className="space-y-1.5">
              {stats.horarioHoy.slice(0, 3).map(h => (
                <div key={h.id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5">
                  <Clock className="h-3 w-3 text-primary" strokeWidth={1.5} />
                  <span className="text-[11px] font-mono font-medium text-foreground">{h.horaInicio}</span>
                  <span className="truncate text-[11px] text-muted-foreground">{h.actividad}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Fila 5: Stock Crítico */}
      <div className="mt-3">
        <section className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
              <AlertTriangle className="h-4 w-4 text-amber-500" strokeWidth={1.5} />
              Stock Crítico
            </h2>
            <button onClick={go("inventario")} className="press flex items-center gap-1 text-[12px] font-medium text-primary hover:text-primary/80">
              Ver todo <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
            </button>
          </div>
          {stats.bajoStock.length === 0 ? (
            <div className="flex items-center gap-2 py-4 text-[13px] text-emerald-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500 anim-pulse-dot" />
              Todo bien — sin alertas de stock
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stats.bajoStock.slice(0, 6).map((p) => {
                const pct = p.minStock ? Math.min(100, (p.quantity / Math.max(p.minStock * 2, 1)) * 100) : 100;
                const bajo = p.minStock && p.minStock > 0 && p.quantity <= p.minStock;
                return (
                  <div key={p.id}>
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="truncate text-[12px] font-medium text-foreground">{p.name}</span>
                      <span className="text-[12px] font-bold tabular-nums text-foreground">
                        {fmtNum(p.quantity)}
                        {p.minStock ? <span className="ml-1 text-[10px] font-normal text-muted-foreground">/ {fmtNum(p.minStock)}</span> : null}
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
  );
}
