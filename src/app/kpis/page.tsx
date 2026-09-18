"use client";
import { AppShell } from "@/components/lem/app-shell";
import { useStore } from "@/lib/store";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Percent, Package } from "lucide-react";
import { useMemo } from "react";

export default function KPIsPage() {
  const products = useStore((s) => s.products);
  const despachos = useStore((s) => s.despachos);
  const entradas = useStore((s) => s.entradas);
  const equipos = useStore((s) => s.equipos);

  const kpis = useMemo(() => {
    const valorTotal = products.reduce((s, p) => s + (p.precio || 0) * p.quantity, 0);
    const totalUnidades = products.reduce((s, p) => s + p.quantity, 0);
    const totalDespachado = despachos.reduce((s, d) => s + d.cantidad, 0);
    const totalEntrado = entradas.reduce((s, e) => s + e.cantidad, 0);
    const rotacion = totalUnidades > 0 ? (totalDespachado / totalUnidades * 100).toFixed(1) : "0";
    const tasaDev = (despachos.length + entradas.length) > 0
      ? ((entradas.length / (despachos.length + entradas.length)) * 100).toFixed(1)
      : "0";
    const bajoStock = products.filter(p => p.minStock && p.minStock > 0 && p.quantity <= p.minStock).length;
    const cobertura = totalDespachado > 0 ? Math.round(totalUnidades / (totalDespachado / 30)) : 0;
    const eqDisponibles = equipos.filter(e => e.estado === "disponible").length;
    const eqAveriados = equipos.filter(e => e.estado === "averiado").length;
    return { valorTotal, totalUnidades, totalDespachado, totalEntrado, rotacion, tasaDev, bajoStock, cobertura, eqDisponibles, eqAveriados };
  }, [products, despachos, entradas, equipos]);

  return (
    <AppShell>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-[22px] font-bold tracking-tight text-foreground">
            <BarChart3 className="h-5 w-5 text-primary" strokeWidth={1.5} /> KPIs
          </h1>
          <p className="text-[13px] text-muted-foreground">Indicadores clave de rendimiento</p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><DollarSign className="h-4 w-4 text-primary" strokeWidth={1.5} /></div>
            <p className="text-[24px] font-bold tabular-nums text-foreground">S/ {kpis.valorTotal.toLocaleString("es-PE", { maximumFractionDigits: 0 })}</p>
            <p className="text-[12px] font-medium text-muted-foreground">Valor Inventario</p>
          </div>
          <div className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm" style={{ animationDelay: "60ms" }}>
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10"><Percent className="h-4 w-4 text-emerald-500" strokeWidth={1.5} /></div>
            <p className="text-[24px] font-bold tabular-nums text-foreground">{kpis.rotacion}%</p>
            <p className="text-[12px] font-medium text-muted-foreground">Rotación Mensual</p>
          </div>
          <div className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm" style={{ animationDelay: "120ms" }}>
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10"><Package className="h-4 w-4 text-amber-500" strokeWidth={1.5} /></div>
            <p className="text-[24px] font-bold tabular-nums text-foreground">{kpis.cobertura}</p>
            <p className="text-[12px] font-medium text-muted-foreground">Días de Cobertura</p>
          </div>
          <div className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm" style={{ animationDelay: "180ms" }}>
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10"><TrendingDown className="h-4 w-4 text-rose-500" strokeWidth={1.5} /></div>
            <p className="text-[24px] font-bold tabular-nums text-foreground">{kpis.tasaDev}%</p>
            <p className="text-[12px] font-medium text-muted-foreground">Tasa Devolución</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="press-card rounded-2xl bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2"><TrendingDown className="h-4 w-4 text-rose-500" strokeWidth={1.5} /><span className="text-[11px] text-muted-foreground">Despachado</span></div>
            <p className="text-[20px] font-bold tabular-nums text-foreground">{kpis.totalDespachado}</p>
          </div>
          <div className="press-card rounded-2xl bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" strokeWidth={1.5} /><span className="text-[11px] text-muted-foreground">Entrado</span></div>
            <p className="text-[20px] font-bold tabular-nums text-foreground">{kpis.totalEntrado}</p>
          </div>
          <div className="press-card rounded-2xl bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2"><Package className="h-4 w-4 text-amber-500" strokeWidth={1.5} /><span className="text-[11px] text-muted-foreground">Bajo Stock</span></div>
            <p className="text-[20px] font-bold tabular-nums text-amber-500">{kpis.bajoStock}</p>
          </div>
          <div className="press-card rounded-2xl bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2"><Package className="h-4 w-4 text-primary" strokeWidth={1.5} /><span className="text-[11px] text-muted-foreground">Equipos</span></div>
            <p className="text-[20px] font-bold tabular-nums text-foreground">{kpis.eqDisponibles}/{equipos.length}</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
