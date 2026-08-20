"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Search, ChevronLeft, ChevronRight, Hash } from "lucide-react";
import { useStore } from "@/lib/store";
import { ESTADO_META, type EstadoEquipo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ESTADOS: EstadoEquipo[] = ["disponible", "averiado", "en_retiro", "en_reparacion"];
const PAGE_SIZE = 20;

export default function SeriesModeloPage() {
  const params = useParams();
  const modelo = decodeURIComponent(params.modelo as string);
  const equipos = useStore((s) => s.equipos);

  const [query, setQuery] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("todos");
  const [page, setPage] = useState(0);

  const equiposModelo = useMemo(() => {
    return equipos.filter((e) => e.modelo === modelo);
  }, [equipos, modelo]);

  const filtered = equiposModelo.filter((e) => {
    if (estadoFilter !== "todos" && e.estado !== estadoFilter) return false;
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return e.serie.toLowerCase().includes(q) || (e.ubicacion ?? "").toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      {/* Botón volver */}
      <Link href="/equipos" className="press mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Volver al panel de equipos
      </Link>

      {/* Header */}
      <div className="anim-fade-up mb-5">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Hash className="h-5 w-5" /> {modelo}
        </h1>
        <p className="text-sm text-muted-foreground">{equiposModelo.length} serie(s) registradas</p>
      </div>

      {/* Buscador + filtros */}
      <div className="anim-fade-up mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} placeholder="Buscar serie…" className="h-9 rounded-xl bg-muted/50 pl-8 text-sm" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={estadoFilter === "todos"} onClick={() => { setEstadoFilter("todos"); setPage(0); }} label="Todos" count={equiposModelo.length} />
          {ESTADOS.map((est) => {
            const n = equiposModelo.filter((e) => e.estado === est).length;
            if (n === 0) return null;
            return <FilterChip key={est} active={estadoFilter === est} onClick={() => { setEstadoFilter(est); setPage(0); }} label={ESTADO_META[est].short} count={n} />;
          })}
        </div>
      </div>

      {/* Tabla de series */}
      <div className="anim-fade-up overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">#</th>
                <th className="px-4 py-2.5 font-medium">Serie</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
                <th className="px-4 py-2.5 font-medium">Ubicación</th>
                <th className="px-4 py-2.5 font-medium">Observación</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((e, i) => (
                <tr key={e.id} className="border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-2.5 text-[11px] text-muted-foreground tabular-nums">{page * PAGE_SIZE + i + 1}</td>
                  <td className="px-4 py-2.5"><span className="font-mono text-[12px] font-semibold">{e.serie}</span></td>
                  <td className="px-4 py-2.5">
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      (e.estado === "averiado" || e.estado === "en_retiro") ? "bg-destructive/10 text-destructive" : e.estado === "disponible" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                      {ESTADO_META[e.estado].icon} {ESTADO_META[e.estado].short}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[11px] text-muted-foreground">{e.ubicacion ?? "—"}</td>
                  <td className="px-4 py-2.5 text-[11px] text-muted-foreground">{e.observacion ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <p className="py-10 text-center text-[12px] text-muted-foreground">No hay series que coincidan.</p>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)} className="press h-8 rounded-lg">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-[12px] font-medium text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="press h-8 rounded-lg">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button onClick={onClick} className={cn("press flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors", active ? "border-primary bg-accent text-foreground" : "border-border bg-muted/40 text-muted-foreground hover:bg-accent/50")}>
      {label}<span className="rounded-full bg-background px-1.5 text-[10px]">{count}</span>
    </button>
  );
}
