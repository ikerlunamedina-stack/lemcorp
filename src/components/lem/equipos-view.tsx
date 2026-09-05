"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { ESTADO_META, type EstadoEquipo, type Equipment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { EstadoIcon } from "@/components/lem/estado-icon";

const ESTADOS: EstadoEquipo[] = ["disponible", "averiado", "en_retiro", "en_reparacion"];

export function EquiposView() {
  const equipos = useStore((s) => s.equipos);
  const addEquipment = useStore((s) => s.addEquipment);
  const updateEquipment = useStore((s) => s.updateEquipment);
  const deleteEquipment = useStore((s) => s.deleteEquipment);
  const findEquipmentBySerie = useStore((s) => s.findEquipmentBySerie);
  const router = useRouter();

  const goSeries = () => router.push("/series");

  const [query, setQuery] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [form, setForm] = useState({ serie: "", modelo: "", estado: "disponible" as EstadoEquipo, ubicacion: "", observacion: "" });
  const [dupError, setDupError] = useState(false);

  const filtered = equipos.filter((e) => {
    if (estadoFilter !== "todos" && e.estado !== estadoFilter) return false;
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return e.serie.toLowerCase().includes(q) || e.modelo.toLowerCase().includes(q) || (e.ubicacion ?? "").toLowerCase().includes(q);
  });

  const byModel: Record<string, Equipment[]> = {};
  for (const e of filtered) {
    const k = e.modelo || "Sin modelo";
    if (!byModel[k]) byModel[k] = [];
    byModel[k].push(e);
  }
  const models = Object.entries(byModel).sort((a, b) => b[1].length - a[1].length);

  const openCreate = () => {
    setEditing(null);
    setForm({ serie: "", modelo: "", estado: "disponible", ubicacion: "", observacion: "" });
    setDupError(false);
    setDialogOpen(true);
  };

  const openEdit = (e: Equipment) => {
    setEditing(e);
    setForm({ serie: e.serie, modelo: e.modelo, estado: e.estado, ubicacion: e.ubicacion ?? "", observacion: e.observacion ?? "" });
    setDupError(false);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.serie.trim() || !form.modelo.trim()) return;
    if (editing) {
      updateEquipment(editing.id, { serie: form.serie.trim(), modelo: form.modelo.trim(), estado: form.estado, ubicacion: form.ubicacion.trim() || undefined, observacion: form.observacion.trim() || undefined });
    } else {
      if (findEquipmentBySerie(form.serie.trim())) { setDupError(true); return; }
      addEquipment({ serie: form.serie.trim(), modelo: form.modelo.trim(), estado: form.estado, ubicacion: form.ubicacion.trim() || undefined, observacion: form.observacion.trim() || undefined });
    }
    setDialogOpen(false);
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {equipos.length} equipos · {models.length} modelos
          </p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]">Equipos</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-48">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar serie…" className="h-9 rounded-md border-border bg-background pl-8 text-[13px]" />
          </div>
          <Button onClick={openCreate} className="press h-9 rounded-md bg-foreground text-background hover:bg-foreground/90">
            <Plus className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Añadir
          </Button>
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
        <p className="py-12 text-center text-[13px] text-muted-foreground">
          {equipos.length === 0 ? "No hay equipos. Haz clic en Añadir." : "Sin coincidencias."}
        </p>
      ) : (
        <div className="divide-y divide-border border-y border-border">
          {models.map(([modelo, items]) => (
            <div key={modelo} className="anim-slide-up flex items-center gap-4 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium text-foreground">{modelo}</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {items.length} equipo(s) · {items.filter((e) => e.estado === "disponible").length} disponibles
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
              </div>
              <span className="text-[15px] font-semibold tabular-nums text-foreground">{items.length}</span>
              <button
                onClick={goSeries}
                className="press flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground"
              >
                Ver series <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-lg border-border bg-background p-0">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle className="text-[15px] font-medium text-foreground">
              {editing ? "Editar equipo" : "Añadir equipo"}
            </DialogTitle>
            <DialogDescription className="text-[12px] text-muted-foreground">
              La serie es obligatoria y única.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 px-5 py-5">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="eq-serie" className="text-[12px] font-medium text-foreground">Número de serie *</Label>
              <Input id="eq-serie" value={form.serie} onChange={(e) => { setForm({ ...form, serie: e.target.value }); setDupError(false); }} placeholder="Ej. 48575443365E42B7" className={cn("rounded-md font-mono text-[13px]", dupError && "border-destructive")} autoFocus />
              {dupError && <p className="text-[11px] text-destructive">Ya existe un equipo con esta serie</p>}
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="eq-modelo" className="text-[12px] font-medium text-foreground">Modelo *</Label>
              <Input id="eq-modelo" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} placeholder="Ej. ROUTER ONT HG8145X6-13 HUAWEI" className="rounded-md text-[13px]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] font-medium text-foreground">Estado</Label>
              <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v as EstadoEquipo })}>
                <SelectTrigger className="rounded-md text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-md">{ESTADOS.map((est) => <SelectItem key={est} value={est}><span className="flex items-center gap-1.5"><EstadoIcon name={ESTADO_META[est].icon} className="h-3 w-3" /> {ESTADO_META[est].label}</span></SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eq-ubic" className="text-[12px] font-medium text-foreground">Ubicación</Label>
              <Input id="eq-ubic" value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} placeholder="Almacén, Taller…" className="rounded-md text-[13px]" />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="eq-obs" className="text-[12px] font-medium text-foreground">Observación</Label>
              <Textarea id="eq-obs" value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} placeholder="Ej. No enciende, cliente devolvió…" className="rounded-md min-h-[60px] text-[13px]" />
            </div>
          </div>
          <DialogFooter className="border-t border-border px-5 py-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="h-9 rounded-md border-border bg-background text-[13px] font-medium hover:bg-muted">Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.serie.trim() || !form.modelo.trim()} className="h-9 rounded-md bg-foreground text-background hover:bg-foreground/90 text-[13px] font-medium">
              {editing ? "Guardar" : "Añadir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
