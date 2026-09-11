"use client";
import { AppShell } from "@/components/lem/app-shell";
import { useStore } from "@/lib/store";
import { Building2, Phone, Mail, Package, Users } from "lucide-react";
import { useState } from "react";

export default function ProveedoresPage() {
  const empresa = useStore((s) => s.empresa);
  const miembros = useStore((s) => s.miembros);
  const despachos = useStore((s) => s.despachos) ?? [];

  const tecnicosUnicos = [...new Set(despachos.map(d => d.tecnico).filter(Boolean))];

  return (
    <AppShell>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-[22px] font-bold tracking-tight text-foreground">
            <Building2 className="h-5 w-5 text-primary" strokeWidth={1.5} /> Proveedores
          </h1>
          <p className="text-[13px] text-muted-foreground">Empresas y contratistas vinculados</p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="press-card rounded-2xl bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" strokeWidth={1.5} /></div>
            <p className="text-[24px] font-bold tabular-nums text-foreground">1</p>
            <p className="text-[11px] text-muted-foreground">Empresa principal</p>
          </div>
          <div className="press-card rounded-2xl bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2"><Users className="h-4 w-4 text-emerald-500" strokeWidth={1.5} /></div>
            <p className="text-[24px] font-bold tabular-nums text-foreground">{miembros.length}</p>
            <p className="text-[11px] text-muted-foreground">Personal</p>
          </div>
          <div className="press-card rounded-2xl bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2"><Package className="h-4 w-4 text-amber-500" strokeWidth={1.5} /></div>
            <p className="text-[24px] font-bold tabular-nums text-foreground">{tecnicosUnicos.length}</p>
            <p className="text-[11px] text-muted-foreground">Contratistas</p>
          </div>
          <div className="press-card rounded-2xl bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2"><Building2 className="h-4 w-4 text-violet-500" strokeWidth={1.5} /></div>
            <p className="text-[24px] font-bold tabular-nums text-foreground">{despachos.length}</p>
            <p className="text-[11px] text-muted-foreground">Despachos totales</p>
          </div>
        </div>

        <div className="mt-4">
          <section className="press-card overflow-hidden rounded-2xl bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3"><h2 className="text-[14px] font-semibold text-foreground">Empresa Principal</h2></div>
            <div className="p-4">
              <div className="flex items-center gap-3 py-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><Building2 className="h-5 w-5 text-primary" strokeWidth={1.5} /></div>
                <div>
                  <p className="text-[15px] font-bold text-foreground">{empresa?.nombre || "Sin nombre"}</p>
                  <p className="text-[12px] text-muted-foreground">RUC: {empresa?.ruc || "—"}</p>
                </div>
              </div>
              <div className="mt-3 space-y-2 text-[13px]">
                <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" strokeWidth={1.5} /> {empresa?.telefono || "—"}</div>
                <div className="flex items-center gap-2 text-muted-foreground"><Building2 className="h-3.5 w-3.5" strokeWidth={1.5} /> {empresa?.direccion || "—"}</div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-3">
          <section className="press-card overflow-hidden rounded-2xl bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3"><h2 className="text-[14px] font-semibold text-foreground">Contratistas</h2></div>
            <div className="max-h-[300px] overflow-y-auto scroll-thin">
              {tecnicosUnicos.length === 0 ? (
                <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">Sin contratistas registrados</div>
              ) : (
                <div className="divide-y divide-border">
                  {tecnicosUnicos.map(tecnico => {
                    const count = despachos.filter(d => d.tecnico === tecnico).length;
                    const total = despachos.filter(d => d.tecnico === tecnico).reduce((s, d) => s + d.cantidad, 0);
                    return (
                      <div key={tecnico} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted"><Users className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} /></div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-foreground">{tecnico}</p>
                          <p className="text-[11px] text-muted-foreground">{count} despachos · {total} unidades</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
