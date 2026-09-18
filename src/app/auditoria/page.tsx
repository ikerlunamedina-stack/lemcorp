"use client";
import { AppShell } from "@/components/lem/app-shell";
import { useStore } from "@/lib/store";
import { Shield, User, Clock, Trash2, Plus, Pencil, ArrowDownToLine, TrendingDown, Cpu, StickyNote, Calendar, Building2, Wrench, Package } from "lucide-react";
import { useState } from "react";
import { fmtNum } from "@/lib/num";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/lem/use-confirm";

const ICON_PROPS = { strokeWidth: 1.5 } as const;

// Mapa de acción → { icono, color, label }
const ACCION_META: Record<string, { icon: typeof Trash2; color: string; label: string }> = {
  delete_product: { icon: Trash2, color: "text-rose-600", label: "Eliminar producto" },
  delete_despacho: { icon: Trash2, color: "text-rose-600", label: "Eliminar despacho" },
  delete_entrada: { icon: Trash2, color: "text-rose-600", label: "Eliminar entrada" },
  delete_equipment: { icon: Trash2, color: "text-rose-600", label: "Eliminar equipo" },
  delete_transferencia: { icon: Trash2, color: "text-rose-600", label: "Eliminar transferencia" },
  delete_recepcion: { icon: Trash2, color: "text-rose-600", label: "Eliminar recepción" },
  delete_miembro: { icon: Trash2, color: "text-rose-600", label: "Eliminar miembro" },
  delete_nota: { icon: Trash2, color: "text-rose-600", label: "Eliminar nota" },
  delete_horario: { icon: Trash2, color: "text-rose-600", label: "Eliminar horario" },
  delete_memoria: { icon: Trash2, color: "text-rose-600", label: "Eliminar memoria" },
  delete_pistoleo_fila: { icon: Trash2, color: "text-rose-600", label: "Eliminar pistoleo" },
  create_recepcion: { icon: ArrowDownToLine, color: "text-emerald-600", label: "Crear recepción" },
  create_transferencia: { icon: TrendingDown, color: "text-amber-600", label: "Crear transferencia" },
  create_despacho: { icon: TrendingDown, color: "text-amber-600", label: "Crear despacho" },
  create_entrada: { icon: ArrowDownToLine, color: "text-emerald-600", label: "Crear entrada" },
  create_equipment: { icon: Cpu, color: "text-emerald-600", label: "Crear equipo" },
  edit_stock: { icon: Pencil, color: "text-amber-600", label: "Editar stock" },
  edit_product: { icon: Pencil, color: "text-amber-600", label: "Editar producto" },
  edit_equipment: { icon: Wrench, color: "text-amber-600", label: "Editar equipo" },
};

const ICON_BY_ENTIDAD: Record<string, typeof Package> = {
  producto: Package,
  despacho: TrendingDown,
  entrada: ArrowDownToLine,
  equipo: Cpu,
  transferencia: TrendingDown,
  recepcion: ArrowDownToLine,
  miembro: User,
  nota: StickyNote,
  horario: Calendar,
  memoria: User,
};

