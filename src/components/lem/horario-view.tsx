"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Calendar,
  Plus,
  Trash2,
  Pencil,
  Clock,
  Truck,
  UtensilsCrossed,
  Users,
  CircleDot,
  BellRing,
  Sun,
  Moon,
  Coffee,
  Zap,
  Check,
  X,
  Play,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  type DiaSemana,
  type TipoHorario,
  DIA_SEMANA_META,
  TIPO_HORARIO_META,
  type Horario,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const DIAS_ORDEN: DiaSemana[] = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
];

const TIPO_ICONO: Record<TipoHorario, typeof Truck> = {
  despacho: Truck,
  almuerzo: UtensilsCrossed,
  reunion: Users,
  otro: CircleDot,
};

/** Convierte "14:30" → "2:30 PM" */
function a12h(hora24: string): string {
  if (!hora24) return "";
  const [h, m] = hora24.split(":").map((x) => parseInt(x, 10));
  if (isNaN(h)) return hora24;
  const periodo = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m || 0).padStart(2, "0")} ${periodo}`;
}

/** Convierte "2:30 PM" → "14:30" para el input type=time */
function a24h(hora12: string): string {
  if (!hora12) return "";
  const match = hora12.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return hora12;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const periodo = match[3].toUpperCase();
  if (periodo === "PM" && h !== 12) h += 12;
  if (periodo === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function hoyDiaSemana(): DiaSemana {
  const dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  return dias[new Date().getDay()] as DiaSemana;
}

function ahora24h(): string {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export function HorarioView() {
  const horario = useStore((s) => s.horario);
  const addHorarioItem = useStore((s) => s.addHorarioItem);
  const updateHorarioItem = useStore((s) => s.updateHorarioItem);
  const deleteHorarioItem = useStore((s) => s.deleteHorarioItem);
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dia, setDia] = useState<DiaSemana>("lunes");
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFin, setHoraFin] = useState("09:00");
  const [actividad, setActividad] = useState("");
  const [tipo, setTipo] = useState<TipoHorario>("despacho");

  // Para animaciones dinámicas cada 5 segundos
  const [pulseKey, setPulseKey] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPulseKey((k) => k + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const hoy = hoyDiaSemana();
  const ahora = ahora24h();

  // Agrupar por día y ordenar por horaInicio
  const porDia = useMemo(() => {
    const map: Record<DiaSemana, Horario[]> = {
      lunes: [], martes: [], miercoles: [], jueves: [],
      viernes: [], sabado: [], domingo: [],
    };
    for (const h of horario) {
      if (map[h.dia]) map[h.dia].push(h);
    }
    for (const d of DIAS_ORDEN) {
      map[d].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    }
    return map;
  }, [horario]);

  const resetForm = () => {
    setDia("lunes");
    setHoraInicio("08:00");
    setHoraFin("09:00");
    setActividad("");
    setTipo("despacho");
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (h: Horario) => {
    setEditingId(h.id);
    setDia(h.dia);
    setHoraInicio(h.horaInicio);
    setHoraFin(h.horaFin);
    setActividad(h.actividad);
    setTipo(h.tipo);
    setOpen(true);
  };

  const handleSave = () => {
    const act = actividad.trim();
    if (!act) {
      toast({ title: "Falta el nombre", description: "Escribe la actividad.", variant: "destructive" });
      return;
    }
    if (horaInicio >= horaFin) {
      toast({ title: "Horas inválidas", description: "La hora de inicio debe ser menor que la de fin.", variant: "destructive" });
      return;
    }
    if (editingId) {
      updateHorarioItem(editingId, { dia, horaInicio, horaFin, actividad: act, tipo });
      toast({ title: "Actividad actualizada", description: `${DIA_SEMANA_META[dia].label} · ${a12h(horaInicio)} – ${a12h(horaFin)} · ${act}` });
    } else {
      addHorarioItem({ dia, horaInicio, horaFin, actividad: act, tipo });
      toast({ title: "Actividad agregada", description: `${DIA_SEMANA_META[dia].label} · ${a12h(horaInicio)} – ${a12h(horaFin)} · ${act}` });
    }
    resetForm();
    setOpen(false);
  };

  const handleDelete = (id: string, label: string) => {
    deleteHorarioItem(id);
    toast({ title: "Actividad eliminada", description: label });
  };

  return (
    <div className="px-4 py-5 sm:px-6 lg:px-8">
      {/* Header con animación */}
      <div className="anim-fade-up mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
            <span className="anim-horario-breathe">
              <Calendar className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
            </span>
            Horario del almacén
          </h1>
          <p className="text-sm text-muted-foreground">
            Planifica la semana. Las actividades se te recordarán automáticamente.
          </p>
        </div>
        <Button onClick={openCreate} className="btn-spacecom rounded-xl h-10">
          <Plus className="mr-1.5 h-4 w-4" /> Nueva actividad
        </Button>
      </div>

      {/* Hora actual grande con animación */}
      <div className="anim-fade-up mb-5 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 anim-horario-shimmer" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima", weekday: "long", day: "numeric", month: "long" })}
              </p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
                {a12h(ahora24h().slice(0, 5) + ":00").replace(":00 ", " ")}
                <span className="ml-2 text-lg text-primary">{ahora.slice(0, 5).split(":")[1] >= "30" ? "PM" : "AM"}</span>
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 sm:h-16 sm:w-16">
              <Clock className="h-7 w-7 text-primary anim-horario-pulse sm:h-8 sm:w-8" />
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="anim-fade-up mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <KPI label="Total actividades" value={horario.length} icon={<Calendar className="h-4 w-4" />} />
        <KPI label="Hoy" value={porDia[hoy].length} highlight icon={<Zap className="h-4 w-4" />} />
        <KPI label="Despachos" value={horario.filter((h) => h.tipo === "despacho").length} icon={<Truck className="h-4 w-4" />} />
        <KPI label="Reuniones" value={horario.filter((h) => h.tipo === "reunion").length} icon={<Users className="h-4 w-4" />} />
      </div>

      {/* Vista semanal responsive */}
      {horario.length === 0 ? (
        <div className="anim-fade-up flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/50 p-8 text-center sm:p-10">
          <Calendar className="mb-3 h-12 w-12 text-muted-foreground anim-horario-breathe sm:h-16 sm:w-16" />
          <p className="text-[15px] font-semibold">No hay actividades programadas</p>
          <p className="mb-4 mt-1 text-[13px] text-muted-foreground">
            Crea tu primera actividad para empezar a organizar la semana.
          </p>
          <Button onClick={openCreate} className="btn-spacecom rounded-xl h-10">
            <Plus className="mr-1.5 h-4 w-4" /> Agregar actividad
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {DIAS_ORDEN.map((d, diaIdx) => {
            const items = porDia[d];
            const esHoy = d === hoy;
            return (
              <div
                key={d}
                className={cn(
                  "anim-horario-slide-in flex flex-col rounded-2xl border bg-card p-3 shadow-sm transition-all sm:p-4",
                  esHoy ? "border-primary ring-2 ring-primary/20" : "border-border"
                )}
                style={{ animationDelay: `${diaIdx * 60}ms` }}
              >
                {/* Cabecera del día */}
                <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl text-[12px] font-bold transition-all sm:h-10 sm:w-10",
                        esHoy
                          ? "bg-primary text-primary-foreground anim-horario-pulse"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {DIA_SEMANA_META[d].short}
                    </span>
                    <div className="flex flex-col leading-tight">
                      <span className="text-[13px] font-bold">{DIA_SEMANA_META[d].label}</span>
                      {esHoy && (
                        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-primary">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary anim-horario-pulse" />
                          Hoy
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {items.length} {items.length === 1 ? "act." : "acts."}
                  </span>
                </div>

                {/* Items del día */}
                {items.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center py-4 text-[11px] text-muted-foreground">
                    Sin actividades
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {items.map((h, idx) => {
                      const cfg = TIPO_HORARIO_META[h.tipo];
                      const Icon = TIPO_ICONO[h.tipo];
                      const ocurriendo = esHoy && ahora >= h.horaInicio && ahora < h.horaFin;
                      const pasado = esHoy && ahora >= h.horaFin;
                      return (
                        <div
                          key={h.id}
                          className={cn(
                            "group relative flex items-start gap-2.5 rounded-xl border bg-background/60 p-2.5 transition-all",
                            ocurriendo
                              ? "border-primary/50 ring-1 ring-primary/30 anim-horario-glow"
                              : pasado
                              ? "border-border opacity-50"
                              : "border-border hover:border-primary/30"
                          )}
                          style={{ animationDelay: `${idx * 80}ms` }}
                        >
                          {/* Icono del tipo */}
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white transition-transform group-hover:scale-110 sm:h-9 sm:w-9"
                            style={{
                              backgroundColor:
                                h.tipo === "despacho" ? "var(--primary)" :
                                h.tipo === "almuerzo" ? "oklch(0.70 0.13 75)" :
                                h.tipo === "reunion" ? "oklch(0.65 0.10 220)" :
                                "oklch(0.65 0.13 145)",
                            }}
                          >
                            <Icon className="h-4 w-4" />
                          </div>

                          {/* Contenido */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] font-bold tabular-nums text-foreground">
                                {a12h(h.horaInicio)}
                              </span>
                              <span className="text-[10px] text-muted-foreground">→</span>
                              <span className="font-mono text-[11px] font-bold tabular-nums text-muted-foreground">
                                {a12h(h.horaFin)}
                              </span>
                              {ocurriendo && (
                                <span className="flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-bold uppercase text-primary-foreground">
                                  <BellRing className="h-2.5 w-2.5 anim-horario-pulse" /> Ahora
                                </span>
                              )}
                              {pasado && (
                                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[8px] font-bold uppercase text-muted-foreground">
                                  <Check className="h-2.5 w-2.5" /> Hecho
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 line-clamp-2 break-words text-[12px] font-medium leading-snug">
                              {h.actividad}
                            </p>
                            <span className="mt-0.5 inline-block rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                              {cfg.label}
                            </span>
                          </div>

                          {/* Acciones */}
                          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={() => openEdit(h)}
                              className="press rounded-md p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(h.id, `${DIA_SEMANA_META[d].label} ${a12h(h.horaInicio)} · ${h.actividad}`)}
                              className="press rounded-md p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                              title="Eliminar"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog para crear/editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingId ? <Pencil className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-primary" />}
              {editingId ? "Editar actividad" : "Nueva actividad"}
            </DialogTitle>
            <DialogDescription>
              Agrega una actividad al horario semanal del almacén.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            {/* Día */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Día de la semana
              </Label>
              <Select value={dia} onValueChange={(v) => setDia(v as DiaSemana)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIAS_ORDEN.map((d) => (
                    <SelectItem key={d} value={d}>{DIA_SEMANA_META[d].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Horas en formato 12h */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <Clock className="h-3 w-3" /> Hora inicio
                </Label>
                <Input
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className="rounded-xl"
                />
                <p className="text-[10px] text-primary">{a12h(horaInicio)}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <Clock className="h-3 w-3" /> Hora fin
                </Label>
                <Input
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                  className="rounded-xl"
                />
                <p className="text-[10px] text-primary">{a12h(horaFin)}</p>
              </div>
            </div>

            {/* Actividad */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Actividad
              </Label>
              <Input
                value={actividad}
                onChange={(e) => setActividad(e.target.value)}
                placeholder="Ej: Despacho matutino"
                className="rounded-xl"
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                autoFocus
              />
            </div>

            {/* Tipo */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Tipo de actividad
              </Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoHorario)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIPO_HORARIO_META) as TipoHorario[]).map((t) => {
                    const cfg = TIPO_HORARIO_META[t];
                    const Icon = TIPO_ICONO[t];
                    return (
                      <SelectItem key={t} value={t}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5" /> {cfg.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl bg-muted/40 p-2 text-[11px] text-muted-foreground">
              <BellRing className="mr-1 inline h-3 w-3 text-primary" />
              Al coincidir la hora de inicio, Alana te avisará con una notificación y leerá el texto en voz alta (si el TTS está activado).
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="rounded-xl">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSave} className="btn-spacecom rounded-xl">
              {editingId ? (
                <><Pencil className="mr-1.5 h-4 w-4" /> Guardar cambios</>
              ) : (
                <><Plus className="mr-1.5 h-4 w-4" /> Agregar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KPI({
  label,
  value,
  highlight,
  icon,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-3 text-center transition-colors",
        highlight ? "border-primary/40 bg-primary/5" : "border-border bg-card"
      )}
    >
      <div className="mb-1 flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <p className={cn("text-xl font-semibold tabular-nums sm:text-2xl", highlight ? "text-primary" : "text-foreground")}>
        {value}
      </p>
      <p className="text-[10px] font-medium text-muted-foreground sm:text-[11px]">{label}</p>
    </div>
  );
}
