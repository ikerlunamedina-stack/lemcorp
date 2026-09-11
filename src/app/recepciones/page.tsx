"use client";
import { AppShell } from "@/components/lem/app-shell";
import { useStore } from "@/lib/store";
import { ArrowDownToLine, Package, FileText, Calendar } from "lucide-react";

export default function RecepcionesPage() {
  const entradas = useStore((s) => s.entradas) ?? [];

  const hoy = entradas.filter(e => {
    try { return new Date(e.fecha).toDateString() === new Date().toDateString(); }
    catch { return false; }
  }).length;

  return (
    <AppShell>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-[22px] font-bold tracking-tight text-foreground">
            <ArrowDownToLine className="h-5 w-5 text-primary" strokeWidth={1.5} /> Recepciones
          </h1>
          <p className="text-[13px] text-muted-foreground">Control de ingresos al almacén con albaranes</p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="press-card rounded-2xl bg-card p-4 shadow-sm">
            <p className="text-[24px] font-bold tabular-nums text-foreground">{entradas.length}</p>
            <p className="text-[11px] text-muted-foreground">Total recepciones</p>
          </div>
          <div className="press-card rounded-2xl bg-card p-4 shadow-sm">
            <p className="text-[24px] font-bold tabular-nums text-emerald-500">{hoy}</p>
            <p className="text-[11px] text-muted-foreground">Recepciones hoy</p>
          </div>
          <div className="press-card rounded-2xl bg-card p-4 shadow-sm">
            <p className="text-[24px] font-bold tabular-nums text-primary">{entradas.filter(e => e.albaran).length}</p>
            <p className="text-[11px] text-muted-foreground">Con albarán</p>
          </div>
          <div className="press-card rounded-2xl bg-card p-4 shadow-sm">
            <p className="text-[24px] font-bold tabular-nums text-foreground">{entradas.reduce((s, e) => s + e.cantidad, 0)}</p>
            <p className="text-[11px] text-muted-foreground">Unidades totales</p>
          </div>
        </div>

        <div className="mt-4">
          <section className="press-card overflow-hidden rounded-2xl bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-[14px] font-semibold text-foreground">Historial de Recepciones</h2>
            </div>
            <div className="max-h-[500px] overflow-y-auto scroll-thin">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Fecha</th>
                    <th className="px-3 py-2 font-medium">SKU</th>
                    <th className="px-3 py-2 font-medium">Producto</th>
                    <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                    <th className="px-3 py-2 font-medium">Albarán</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entradas.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Sin recepciones</td></tr>
                  ) : (
                    entradas.map((e) => (
                      <tr key={e.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">{new Date(e.fecha).toLocaleString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-foreground">{e.sku}</td>
                        <td className="px-3 py-2 text-foreground">{e.producto}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-emerald-500">+{e.cantidad}</td>
                        <td className="px-3 py-2 text-muted-foreground">{e.albaran || "—"}</td>
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
