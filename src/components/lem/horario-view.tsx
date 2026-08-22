"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  Plus,
  Trash2,
  Clock,
  Truck,
  UtensilsCrossed,
  Users,
  CircleDot,
  BellRing,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  type DiaSemana,
  type TipoHorario,
  DIA_SEMANA_META,
  TIPO_HORARIO_META,
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

function hoyDiaSemana(): DiaSemana {
  const dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  return dias[new Date().getDay()] as DiaSemana;
}

function ahoraStr(): string {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export function HorarioView() {
  const horario = useStore((s) => s.horario);
  const addHorarioItem = useStore((s) => s.addHorarioItem);
  const deleteHorarioItem = useStore((s) => s.deleteHorarioItem);
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [dia, setDia] = useState<DiaSemana>("lunes");
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFin, setHoraFin] = useState("09:00");
  const [actividad, setActividad] = useState("");
  const [tipo, setTipo] = useState<TipoHorario>("despacho");

  const hoy = hoyDiaSemana();
  const ahora = ahoraStr();

  // Agrupar por día y ordenar por horaInicio
  const porDia = useMemo(() => {
    const map: Record<DiaSemana, typeof horario> = {
      lunes: [],
      martes: [],
      miercoles: [],
      jueves: [],
      viernes: [],
      sabado: [],
      domingo: [],
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
  };

  const handleAdd = () => {
    const act = actividad.trim();
    if (!act) {
      toast({
        title: "Falta el nombre",
        description: "Escribe la actividad (ej: Despacho matutino, Almuerzo, Reunión).",
        variant: "destructive",
      });
      return;
    }
    if (horaInicio >= horaFin) {
      toast({
        title: "Horas inválidas",
        description: "La hora de inicio debe ser menor que la hora de fin.",
        variant: "destructive",
      });
      return;
    }
    addHorarioItem({
      dia,
      horaInicio,
      horaFin,
      actividad: act,
      tipo,
    });
    toast({
      title: "Actividad agregada",
      description: `${DIA_SEMANA_META[dia].label} · ${horaInicio}–${horaFin} · ${act}`,
    });
    resetForm();
    setOpen(false);
  };

  const handleDelete = (id: string, label: string) => {
    deleteHorarioItem(id);
    toast({
      title: "Actividad eliminada",
      description: label,
    });
  };

  return (
    <div className="px-4 py-6 lg:px-8">
      {/* Header */}
      <div className="anim-fade-up mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Calendar className="h-5 w-5 text-primary" /> Horario del almacén
          </h1>
          <p className="text-sm text-muted-foreground">
            Planifica la semana. Las actividades se te recordarán automáticamente con una notificación.
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
          className="btn-spacecom rounded-xl"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Nueva actividad
        </Button>
      </div>

      {/* KPIs */}
      <div className="anim-fade-up mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <KPI label="Total actividades" value={horario.length} />
        <KPI label="Hoy" value={porDia[hoy].length} highlight />
        <KPI label="Despachos" value={horario.filter((h) => h.tipo === "despacho").length} />
        <KPI label="Reuniones" value={horario.filter((h) => h.tipo === "reunion").length} />
      </div>

      {/* Vista semanal responsive */}
      {horario.length === 0 ? (
        <div className="anim-fade-up flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/50 p-10 text-center">
          <Calendar className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-[14px] font-semibold">No hay actividades programadas</p>
          <p className="mb-4 text-[12px] text-muted-foreground">
            Crea tu primera actividad para empezar a organizar la semana.
          </p>
          <Button
            onClick={() => {
              resetForm();
              setOpen(true);
            }}
            className="btn-spacecom rounded-xl"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Agregar actividad
          </Button>
        </div>
      ) : (
        <div className="anim-fade-up grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {DIAS_ORDEN.map((d) => {
            const items = porDia[d];
            const esHoy = d === hoy;
            return (
              <div
                key={d}
                className={cn(
                  "flex flex-col rounded-3xl border bg-card p-3 shadow-sm transition-colors",
                  esHoy ? "border-primary/60 ring-1 ring-primary/20" : "border-border"
                )}
              >
                <div className="mb-2 flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-xl text-[12px] font-bold",
                        esHoy
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {DIA_SEMANA_META[d].short}
                    </span>
                    <div className="flex flex-col leading-tight">
                      <span className="text-[12px] font-bold">{DIA_SEMANA_META[d].label}</span>
                      {esHoy && (
                        <span className="text-[9px] font-bold uppercase tracking-wide text-primary">
                          Hoy
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {items.length} {items.length === 1 ? "act." : "acts."}
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center py-4 text-[10px] text-muted-foreground">
                    Sin actividades
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {items.map((h) => {
                      const cfg = TIPO_HORARIO_META[h.tipo];
                      const Icon = TIPO_ICONO[h.tipo];
                      // Highlight si está ocurriendo ahora
                      const ocurriendo =
                        esHoy && ahora >= h.horaInicio && ahora < h.horaFin;
                      return (
                        <div
                          key={h.id}
                          className={cn(
                            "group flex items-start gap-2 rounded-2xl border bg-background/60 p-2.5 transition-all",
                            ocurriendo
                              ? "border-primary/50 ring-1 ring-primary/30"
                              : "border-border hover:border-primary/30"
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
                            )}
                            style={{
                              backgroundColor:
                                h.tipo === "despacho"
                                  ? "var(--primary)"
                                  : h.tipo === "almuerzo"
                                  ? "oklch(0.70 0.13 75)"
                                  : h.tipo === "reunion"
                                  ? "oklch(0.65 0.10 220)"
                                  : "oklch(0.65 0.13 145)",
                            }}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] font-bold tabular-nums text-foreground">
                                {h.horaInicio}–{h.horaFin}
                              </span>
                              {ocurriendo && (
                                <span className="flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-bold uppercase text-primary-foreground">
                                  <BellRing className="h-2.5 w-2.5" /> Ahora
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
                          <button
                            onClick={() =>
                              handleDelete(
                                h.id,
                                `${DIA_SEMANA_META[d].label} ${h.horaInicio} · ${h.actividad}`
                              )
                            }
                            className="press shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-rose-500 group-hover:opacity-100"
                            title="Eliminar actividad"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
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

      {/* Dialog para nueva actividad */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> Nueva actividad
            </DialogTitle>
            <DialogDescription>
              Agrega una actividad al horario semanal del almacén.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Día de la semana
              </Label>
              <Select value={dia} onValueChange={(v) => setDia(v as DiaSemana)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIAS_ORDEN.map((d) => (
                    <SelectItem key={d} value={d}>
                      {DIA_SEMANA_META[d].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Actividad
              </Label>
              <Input
                value={actividad}
                onChange={(e) => setActividad(e.target.value)}
                placeholder="Ej: Despacho matutino a técnicos"
                className="rounded-xl"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Tipo de actividad
              </Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoHorario)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIPO_HORARIO_META) as TipoHorario[]).map((t) => {
                    const cfg = TIPO_HORARIO_META[t];
                    const Icon = TIPO_ICONO[t];
                    return (
                      <SelectItem key={t} value={t}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5" />
                          {cfg.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <p className="rounded-xl bg-muted/40 p-2 text-[11px] text-muted-foreground">
              <BellRing className="mr-1 inline h-3 w-3 text-primary" />
              Al coincidir la hora de inicio, Alana te avisará con una notificación y leerá el texto en voz alta (si el TTS está activado).
            </p>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="rounded-xl">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleAdd} className="btn-spacecom rounded-xl">
              <Plus className="mr-1.5 h-4 w-4" /> Agregar
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
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-3 text-center",
        highlight ? "border-primary/40 bg-primary/5" : "border-border bg-card"
      )}
    >
      <p
        className={cn(
          "text-xl font-semibold tabular-nums",
          highlight ? "text-primary" : "text-foreground"
        )}
      >
        {value}
      </p>
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
