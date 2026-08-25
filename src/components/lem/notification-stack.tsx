"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  X,
  AlertTriangle,
  Info,
  BellRing,
  Calendar,
  Eye,
} from "lucide-react";
import { speak } from "@/lib/tts";

interface FullScreenNotif {
  id: string;
  titulo: string;
  cuerpo: string;
  tipo: "recordatorio" | "horario";
  textoVoz: string;
  // destino opcional al tocar "Ver"
  viewDestino?: "ia" | "horario";
  // id interno para hacer tracking
  internalKey: string;
}

const AUTO_DISMISS_MS = 15_000;

function a12h(hora24: string): string {
  if (!hora24) return "";
  const [h, m] = hora24.split(":").map((x) => parseInt(x, 10));
  if (isNaN(h)) return hora24;
  const periodo = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m || 0).padStart(2, "0")} ${periodo}`;
}

export function NotificationStack() {
  const notificaciones = useStore((s) => s.notificaciones);
  const markNotificacionLeida = useStore((s) => s.markNotificacionLeida);
  const checkRecordatorios = useStore((s) => s.checkRecordatorios);
  const marcarRecordatorioDisparado = useStore((s) => s.marcarRecordatorioDisparado);
  const addNotificacion = useStore((s) => s.addNotificacion);
  const checkHorario = useStore((s) => s.checkHorario);
  const marcarHorarioDisparado = useStore((s) => s.marcarHorarioDisparado);
  const vozEnabled = useStore((s) => s.settings.voz);
  const router = useRouter();

  // Notificación a pantalla completa (estilo iOS)
  const [fullNotif, setFullNotif] = useState<FullScreenNotif | null>(null);

  // Helper: dispara una notificación full-screen
  const dispararFull = useCallback(
    (n: FullScreenNotif) => {
      setFullNotif((prev) => prev ?? n); // solo la primera si hay varias
      // Hablar el recordatorio en voz alta si está activado
      if (vozEnabled) {
        speak(n.textoVoz);
      }
    },
    [vozEnabled]
  );

  // Cerrar la notificación full-screen
  const cerrarFull = useCallback(() => {
    setFullNotif(null);
  }, []);

  // Botón "Ver": navega al destino y cierra
  const verFull = useCallback(() => {
    if (fullNotif?.viewDestino) {
      router.push(fullNotif.viewDestino === "ia" ? "/ia" : "/horario");
    }
    setFullNotif(null);
  }, [fullNotif, router]);

  // Check recordatorios cada 10 segundos (mantener patrón previo)
  useEffect(() => {
    const check = () => {
      const pendientes = checkRecordatorios();
      for (const r of pendientes) {
        addNotificacion("Recordatorio", r.texto, "recordatorio");
        marcarRecordatorioDisparado(r.id);
        // Disparar notificación full-screen estilo iOS
        dispararFull({
          id: r.id,
          internalKey: `rec-${r.id}`,
          titulo: "Recordatorio",
          cuerpo: r.texto,
          tipo: "recordatorio",
          textoVoz: `Recordatorio. ${r.texto}`,
          viewDestino: "ia",
        });
      }
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [checkRecordatorios, marcarRecordatorioDisparado, addNotificacion, dispararFull]);

  // Check horario cada 2 minutos (reducido para ahorrar memoria)
  useEffect(() => {
    const check = () => {
      const matches = checkHorario();
      for (const h of matches) {
        const ahora = new Date();
        const fechaISO = `${ahora.getFullYear()}-${(ahora.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-${ahora.getDate().toString().padStart(2, "0")}`;
        marcarHorarioDisparado(h.id, fechaISO);
        addNotificacion("Horario", `${a12h(h.horaInicio)} · ${h.actividad}`, "horario");
        // Disparar notificación full-screen
        dispararFull({
          id: h.id,
          internalKey: `hor-${h.id}-${fechaISO}`,
          titulo: "Horario del almacén",
          cuerpo: `${a12h(h.horaInicio)} – ${a12h(h.horaFin)} · ${h.actividad}`,
          tipo: "horario",
          textoVoz: `Es hora de ${h.actividad}`,
          viewDestino: "horario",
        });
      }
    };
    check();
    const id = setInterval(check, 120_000);
    return () => clearInterval(id);
  }, [checkHorario, marcarHorarioDisparado, addNotificacion, dispararFull]);

  // Auto-dismiss después de 15 segundos
  useEffect(() => {
    if (!fullNotif) return;
    const id = setTimeout(() => {
      setFullNotif(null);
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [fullNotif]);

  // Auto-dismiss después de 8 segundos (solo para toasts pequeños)
  useEffect(() => {
    const noLeidas = notificaciones.filter(
      (n) => !n.leida && n.tipo !== "recordatorio" && n.tipo !== "horario"
    );
    if (noLeidas.length === 0) return;
    const id = setTimeout(() => {
      noLeidas.forEach((n) => markNotificacionLeida(n.id));
    }, 8000);
    return () => clearTimeout(id);
  }, [notificaciones, markNotificacionLeida]);

  // Solo mostrar toasts pequeños para tipos no full-screen (máximo 3)
  const visibles = notificaciones
    .filter((n) => !n.leida && n.tipo !== "recordatorio" && n.tipo !== "horario")
    .slice(0, 3);

  const tipoConfig = {
    recordatorio: { icon: BellRing, color: "bg-primary text-primary-foreground", badge: "Recordatorio" },
    horario: { icon: Calendar, color: "bg-primary text-primary-foreground", badge: "Horario" },
    stock: { icon: AlertTriangle, color: "bg-amber-500 text-white", badge: "Stock" },
    alerta: { icon: AlertTriangle, color: "bg-rose-500 text-white", badge: "Alerta" },
    info: { icon: Info, color: "bg-cyan-600 text-white", badge: "Info" },
  };

  return (
    <>
      {/* Toast pequeños (no recordatorios ni horarios — esos van full-screen) */}
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

      {/* ───── Notificación full-screen estilo iPhone (z-[200]) ───── */}
      {fullNotif && (
        <div
          className="fixed inset-0 z-[200] flex items-start justify-center px-4 pt-[max(env(safe-area-inset-top,0px),1rem)] sm:pt-16"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="notif-fullscreen-title"
        >
          {/* Fondo blur con oscurecido */}
          <button
            aria-label="Cerrar notificación"
            onClick={cerrarFull}
            className="absolute inset-0 bg-black/50 backdrop-blur-md anim-fade-in"
            tabIndex={-1}
          />

          {/* Tarjeta iOS muy redondeada */}
          <div
            className="pointer-events-auto relative w-full max-w-sm anim-ios-slide-down"
          >
            <div className="overflow-hidden rounded-3xl border border-border bg-card/95 shadow-2xl backdrop-blur-2xl">
              {/* Header: app icono + nombre + hora */}
              <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
                  {/* Logo del cubo */}
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2 L22 8.5 L22 15.5 L12 22 L2 15.5 L2 8.5 Z" />
                    <path d="M12 2 L12 9" />
                    <path d="M22 8.5 L12 9 L2 8.5" />
                    <path d="M12 9 L12 22" />
                  </svg>
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-[13px] font-bold text-foreground">Alana</span>
                  <span className="text-[10px] text-muted-foreground">ahora</span>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                      fullNotif.tipo === "horario"
                        ? "bg-primary/15 text-primary"
                        : "bg-primary/15 text-primary"
                    )}
                  >
                    {fullNotif.tipo === "horario" ? "Horario" : "Recordatorio"}
                  </span>
                </div>
              </div>

              {/* Cuerpo */}
              <div className="px-4 pb-3">
                <p className="text-[16px] font-bold leading-tight text-foreground">
                  {fullNotif.titulo}
                </p>
                <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
                  {fullNotif.cuerpo}
                </p>
              </div>

              {/* Botones */}
              <div className="grid grid-cols-2 gap-2 border-t border-border bg-card/50 px-4 py-3">
                <button
                  onClick={cerrarFull}
                  className="press flex h-10 items-center justify-center rounded-2xl border border-border bg-muted/40 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                  Cerrar
                </button>
                <button
                  onClick={verFull}
                  className="press flex h-10 items-center justify-center gap-1.5 rounded-2xl bg-primary text-[13px] font-semibold text-primary-foreground shadow-md transition-all hover:brightness-105"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Ver
                </button>
              </div>
            </div>

            {/* Indicador de auto-cierre (barra de progreso) */}
            <div className="mx-auto mt-2 h-0.5 w-24 overflow-hidden rounded-full bg-border/40">
              <div
                className="h-full bg-primary/60"
                style={{
                  animation: `lem-progress-shrink ${AUTO_DISMISS_MS}ms linear forwards`,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
