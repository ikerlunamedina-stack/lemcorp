"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const VERSION_KEY = "lemcorp-version-seen";
const CURRENT_VERSION = "3.5.0";

const NOVEDADES = [
  {
    version: "3.5.0",
    titulo: "Nueva versión disponible",
    fecha: "27 ago 2026",
    cambios: [
      "Sistema de apagado y encendido con código de seguridad",
      "Alana ahora prepara el almacén durante 5 minutos al encender",
      "Voz de Alana más natural con Google Translate TTS",
      "Diseño con colores teal corporativos y todo redondeado",
      "Menú hamburguesa para móvil con animaciones fluidas",
      "Sistema de permisos por roles (admin, supervisor, almacenero)",
      "Pistoleo con 3 campos: serie, MAC y CM MAC",
      "Detección de series duplicadas con aviso clickeable",
      "Alana puede añadir productos, notas, equipos y cambiar el tema",
      "Exportar inventario a Excel con diseño profesional",
    ],
  },
];

interface Novedad {
  version: string;
  titulo: string;
  fecha: string;
  cambios: string[];
}

export function UpdateNotifier() {
  const [showDialog, setShowDialog] = useState(false);
  const [novedad, setNovedad] = useState<Novedad | null>(null);

  useEffect(() => {
    try {
      const seenVersion = localStorage.getItem(VERSION_KEY);
      if (seenVersion !== CURRENT_VERSION && NOVEDADES.length > 0) {
        // Mostrar después de 2 segundos para que la página cargue primero
        const timer = setTimeout(() => {
          setNovedad(NOVEDADES[0]);
          setShowDialog(true);
        }, 2000);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  const cerrarYMarcar = () => {
    try {
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    } catch {}
    setShowDialog(false);
  };

  if (!showDialog || !novedad) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="flex max-h-[85vh] w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl anim-page-enter">
        {/* Header con gradiente */}
        <div className="relative gradient-aurora shrink-0 px-5 py-4">
          <div className="absolute inset-0 anim-aurora-shimmer" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wide text-white/80">
                  Novedad · v{novedad.version}
                </p>
                <h2 className="text-[15px] font-bold text-white">{novedad.titulo}</h2>
              </div>
            </div>
            <button
              onClick={cerrarYMarcar}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white transition-all hover:bg-white/30 active:scale-95"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto scroll-thin p-5">
          <p className="text-[11px] text-muted-foreground">
            {novedad.fecha} — Lo nuevo:
          </p>

          {/* Lista de cambios */}
          <div className="mt-3 space-y-2">
            {novedad.cambios.map((cambio, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/30 p-2.5 transition-all hover:bg-muted/50"
              >
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <Check className="h-2.5 w-2.5 text-primary" />
                </div>
                <p className="text-[12px] font-medium leading-snug text-foreground">
                  {cambio}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Botón cerrar fijo abajo */}
        <div className="shrink-0 border-t border-border p-4">
          <button
            onClick={cerrarYMarcar}
            className="press flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-[13px] font-bold text-primary-foreground transition-all hover:brightness-105 active:scale-95"
          >
            <Check className="h-4 w-4" />
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
