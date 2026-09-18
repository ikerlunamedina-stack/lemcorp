"use client";
import { AppShell } from "@/components/lem/app-shell";
import { useStore } from "@/lib/store";
import { Bell, AlertTriangle, CheckCircle, Clock } from "lucide-react";

export default function AlertasPage() {
  const products = useStore((s) => s.products);
  const equipos = useStore((s) => s.equipos);

  const alertasStock = products.filter(p => p.minStock && p.minStock > 0 && p.quantity <= p.minStock);
  const agotados = products.filter(p => p.quantity === 0);
  const equiposAveriados = equipos.filter(e => e.estado === "averiado");
  const equiposRetiro = equipos.filter(e => e.estado === "en_retiro");

  return (
    <AppShell>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-[22px] font-bold tracking-tight text-foreground">
            <Bell className="h-5 w-5 text-primary" strokeWidth={1.5} /> Alertas
          </h1>
          <p className="text-[13px] text-muted-foreground">Alertas activas del sistema</p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="press-card rounded-2xl bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" strokeWidth={1.5} /></div>
            <p className="text-[24px] font-bold tabular-nums text-amber-500">{alertasStock.length}</p>
            <p className="text-[11px] text-muted-foreground">Bajo stock</p>
          </div>
          <div className="press-card rounded-2xl bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-rose-500" strokeWidth={1.5} /></div>
            <p className="text-[24px] font-bold tabular-nums text-rose-500">{agotados.length}</p>
            <p className="text-[11px] text-muted-foreground">Agotados</p>
          </div>
          <div className="press-card rounded-2xl bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-orange-500" strokeWidth={1.5} /></div>
            <p className="text-[24px] font-bold tabular-nums text-orange-500">{equiposAveriados.length}</p>
            <p className="text-[11px] text-muted-foreground">Equipos averiados</p>
          </div>
          <div className="press-card rounded-2xl bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} /></div>
            <p className="text-[24px] font-bold tabular-nums text-foreground">{equiposRetiro.length}</p>
            <p className="text-[11px] text-muted-foreground">En retiro</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <section className="press-card overflow-hidden rounded-2xl bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3"><h2 className="text-[14px] font-semibold text-foreground">Alertas de Stock</h2></div>
            <div className="max-h-[300px] overflow-y-auto scroll-thin">
              {alertasStock.length === 0 && agotados.length === 0 ? (
                <div className="flex items-center gap-2 px-4 py-8 text-[13px] text-emerald-500">
                  <CheckCircle className="h-4 w-4" strokeWidth={1.5} /> Todo bien — sin alertas
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {[...agotados.map(p => ({ ...p, estado: "agotado" })), ...alertasStock.map(p => ({ ...p, estado: "bajo" }))].map(p => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${p.estado === "agotado" ? "bg-rose-500" : "bg-amber-500"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-foreground">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">Stock: {p.quantity} · Min: {p.minStock || 0}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="press-card overflow-hidden rounded-2xl bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3"><h2 className="text-[14px] font-semibold text-foreground">Equipos con Problemas</h2></div>
            <div className="max-h-[300px] overflow-y-auto scroll-thin">
              {equiposAveriados.length === 0 && equiposRetiro.length === 0 ? (
                <div className="flex items-center gap-2 px-4 py-8 text-[13px] text-emerald-500">
                  <CheckCircle className="h-4 w-4" strokeWidth={1.5} /> Todos los equipos operativos
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {[...equiposAveriados, ...equiposRetiro].map(e => (
                    <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${e.estado === "averiado" ? "bg-orange-500" : "bg-muted-foreground"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[12px] font-medium text-foreground">{e.serie}</p>
                        <p className="text-[11px] text-muted-foreground">{e.modelo}</p>
                      </div>
                      <span className="shrink-0 text-[10px] uppercase text-muted-foreground">{e.estado}</span>
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
