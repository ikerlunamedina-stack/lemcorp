"use client";

import { useState, useMemo } from "react";
import { FileText, Save, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { useStore } from "@/lib/store";
import { type DiaSemana, DIA_SEMANA_META } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const DIAS: DiaSemana[] = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

/** Obtiene el lunes de la semana actual en formato YYYY-MM-DD */
function getLunesActual(offsetSemanas: number = 0): string {
  const hoy = new Date();
  const diaSemana = hoy.getDay(); // 0=domingo, 1=lunes...
  const diff = diaSemana === 0 ? -6 : 1 - diaSemana; // Llegar al lunes
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diff + (offsetSemanas * 7));
  return lunes.toISOString().slice(0, 10);
}

/** Formatea una fecha YYYY-MM-DD a "DD/MM/YYYY" */
function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

export function ReporteSemanalView() {
  const { toast } = useToast();
  const [offsetSemana, setOffsetSemana] = useState(0);
  const [diaSeleccionado, setDiaSeleccionado] = useState<DiaSemana>("lunes");
  const semanaInicio = useMemo(() => getLunesActual(offsetSemana), [offsetSemana]);

  // Cargar/guardar reportes en localStorage (persistente, no se borra)
  const storageKey = `lemcorp-reportes-${semanaInicio}`;
  const [reportes, setReportes] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(`lemcorp-reportes-${semanaInicio}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const guardarDia = (dia: string, contenido: string) => {
    const nuevos = { ...reportes, [dia]: contenido };
    setReportes(nuevos);
    try {
      localStorage.setItem(storageKey, JSON.stringify(nuevos));
    } catch {}
  };

  const handleGuardar = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(reportes));
      toast({ title: "Guardado", description: "El reporte se guardó correctamente." });
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  // Generar texto del reporte completo para enviar
  const generarReporteTexto = () => {
    let texto = `REPORTE SEMANAL LEMCORP\nSemana del ${formatFecha(semanaInicio)}\n\n`;
    for (const dia of DIAS) {
      const contenido = reportes[dia] || "";
      if (contenido.trim()) {
        texto += `--- ${DIA_SEMANA_META[dia].label.toUpperCase()} ---\n${contenido}\n\n`;
      }
    }
    return texto;
  };

  const handleCopiar = () => {
    const texto = generarReporteTexto();
    navigator.clipboard.writeText(texto).then(() => {
      toast({ title: "Copiado", description: "Reporte copiado al portapapeles. Pégalo en WhatsApp o correo." });
    }).catch(() => {
      toast({ title: "No se pudo copiar", variant: "destructive" });
    });
  };

  const diaActual = DIAS[diaSeleccionado as DiaSemana] || "lunes";
  const contenidoActual = reportes[diaActual] || "";

  return (
    <div className="px-4 py-5 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            <FileText className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
            Reporte semanal
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escribe lo que pasa cada día. No se borra.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setOffsetSemana(o => o - 1)} className="press h-9 rounded-xl">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-[12px] font-semibold text-foreground min-w-[80px] text-center">
            {offsetSemana === 0 ? "Esta semana" : offsetSemana === -1 ? "Semana pasada" : `Hace ${Math.abs(offsetSemana)} sem`}
          </span>
          <Button variant="outline" size="sm" onClick={() => setOffsetSemana(o => o + 1)} className="press h-9 rounded-xl" disabled={offsetSemana >= 0}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Selector de día */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {DIAS.map((d) => {
          const activo = diaSeleccionado === d;
          const tieneContenido = !!(reportes[d] || "").trim();
          return (
            <button
              key={d}
              onClick={() => setDiaSeleccionado(d)}
              className={cn(
                "press flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-semibold transition-all",
                activo
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-accent"
              )}
            >
              <span>{DIA_SEMANA_META[d].label}</span>
              {tieneContenido && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Editor del día */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-foreground">
            {DIA_SEMANA_META[diaSeleccionado].label}
          </h2>
          <span className="text-[11px] text-muted-foreground">
            {formatFecha(semanaInicio)}
          </span>
        </div>
        <Textarea
          value={contenidoActual}
          onChange={(e) => guardarDia(diaActual, e.target.value)}
          placeholder={`Escribe lo que pasó el ${DIA_SEMANA_META[diaSeleccionado].label.toLowerCase()}...

Ejemplo: Se atendieron 20 cuadrillas. 3 pidieron material antes de las 6pm y se les despachó. Las demás pidieron después del cierre (6pm) y no se pudo despachar.`}
          className="min-h-[300px] rounded-xl border border-border bg-background p-3 text-[14px] leading-relaxed"
          autoFocus
        />
      </div>

      {/* Acciones */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={handleGuardar} className="press btn-spacecom h-10 rounded-xl">
          <Save className="mr-1.5 h-4 w-4" /> Guardar
        </Button>
        <Button variant="outline" onClick={handleCopiar} className="press h-10 rounded-xl">
          <Send className="mr-1.5 h-4 w-4" /> Copiar reporte completo
        </Button>
      </div>

      {/* Vista previa del reporte completo */}
      {Object.values(reportes).some(v => v.trim()) && (
        <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-4">
          <h3 className="mb-3 text-[13px] font-bold text-foreground">Vista previa del reporte</h3>
          <div className="space-y-3">
            {DIAS.map((d) => {
              const contenido = reportes[d] || "";
              if (!contenido.trim()) return null;
              return (
                <div key={d} className="rounded-xl border border-border/60 bg-card p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
                    {DIA_SEMANA_META[d].label}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
                    {contenido}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
