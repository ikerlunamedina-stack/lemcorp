"use client";

import { cn } from "@/lib/utils";

interface AlanaAvatarProps {
  /** Tamaño en píxeles (cuadrado) */
  size?: number;
  /** Clases extra */
  className?: string;
  /** Mostrar anillo de glow alrededor */
  glow?: boolean;
}

/**
 * Avatar de Alana (la IA asistente).
 * Usa /alana-avatar.png en todos los lugares donde aparece la IA.
 */
export function AlanaAvatar({ size = 32, className, glow = false }: AlanaAvatarProps) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-primary/10",
        glow && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background",
        className
      )}
      style={{ width: size, height: size }}
    >
      <img
        src="/alana-avatar.png"
        alt="Alana"
        className="h-full w-full object-cover"
        draggable={false}
      />
    </div>
  );
}
