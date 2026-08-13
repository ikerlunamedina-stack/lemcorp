"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { getHeaderColumns } from "@/lib/detection";
import { recalcFile } from "@/lib/formulas";
import type { SheetFile } from "@/lib/types";
import {
  Wrench,
  ChevronDown,
  Hash,
  MapPin,
  CircleDot,
  Search,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const MODEL_COLS = ["modelo", "equipo", "tipo", "categoria", "categoría", "articulo", "artículo"];
const SERIE_COLS = ["serie", "serial", "mac", "imei", "n° serie", "n serie"];
const STATE_COLS = ["estado", "situacion", "situación", "condicion", "condición"];
const LOC_COLS = ["ubicacion", "ubicación", "lugar", "sitio", "almacen", "almacén"];

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

interface EquipmentRow {
  fileId: string;
  fileName: string;
  row: number;
  serie: string;
  model: string;
  state?: string;
  location?: string;
}

function extractEquipment(file: SheetFile): EquipmentRow[] {
  const headers = getHeaderColumns(file);
  recalcFile(file);
  const modelCol = findColIdx(headers, MODEL_COLS);
  const serieCol = findColIdx(headers, SERIE_COLS);
  const stateCol = findColIdx(headers, STATE_COLS);
  const locCol = findColIdx(headers, LOC_COLS);
  const out: EquipmentRow[] = [];
  if (modelCol < 0 && serieCol < 0) return out;
  for (let r = 1; r < file.rowCount; r++) {
    const serie = serieCol >= 0 ? (file.cells[`${r},${serieCol}`] ?? "").trim() : "";
    const model = modelCol >= 0 ? (file.cells[`${r},${modelCol}`] ?? "").trim() : "";
    if (!serie && !model) continue;
    out.push({
      fileId: file.id,
      fileName: file.name,
      row: r,
      serie: serie || "—",
      model: model || "Sin modelo",
      state: stateCol >= 0 ? (file.cells[`${r},${stateCol}`] ?? "").trim() : undefined,
      location: locCol >= 0 ? (file.cells[`${r},${locCol}`] ?? "").trim() : undefined,
    });
  }
  return out;
}

export function EquipmentView() {
  const files = useStore((s) => s.files);
  const openFile = useStore((s) => s.openFile);
  const createFile = useStore((s) => s.createFile);
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const eqFiles = files.filter((f) => f.tag === "equipos");

  const allRows = useMemo(() => eqFiles.flatMap(extractEquipment), [eqFiles]);

  const byModel = useMemo(() => {
    const m: Record<string, EquipmentRow[]> = {};
    for (const r of allRows) {
      const key = r.model || "Sin modelo";
      if (!m[key]) m[key] = [];
      m[key].push(r);
    }
    return m;
  }, [allRows]);

  const models = Object.entries(byModel).sort((a, b) => b[1].length - a[1].length);

  const filtered = models.filter(([model]) =>
    model.toLowerCase().includes(query.toLowerCase())
  );

  if (eqFiles.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="anim-fade-up flex flex-col items-center gap-5 rounded-3xl border border-border bg-card p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Wrench className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold">Sin equipos registrados</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Crea o importa un archivo de equipos (averiados, en retiro, etc.) y
              etiqétalo como «Equipos» para verlo agrupado por modelo aquí.
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

  const totalSeries = allRows.length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <div className="anim-fade-up mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Equipos</h1>
          <p className="text-sm text-muted-foreground">
            {totalSeries} equipos registrados · {models.length} modelo(s) · {eqFiles.length} archivo(s)
          </p>
        </div>
        <div className="relative w-56">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar modelo…"
            className="h-9 rounded-xl bg-muted/50 pl-8 text-sm"
          />
        </div>
      </div>

      {models.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
          No se encontraron equipos con columnas de Modelo/Serie. Verifica que tus
          archivos tengan una columna «Modelo» o «Serie».
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(([model, rows], i) => {
            const isOpen = expanded === model;
            const states = countBy(rows, (r) => r.state || "—");
            return (
              <div
                key={model}
                className="anim-fade-up overflow-hidden rounded-2xl border border-border bg-card"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : model)}
                  className="press flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/40"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-transform",
                      isOpen && "rotate-90"
                    )}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold">{model}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {rows.length} unidad(es) · {Object.keys(states).length} estado(s)
                    </p>
                  </div>
                  {/* mini barras de estado */}
                  <div className="hidden items-center gap-2 sm:flex">
                    {Object.entries(states).slice(0, 3).map(([state, n]) => (
                      <span
                        key={state}
                        className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                      >
                        <CircleDot className="h-2.5 w-2.5" />
                        {state}: {n}
                      </span>
                    ))}
                  </div>
                  <span className="rounded-full bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background">
                    {rows.length}
                  </span>
                </button>

                {isOpen && (
                  <div className="anim-fade-in border-t border-border">
                    <div className="overflow-x-auto scroll-thin">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                            <th className="px-4 py-2 font-medium">
                              <span className="flex items-center gap-1.5">
                                <Hash className="h-3 w-3" />
                                Serie
                              </span>
                            </th>
                            <th className="px-4 py-2 font-medium">Estado</th>
                            <th className="px-4 py-2 font-medium">Ubicación</th>
                            <th className="px-4 py-2 font-medium">Origen</th>
                            <th className="px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r, idx) => (
                            <tr
                              key={`${r.fileId}-${r.row}-${idx}`}
                              className="border-b border-border/50 last:border-0 hover:bg-accent/30"
                            >
                              <td className="px-4 py-2 font-mono text-[12px] font-medium">
                                {r.serie}
                              </td>
                              <td className="px-4 py-2">
                                {r.state ? (
                                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                                    {r.state}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-[12px] text-muted-foreground">
                                {r.location ? (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {r.location}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="px-4 py-2 text-[11px] text-muted-foreground">
                                {r.fileName}
                              </td>
                              <td className="px-4 py-2 text-right">
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
          })}
        </div>
      )}
    </div>
  );
}

function countBy<T>(arr: T[], fn: (x: T) => string): Record<string, number> {
  const m: Record<string, number> = {};
  for (const x of arr) {
    const k = fn(x);
    m[k] = (m[k] || 0) + 1;
  }
  return m;
}
