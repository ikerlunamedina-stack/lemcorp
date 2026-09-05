"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Download, ArrowRight } from "lucide-react";
import { fmtNum } from "@/lib/num";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ESTADO_META, type ActiveView, type EstadoEquipo } from "@/lib/types";

const VIEW_PATH: Record<ActiveView, string> = {
  dashboard: "/",
  inventario: "/inventario",
  despachos: "/despachos",
  equipos: "/equipos",
  series: "/series",
  pistolear: "/pistolear",
  horario: "/horario",
  bloc: "/bloc",
  ia: "/ia",
  empresa: "/empresa",
  notificaciones: "/notificaciones",
  config: "/config",
};

export function DashboardView() {
  const products = useStore((s) => s.products) ?? [];
  const equipos = useStore((s) => s.equipos) ?? [];
  const entradas = useStore((s) => s.entradas) ?? [];
  const notas = useStore((s) => s.notas) ?? [];
  const exportInventarioExcel = useStore((s) => s.exportInventarioExcel);
  const router = useRouter();

  const go = (v: ActiveView) => () => router.push(VIEW_PATH[v]);

  const stats = useMemo(() => {
    const totalUnidades = products.reduce((s, p) => s + p.quantity, 0);
    const bajoStock = products.filter((p) => p.minStock && p.minStock > 0 && p.quantity <= p.minStock);
    const equiposDisponibles = equipos.filter((e) => e.estado === "disponible").length;
    const topBajoStock = [...products].sort((a, b) => {
      const aPct = a.minStock ? a.quantity / a.minStock : 999;
      const bPct = b.minStock ? b.quantity / b.minStock : 999;
      return aPct - bPct;
    }).slice(0, 5);
    return { totalUnidades, bajoStock, equiposDisponibles, topBajoStock };
  }, [products, equipos]);

  const { totalUnidades, bajoStock, equiposDisponibles, topBajoStock } = stats;

  const kpis = [
    { label: "Productos", value: products.length, sub: "en catálogo", view: "inventario" as ActiveView },
    { label: "Unidades", value: fmtNum(totalUnidades), sub: "en stock", view: "inventario" as ActiveView },
    { label: "Equipos", value: equipos.length, sub: `${equiposDisponibles} disponibles`, view: "equipos" as ActiveView },
    { label: "Alertas", value: bajoStock.length, sub: bajoStock.length === 0 ? "Todo OK" : "bajo stock", view: "inventario" as ActiveView },
  ];

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-10">
      {/* Header minimalista */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima", weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]">
            Dashboard
          </h1>
        </div>
        <Button
          onClick={() => exportInventarioExcel()}
          variant="outline"
          className="press h-9 rounded-md border-border bg-background px-3 text-[13px] font-medium hover:bg-muted"
        >
          <Download className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Exportar
        </Button>
      </div>

      {/* KPIs — solo números grandes, sin iconos en círculos de color */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-4">
        {kpis.map((k, i) => (
          <button
            key={k.label}
            onClick={go(k.view)}
            className="anim-slide-up group bg-background p-5 text-left transition-colors hover:bg-muted/50"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <p className="text-[32px] font-semibold tabular-nums tracking-tight text-foreground sm:text-[36px]">
              {k.value}
            </p>
            <p className="mt-1 text-[13px] font-medium text-foreground">{k.label}</p>
            <p className="text-[11px] text-muted-foreground">{k.sub}</p>
          </button>
        ))}
      </div>

      {/* Grid principal */}
      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Col izquierda */}
        <div className="space-y-10 lg:col-span-2">
          {/* Productos con menor stock */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-medium text-foreground">Productos con menor stock</h2>
              <button
                onClick={go("inventario")}
                className="press flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground"
              >
                Ver todo <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
              </button>
            </div>
            <div className="space-y-4">
              {topBajoStock.map((p) => {
                const pct = p.minStock ? Math.min(100, (p.quantity / Math.max(p.minStock * 2, 1)) * 100) : 100;
                const bajo = p.minStock && p.minStock > 0 && p.quantity <= p.minStock;
                return (
                  <div key={p.id}>
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="text-[13px] font-medium text-foreground">{p.name}</span>
                      <span className="text-[13px] font-semibold tabular-nums text-foreground">
                        {fmtNum(p.quantity)}
                        {p.minStock ? (
                          <span className="ml-1 text-[11px] font-normal text-muted-foreground">/ {fmtNum(p.minStock)}</span>
                        ) : null}
                      </span>
                    </div>
                    <div className="h-px w-full bg-muted">
                      <div
                        className={cn(
                          "h-px transition-all",
                          bajo ? "bg-foreground" : "bg-foreground/40"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Entradas recientes */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-medium text-foreground">Entradas recientes</h2>
              <button
                onClick={go("inventario")}
                className="press flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground"
              >
                Ver <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
              </button>
            </div>
            {entradas.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No hay entradas registradas</p>
            ) : (
              <div className="divide-y divide-border">
                {entradas.slice(0, 5).map((e) => (
                  <div key={e.id} className="flex items-center gap-4 py-3">
                    <span className="text-[13px] font-semibold tabular-nums text-foreground">+{e.cantidad}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-foreground">{e.producto}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{e.sku}</p>
                    </div>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {new Date(e.fecha).toLocaleDateString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Col derecha */}
        <div className="space-y-10">
          {/* Equipos por estado */}
          {equipos.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[15px] font-medium text-foreground">Equipos por estado</h2>
                <button
                  onClick={go("equipos")}
                  className="press flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground"
                >
                  Ver <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
                </button>
              </div>
              <div className="space-y-3">
                {(Object.keys(ESTADO_META) as EstadoEquipo[]).map((est) => {
                  const n = equipos.filter((e) => e.estado === est).length;
                  const meta = ESTADO_META[est];
                  const pct = equipos.length > 0 ? (n / equipos.length) * 100 : 0;
                  return (
                    <div key={est}>
                      <div className="mb-1 flex items-baseline justify-between">
                        <span className="text-[13px] text-muted-foreground">{meta.label}</span>
                        <span className="text-[13px] font-semibold tabular-nums text-foreground">{n}</span>
                      </div>
                      <div className="h-px w-full bg-muted">
                        <div className="h-px bg-foreground/60" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Accesos rápidos — solo texto, sin cuadros con iconos */}
          <section>
            <h2 className="mb-4 text-[15px] font-medium text-foreground">Accesos rápidos</h2>
            <div className="divide-y divide-border border-y border-border">
              {[
                { label: "Asistente Alana", view: "ia" as ActiveView },
                { label: "Series", view: "series" as ActiveView },
                { label: "Bloc de notas", view: "bloc" as ActiveView },
                { label: "Empresas", view: "empresa" as ActiveView },
              ].map((q) => (
                <button
                  key={q.view}
                  onClick={go(q.view)}
                  className="press flex w-full items-center justify-between py-3 text-left transition-colors hover:text-foreground"
                >
                  <span className="text-[13px] font-medium text-foreground">{q.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                </button>
              ))}
            </div>
          </section>

          {/* Notas fijadas */}
          {notas.filter((n) => n.pinned).length > 0 && (
            <section>
              <h2 className="mb-3 text-[15px] font-medium text-foreground">Notas fijadas</h2>
              <div className="space-y-2">
                {notas.filter((n) => n.pinned).slice(0, 3).map((n) => (
                  <p key={n.id} className="text-[13px] text-muted-foreground">{n.texto}</p>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
