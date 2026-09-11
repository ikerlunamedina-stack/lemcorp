"use client";
import { AppShell } from "@/components/lem/app-shell";
import { useStore } from "@/lib/store";
import { ArrowLeftRight, ArrowDownToLine, ArrowUpFromLine, Clock, FileText } from "lucide-react";
import { useMemo } from "react";

export default function MovimientosPage() {
  const despachos = useStore((s) => s.despachos) ?? [];
  const entradas = useStore((s) => s.entradas) ?? [];

  const movimientos = useMemo(() => {
    const salidas = despachos.map(d => ({
      id: d.id, tipo: "salida" as const, fecha: d.fecha,
      sku: d.sku, producto: d.producto, cantidad: d.cantidad,
      detalle: d.tecnico || d.destino || "—", albaran: d.albaran,
    }));
    const entradasM = entradas.map(e => ({
      id: e.id, tipo: "entrada" as const, fecha: e.fecha,
      sku: e.sku, producto: e.producto, cantidad: e.cantidad,
      detalle: e.observacion || "Recepción", albaran: e.albaran,
    }));
    return [...salidas, ...entradasM].sort((a, b) => b.fecha - a.fecha).slice(0, 200);
  }, [despachos, entradas]);

  return (
    <AppShell>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-[22px] font-bold tracking-tight text-foreground">
            <ArrowLeftRight className="h-5 w-5 text-primary" strokeWidth={1.5} /> Movimientos
          </h1>
          <p className="text-[13px] text-muted-foreground">Historial de entradas y salidas del almacén</p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="press-card rounded-2xl bg-card p-4 shadow-sm">
            <p className="text-[24px] font-bold tabular-nums text-foreground">{movimientos.length}</p>
            <p className="text-[11px] text-muted-foreground">Total movimientos</p>
          </div>
          <div className="press-card rounded-2xl bg-card p-4 shadow-sm">
            <p className="text-[24px] font-bold tabular-nums text-rose-500">{despachos.length}</p>
            <p className="text-[11px] text-muted-foreground">Salidas</p>
          </div>
          <div className="press-card rounded-2xl bg-card p-4 shadow-sm">
            <p className="text-[24px] font-bold tabular-nums text-emerald-500">{entradas.length}</p>
            <p className="text-[11px] text-muted-foreground">Entradas</p>
          </div>
          <div className="press-card rounded-2xl bg-card p-4 shadow-sm">
            <p className="text-[24px] font-bold tabular-nums text-primary">
              {movimientos.filter(m => m.albaran).length}
            </p>
            <p className="text-[11px] text-muted-foreground">Con albarán</p>
          </div>
        </div>

        <div className="mt-4">
          <section className="press-card overflow-hidden rounded-2xl bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-[14px] font-semibold text-foreground">Historial de Movimientos</h2>
            </div>
            <div className="max-h-[500px] overflow-y-auto scroll-thin">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Tipo</th>
                    <th className="px-3 py-2 font-medium">Fecha</th>
                    <th className="px-3 py-2 font-medium">SKU</th>
                    <th className="px-3 py-2 font-medium">Producto</th>
                    <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                    <th className="px-3 py-2 font-medium">Detalle</th>
                    <th className="px-3 py-2 font-medium">Albarán</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {movimientos.length === 0 ? (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">Sin movimientos</td></tr>
                  ) : (
                    movimientos.map((m) => (
                      <tr key={`${m.tipo}-${m.id}`} className="hover:bg-muted/30">
                        <td className="px-3 py-2">
                          {m.tipo === "entrada" ? (
                            <span className="flex items-center gap-1 text-emerald-500"><ArrowDownToLine className="h-3 w-3" strokeWidth={1.5} /> Entrada</span>
                          ) : (
                            <span className="flex items-center gap-1 text-rose-500"><ArrowUpFromLine className="h-3 w-3" strokeWidth={1.5} /> Salida</span>
                          )}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">{new Date(m.fecha).toLocaleString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-foreground">{m.sku}</td>
                        <td className="px-3 py-2 text-foreground">{m.producto}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-foreground">{m.cantidad}</td>
                        <td className="px-3 py-2 text-muted-foreground">{m.detalle}</td>
                        <td className="px-3 py-2 text-muted-foreground">{m.albaran || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
