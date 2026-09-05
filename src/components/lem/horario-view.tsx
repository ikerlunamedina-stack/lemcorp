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

const ICON_PROPS = { strokeWidth: 1.5 } as const;

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

  // Estado UI para la pestaña de día seleccionada
  const [selectedDia, setSelectedDia] = useState<DiaSemana>(() => hoyDiaSemana());

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

  // Re-render trigger (5s)
  void pulseKey;

  const itemsSelected = porDia[selectedDia];
  const esSelectedHoy = selectedDia === hoy;

  return (
    <div className="anim-fade-in px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="anim-slide-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Operaciones</p>
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground">Horario del almacén</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Planifica la semana. Las actividades se te recordarán automáticamente.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="h-9 rounded-md bg-foreground text-[13px] font-medium text-background shadow-none hover:bg-foreground/90"
        >
          <Plus className="mr-1.5 h-4 w-4" {...ICON_PROPS} /> Nueva actividad
        </Button>
      </div>

      {/* Hora actual (minimal) */}
      <div className="anim-slide-up mt-6 flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima", weekday: "long", day: "numeric", month: "long" })}
          </p>
          <p className="mt-0.5 text-[28px] font-semibold tabular-nums tracking-tight text-foreground">
            {a12h(ahora24h().slice(0, 5) + ":00").replace(":00 ", " ")}
          </p>
        </div>
        <Clock className="h-5 w-5 text-muted-foreground" {...ICON_PROPS} />
      </div>

      {/* KPIs */}
      <div className="anim-slide-up mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        <KPI label="Total actividades" value={horario.length} icon={<Calendar className="h-4 w-4" {...ICON_PROPS} />} />
        <KPI label="Hoy" value={porDia[hoy].length} highlight icon={<Zap className="h-4 w-4" {...ICON_PROPS} />} />
        <KPI label="Despachos" value={horario.filter((h) => h.tipo === "despacho").length} icon={<Truck className="h-4 w-4" {...ICON_PROPS} />} />
        <KPI label="Reuniones" value={horario.filter((h) => h.tipo === "reunion").length} icon={<Users className="h-4 w-4" {...ICON_PROPS} />} />
      </div>

      {/* Vista semanal responsive */}
      {horario.length === 0 ? (
        <div className="anim-fade-in mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background px-4 py-16 text-center">
          <Calendar className="mb-3 h-10 w-10 text-muted-foreground/40" {...ICON_PROPS} />
          <p className="text-[13px] font-medium text-foreground">No hay actividades programadas</p>
          <p className="mb-4 mt-1 text-[12px] text-muted-foreground">
            Crea tu primera actividad para empezar a organizar la semana.
          </p>
          <Button
            onClick={openCreate}
            className="h-9 rounded-md bg-foreground text-[13px] font-medium text-background shadow-none hover:bg-foreground/90"
          >
            <Plus className="mr-1.5 h-4 w-4" {...ICON_PROPS} /> Agregar actividad
          </Button>
        </div>
      ) : (
        <>
          {/* Pestañas de día (text tabs, active = underline) */}
          <div className="anim-slide-up mt-6 overflow-x-auto">
            <div className="flex items-center gap-6 border-b border-border">
              {DIAS_ORDEN.map((d) => {
                const count = porDia[d].length;
                const isActive = selectedDia === d;
                const isToday = d === hoy;
                return (
                  <button
                    key={d}
                    onClick={() => setSelectedDia(d)}
                    className={cn(
                      "relative -mb-px border-b-2 px-1 py-2.5 text-[12px] font-medium transition-colors whitespace-nowrap",
                      isActive
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      {DIA_SEMANA_META[d].label}
                      {isToday && (
                        <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                      )}
                      {count > 0 && (
                        <span className="text-[10px] font-normal tabular-nums text-muted-foreground">{count}</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Items del día seleccionado (hairline rows) */}
          {itemsSelected.length === 0 ? (
            <div className="anim-fade-in mt-6 rounded-lg border border-dashed border-border bg-background px-4 py-12 text-center">
              <p className="text-[13px] font-medium text-foreground">
                Sin actividades para {DIA_SEMANA_META[selectedDia].label}
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Agrega una nueva actividad para este día.
              </p>
            </div>
          ) : (
            <div className="anim-fade-in mt-4 overflow-hidden rounded-lg border border-border bg-background">
              <div className="divide-y divide-border">
                {itemsSelected.map((h) => {
                  const cfg = TIPO_HORARIO_META[h.tipo];
                  const Icon = TIPO_ICONO[h.tipo];
                  const ocurriendo = esSelectedHoy && ahora >= h.horaInicio && ahora < h.horaFin;
                  const pasado = esSelectedHoy && ahora >= h.horaFin;
                  return (
                    <div
                      key={h.id}
                      className={cn(
                        "group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40",
                        pasado && "opacity-50"
                      )}
                    >
                      {/* Time range (mono, condensed) */}
                      <div className="flex w-[88px] shrink-0 flex-col text-[11px] tabular-nums leading-tight">
                        <span className="font-mono font-medium text-foreground">{a12h(h.horaInicio)}</span>
                        <span className="font-mono text-muted-foreground">{a12h(h.horaFin)}</span>
                      </div>

                      {/* Status dot */}
                      <div className="flex w-4 shrink-0 justify-center">
                        {ocurriendo ? (
                          <span className="h-2 w-2 animate-pulse rounded-full bg-foreground" title="Ocurriendo ahora" />
                        ) : pasado ? (
                          <Check className="h-3 w-3 text-muted-foreground" {...ICON_PROPS} />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                        )}
                      </div>

                      {/* Icon (line-art, muted) */}
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" {...ICON_PROPS} />

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-foreground">{h.actividad}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {cfg.label}
                          {ocurriendo && <span className="ml-2 text-foreground">· Ahora</span>}
                          {pasado && <span className="ml-2">· Hecho</span>}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => openEdit(h)}
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" {...ICON_PROPS} />
                        </button>
                        <button
                          onClick={() => handleDelete(h.id, `${DIA_SEMANA_META[selectedDia].label} ${a12h(h.horaInicio)} · ${h.actividad}`)}
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" {...ICON_PROPS} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialog para crear/editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-0 rounded-lg p-0">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold">
              {editingId
                ? <Pencil className="h-4 w-4 text-foreground" {...ICON_PROPS} />
                : <Plus className="h-4 w-4 text-foreground" {...ICON_PROPS} />}
              {editingId ? "Editar actividad" : "Nueva actividad"}
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              Agrega una actividad al horario semanal del almacén.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 px-5 py-4">
            {/* Día */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Día de la semana
              </Label>
              <Select value={dia} onValueChange={(v) => setDia(v as DiaSemana)}>
                <SelectTrigger className="h-9 rounded-md border-border bg-background"><SelectValue /></SelectTrigger>
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
                <Label className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <Clock className="h-3 w-3" {...ICON_PROPS} /> Hora inicio
                </Label>
                <Input
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className="h-9 rounded-md border-border bg-background"
                />
                <p className="text-[10px] text-muted-foreground">{a12h(horaInicio)}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <Clock className="h-3 w-3" {...ICON_PROPS} /> Hora fin
                </Label>
                <Input
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                  className="h-9 rounded-md border-border bg-background"
                />
                <p className="text-[10px] text-muted-foreground">{a12h(horaFin)}</p>
              </div>
            </div>

            {/* Actividad */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Actividad
              </Label>
              <Input
                value={actividad}
                onChange={(e) => setActividad(e.target.value)}
                placeholder="Ej: Despacho matutino"
                className="h-9 rounded-md border-border bg-background"
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                autoFocus
              />
            </div>

            {/* Tipo */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Tipo de actividad
              </Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoHorario)}>
                <SelectTrigger className="h-9 rounded-md border-border bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIPO_HORARIO_META) as TipoHorario[]).map((t) => {
                    const cfg = TIPO_HORARIO_META[t];
                    const Icon = TIPO_ICONO[t];
                    return (
                      <SelectItem key={t} value={t}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5" {...ICON_PROPS} /> {cfg.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
              <BellRing className="mr-1 inline h-3 w-3" {...ICON_PROPS} />
              Al coincidir la hora de inicio, Alana te avisará con una notificación y leerá el texto en voz alta (si el TTS está activado).
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border px-5 py-3">
            <DialogClose asChild>
              <Button
                variant="outline"
                className="h-9 rounded-md border-border bg-background text-[13px] font-medium text-foreground hover:bg-muted"
              >
                Cancelar
              </Button>
            </DialogClose>
            <Button
              onClick={handleSave}
              className="h-9 rounded-md bg-foreground text-[13px] font-medium text-background shadow-none hover:bg-foreground/90"
            >
              {editingId ? (
                <><Pencil className="mr-1.5 h-4 w-4" {...ICON_PROPS} /> Guardar cambios</>
              ) : (
                <><Plus className="mr-1.5 h-4 w-4" {...ICON_PROPS} /> Agregar</>
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
    <div className={cn("bg-background px-4 py-3", highlight && "bg-muted/40")}>
      <div className="mb-1 text-muted-foreground">{icon}</div>
      <p className="text-lg font-semibold tabular-nums text-foreground">{value}</p>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
