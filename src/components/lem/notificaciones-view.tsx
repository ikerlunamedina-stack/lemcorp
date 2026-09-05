"use client";

import { useStore } from "@/lib/store";

import {
  BellRing, AlertTriangle, Info, Package, Bell,
  Check, Trash2, CheckCheck,
} from "lucide-react";

const ICON_PROPS = { strokeWidth: 1.5 } as const;

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

  const hasAny =
    notificaciones.length > 0 ||
    bajoStock.length > 0 ||
    recordatoriosPendientes.length > 0;

  return (
    <div className="anim-fade-in mx-auto w-full max-w-[720px] px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="anim-slide-up mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Avisos
          </p>
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground">
            Notificaciones
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            <span className="tabular-nums">{noLeidas.length}</span> sin leer · <span className="tabular-nums">{notificaciones.length}</span> total
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {leidas.length > 0 && (
            <button
              onClick={clearNotificacionesLeidas}
              className="press inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[12px] font-medium text-foreground hover:bg-muted"
            >
              <CheckCheck className="h-3.5 w-3.5" {...ICON_PROPS} />
              Limpiar leídas
            </button>
          )}
          {notificaciones.length > 0 && (
            <button
              onClick={clearNotificaciones}
              className="press inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" {...ICON_PROPS} />
              Borrar todo
            </button>
          )}
        </div>
      </div>

      {/* Alertas de stock — hairline list with small red dot */}
      {bajoStock.length > 0 && (
        <div className="anim-slide-up mb-4 overflow-hidden rounded-lg border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h2 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" {...ICON_PROPS} />
              Productos con bajo stock
            </h2>
            <span className="text-[12px] tabular-nums text-muted-foreground">{bajoStock.length}</span>
          </div>
          <ul className="divide-y divide-border">
            {bajoStock.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-foreground">{p.name}</p>
                  <p className="font-mono text-[11px] tabular-nums text-muted-foreground">{p.sku}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-[13px] font-semibold tabular-nums text-destructive">{p.quantity}</span>
                  <span className="ml-0.5 text-[11px] tabular-nums text-muted-foreground">/ {p.minStock} mín</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recordatorios pendientes — hairline list */}
      {recordatoriosPendientes.length > 0 && (
        <div className="anim-slide-up mb-4 overflow-hidden rounded-lg border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h2 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <BellRing className="h-3.5 w-3.5" {...ICON_PROPS} />
              Recordatorios próximos
            </h2>
            <span className="text-[12px] tabular-nums text-muted-foreground">{recordatoriosPendientes.length}</span>
          </div>
          <ul className="divide-y divide-border">
            {recordatoriosPendientes.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/60" aria-hidden />
                <p className="flex-1 truncate text-[13px] text-foreground">{r.texto}</p>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {new Date(r.cuando).toLocaleString("es-PE", {
                    timeZone: "America/Lima",
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Notificaciones no leídas — hairline list */}
      {noLeidas.length > 0 && (
        <div className="mb-4">
          <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Sin leer
          </h2>
          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <ul className="divide-y divide-border">
              {noLeidas.map((n) => {
                const cfg = tipoConfig[n.tipo] || tipoConfig.info;
                const Icon = cfg.icon;
                return (
                  <li key={n.id} className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" aria-hidden />
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" {...ICON_PROPS} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{cfg.label}</span>
                        <span className="text-[10px] tabular-nums text-muted-foreground">· {tiempoRelativoLima(n.fecha)}</span>
                      </div>
                      <p className="mt-0.5 text-[13px] font-medium text-foreground">{n.titulo}</p>
                      <p className="text-[12px] text-muted-foreground">{n.cuerpo}</p>
                    </div>
                    <button
                      onClick={() => markNotificacionLeida(n.id)}
                      className="press shrink-0 rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100"
                      title="Marcar como leída"
                    >
                      <Check className="h-3.5 w-3.5" {...ICON_PROPS} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Notificaciones leídas — hairline list, dimmed */}
      {leidas.length > 0 && (
        <div>
          <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Leídas
          </h2>
          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <ul className="divide-y divide-border">
              {leidas.map((n) => {
                const cfg = tipoConfig[n.tipo] || tipoConfig.info;
                const Icon = cfg.icon;
                return (
                  <li key={n.id} className="flex items-start gap-3 px-4 py-3 opacity-60">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" aria-hidden />
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" {...ICON_PROPS} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{cfg.label}</span>
                        <span className="text-[10px] tabular-nums text-muted-foreground">· {tiempoRelativoLima(n.fecha)}</span>
                      </div>
                      <p className="mt-0.5 text-[13px] font-medium text-foreground">{n.titulo}</p>
                      <p className="text-[12px] text-muted-foreground">{n.cuerpo}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {!hasAny && (
        <div className="anim-fade-in rounded-lg border border-dashed border-border bg-background px-4 py-16 text-center">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground/40" {...ICON_PROPS} />
          <p className="mt-3 text-[13px] font-medium text-foreground">No hay notificaciones</p>
          <p className="mt-1 text-[12px] text-muted-foreground">Los recordatorios y alertas aparecerán aquí</p>
        </div>
      )}
    </div>
  );
}
