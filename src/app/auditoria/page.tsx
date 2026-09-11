"use client";
import { AppShell } from "@/components/lem/app-shell";
import { useStore } from "@/lib/store";
import { Shield, User, Clock } from "lucide-react";

export default function AuditoriaPage() {
  const auditLog = useStore((s) => s.auditLog) ?? [];

  const accionColor: Record<string, string> = {
    despacho: "text-rose-500",
    entrada: "text-emerald-500",
    edit_stock: "text-amber-500",
    delete_product: "text-rose-500",
    delete_despacho: "text-rose-500",
    delete_entrada: "text-rose-500",
  };

  return (
    <AppShell>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-[22px] font-bold tracking-tight text-foreground">
            <Shield className="h-5 w-5 text-primary" strokeWidth={1.5} /> Auditoría
          </h1>
          <p className="text-[13px] text-muted-foreground">Registro de todos los cambios — quién, qué y cuándo</p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="press-card rounded-2xl bg-card p-4 shadow-sm">
            <p className="text-[24px] font-bold tabular-nums text-foreground">{auditLog.length}</p>
            <p className="text-[11px] text-muted-foreground">Total registros</p>
          </div>
          <div className="press-card rounded-2xl bg-card p-4 shadow-sm">
            <p className="text-[24px] font-bold tabular-nums text-rose-500">{auditLog.filter(a => a.accion.includes("delete")).length}</p>
            <p className="text-[11px] text-muted-foreground">Eliminaciones</p>
          </div>
          <div className="press-card rounded-2xl bg-card p-4 shadow-sm">
            <p className="text-[24px] font-bold tabular-nums text-emerald-500">{auditLog.filter(a => a.accion === "entrada").length}</p>
            <p className="text-[11px] text-muted-foreground">Entradas</p>
          </div>
          <div className="press-card rounded-2xl bg-card p-4 shadow-sm">
            <p className="text-[24px] font-bold tabular-nums text-rose-500">{auditLog.filter(a => a.accion === "despacho").length}</p>
            <p className="text-[11px] text-muted-foreground">Despachos</p>
          </div>
        </div>

        <div className="mt-4">
          <section className="press-card overflow-hidden rounded-2xl bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-[14px] font-semibold text-foreground">Historial Completo</h2>
            </div>
            <div className="max-h-[500px] overflow-y-auto scroll-thin">
              {auditLog.length === 0 ? (
                <div className="px-4 py-12 text-center text-[13px] text-muted-foreground">No hay registros de auditoría</div>
              ) : (
                <div className="divide-y divide-border">
                  {auditLog.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <User className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-[13px] font-medium text-foreground">{entry.descripcion}</p>
                          <span className={`shrink-0 text-[10px] font-bold uppercase ${accionColor[entry.accion] || "text-muted-foreground"}`}>{entry.accion}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span>{entry.usuario}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" strokeWidth={1.5} />{new Date(entry.timestamp).toLocaleString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                          {entry.destinatario && (<><span>·</span><span>Para: {entry.destinatario}</span></>)}
                        </div>
                        {entry.valorAnterior && entry.valorNuevo && (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {entry.valorAnterior} → {entry.valorNuevo}
                          </p>
                        )}
                      </div>
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
