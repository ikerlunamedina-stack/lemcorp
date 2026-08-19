"use client";

import { useStore } from "@/lib/store";
import { ESTADO_META } from "@/lib/types";
import {
  Package,
  Boxes,
  AlertTriangle,
  Cpu,
  ArrowRight,
  Download,
  TrendingUp,
} from "lucide-react";
import { fmtNum } from "@/lib/num";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function DashboardView() {
  const products = useStore((s) => s.products) ?? [];
  const equipos = useStore((s) => s.equipos) ?? [];
  const setActiveView = useStore((s) => s.setActiveView);
  const exportInventarioExcel = useStore((s) => s.exportInventarioExcel);

  const totalProductos = products.length;
  const totalUnidades = products.reduce((s, p) => s + p.quantity, 0);
  const bajoStock = products.filter(
    (p) => p.minStock !== undefined && p.minStock > 0 && p.quantity <= p.minStock
  );
  const equiposDisponibles = equipos.filter((e) => e.estado === "disponible").length;

  // Categorías (sin useMemo para evitar error de React Compiler)
  const catMap: Record<string, number> = {};
  for (const p of products) {
    const k = p.category ?? "Sin categoría";
    catMap[k] = (catMap[k] ?? 0) + p.quantity;
  }
  const categorias = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxCat = categorias[0]?.[1] ?? 1;

  const stats = [
    {
      icon: <Package className="h-5 w-5" />,
      label: "Productos",
      value: totalProductos.toString(),
      sub: "en catálogo",
      onClick: () => setActiveView("inventario"),
    },
    {
      icon: <Boxes className="h-5 w-5" />,
      label: "Unidades totales",
      value: fmtNum(totalUnidades),
      sub: "en stock",
      onClick: () => setActiveView("inventario"),
    },
    {
      icon: <Cpu className="h-5 w-5" />,
      label: "Equipos",
      value: equipos.length.toString(),
      sub: `${equiposDisponibles} disponibles`,
      onClick: () => setActiveView("equipos"),
    },
    {
      icon: <AlertTriangle className="h-5 w-5" />,
      label: "Bajo stock",
      value: bajoStock.length.toString(),
      sub: bajoStock.length === 0 ? "Todo OK" : "requieren atención",
      tone: bajoStock.length > 0 ? "text-destructive" : "",
      onClick: () => setActiveView("inventario"),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      {/* Encabezado */}
      <div className="anim-fade-up mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Dashboard</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Control de inventario y equipos LEMCORP
          </p>
        </div>
        <Button
          onClick={() => exportInventarioExcel()}
          className="press rounded-2xl shadow-lg shadow-primary/20"
        >
          <Download className="mr-1.5 h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s, i) => (
          <button
            key={s.label}
            onClick={s.onClick}
            className="anim-fade-up group rounded-3xl border border-border bg-card p-5 text-left shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className={cn(
                "flex h-10 w-10 items-center justify-center rounded-2xl transition-transform group-hover:scale-110",
                s.tone ? "bg-destructive/10" : "bg-primary/10"
              )}>
                <span className={s.tone}>{s.icon}</span>
              </span>
            </div>
            <p className="mt-3 text-[26px] font-bold tabular-nums tracking-tight">{s.value}</p>
            <p className="text-[13px] font-semibold">{s.label}</p>
            <p className="text-[11px] text-muted-foreground">{s.sub}</p>
          </button>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Bajo stock */}
        <div className="anim-fade-up rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h2 className="text-[14px] font-semibold">Alertas de bajo stock</h2>
          </div>
          {bajoStock.length === 0 ? (
            <div className="flex items-center gap-2 py-6 text-center">
              <span className="mx-auto text-[13px] text-muted-foreground">
                Todo el stock está por encima del mínimo ✓
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {bajoStock.slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActiveView("inventario")}
                  className="press flex w-full items-center gap-3 rounded-2xl border border-border bg-muted/30 p-2.5 text-left transition-colors hover:bg-accent/50"
                >
                  <span className="font-mono text-[12px] font-semibold">{p.sku}</span>
                  <span className="flex-1 truncate text-[12px]">{p.name}</span>
                  <span className={cn(
                    "rounded-lg px-2 py-0.5 text-[11px] font-bold tabular-nums",
                    p.quantity === 0
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-foreground"
                  )}>
                    {fmtNum(p.quantity)} / {fmtNum(p.minStock)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Por categoría */}
        <div className="anim-fade-up rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-[14px] font-semibold">Stock por categoría</h2>
          </div>
          <div className="space-y-2.5">
            {categorias.map(([cat, qty]) => {
              const pct = (qty / maxCat) * 100;
              return (
                <div key={cat}>
                  <div className="mb-1 flex items-center justify-between text-[12px]">
                    <span className="font-medium">{cat}</span>
                    <span className="tabular-nums text-muted-foreground">{fmtNum(qty)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary anim-bar-fill"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {categorias.length === 0 && (
              <p className="py-6 text-center text-[12px] text-muted-foreground">
                No hay categorías definidas.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Equipos por estado */}
      {equipos.length > 0 && (
        <div className="anim-fade-up mt-4 rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-[14px] font-semibold">Equipos por estado</h2>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="press h-7 rounded-lg text-[12px]"
              onClick={() => setActiveView("equipos")}
            >
              Ver equipos <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(Object.keys(ESTADO_META) as (keyof typeof ESTADO_META)[]).map((est) => {
              const n = equipos.filter((e) => e.estado === est).length;
              const meta = ESTADO_META[est];
              return (
                <div
                  key={est}
                  className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-muted/30 p-3"
                >
                  <span className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-xl text-[13px] font-bold",
                    meta.color === "destructive"
                      ? "bg-destructive/10 text-destructive"
                      : meta.color === "primary"
                      ? "bg-primary/10 text-primary"
                      : "bg-accent text-accent-foreground"
                  )}>
                    {meta.icon}
                  </span>
                  <span className="text-[18px] font-bold tabular-nums">{n}</span>
                  <span className="text-[10px] text-muted-foreground">{meta.short}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
