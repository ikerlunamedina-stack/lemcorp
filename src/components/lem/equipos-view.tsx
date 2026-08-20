"use client";

import { useState } from "react";
import Link from "next/link";
import { Cpu, Plus, Search, Pencil, Trash2, ChevronDown, Hash, ArrowRight } from "lucide-react";
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

const ESTADOS: EstadoEquipo[] = ["disponible", "averiado", "en_retiro", "en_reparacion"];

export function EquiposView() {
  const equipos = useStore((s) => s.equipos);
  const addEquipment = useStore((s) => s.addEquipment);
  const updateEquipment = useStore((s) => s.updateEquipment);
  const deleteEquipment = useStore((s) => s.deleteEquipment);
  const findEquipmentBySerie = useStore((s) => s.findEquipmentBySerie);

  const [query, setQuery] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("todos");
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
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
    <div className="mx-auto max-w-5xl px-6 py-6">
      <div className="anim-fade-up mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Equipos</h1>
          <p className="text-sm text-muted-foreground">{equipos.length} equipo(s) · {models.length} modelo(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-48">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar serie…" className="h-9 rounded-xl bg-muted/50 pl-8 text-sm" />
          </div>
          <Button onClick={openCreate} className="press h-9 rounded-xl"><Plus className="mr-1.5 h-4 w-4" />Añadir</Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="anim-fade-up mb-4 flex flex-wrap items-center gap-1.5">
        <FilterChip active={estadoFilter === "todos"} onClick={() => setEstadoFilter("todos")} label="Todos" count={equipos.length} />
        {ESTADOS.map((est) => {
          const n = equipos.filter((e) => e.estado === est).length;
          return <FilterChip key={est} active={estadoFilter === est} onClick={() => setEstadoFilter(est)} label={ESTADO_META[est].short} count={n} />;
        })}
      </div>

      {/* Lista por modelo (solo resumen, sin expandir series) */}
      {models.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
          {equipos.length === 0 ? "No hay equipos. Haz clic en \"Añadir\"." : "Sin coincidencias."}
        </div>
      ) : (
        <div className="space-y-2.5">
          {models.map(([modelo, items], i) => (
            <div key={modelo} className="anim-fade-up rounded-2xl border border-border bg-card overflow-hidden" style={{ animationDelay: `${i * 30}ms` }}>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground"><Cpu className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold">{modelo}</p>
                  <p className="text-[11px] text-muted-foreground">{items.length} equipo(s) · {items.filter(e => e.estado === "disponible").length} disponibles</p>
                </div>
                <div className="hidden items-center gap-1.5 sm:flex">
                  {ESTADOS.map((est) => {
                    const n = items.filter((e) => e.estado === est).length;
                    if (n === 0) return null;
                    return <span key={est} className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", (est === "averiado" || est === "en_retiro") ? "bg-destructive/10 text-destructive" : est === "disponible" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{ESTADO_META[est].icon} {n}</span>;
                  })}
                </div>
                <span className="rounded-full bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background">{items.length}</span>
                <Link href={`/series/${encodeURIComponent(modelo)}`} className="press flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                  Ver series <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Hash className="h-4 w-4" />{editing ? "Editar equipo" : "Añadir equipo"}</DialogTitle>
            <DialogDescription>La serie es obligatoria y única.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-1">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="eq-serie">Número de serie *</Label>
              <Input id="eq-serie" value={form.serie} onChange={(e) => { setForm({ ...form, serie: e.target.value }); setDupError(false); }} placeholder="Ej. 48575443365E42B7" className={cn("rounded-xl font-mono", dupError && "border-destructive")} autoFocus />
              {dupError && <p className="flex items-center gap-1 text-[11px] text-destructive"><Hash className="h-3 w-3" />Ya existe un equipo con esta serie</p>}
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="eq-modelo">Modelo *</Label>
              <Input id="eq-modelo" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} placeholder="Ej. ROUTER ONT HG8145X6-13 HUAWEI" className="rounded-xl" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v as EstadoEquipo })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">{ESTADOS.map((est) => <SelectItem key={est} value={est}>{ESTADO_META[est].icon} {ESTADO_META[est].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eq-ubic">Ubicación</Label>
              <Input id="eq-ubic" value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} placeholder="Almacén, Taller…" className="rounded-xl" />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="eq-obs">Observación</Label>
              <Textarea id="eq-obs" value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} placeholder="Ej. No enciende, cliente devolvió…" className="rounded-xl min-h-[60px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.serie.trim() || !form.modelo.trim()} className="rounded-xl">{editing ? "Guardar" : "Añadir"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
