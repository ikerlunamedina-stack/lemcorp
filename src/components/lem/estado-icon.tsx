"use client";

import { Check, X, Undo2, Wrench, type LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  check: Check,
  x: X,
  undo: Undo2,
  wrench: Wrench,
};

export function EstadoIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICON_MAP[name] ?? Check;
  return <Icon className={className} />;
}
