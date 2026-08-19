"use client";

import { useState, useMemo } from "react";
import {
  Cpu,
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronDown,
  Hash,
  MapPin,
  User,
  AlertTriangle,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { ESTADO_META, type EstadoEquipo, type Equipment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const ESTADOS: EstadoEquipo[] = ["disponible", "asignado", "averiado", "en_retiro", "en_reparacion"];

export function EquiposView() {
  const equipos = useStore((s) => s.equipos);
  const addEquipment = useStore((s) => s.addEquipment);
  const updateEquipment = useStore((s) => s.updateEquipment);
  const deleteEquipment = useStore((s) => s.deleteEquipment);
  const findEquipmentBySerie = useStore((s) => s.findEquipmentBySerie);
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");
  const [expandedModel, setExpandedModel] = useState<string | null>("__all__");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [form, setForm] = useState({
    serie: "",
    sku: "",
    modelo: "",
    estado: "disponible" as EstadoEquipo,
    ubicacion: "",
    cliente: "",
    observacion: "",
  });
  const [dupError, setDupError] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return equipos.filter((e) => {
      if (estadoFilter !== "todos" && e.estado !== estadoFilter) return false;
      if (!q) return true;
      return (
        e.serie.toLowerCase().includes(q) ||
        e.modelo.toLowerCase().includes(q) ||
        (e.ubicacion ?? "").toLowerCase().includes(q) ||
        (e.cliente ?? "").toLowerCase().includes(q)
      );
    });
  }, [equipos, query, estadoFilter]);

  // Agrupar por modelo
  const byModel = useMemo(() => {
    const m: Record<string, Equipment[]> = {};
    for (const e of filtered) {
      const key = e.modelo || "Sin modelo";
      if (!m[key]) m[key] = [];
      m[key].push(e);
    }
    return m;
  }, [filtered]);

  const models = Object.entries(byModel).sort((a, b) => b[1].length - a[1].length);

  const openCreate = () => {
    setEditing(null);
    setForm({ serie: "", sku: "", modelo: "", estado: "disponible", ubicacion: "", cliente: "", observacion: "" });
    setDupError(false);
    setDialogOpen(true);
  };

  const openEdit = (e: Equipment) => {
    setEditing(e);
    setForm({
      serie: e.serie,
      sku: e.sku ?? "",
      modelo: e.modelo,
      estado: e.estado,
      ubicacion: e.ubicacion ?? "",
      cliente: e.cliente ?? "",
      observacion: e.observacion ?? "",
    });
    setDupError(false);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.serie.trim() || !form.modelo.trim()) return;
    if (editing) {
      updateEquipment(editing.id, {
        serie: form.serie.trim(),
        sku: form.sku.trim() || undefined,
        modelo: form.modelo.trim(),
        estado: form.estado,
        ubicacion: form.ubicacion.trim() || undefined,
        cliente: form.cliente.trim() || undefined,
        observacion: form.observacion.trim() || undefined,
      });
      toast({ title: "Equipo actualizado" });
    } else {
      if (findEquipmentBySerie(form.serie.trim())) {
        setDupError(true);
        return;
      }
      const id = addEquipment({
        serie: form.serie.trim(),
        sku: form.sku.trim() || undefined,
        modelo: form.modelo.trim(),
        estado: form.estado,
        ubicacion: form.ubicacion.trim() || undefined,
        cliente: form.cliente.trim() || undefined,
        observacion: form.observacion.trim() || undefined,
      });
      if (!id) {
        setDupError(true);
        return;
      }
      toast({ title: "Equipo registrado", description: form.serie.trim() });
    }
    setDialogOpen(false);
  };

  const handleDelete = (e: Equipment) => {
    deleteEquipment(e.id);
    toast({ title: "Equipo eliminado", description: e.serie });
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      {/* Encabezado */}
      <div className="anim-fade-up mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Cpu className="h-5 w-5" />
            Equipos
          </h1>
          <p className="text-sm text-muted-foreground">
            {equipos.length} equipo(s) · {models.length} modelo(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-48">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar serie, modelo…"
              className="h-9 rounded-xl bg-muted/50 pl-8 text-sm"
            />
          </div>
          <Button onClick={openCreate} className="press h-9 rounded-xl">
            <Plus className="mr-1.5 h-4 w-4" />
            Añadir equipo
          </Button>
        </div>
      </div>

      {/* Filtros por estado */}
      <div className="anim-fade-up mb-4 flex flex-wrap items-center gap-1.5">
        <FilterChip
          active={estadoFilter === "todos"}
          onClick={() => setEstadoFilter("todos")}
          label="Todos"
          count={equipos.length}
        />
        {ESTADOS.map((est) => {
          const count = equipos.filter((e) => e.estado === est).length;
          return (
            <FilterChip
              key={est}
              active={estadoFilter === est}
              onClick={() => setEstadoFilter(est)}
              label={ESTADO_META[est].short}
              count={count}
              tone={ESTADO_META[est].color}
            />
          );
        })}
      </div>

      {/* Lista por modelo */}
      {models.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
          {equipos.length === 0
            ? "No hay equipos registrados. Haz clic en \"Añadir equipo\" para registrar el primero."
            : "Sin coincidencias."}
        </div>
      ) : (
        <div className="space-y-2.5">
          {models.map(([modelo, items], i) => {
            const isOpen = expandedModel === modelo || expandedModel === "__all__";
            const disponible = items.filter((e) => e.estado === "disponible").length;
            const averiado = items.filter((e) => e.estado === "averiado" || e.estado === "en_retiro").length;
            return (
              <div
                key={modelo}
                className="anim-fade-up overflow-hidden rounded-2xl border border-border bg-card"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <button
                  onClick={() => setExpandedModel(isOpen ? null : modelo)}
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
                    <p className="truncate text-[14px] font-semibold">{modelo}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {items.length} equipo(s)
                      {disponible > 0 && ` · ${disponible} disponible(s)`}
                      {averiado > 0 && ` · ${averiado} averiado(s)`}
                    </p>
                  </div>
                  <div className="hidden items-center gap-1.5 sm:flex">
                    {ESTADOS.map((est) => {
                      const n = items.filter((e) => e.estado === est).length;
                      if (n === 0) return null;
                      return (
                        <span
                          key={est}
                          className={cn(
                            "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                            ESTADO_META[est].color === "destructive"
                              ? "bg-destructive/10 text-destructive"
                              : ESTADO_META[est].color === "primary"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {ESTADO_META[est].icon}
                          {n}
                        </span>
                      );
                    })}
                  </div>
                  <span className="rounded-full bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background">
                    {items.length}
                  </span>
                </button>

                {isOpen && (
                  <div className="anim-fade-in border-t border-border">
                    <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
                      {items.map((e) => (
                        <div
                          key={e.id}
                          className="group flex items-start gap-3 rounded-xl border border-border/60 p-3 transition-colors hover:bg-accent/30"
                        >
                          <span
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold",
                              ESTADO_META[e.estado].color === "destructive"
                                ? "bg-destructive/10 text-destructive"
                                : ESTADO_META[e.estado].color === "primary"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {ESTADO_META[e.estado].icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-[12px] font-semibold">{e.serie}</p>
                            {e.sku && (
                              <p className="font-mono text-[10px] text-muted-foreground">SKU: {e.sku}</p>
                            )}
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {ESTADO_META[e.estado].label}
                            </p>
                            {e.ubicacion && (
                              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                                <MapPin className="h-2.5 w-2.5" />
                                {e.ubicacion}
                              </p>
                            )}
                            {e.cliente && (
                              <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <User className="h-2.5 w-2.5" />
                                {e.cliente}
                              </p>
                            )}
                            {e.observacion && (
                              <p className="mt-0.5 text-[10px] italic text-muted-foreground">
                                {e.observacion}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={() => openEdit(e)}
                              className="press rounded-md p-1.5 text-muted-foreground hover:bg-accent"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(e)}
                              className="press rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog añadir/editar equipo */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              {editing ? "Editar equipo" : "Añadir equipo"}
            </DialogTitle>
            <DialogDescription>
              Registra equipos individuales por su número de serie (MAC, IMEI, S/N).
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-1">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="eq-serie">Número de serie *</Label>
              <Input
                id="eq-serie"
                value={form.serie}
                onChange={(e) => { setForm({ ...form, serie: e.target.value }); setDupError(false); }}
                placeholder="Ej. 48575443365E42B7"
                className={cn("rounded-xl font-mono", dupError && "border-destructive")}
                autoFocus
              />
              {dupError && (
                <p className="flex items-center gap-1 text-[11px] text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  Ya existe un equipo con esta serie
                </p>
              )}
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="eq-modelo">Modelo *</Label>
              <Input
                id="eq-modelo"
                value={form.modelo}
                onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                placeholder="Ej. ROUTER ONT HG8145X6-13 HUAWEI"
                className="rounded-xl"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eq-sku">SKU (opcional)</Label>
              <Input
                id="eq-sku"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="Ej. 4076358"
                className="rounded-xl font-mono"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v as EstadoEquipo })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {ESTADOS.map((est) => (
                    <SelectItem key={est} value={est}>
                      {ESTADO_META[est].icon} {ESTADO_META[est].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eq-ubic">Ubicación</Label>
              <Input
                id="eq-ubic"
                value={form.ubicacion}
                onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
                placeholder="Ej. Almacén, Taller, Cliente…"
                className="rounded-xl"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eq-cliente">Cliente</Label>
              <Input
                id="eq-cliente"
                value={form.cliente}
                onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                placeholder="Ej. Corporación ABC"
                className="rounded-xl"
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="eq-obs">Observación</Label>
              <Input
                id="eq-obs"
                value={form.observacion}
                onChange={(e) => setForm({ ...form, observacion: e.target.value })}
                placeholder="Ej. No enciende, cliente devolvió…"
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.serie.trim() || !form.modelo.trim()}
              className="rounded-xl"
            >
              {editing ? "Guardar cambios" : "Añadir equipo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "press flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
        active
          ? tone === "destructive"
            ? "border-destructive bg-destructive/10 text-destructive"
            : tone === "primary"
            ? "border-primary bg-primary/10 text-primary"
            : "border-primary bg-accent text-foreground"
          : "border-border bg-muted/40 text-muted-foreground hover:bg-accent/50"
      )}
    >
      {label}
      <span className="rounded-full bg-background px-1.5 text-[10px]">{count}</span>
    </button>
  );
}