function fmtFecha(ts: number): string {
  return new Date(ts).toLocaleString("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AuditoriaPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const auditLog = useStore((s) => s.auditLog) ?? [];
  const clearAuditLog = useStore((s) => s.clearAuditLog);
  const [filter, setFilter] = useState<"all" | "delete" | "create" | "edit">("all");

  const filtered = filter === "all"
    ? auditLog
    : filter === "delete"
      ? auditLog.filter(a => a.accion.startsWith("delete"))
      : filter === "create"
        ? auditLog.filter(a => a.accion.startsWith("create"))
        : auditLog.filter(a => a.accion.startsWith("edit"));

  return (
    <AppShell>
      <div className="px-4 py-6 sm:px-6 lg:px-8 anim-fade-in">
        {/* Header */}
        <div className="anim-slide-up flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Sistema</p>
            <h1 className="text-[28px] font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Shield className="h-7 w-7" strokeWidth={1.5} /> Auditoría
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Registro de todas las acciones destructivas — quién, qué y cuándo
            </p>
          </div>
          {auditLog.length > 0 && (
            <Button
              variant="outline"
              onClick={async () => {
                const ok = await confirm({
                  title: "Limpiar log de auditoría",
                  description: "¿Borrar todos los registros de auditoría? Esta acción no afecta el inventario.",
                  critical: true,
                });
                if (ok) clearAuditLog();
              }}
              className="h-9 rounded-lg border-border bg-background px-3.5 text-[13px] hover:bg-muted"
            >
              <Trash2 className="mr-1.5 h-4 w-4" {...ICON_PROPS} /> Limpiar log
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="anim-slide-up grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
          <div className="bg-background px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total registros</p>
            <p className="mt-1 text-[24px] font-semibold tabular-nums text-foreground">{auditLog.length}</p>
          </div>
          <div className="bg-background px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Eliminaciones</p>
            <p className="mt-1 text-[24px] font-semibold tabular-nums text-rose-600">
              {auditLog.filter(a => a.accion.startsWith("delete")).length}
            </p>
          </div>
          <div className="bg-background px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Creaciones</p>
            <p className="mt-1 text-[24px] font-semibold tabular-nums text-emerald-600">
              {auditLog.filter(a => a.accion.startsWith("create")).length}
            </p>
          </div>
          <div className="bg-background px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ediciones</p>
            <p className="mt-1 text-[24px] font-semibold tabular-nums text-amber-600">
              {auditLog.filter(a => a.accion.startsWith("edit")).length}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="anim-slide-up mt-4 flex items-center gap-2 text-[12px]">
          <span className="text-muted-foreground">Filtrar:</span>
          {([
            { key: "all", label: "Todos" },
            { key: "delete", label: "Eliminaciones" },
            { key: "create", label: "Creaciones" },
            { key: "edit", label: "Ediciones" },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                filter === f.key
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Historial */}
        <div className="anim-slide-up mt-4">
          <section className="overflow-hidden rounded-lg border border-border bg-background">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-[14px] font-semibold text-foreground">
                Historial ({filtered.length} registro{filtered.length !== 1 ? "s" : ""})
              </h2>
            </div>
            <div className="max-h-[500px] overflow-y-auto scroll-thin">
              {filtered.length === 0 ? (
                <div className="px-4 py-16 text-center text-[13px] text-muted-foreground">
                  <Shield className="mx-auto h-10 w-10 text-muted-foreground/40" {...ICON_PROPS} />
                  <p className="mt-2">
                    {auditLog.length === 0
                      ? "No hay registros de auditoría todavía."
                      : "No hay registros con este filtro."}
                  </p>
                  {auditLog.length === 0 && (
                    <p className="mt-1 text-[12px]">
                      Las eliminaciones y ediciones críticas se registrarán aquí automáticamente.
                    </p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filtered.map((entry) => {
                    const meta = ACCION_META[entry.accion] || { icon: User, color: "text-muted-foreground", label: entry.accion };
                    const Icon = meta.icon;
                    const EntIcon = ICON_BY_ENTIDAD[entry.entidad] || User;
                    return (
                      <div key={entry.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Icon className={cn("h-3.5 w-3.5", meta.color)} {...ICON_PROPS} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-[13px] font-medium text-foreground truncate">
                              {entry.descripcion}
                            </p>
                            <span className={cn("shrink-0 text-[10px] font-bold uppercase", meta.color)}>
                              {meta.label}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <EntIcon className="h-2.5 w-2.5" {...ICON_PROPS} />
                            <span>{entry.entidad}</span>
                            {entry.usuario && (
                              <>
                                <span>·</span>
                                <User className="h-2.5 w-2.5" {...ICON_PROPS} />
                                <span>{entry.usuario}</span>
                              </>
                            )}
                            <span>·</span>
                            <Clock className="h-2.5 w-2.5" {...ICON_PROPS} />
                            <span className="tabular-nums">{fmtFecha(entry.fecha)}</span>
                          </div>
                          {entry.detalles && (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground">
                                Ver detalles
                              </summary>
                              <pre className="mt-1 max-h-[150px] overflow-auto rounded-md border border-border bg-muted/30 px-2 py-1.5 text-[10px] text-muted-foreground whitespace-pre-wrap">
                                {(() => {
                                  try {
                                    const parsed = JSON.parse(entry.detalles!);
                                    return JSON.stringify(parsed, null, 2);
                                  } catch {
                                    return entry.detalles;
                                  }
                                })()}
                              </pre>
                            </details>
                          )}
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
      {ConfirmDialog}
    </AppShell>
  );
}
