"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hash, Search, Cpu, FileText, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { ESTADO_META, type EstadoEquipo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EstadoIcon } from "@/components/lem/estado-icon";

const ESTADOS: EstadoEquipo[] = ["disponible", "averiado", "en_retiro", "en_reparacion"];

export function SeriesView() {
  const equipos = useStore((s) => s.equipos);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("todos");

  const filtered = equipos.filter((e) => {
    if (estadoFilter !== "todos" && e.estado !== estadoFilter) return false;
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return e.serie.toLowerCase().includes(q)
      || e.modelo.toLowerCase().includes(q)
      || (e.mac ?? "").toLowerCase().includes(q)
      || (e.cmMac ?? "").toLowerCase().includes(q);
  });

  const byModel: Record<string, typeof equipos> = {};
  for (const e of filtered) {
    const k = e.modelo || "Sin modelo";
    if (!byModel[k]) byModel[k] = [];
    byModel[k].push(e);
  }
  const models = Object.entries(byModel).sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="px-6 py-6">
      <div className="anim-fade-up mb-5">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Hash className="h-5 w-5" /> Series
        </h1>
        <p className="text-sm text-muted-foreground">
          Todas las series registradas en el sistema · {equipos.length} equipo(s) en {models.length} modelo(s)
        </p>
      </div>

      {/* Buscador */}
      <div className="anim-fade-up mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar serie, modelo, MAC…" className="h-9 rounded-xl bg-muted/50 pl-8 text-sm" />
        </div>
      </div>

      {/* Filtros */}
      <div className="anim-fade-up mb-4 flex flex-wrap gap-1.5">
        <Chip active={estadoFilter === "todos"} onClick={() => setEstadoFilter("todos")} label="Todos" count={equipos.length} />
        {ESTADOS.map((est) => {
          const n = equipos.filter((e) => e.estado === est).length;
          return <Chip key={est} active={estadoFilter === est} onClick={() => setEstadoFilter(est)} label={ESTADO_META[est].short} count={n} />;
        })}
      </div>

      {/* Lista por modelo */}
      {models.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
          No hay equipos registrados.
        </div>
      ) : (
        <div className="space-y-4">
          {models.map(([modelo, items], i) => (
            <div key={modelo} className="anim-fade-up rounded-3xl border border-border bg-card p-5 shadow-sm" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-[15px] font-semibold">{modelo}</h2>
                </div>
                <span className="rounded-full bg-foreground px-2.5 py-1 text-[11px] font-bold text-background">{items.length}</span>
              </div>
              <div className="overflow-x-auto scroll-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">#</th>
                      <th className="pb-2 pr-3 font-medium">Serie</th>
                      <th className="pb-2 pr-3 font-medium">MAC</th>
                      <th className="pb-2 pr-3 font-medium">CM MAC</th>
                      <th className="pb-2 pr-3 font-medium">Estado</th>
                      <th className="pb-2 pr-3 font-medium">Ubicación</th>
                      <th className="pb-2 font-medium">Observación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((e, idx) => (
                      <tr key={e.id} className="border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors">
                        <td className="py-2 pr-3 text-[11px] text-muted-foreground tabular-nums">{idx + 1}</td>
                        <td className="py-2 pr-3"><span className="font-mono text-[12px] font-semibold">{e.serie}</span></td>
                        <td className="py-2 pr-3 font-mono text-[11px] text-muted-foreground">{e.mac ?? "—"}</td>
                        <td className="py-2 pr-3 font-mono text-[11px] text-muted-foreground">{e.cmMac ?? "—"}</td>
                        <td className="py-2 pr-3">
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                            (e.estado === "averiado" || e.estado === "en_retiro") ? "bg-red-500/15 text-red-400" : e.estado === "disponible" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            <EstadoIcon name={ESTADO_META[e.estado].icon} className="h-2.5 w-2.5" /> {ESTADO_META[e.estado].short}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-[11px] text-muted-foreground">{e.ubicacion ?? "—"}</td>
                        <td className="py-2 text-[11px] text-muted-foreground">{e.observacion ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ir a Equipos */}
      <div className="mt-4 text-center">
        <Button variant="ghost" onClick={() => router.push("/equipos")} className="press rounded-xl">
          <FileText className="mr-1.5 h-4 w-4 text-primary" /> Gestionar equipos <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function Chip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button onClick={onClick} className={cn(
      "press flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
      active ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-muted/40 text-muted-foreground hover:bg-accent/50"
    )}>
      {label}<span className="rounded-full bg-background px-1.5 text-[10px]">{count}</span>
    </button>
  );
}
