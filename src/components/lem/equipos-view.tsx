"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  ESTADO_META, ANTIGUEDAD_META, calcularAntiguedad,
  type EstadoEquipo,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { AuroraSearchInput } from "@/components/lem/aurora-search-input";
import { EstadoIcon } from "@/components/lem/estado-icon";

const ESTADOS: EstadoEquipo[] = ["disponible", "averiado", "en_retiro"];

export function EquiposView() {
  const equipos = useStore((s) => s.equipos);
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<"todos" | EstadoEquipo>("todos");

  const filtered = useMemo(() => equipos.filter((e) => {
    if (estadoFilter !== "todos" && e.estado !== estadoFilter) return false;
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return e.serie.toLowerCase().includes(q) || e.modelo.toLowerCase().includes(q) || (e.ubicacion ?? "").toLowerCase().includes(q);
  }), [equipos, estadoFilter, query]);

  const byModel: Record<string, typeof equipos> = {};
  for (const e of filtered) {
    const k = e.modelo || "Sin modelo";
    if (!byModel[k]) byModel[k] = [];
    byModel[k].push(e);
  }
  const models = Object.entries(byModel).sort((a, b) => b[1].length - a[1].length);

  const goSeries = () => router.push("/series");

  return (
    <div className="select-text cursor-text px-4 py-8 sm:px-6 lg:px-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {equipos.length} equipos · {models.length} modelos
          </p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]">Equipos</h1>
        </div>
        <AuroraSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Buscar serie…"
          placeholderFocused="Escribe para filtrar series…"
          className="w-48"
          iconSize="h-3.5 w-3.5"
        />
      </div>

      {/* Filtros minimalistas */}
      <div className="mb-6 flex flex-wrap items-center gap-1">
        <FilterChip active={estadoFilter === "todos"} onClick={() => setEstadoFilter("todos")} label="Todos" count={equipos.length} />
        {ESTADOS.map((est) => {
          const n = equipos.filter((e) => e.estado === est).length;
          return <FilterChip key={est} active={estadoFilter === est} onClick={() => setEstadoFilter(est)} label={ESTADO_META[est].short} count={n} />;
        })}
      </div>

      {models.length === 0 ? (
        <p className="py-12 text-center text-[13px] text-muted-foreground">
          {equipos.length === 0 ? "No hay equipos registrados. Los equipos se añaden automáticamente al recibir una guía de remisión SUNAT en la página de Recepciones." : "Sin coincidencias."}
        </p>
      ) : (
        <div className="divide-y divide-border border-y border-border">
          {models.map(([modelo, items]) => {
            // ─── Antigüedad: contar equipos disponibles por nivel ───
            const disp = items.filter((e) => e.estado === "disponible");
            const ant = disp.map((e) => calcularAntiguedad(e.createdAt));
            const antAdv = ant.filter((a) => a.nivel === "advertencia").length;
            const antCrit = ant.filter((a) => a.nivel === "critico").length;
            const antOld = ant.filter((a) => a.nivel === "antiguo").length;
            const antTotal = antAdv + antCrit + antOld;
            return (
            <div key={modelo} className="anim-slide-up flex items-center gap-4 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium text-foreground">{modelo}</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {items.length} equipo(s) · {disp.length} disponibles
                  {items.some((e) => e.ubicacion) && (
                    <span className="ml-1.5 inline-flex items-center gap-1 text-[11px]">
                      <MapPin className="h-3 w-3" strokeWidth={1.5} />
                      {[...new Set(items.map((e) => e.ubicacion).filter(Boolean))].slice(0, 3).join(", ")}
                      {[...new Set(items.map((e) => e.ubicacion).filter(Boolean))].length > 3 && "…"}
                    </span>
                  )}
                  {antTotal > 0 && (
                    <span className="ml-1.5 inline-flex items-center gap-1 text-[11px]">
                      <Clock className="h-3 w-3" strokeWidth={1.5} />
                      {antTotal} con antigüedad
                    </span>
                  )}
                </p>
              </div>
              <div className="hidden items-center gap-3 sm:flex">
                {ESTADOS.map((est) => {
                  const n = items.filter((e) => e.estado === est).length;
                  if (n === 0) return null;
                  return (
                    <span key={est} className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                      <EstadoIcon name={ESTADO_META[est].icon} className="h-3 w-3" />
                      {n}
                    </span>
                  );
                })}
                {/* Indicadores de antigüedad (solo si hay equipos disponibles) */}
                {antAdv > 0 && (
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium", ANTIGUEDAD_META.advertencia.bg, ANTIGUEDAD_META.advertencia.text)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", ANTIGUEDAD_META.advertencia.dot)} />
                    {antAdv} advert.
                  </span>
                )}
                {antCrit > 0 && (
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium", ANTIGUEDAD_META.critico.bg, ANTIGUEDAD_META.critico.text)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", ANTIGUEDAD_META.critico.dot)} />
                    {antCrit} crít.
                  </span>
                )}
                {antOld > 0 && (
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium", ANTIGUEDAD_META.antiguo.bg, ANTIGUEDAD_META.antiguo.text)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", ANTIGUEDAD_META.antiguo.dot)} />
                    {antOld} antiguos
                  </span>
                )}
              </div>
              <span className="text-[15px] font-semibold tabular-nums text-foreground">{items.length}</span>
              <button
                onClick={goSeries}
                className="press flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground"
              >
                Ver series <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
              </button>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "press flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      {label}
      <span className={cn("tabular-nums", active ? "text-background/70" : "text-muted-foreground")}>{count}</span>
    </button>
  );
}
