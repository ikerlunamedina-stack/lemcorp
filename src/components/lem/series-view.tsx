"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { ESTADO_META, type EstadoEquipo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EstadoIcon } from "@/components/lem/estado-icon";

const ESTADOS: EstadoEquipo[] = ["disponible", "averiado", "en_retiro", "en_reparacion"];
const SERIES_POR_MODELO_INICIAL = 50;

export function SeriesView() {
  const equipos = useStore((s) => s.equipos);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("todos");
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return equipos.filter((e) => {
      if (estadoFilter !== "todos" && e.estado !== estadoFilter) return false;
      if (!q) return true;
      return e.serie.toLowerCase().includes(q)
        || e.modelo.toLowerCase().includes(q)
        || (e.mac ?? "").toLowerCase().includes(q)
        || (e.cmMac ?? "").toLowerCase().includes(q);
    });
  }, [equipos, query, estadoFilter]);

  const models = useMemo(() => {
    const byModel: Record<string, typeof equipos> = {};
    for (const e of filtered) {
      const k = e.modelo || "Sin modelo";
      if (!byModel[k]) byModel[k] = [];
      byModel[k].push(e);
    }
    return Object.entries(byModel).sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const toggleExpandido = (modelo: string) =>
    setExpandido((p) => ({ ...p, [modelo]: !p[modelo] }));

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {equipos.length} equipos · {models.length} modelos
          </p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]">Series</h1>
        </div>
        <div className="relative w-56">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar serie, modelo, MAC…" className="h-9 rounded-md border-border bg-background pl-8 text-[13px]" />
        </div>
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
        <p className="py-12 text-center text-[13px] text-muted-foreground">No hay equipos registrados.</p>
      ) : (
        <div className="space-y-10">
          {models.map(([modelo, items]) => {
            const mostrarTodas = expandido[modelo] || items.length <= SERIES_POR_MODELO_INICIAL;
            const itemsVisibles = mostrarTodas ? items : items.slice(0, SERIES_POR_MODELO_INICIAL);
            return (
              <section key={modelo}>
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="text-[15px] font-medium text-foreground">{modelo}</h2>
                  <span className="text-[12px] tabular-nums text-muted-foreground">{items.length}</span>
                </div>
                <div className="overflow-x-auto scroll-thin">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">#</th>
                        <th className="py-2 pr-3 font-medium">Serie</th>
                        <th className="py-2 pr-3 font-medium">MAC</th>
                        <th className="py-2 pr-3 font-medium">CM MAC</th>
                        <th className="py-2 pr-3 font-medium">Estado</th>
                        <th className="py-2 pr-3 font-medium">Ubicación</th>
                        <th className="py-2 font-medium">Observación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {itemsVisibles.map((e, idx) => (
                        <tr key={e.id} className="transition-colors hover:bg-muted/30">
                          <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">{idx + 1}</td>
                          <td className="py-2.5 pr-3 font-mono text-[12px] font-medium text-foreground">{e.serie}</td>
                          <td className="py-2.5 pr-3 font-mono text-[11px] text-muted-foreground">{e.mac ?? "—"}</td>
                          <td className="py-2.5 pr-3 font-mono text-[11px] text-muted-foreground">{e.cmMac ?? "—"}</td>
                          <td className="py-2.5 pr-3">
                            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                              <EstadoIcon name={ESTADO_META[e.estado].icon} className="h-3 w-3" />
                              {ESTADO_META[e.estado].short}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 text-[12px] text-muted-foreground">{e.ubicacion ?? "—"}</td>
                          <td className="py-2.5 text-[12px] text-muted-foreground">{e.observacion ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!mostrarTodas && (
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleExpandido(modelo)}
                      className="press h-8 rounded-md border-border bg-background text-[12px] font-medium hover:bg-muted"
                    >
                      Ver {items.length - SERIES_POR_MODELO_INICIAL} más
                    </Button>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <div className="mt-8 border-t border-border pt-6">
        <Button variant="ghost" onClick={() => router.push("/equipos")} className="press rounded-md text-[13px] font-medium text-muted-foreground hover:text-foreground">
          Gestionar equipos <ArrowRight className="ml-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "press flex items-center gap-1.5 rounded-md border px-3 py-1 text-[12px] font-medium transition-colors",
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
