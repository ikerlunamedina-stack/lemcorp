"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { X, AlertTriangle, Info, BellRing } from "lucide-react";

export function NotificationStack() {
  const notificaciones = useStore((s) => s.notificaciones);
  const markNotificacionLeida = useStore((s) => s.markNotificacionLeida);
  const checkRecordatorios = useStore((s) => s.checkRecordatorios);
  const marcarRecordatorioDisparado = useStore((s) => s.marcarRecordatorioDisparado);
  const addNotificacion = useStore((s) => s.addNotificacion);

  // Check recordatorios cada 10 segundos
  useEffect(() => {
    const check = () => {
      const pendientes = checkRecordatorios();
      for (const r of pendientes) {
        addNotificacion("Recordatorio", r.texto, "recordatorio");
        marcarRecordatorioDisparado(r.id);
      }
    };
    check();
    const id = setInterval(check, 10000);
    return () => clearInterval(id);
  }, [checkRecordatorios, marcarRecordatorioDisparado, addNotificacion]);

  // Auto-dismiss después de 8 segundos
  useEffect(() => {
    const noLeidas = notificaciones.filter((n) => !n.leida);
    if (noLeidas.length === 0) return;
    const id = setTimeout(() => {
      noLeidas.forEach((n) => markNotificacionLeida(n.id));
    }, 8000);
    return () => clearTimeout(id);
  }, [notificaciones, markNotificacionLeida]);

  // Solo mostrar las no leídas (máximo 3)
  const visibles = notificaciones.filter((n) => !n.leida).slice(0, 3);

  const tipoConfig = {
    recordatorio: { icon: BellRing, color: "bg-primary text-primary-foreground", badge: "Recordatorio" },
    stock: { icon: AlertTriangle, color: "bg-amber-500 text-white", badge: "Stock" },
    alerta: { icon: AlertTriangle, color: "bg-rose-500 text-white", badge: "Alerta" },
    info: { icon: Info, color: "bg-cyan-600 text-white", badge: "Info" },
  };

  return (
    <div className="pointer-events-none fixed right-4 top-16 z-[100] flex flex-col gap-2 sm:right-6">
      {visibles.map((n, idx) => {
        const cfg = tipoConfig[n.tipo] || tipoConfig.info;
        const Icon = cfg.icon;
        const delay = idx * 80;
        return (
          <div
            key={n.id}
            className="pointer-events-auto anim-iphone-notification"
            style={{ animationDelay: `${delay}ms` }}
          >
            <div className="flex w-[320px] max-w-[calc(100vw-2rem)] items-start gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur-xl">
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-lg", cfg.color)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{cfg.badge}</span>
                  <span className="text-[9px] text-muted-foreground">· ahora</span>
                </div>
                <p className="mt-0.5 text-[13px] font-bold text-foreground">{n.titulo}</p>
                <p className="text-[12px] leading-snug text-muted-foreground">{n.cuerpo}</p>
              </div>
              <button
                onClick={() => markNotificacionLeida(n.id)}
                className="press shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
