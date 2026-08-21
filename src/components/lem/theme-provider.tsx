"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import type { Tema } from "@/lib/types";

function applyTema(tema: Tema) {
  const root = document.documentElement;
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const isDark = tema === "oscuro" || (tema === "sistema" && prefersDark);

  if (isDark) {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const tema = useStore((s) => s.settings.tema);

  // Aplica el tema cuando cambia settings.tema
  useEffect(() => {
    applyTema(tema);
  }, [tema]);

  // Si está en "sistema", escucha cambios en prefers-color-scheme
  useEffect(() => {
    if (tema !== "sistema") return;
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTema("sistema");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [tema]);

  // Aplica tema oscuro al montar para evitar flash inicial
  useEffect(() => {
    applyTema(tema);
    // tema se aplica también arriba en el primer useEffect; este efecto es
    // intencionalmente redundante para garantizar el estado inicial.
  }, [tema]);

  return <>{children}</>;
}
