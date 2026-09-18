"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlanaAvatarProps {
  size?: number;
  className?: string;
  glow?: boolean;
}

export function AlanaAvatar({ size = 32, className, glow = false }: AlanaAvatarProps) {
  const iconSize = Math.round(size * 0.55);
  return (
    <div
      className={cn(
        "relative shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm transition-transform hover:scale-110 active:scale-95",
        glow && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background",
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* Anillo pulsante */}
      <span className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/40 to-violet-600/40 animate-ping opacity-30" style={{ animationDuration: "2s" }} />
      <Sparkles
        className="relative text-white transition-transform"
        style={{ width: iconSize, height: iconSize }}
        strokeWidth={1.5}
      />
    </div>
  );
}
