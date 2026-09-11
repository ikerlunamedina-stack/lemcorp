"use client";
import { AppShell } from "@/components/lem/app-shell";
import { useStore } from "@/lib/store";
import { fmtNum } from "@/lib/num";
import { Download, TrendingUp, TrendingDown, Package, DollarSign, BarChart3 } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";

export default function ReportesPage() {
  const products = useStore((s) => s.products);
  const despachos = useStore((s) => s.despachos);
  const entradas = useStore((s) => s.entradas);
  const equipos = useStore((s) => s.equipos);

  const data = useMemo(() => {
    const valorTotal = products.reduce((s, p) => s + (p.precio || 0) * p.quantity, 0);
    const totalDespachado = despachos.reduce((s, d) => s + d.cantidad, 0);
    const totalEntrado = entradas.reduce((s, e) => s + e.cantidad, 0);
    const totalUnidades = products.reduce((s, p) => s + p.quantity, 0);
    const valorDespachado = despachos.reduce((s, d) => {
      const prod = products.find(p => p.sku === d.sku);
      return s + (prod?.precio || 0) * d.cantidad;
    }, 0);
    return { valorTotal, totalDespachado, totalEntrado, totalUnidades, valorDespachado };
  }, [products, despachos, entradas]);

  return (
    <AppShell>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-foreground">Reportes</h1>
            <p className="text-[13px] text-muted-foreground">Análisis y estadísticas del almacén</p>
          </div>
          <Button variant="outline" className="press h-9 rounded-lg border-border bg-card px-3 text-[13px] shadow-sm hover:bg-muted">
            <Download className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Exportar PDF
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><DollarSign className="h-4 w-4 text-primary" strokeWidth={1.5} /></div>
            <p className="text-[24px] font-bold tabular-nums text-foreground">S/ {data.valorTotal.toLocaleString("es-PE", { maximumFractionDigits: 0 })}</p>
            <p className="text-[12px] font-medium text-muted-foreground">Valor del Stock</p>
          </div>
          <div className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm" style={{ animationDelay: "60ms" }}>
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10"><TrendingUp className="h-4 w-4 text-emerald-500" strokeWidth={1.5} /></div>
            <p className="text-[24px] font-bold tabular-nums text-foreground">{fmtNum(data.totalEntrado)}</p>
            <p className="text-[12px] font-medium text-muted-foreground">Unidades Entradas</p>
          </div>
          <div className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm" style={{ animationDelay: "120ms" }}>
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10"><TrendingDown className="h-4 w-4 text-rose-500" strokeWidth={1.5} /></div>
            <p className="text-[24px] font-bold tabular-nums text-foreground">{fmtNum(data.totalDespachado)}</p>
            <p className="text-[12px] font-medium text-muted-foreground">Unidades Despachadas</p>
          </div>
          <div className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm" style={{ animationDelay: "180ms" }}>
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10"><Package className="h-4 w-4 text-amber-500" strokeWidth={1.5} /></div>
            <p className="text-[24px] font-bold tabular-nums text-foreground">{fmtNum(data.totalUnidades)}</p>
            <p className="text-[12px] font-medium text-muted-foreground">Stock Actual</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <section className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-[14px] font-semibold text-foreground">Reporte de Despachos por Producto</h2>
            <div className="max-h-[300px] overflow-y-auto scroll-thin">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Producto</th>
                    <th className="px-3 py-2 text-right font-medium">Despachado</th>
                    <th className="px-3 py-2 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {despachos.length === 0 ? (
                    <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">Sin despachos</td></tr>
                  ) : (
                    Object.entries(despachos.reduce((acc, d) => {
                      const k = d.producto || d.sku;
                      if (!acc[k]) acc[k] = { count: 0, valor: 0 };
                      acc[k].count += d.cantidad;
                      const prod = products.find(p => p.sku === d.sku);
                      acc[k].valor += (prod?.precio || 0) * d.cantidad;
                      return acc;
                    }, {} as Record<string, { count: number; valor: number }>)).map(([prod, data]) => (
                      <tr key={prod} className="hover:bg-muted/30">
                        <td className="px-3 py-2 text-foreground">{prod}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{data.count}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-primary">S/ {data.valor.toLocaleString("es-PE", { maximumFractionDigits: 0 })}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm" style={{ animationDelay: "60ms" }}>
            <h2 className="mb-4 text-[14px] font-semibold text-foreground">Resumen General</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
                <span className="text-[13px] text-muted-foreground">Productos en catálogo</span>
                <span className="text-[15px] font-bold tabular-nums text-foreground">{products.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
                <span className="text-[13px] text-muted-foreground">Equipos registrados</span>
                <span className="text-[15px] font-bold tabular-nums text-foreground">{equipos.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
                <span className="text-[13px] text-muted-foreground">Total despachos</span>
                <span className="text-[15px] font-bold tabular-nums text-foreground">{despachos.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
                <span className="text-[13px] text-muted-foreground">Total entradas</span>
                <span className="text-[15px] font-bold tabular-nums text-foreground">{entradas.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
                <span className="text-[13px] text-muted-foreground">Valor despachado</span>
                <span className="text-[15px] font-bold tabular-nums text-primary">S/ {data.valorDespachado.toLocaleString("es-PE", { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
