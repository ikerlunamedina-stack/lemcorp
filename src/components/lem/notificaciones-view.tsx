"use client";

import { useStore } from "@/lib/store";

import {
  BellRing, AlertTriangle, Info, Package, Bell,
  Check, Trash2, CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function tiempoRelativoLima(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return new Date(ts).toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
}

const tipoConfig = {
  recordatorio: { icon: BellRing, label: "Recordatorio" },
  horario: { icon: Bell, label: "Horario" },
  stock: { icon: Package, label: "Stock" },
  alerta: { icon: AlertTriangle, label: "Alerta" },
  info: { icon: Info, label: "Info" },
};

export function NotificacionesView() {
  const notificaciones = useStore((s) => s.notificaciones);
  const markNotificacionLeida = useStore((s) => s.markNotificacionLeida);
  const clearNotificaciones = useStore((s) => s.clearNotificaciones);
  const clearNotificacionesLeidas = useStore((s) => s.clearNotificacionesLeidas);
  const products = useStore((s) => s.products);
  const recordatorios = useStore((s) => s.recordatorios);

  const noLeidas = notificaciones.filter((n) => !n.leida);
  const leidas = notificaciones.filter((n) => n.leida);
  const bajoStock = products.filter((p) => p.minStock && p.minStock > 0 && p.quantity <= p.minStock);
  const recordatoriosPendientes = recordatorios.filter((r) => !r.disparado);

  return (
    <div className="mx-auto w-full max-w-[800px] px-4 py-5 lg:px-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Notificaciones</h1>
          <p className="text-sm text-muted-foreground">
            {noLeidas.length} sin leer · {notificaciones.length} total
          </p>
        </div>
        <div className="flex gap-2">
          {leidas.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearNotificacionesLeidas} className="press h-8 rounded-lg text-xs">
              <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Limpiar leídas
            </Button>
          )}
          {notificaciones.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearNotificaciones} className="press h-8 rounded-lg text-xs text-destructive">
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Borrar todo
            </Button>
          )}
        </div>
      </div>

      {/* Alertas de stock */}
      {bajoStock.length > 0 && (
        <div className="mb-4 rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </span>
            Productos con bajo stock ({bajoStock.length})
          </h2>
          <div className="space-y-1.5">
            {bajoStock.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-md border border-border/40 p-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{p.name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{p.sku}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold tabular-nums text-destructive">{p.quantity}</span>
                  <span className="text-muted-foreground"> / {p.minStock} mín</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recordatorios pendientes */}
      {recordatoriosPendientes.length > 0 && (
        <div className="mb-4 rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
              <BellRing className="h-4 w-4 text-foreground" />
            </span>
            Recordatorios próximos ({recordatoriosPendientes.length})
          </h2>
          <div className="space-y-1.5">
            {recordatoriosPendientes.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-md border border-border/40 p-2 text-sm">
                <p className="flex-1 truncate text-foreground">{r.texto}</p>
                <span className="ml-2 shrink-0 text-[11px] text-muted-foreground">
                  {new Date(r.cuando).toLocaleString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notificaciones no leídas */}
      {noLeidas.length > 0 && (
        <div className="mb-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Sin leer</h2>
          <div className="space-y-2">
            {noLeidas.map((n) => {
              const cfg = tipoConfig[n.tipo] || tipoConfig.info;
              const Icon = cfg.icon;
              return (
                <div key={n.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent">
                    <Icon className="h-4 w-4 text-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{cfg.label}</span>
                      <span className="text-[9px] text-muted-foreground">· {tiempoRelativoLima(n.fecha)}</span>
                    </div>
                    <p className="mt-0.5 text-sm font-bold text-foreground">{n.titulo}</p>
                    <p className="text-[13px] text-muted-foreground">{n.cuerpo}</p>
                  </div>
                  <button
                    onClick={() => markNotificacionLeida(n.id)}
                    className="press shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    title="Marcar como leída"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notificaciones leídas */}
      {leidas.length > 0 && (
        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Leídas</h2>
          <div className="space-y-2">
            {leidas.map((n) => {
              const cfg = tipoConfig[n.tipo] || tipoConfig.info;
              const Icon = cfg.icon;
              return (
                <div key={n.id} className="flex items-start gap-3 rounded-lg border border-border/40 bg-card/50 p-3 opacity-70">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{cfg.label}</span>
                      <span className="text-[9px] text-muted-foreground">· {tiempoRelativoLima(n.fecha)}</span>
                    </div>
                    <p className="mt-0.5 text-sm font-semibold text-foreground">{n.titulo}</p>
                    <p className="text-[13px] text-muted-foreground">{n.cuerpo}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {notificaciones.length === 0 && bajoStock.length === 0 && recordatoriosPendientes.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-card px-4 py-16 text-center shadow-sm">
          <Bell className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-foreground">No hay notificaciones</p>
          <p className="mt-1 text-xs text-muted-foreground">Los recordatorios y alertas aparecerán aquí</p>
        </div>
      )}
    </div>
  );
}
