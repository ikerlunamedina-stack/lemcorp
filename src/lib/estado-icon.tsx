import { Check, X, Undo2, Wrench } from "lucide-react";
import type { ESTADO_META } from "./types";
import { cn } from "./utils";

type EstadoKey = keyof typeof ESTADO_META;
type Tone = (typeof ESTADO_META)[EstadoKey]["tone"];

const ICONS = {
  check: Check,
  x: X,
  undo: Undo2,
  wrench: Wrench,
} as const;

const TONE_CLASSES: Record<Tone, string> = {
  ok: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  danger: "bg-red-500/10 text-red-600 dark:text-red-400",
  warn: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  neutral: "bg-muted text-muted-foreground",
};

export function EstadoIcon({
  icon,
  tone,
  className,
  iconClassName,
}: {
  icon: (typeof ESTADO_META)[EstadoKey]["icon"];
  tone: Tone;
  className?: string;
  iconClassName?: string;
}) {
  const Icon = ICONS[icon];
  return (
    <span
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded-lg",
        TONE_CLASSES[tone],
        className
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", iconClassName)} />
    </span>
  );
}

export function EstadoPill({
  icon,
  tone,
  label,
  className,
}: {
  icon: (typeof ESTADO_META)[EstadoKey]["icon"];
  tone: Tone;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium",
        TONE_CLASSES[tone],
        className
      )}
    >
      <EstadoIcon icon={icon} tone={tone} className="h-3.5 w-3.5 rounded-md" iconClassName="h-2.5 w-2.5" />
      {label}
    </span>
  );
}
