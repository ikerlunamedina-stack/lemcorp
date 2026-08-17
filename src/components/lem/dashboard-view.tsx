"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import {
  Package,
  TrendingDown,
  AlertTriangle,
  Boxes,
  ArrowRight,
  Download,
} from "lucide-react";
import { fmtNum } from "@/lib/num";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function DashboardView() {
  const products = useStore((s) => s.products);
  const despachos = useStore((s) => s.despachos);
  const getDespachosDelDia = useStore((s) => s.getDespachosDelDia);
  const setActiveView = useStore((s) => s.setActiveView);
  const exportInventarioExcel = useStore((s) => s.exportInventarioExcel);
  const { toast } = useToast();

  const despachosHoy = useMemo(() => getDespachosDelDia(), [getDespachosDelDia, despachos]);

  const totalProductos = products.length;
  const totalUnidades = products.reduce((s, p) => s + p.quantity, 0);
  const bajoStock = products.filter(
    (p) => p.minStock !== undefined && p.minStock > 0 && p.quantity <= p.minStock
  );
  const totalDespachadoHoy = despachosHoy.reduce((s, d) => s + d.cantidad, 0);

  const stats = [
    {
      icon: <Package className="h-5 w-5" />,
      label: "Productos",
      value: totalProductos.toString(),
      sub: "en catálogo",
    },
    {
      icon: <Boxes className="h-5 w-5" />,
      label: "Unidades totales",
      value: fmtNum(totalUnidades),
      sub: "en stock",
    },
    {
      icon: <TrendingDown className="h-5 w-5" />,
      label: "Despachado hoy",
      value: fmtNum(totalDespachadoHoy),
      sub: `${despachosHoy.length} despacho(s)`,
    },
    {
      icon: <AlertTriangle className="h-5 w-5" />,
      label: "Bajo stock",
      value: bajoStock.length.toString(),
      sub: bajoStock.length === 0 ? "Todo OK" : "requieren atención",
      tone: bajoStock.length > 0 ? "text-destructive" : "",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      {/* Encabezado */}
      <div className="anim-fade-up mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Resumen general del sistema de inventario LEMCORP
          </p>
        </div>
        <Button
          onClick={() => {
            exportInventarioExcel();
            toast({ title: "Exportando inventario a Excel…" });
          }}
          className="press rounded-xl"
        >
          <Download className="mr-1.5 h-4 w-4" />
          Exportar a Excel
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="anim-fade-up rounded-2xl border border-border bg-card p-4"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span className={cn("text-muted-foreground", s.tone)}>{s.icon}</span>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{s.value}</p>
            <p className="text-[13px] font-medium">{s.label}</p>
            <p className="text-[11px] text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Bajo stock */}
      {bajoStock.length > 0 && (
        <div className="anim-fade-up mt-5 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h2 className="text-sm font-semibold text-destructive">
              Alertas de bajo stock ({bajoStock.length})
            </h2>
          </div>
          <div className="space-y-1.5">
            {bajoStock.slice(0, 8).map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveView("inventario")}
                className="press flex w-full items-center gap-3 rounded-lg border border-border bg-card p-2.5 text-left hover:bg-accent/50"
              >
                <span className="font-mono text-[12px] font-semibold">{p.sku}</span>
                <span className="flex-1 truncate text-[12px]">{p.name}</span>
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                    p.quantity === 0
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-foreground"
                  )}
                >
                  {fmtNum(p.quantity)} / mín {fmtNum(p.minStock)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Despachos recientes */}
      <div className="anim-fade-up mt-5 rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Despachos de hoy</h2>
          <Button
            size="sm"
            variant="outline"
            className="press h-7 rounded-lg text-xs"
            onClick={() => setActiveView("despachos")}
          >
            Registrar despacho <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
        {despachosHoy.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-muted-foreground">
            No hay despachos registrados hoy.
          </p>
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Hora</th>
                  <th className="pb-2 pr-3 font-medium">SKU</th>
                  <th className="pb-2 pr-3 font-medium">Producto</th>
                  <th className="pb-2 pr-3 text-right font-medium">Cant.</th>
                  <th className="pb-2 font-medium">Cliente / Técnico</th>
                </tr>
              </thead>
              <tbody>
                {despachosHoy.slice(0, 10).map((d) => (
                  <tr key={d.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-3 text-[11px] text-muted-foreground">
                      {new Date(d.fecha).toLocaleTimeString("es-PE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2 pr-3 font-mono text-[12px] font-semibold">{d.sku}</td>
                    <td className="py-2 pr-3 text-[12px]">{d.producto}</td>
                    <td className="py-2 pr-3 text-right">
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                        {d.cantidad}
                      </span>
                    </td>
                    <td className="py-2 text-[11px] text-muted-foreground">
                      {d.cliente ?? d.tecnico ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
