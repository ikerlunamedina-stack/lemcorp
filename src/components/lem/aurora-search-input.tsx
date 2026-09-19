"use client";

import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const ICON_PROPS = { strokeWidth: 1.5 } as const;

interface AuroraSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  placeholderFocused?: string;
  className?: string;
  inputClassName?: string;
  iconSize?: string;
}

/**
 * Input de búsqueda con efecto AURORA alrededor.
 * Inspirado en las auroras boreales de Finlandia: verde-cyan, azul, morado, rosa.
 * El efecto es siempre visible (sutil cuando no hay focus, intenso con focus).
 * La transición es suave (1.5s) para que no se note el encendido/apagado.
 */
export function AuroraSearchInput({
  value,
  onChange,
  placeholder = "Buscar…",
  placeholderFocused,
  className,
  inputClassName,
  iconSize = "h-4 w-4",
}: AuroraSearchInputProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const layersRef = useRef<SVGGElement>(null);

  // IDs únicos para los filtros/gradientes SVG (evita colisiones si hay múltiples instancias)
  const [instanceId] = useState(() => `aurora-${Math.random().toString(36).slice(2, 9)}`);
  const gradId = `${instanceId}-grad`;
  const blurXwideId = `${instanceId}-blur-xwide`;
  const blurWideId = `${instanceId}-blur-wide`;
  const blurMidId = `${instanceId}-blur-mid`;
  const blurCoreId = `${instanceId}-blur-core`;

  // ResizeObserver para sincronizar el SVG aurora con el tamaño real del input
  useEffect(() => {
    const wrap = wrapRef.current;
    const svg = svgRef.current;
    const layers = layersRef.current;
    if (!wrap || !svg || !layers) return;

    const PAD = 14;
    const RADIUS = 8;

    const sync = () => {
      const w = wrap.offsetWidth + PAD * 2;
      const h = wrap.offsetHeight + PAD * 2;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      const rects = layers.querySelectorAll("rect");
      rects.forEach((r) => {
        r.setAttribute("x", String(PAD));
        r.setAttribute("y", String(PAD));
        r.setAttribute("width", String(Math.max(0, w - PAD * 2)));
        r.setAttribute("height", String(Math.max(0, h - PAD * 2)));
        r.setAttribute("rx", String(RADIUS));
        r.setAttribute("ry", String(RADIUS));
      });
    };

    const ro = new ResizeObserver(sync);
    ro.observe(wrap);
    sync();
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "aurora-wrap relative transition-all duration-300",
        searchFocused && "w-64",
        searchFocused && "active",
        className
      )}
    >
      {/* SVG aurora — luz suave que rodea el input con efecto drift + breathe */}
      <svg ref={svgRef} className="aurora" aria-hidden="true">
        <defs>
          {/* Gradiente Aurora Boreal de Finlandia:
              verde-cyan (oxígeno bajo), azul (nitrógeno), morado (alta altitud), rosa-magenta (combinación) */}
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" className="aurora-grad-stop-1" />
            <stop offset="30%" className="aurora-grad-stop-2" />
            <stop offset="60%" className="aurora-grad-stop-3" />
            <stop offset="100%" className="aurora-grad-stop-4" />
          </linearGradient>

          {/* Filtros de desenfoque gaussianos para suavizar los bordes */}
          <filter id={blurXwideId} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter id={blurWideId} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
          <filter id={blurMidId} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <filter id={blurCoreId} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* 4 capas del aurora: mismas dimensiones, distintos blur/width/opacity */}
        <g ref={layersRef} className="aurora-breathe">
          <rect
            className="aurora-veil"
            pathLength={100}
            stroke={`url(#${gradId})`}
            strokeWidth={20}
            strokeDasharray="42 58"
            opacity={0.22}
            filter={`url(#${blurXwideId})`}
          />
          <rect
            className="aurora-veil"
            pathLength={100}
            stroke={`url(#${gradId})`}
            strokeWidth={14}
            strokeDasharray="40 60"
            opacity={0.32}
            filter={`url(#${blurWideId})`}
          />
          <rect
            className="aurora-veil"
            pathLength={100}
            stroke={`url(#${gradId})`}
            strokeWidth={8}
            strokeDasharray="38 62"
            opacity={0.45}
            filter={`url(#${blurMidId})`}
          />
          <rect
            className="aurora-veil"
            pathLength={100}
            stroke={`url(#${gradId})`}
            strokeWidth={4}
            strokeDasharray="34 66"
            opacity={0.55}
            filter={`url(#${blurCoreId})`}
          />
        </g>
      </svg>

      {/* Input real encima del aurora — transparente, sin border azul */}
      <div className="relative z-10 flex items-center gap-2">
        <Search
          className={cn(
            "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 transition-colors duration-500",
            iconSize,
            searchFocused ? "text-foreground" : "text-muted-foreground"
          )}
          {...ICON_PROPS}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder={searchFocused && placeholderFocused ? placeholderFocused : placeholder}
          className={cn(
            "h-9 w-full rounded-lg border-transparent bg-transparent pl-8 text-[13px] outline-none transition-all duration-500",
            "focus-visible:ring-0 focus-visible:border-transparent focus-visible:ring-offset-0 focus-visible:shadow-none",
            inputClassName
          )}
        />
      </div>
    </div>
  );
}
