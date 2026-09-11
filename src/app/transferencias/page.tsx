"use client";
import { AppShell } from "@/components/lem/app-shell";
import { useStore } from "@/lib/store";
import { ArrowLeftRight, TrendingDown, ArrowLeftRight as Swap, Clock } from "lucide-react";

export default function TransferenciasPage() {
  const despachos = useStore((s) => s.despachos) ?? [];
  const transferencias = despachos.filter(d => d.tipo === "transferencia");

  return (
    <AppShell>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-[22px] font-bold tracking-tight text-foreground">
            <ArrowLeftRight className="h-5 w-5 text-primary" strokeWidth={1.5} /> Transferencias
          </h1>
          <p className="text-[13px] text-muted-foreground">Movimientos entre ubicaciones y almacenes</p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <div className="press-card rounded-2xl bg-card p-4 shadow-sm">
            <p className="text-[24px] font-bold tabular-nums text-foreground">{transferencias.length}</p>
            <p className="text-[11px] text-muted-foreground">Total transferencias</p>
          </div>
          <div className="press-card rounded-2xl bg-card p-4 shadow-sm">
            <p className="text-[24px] font-bold tabular-nums text-primary">{transferencias.reduce((s, t) => s + t.cantidad, 0)}</p>
            <p className="text-[11px] text-muted-foreground">Unidades transferidas</p>
          </div>
          <div className="press-card rounded-2xl bg-card p-4 shadow-sm">
            <p className="text-[24px] font-bold tabular-nums text-foreground">{new Set(transferencias.map(t => t.destino)).size}</p>
            <p className="text-[11px] text-muted-foreground">Destinos</p>
          </div>
        </div>

        <div className="mt-4">
          <section className="press-card overflow-hidden rounded-2xl bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-[14px] font-semibold text-foreground">Historial de Transferencias</h2>
            </div>
            <div className="max-h-[500px] overflow-y-auto scroll-thin">
              {transferencias.length === 0 ? (
                <div className="px-4 py-12 text-center text-[13px] text-muted-foreground">No hay transferencias registradas</div>
              ) : (
                <div className="divide-y divide-border">
                  {transferencias.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10"><Swap className="h-4 w-4 text-primary" strokeWidth={1.5} /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-foreground">{t.cantidad} × {t.producto || t.sku}</p>
                        <p className="text-[11px] text-muted-foreground">Destino: {t.ubicacionDestino || t.destino || "—"}</p>
                      </div>
                      <span className="text-[11px] tabular-nums text-muted-foreground">{new Date(t.fecha).toLocaleString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
