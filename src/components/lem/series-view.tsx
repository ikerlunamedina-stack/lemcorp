"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { getHeaderColumns } from "@/lib/detection";
import { recalcFile } from "@/lib/formulas";
import type { SheetFile } from "@/lib/types";
import {
  Hash,
  Search,
  MapPin,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const MODEL_COLS = ["modelo", "equipo", "tipo", "categoria", "categoría", "articulo", "artículo"];
const SERIE_COLS = ["serie", "serial", "mac", "imei", "n° serie", "n serie"];
const STATE_COLS = ["estado", "situacion", "situación", "condicion", "condición"];
const LOC_COLS = ["ubicacion", "ubicación", "lugar", "sitio", "almacen", "almacén"];
const OBS_COLS = ["observacion", "observación", "nota", "comentario", "detalle"];

function normalize(s: string): string {
  return s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function findColIdx(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const nc = normalize(c);
    for (let i = 0; i < headers.length; i++) {
      if (normalize(headers[i]) === nc) return i;
    }
  }
  for (const c of candidates) {
    const nc = normalize(c);
    for (let i = 0; i < headers.length; i++) {
      const h = normalize(headers[i]);
      if (h.includes(nc)) return i;
    }
  }
  return -1;
}

interface SeriesRow {
  fileId: string;
  fileName: string;
  row: number;
  serie: string;
  model: string;
  state?: string;
  location?: string;
  observation?: string;
}

function extractSeries(file: SheetFile): SeriesRow[] {
  const headers = getHeaderColumns(file);
  recalcFile(file);
  const serieCol = findColIdx(headers, SERIE_COLS);
  if (serieCol < 0) return [];
  const modelCol = findColIdx(headers, MODEL_COLS);
  const stateCol = findColIdx(headers, STATE_COLS);
  const locCol = findColIdx(headers, LOC_COLS);
  const obsCol = findColIdx(headers, OBS_COLS);
  const out: SeriesRow[] = [];
  for (let r = 1; r < file.rowCount; r++) {
    const serie = (file.cells[`${r},${serieCol}`] ?? "").trim();
    if (!serie) continue;
    out.push({
      fileId: file.id,
      fileName: file.name,
      row: r,
      serie,
      model: modelCol >= 0 ? (file.cells[`${r},${modelCol}`] ?? "").trim() : "",
      state: stateCol >= 0 ? (file.cells[`${r},${stateCol}`] ?? "").trim() : undefined,
      location: locCol >= 0 ? (file.cells[`${r},${locCol}`] ?? "").trim() : undefined,
      observation: obsCol >= 0 ? (file.cells[`${r},${obsCol}`] ?? "").trim() : undefined,
    });
  }
  return out;
}

export function SeriesView() {
  const files = useStore((s) => s.files);
  const openFile = useStore((s) => s.openFile);
  const createFile = useStore((s) => s.createFile);
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("todos");

  const eqFiles = files.filter((f) => f.tag === "equipos");
  const allRows = useMemo(() => eqFiles.flatMap(extractSeries), [eqFiles]);

  const states = useMemo(() => {
    const s = new Set<string>();
    for (const r of allRows) if (r.state) s.add(r.state);
    return Array.from(s).sort();
  }, [allRows]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return allRows.filter((r) => {
      if (stateFilter !== "todos" && r.state !== stateFilter) return false;
      if (!q) return true;
      return (
        r.serie.toLowerCase().includes(q) ||
        r.model.toLowerCase().includes(q) ||
        r.fileName.toLowerCase().includes(q) ||
        (r.state ?? "").toLowerCase().includes(q) ||
        (r.location ?? "").toLowerCase().includes(q)
      );
    });
  }, [allRows, query, stateFilter]);

  if (eqFiles.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="anim-fade-up flex flex-col items-center gap-5 rounded-3xl border border-border bg-card p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Hash className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold">Sin series registradas</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Crea o importa un archivo de equipos y etiquétalo como «Equipos».
              Aquí aparecerá la lista completa de todos los números de serie,
              lista para buscar y filtrar.
            </p>
          </div>
          <Button
            onClick={() => createFile("Equipos Averiados", "equipos")}
            className="press rounded-xl"
          >
            Crear archivo de equipos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      {/* Encabezado */}
      <div className="anim-fade-up mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Series de equipos</h1>
          <p className="text-sm text-muted-foreground">
            {allRows.length} serie(s) en total · {eqFiles.length} archivo(s) ·{" "}
            {states.length} estado(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar serie, modelo, estado…"
              className="h-9 rounded-xl bg-muted/50 pl-8 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Filtros de estado */}
      {states.length > 0 && (
        <div className="anim-fade-up mb-4 flex flex-wrap items-center gap-1.5">
          <FilterChip
            active={stateFilter === "todos"}
            onClick={() => setStateFilter("todos")}
            label="Todos"
            count={allRows.length}
          />
          {states.map((st) => {
            const count = allRows.filter((r) => r.state === st).length;
            return (
              <FilterChip
                key={st}
                active={stateFilter === st}
                onClick={() => setStateFilter(st)}
                label={st}
                count={count}
              />
            );
          })}
        </div>
      )}

      {/* Tabla plana */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
          {allRows.length === 0
            ? "No se encontraron series. Verifica que tus archivos de equipos tengan una columna «Serie»."
            : "Sin coincidencias para tu búsqueda."}
        </div>
      ) : (
        <div className="anim-fade-up overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Hash className="h-3 w-3" />
                      N° Serie
                    </span>
                  </th>
                  <th className="px-4 py-2.5 font-medium">Modelo</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5 font-medium">Ubicación</th>
                  <th className="px-4 py-2.5 font-medium">Observación</th>
                  <th className="px-4 py-2.5 font-medium">Origen</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr
                    key={`${r.fileId}-${r.row}-${i}`}
                    className="border-b border-border/50 last:border-0 hover:bg-accent/30"
                  >
                    <td className="px-4 py-2.5 font-mono text-[12px] font-semibold">
                      {r.serie}
                    </td>
                    <td className="px-4 py-2.5 text-[12px]">{r.model || "—"}</td>
                    <td className="px-4 py-2.5">
                      {r.state ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                            isNegativeState(r.state)
                              ? "bg-destructive/10 text-destructive"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {isNegativeState(r.state) ? (
                            <ShieldAlert className="h-2.5 w-2.5" />
                          ) : (
                            <ShieldCheck className="h-2.5 w-2.5" />
                          )}
                          {r.state}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-muted-foreground">
                      {r.location ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {r.location}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-2.5 text-[11px] text-muted-foreground">
                      {r.observation || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileSpreadsheet className="h-3 w-3" />
                        {r.fileName}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="press h-7 rounded-lg text-[11px]"
                        onClick={() => {
                          openFile(r.fileId);
                          toast({
                            title: "Abriendo archivo",
                            description: r.fileName,
                          });
                        }}
                      >
                        Ver <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "press flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
        active
          ? "border-primary bg-accent text-foreground"
          : "border-border bg-muted/40 text-muted-foreground hover:bg-accent/50"
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 text-[10px]",
          active ? "bg-foreground/15" : "bg-background"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function isNegativeState(state: string): boolean {
  const n = normalize(state);
  return ["averiado", "dañado", "danado", "roto", "malogrado", "en retiro", "retiro", "baja", "descartado"].some(
    (k) => n.includes(k)
  );
}
