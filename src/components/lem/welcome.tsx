"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Boxes,
  Wrench,
  Truck,
  Zap,
  ArrowRight,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";

const WELCOME_KEY = "lemcorp-welcome-seen-v1";

export function WelcomeOverlay() {
  const [open, setOpen] = useState(false);
  const setActiveView = useStore((s) => s.setActiveView);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(WELCOME_KEY);
    if (!seen) {
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(WELCOME_KEY, "1");
    setOpen(false);
  };

  const features = [
    {
      icon: <Boxes className="h-5 w-5" />,
      title: "Inventario consolidado",
      desc: "Suma SKUs y unidades de todos tus archivos en un solo tablero, con alertas de bajo stock.",
    },
    {
      icon: <Truck className="h-5 w-5" />,
      title: "Despachos automáticos",
      desc: "Al registrar un despacho, el inventario se descuenta solo, sin fórmulas ni copiar y pegar.",
    },
    {
      icon: <Wrench className="h-5 w-5" />,
      title: "Equipos por modelo",
      desc: "Agrupa equipos averiados o en retiro por modelo y consulta cada número de serie.",
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Fórmulas reales",
      desc: "Importa Excel con fórmulas (SUMA, SI, referencias) y escribe las tuyas con recálculo automático.",
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-4"
          onClick={dismiss}
        >
          <motion.div
            initial={{ scale: 0.94, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={dismiss}
              className="press absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="px-7 pt-8 pb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <span className="text-lg font-semibold">L</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    Bienvenido a LEMCORP
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Gestor centralizado de planillas
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                Reemplaza tus archivos Excel sueltos por una sola aplicación.
                Todo se guarda en este equipo.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2.5">
                {features.map((f, i) => (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                    className="rounded-xl border border-border bg-muted/30 p-3"
                  >
                    <span className="text-muted-foreground">{f.icon}</span>
                    <p className="mt-2 text-[13px] font-semibold">{f.title}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      {f.desc}
                    </p>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-2">
                <Button
                  onClick={() => {
                    dismiss();
                    setActiveView("resumen");
                  }}
                  className="press flex-1 rounded-xl"
                >
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Empezar
                </Button>
                <Button
                  variant="outline"
                  onClick={dismiss}
                  className="press rounded-xl"
                >
                  Cerrar
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
