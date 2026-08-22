"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ScanLine,
  Trash2,
  Save,
  Check,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Cpu,
  Hash,
  Settings2,
  CircleDot,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  ESTADO_META,
  PISTOLEO_CAMPOS,
  REGLAS_PREFIJO,
  type EstadoEquipo,
  type PistoleoCampo,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const ESTADOS: EstadoEquipo[] = ["disponible", "averiado", "en_retiro", "en_reparacion"];

interface FeedbackMsg {
  ok: boolean;
  text: string;
  ts: number;
}

function detectarModelo(serie: string, prefijoEnabled: boolean): string | null {
  if (!prefijoEnabled) return null;
  const s = serie.trim().toUpperCase();
  for (const r of REGLAS_PREFIJO) {
    if (s.startsWith(r.prefijo.toUpperCase())) return r.modelo;
  }
  return null;
}

function validarPrefijo(serie: string, prefijo: string, enabled: boolean): boolean {
  if (!enabled) return true;
  if (!prefijo.trim()) return true;
  return serie.trim().toUpperCase().startsWith(prefijo.trim().toUpperCase());
}

export function PistolearView() {
  const settings = useStore((s) => s.settings);
  const setSetting = useStore((s) => s.setSetting);
  const pistoleoCampo = useStore((s) => s.pistoleoCampo);
  const pistoleoModelo = useStore((s) => s.pistoleoModelo);
  const pistoleoEstado = useStore((s) => s.pistoleoEstado);
  const pistoleoFilas = useStore((s) => s.pistoleoFilas);
  const findEquipmentBySerie = useStore((s) => s.findEquipmentBySerie);
  const setPistoleoConfig = useStore((s) => s.setPistoleoConfig);
  const addPistoleoFila = useStore((s) => s.addPistoleoFila);
  const deletePistoleoFila = useStore((s) => s.deletePistoleoFila);
  const clearPistoleoFilas = useStore((s) => s.clearPistoleoFilas);
  const confirmarPistoleo = useStore((s) => s.confirmarPistoleo);
  const { toast } = useToast();

  const [showConfig, setShowConfig] = useState(true);
  const [valor, setValor] = useState("");
  const [feedback, setFeedback] = useState<FeedbackMsg | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const campoMeta = PISTOLEO_CAMPOS[pistoleoCampo];
  const camposEsperados = campoMeta.campos.length; // 1, 2 o 2
  const [parcial, setParcial] = useState<string[]>([]);

  // Foco automático al input
  useEffect(() => {
    inputRef.current?.focus();
  }, [pistoleoCampo]);

  const pushFeedback = (ok: boolean, text: string) => {
    setFeedback({ ok, text, ts: Date.now() });
  };

  const handleScan = (raw: string) => {
    const v = raw.trim();
    if (!v) return;

    // Validar prefijo (solo en el primer campo = serie)
    const idxEnFila = parcial.length; // 0 = serie, 1 = ua/mac
    const esSerie = idxEnFila === 0;
    if (esSerie && !validarPrefijo(v, settings.pistoleoPrefijo, settings.pistoleoPrefijoEnabled)) {
      pushFeedback(false, `Rechazada: no empieza con ${settings.pistoleoPrefijo}`);
      setValor("");
      return;
    }

    // Verificar duplicado si es serie
    if (esSerie && findEquipmentBySerie(v)) {
      pushFeedback(false, `Rechazada: serie duplicada (${v})`);
      setValor("");
      return;
    }

    // Verificar duplicado dentro de filas actuales
    if (esSerie) {
      const yaEnFilas = pistoleoFilas.some((f) => f.valores[0]?.toUpperCase() === v.toUpperCase());
      if (yaEnFilas) {
        pushFeedback(false, `Rechazada: ya capturada en esta sesión`);
        setValor("");
        return;
      }
    }

    const nuevosParcial = [...parcial, v];
    setParcial(nuevosParcial);
    setValor("");

    if (nuevosParcial.length >= camposEsperados) {
      addPistoleoFila(nuevosParcial);
      setParcial([]);
      const modeloDetectado = pistoleoModelo.trim() || detectarModelo(v, settings.pistoleoPrefijoEnabled) || "SIN MODELO";
      pushFeedback(true, `Aceptada · ${v} → ${modeloDetectado}`);
    } else {
      pushFeedback(true, `Aceptada · ${v} (esperando ${campoMeta.campos[nuevosParcial.length]}…)`);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleScan(valor);
    } else if (e.key === "Escape" && parcial.length > 0) {
      setParcial([]);
      setValor("");
      pushFeedback(false, "Lectura parcial cancelada");
    }
  };

  const handleConfirmar = () => {
    if (pistoleoFilas.length === 0) return;
    const r = confirmarPistoleo();
    if (r.ok) {
      toast({ title: "Series guardadas", description: r.msg });
      pushFeedback(true, r.msg);
    } else {
      toast({ title: "Sin guardar", description: r.msg, variant: "destructive" });
      pushFeedback(false, r.msg);
    }
  };

  const handleClear = () => {
    if (pistoleoFilas.length === 0) return;
    clearPistoleoFilas();
    toast({ title: "Captura descartada" });
  };

  const hayParcial = parcial.length > 0;
  const feedbackVisible = feedback && Date.now() - feedback.ts < 4000;

  return (
    <div className="px-4 py-6 lg:px-8">
      {/* Header */}
      <div className="anim-fade-up mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <ScanLine className="h-5 w-5 text-primary" /> Pistolear series
          </h1>
          <p className="text-sm text-muted-foreground">
            Captura rápida con lector óptico. Cada lectura envía Enter automáticamente.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowConfig((v) => !v)}
          className="press h-9 rounded-xl"
        >
          <Settings2 className="mr-1.5 h-4 w-4" />
          {showConfig ? "Ocultar config" : "Configuración"}
          {showConfig ? <ChevronDown className="ml-1 h-3 w-3" /> : <ChevronRight className="ml-1 h-3 w-3" />}
        </Button>
      </div>

      {/* Config panel */}
      {showConfig && (
        <div className="anim-fade-up mb-4 rounded-2xl border border-border bg-card p-5">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Toggle + prefijo */}
            <div className="lg:col-span-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Validación de prefijo
              </Label>
              <div className="mt-1.5 flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                <Switch
                  checked={settings.pistoleoPrefijoEnabled}
                  onCheckedChange={(v) => setSetting("pistoleoPrefijoEnabled", v)}
                />
                <div className="flex-1">
                  <p className="text-[12px] font-medium">Activar validación</p>
                  <p className="text-[10px] text-muted-foreground">Solo acepta series con el prefijo</p>
                </div>
              </div>
              <div className="mt-2">
                <Label htmlFor="prefijo" className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Prefijo
                </Label>
                <Input
                  id="prefijo"
                  value={settings.pistoleoPrefijo}
                  onChange={(e) => setSetting("pistoleoPrefijo", e.target.value)}
                  placeholder="ZTEATV"
                  className="mt-1 rounded-xl font-mono uppercase"
                  disabled={!settings.pistoleoPrefijoEnabled}
                />
              </div>
            </div>

            {/* Modelo y estado por defecto */}
            <div className="lg:col-span-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Modelo por defecto (opcional)
              </Label>
              <Input
                value={pistoleoModelo}
                onChange={(e) => setPistoleoConfig({ pistoleoModelo: e.target.value })}
                placeholder="Se autodetecta por prefijo si lo dejas vacío"
                className="mt-1.5 rounded-xl"
              />
              <Label className="mt-3 block text-[11px] uppercase tracking-wide text-muted-foreground">
                Estado por defecto
              </Label>
              <Select
                value={pistoleoEstado}
                onValueChange={(v) => setPistoleoConfig({ pistoleoEstado: v as EstadoEquipo })}
              >
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {ESTADOS.map((est) => (
                    <SelectItem key={est} value={est}>
                      {ESTADO_META[est].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reglas de auto-detección */}
            <div className="lg:col-span-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Reglas de auto-detección
              </Label>
              <div className="mt-1.5 space-y-1.5">
                {REGLAS_PREFIJO.map((r) => (
                  <div
                    key={r.prefijo}
                    className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-2"
                  >
                    <CircleDot className="mt-0.5 h-3 w-3 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] font-semibold text-primary">{r.prefijo}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{r.modelo}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modo: 3 botones */}
      <div className="anim-fade-up mb-4 flex flex-wrap gap-1.5">
        {(Object.keys(PISTOLEO_CAMPOS) as PistoleoCampo[]).map((k) => {
          const meta = PISTOLEO_CAMPOS[k];
          const active = pistoleoCampo === k;
          return (
            <button
              key={k}
              onClick={() => {
                setPistoleoConfig({ pistoleoCampo: k });
                setParcial([]);
              }}
              className={cn(
                "press flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-medium transition-all",
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-accent"
              )}
            >
              <Hash className="h-3.5 w-3.5" />
              {meta.label}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
          {hayParcial ? (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-amber-300">
              <AlertTriangle className="h-3 w-3" />
              Esperando: {campoMeta.campos[parcial.length]}… ({parcial.length}/{camposEsperados})
            </span>
          ) : (
            <span className="flex items-center gap-1">
              Modo activo: <strong className="text-foreground">{campoMeta.label}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Input grande */}
      <div className="anim-fade-up mb-3">
        <div className="relative">
          <ScanLine className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
          <input
            ref={inputRef}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              hayParcial
                ? `Escanear ${campoMeta.campos[parcial.length]}… (Enter para confirmar)`
                : `Escanear serie con el lector… (Enter para confirmar)`
            }
            className="h-14 w-full rounded-2xl border-2 border-primary/30 bg-card pl-14 pr-4 font-mono text-[16px] font-semibold tracking-wide outline-none transition-all focus:border-primary focus:shadow-[0_0_0_4px_oklch(0.58_0.22_295/0.15)]"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        {/* Live feedback */}
        <div className="mt-2 h-6">
          {feedbackVisible && feedback && (
            <div
              className={cn(
                "anim-fade-up inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium",
                feedback.ok
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-red-500/15 text-red-400"
              )}
            >
              {feedback.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              {feedback.text}
            </div>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="anim-fade-up mb-4 flex flex-wrap items-center gap-2">
        <Button
          onClick={handleConfirmar}
          disabled={pistoleoFilas.length === 0}
          className="press btn-spacecom h-10 rounded-xl"
        >
          <Save className="mr-1.5 h-4 w-4" /> Guardar en sistema ({pistoleoFilas.length})
        </Button>
        <Button
          variant="outline"
          onClick={handleClear}
          disabled={pistoleoFilas.length === 0}
          className="press h-10 rounded-xl"
        >
          <Trash2 className="mr-1.5 h-4 w-4" /> Descartar captura
        </Button>
        <span className="ml-auto text-[11px] text-muted-foreground">
          Tip: pulsa <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd> para cancelar una lectura parcial
        </span>
      </div>

      {/* Tabla de capturas */}
      <div className="anim-fade-up overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Cpu className="h-4 w-4 text-primary" /> Series capturadas
          </h2>
          <span className="text-[11px] text-muted-foreground">{pistoleoFilas.length} captura(s)</span>
        </div>
        {pistoleoFilas.length === 0 ? (
          <div className="px-4 py-10 text-center text-[12px] text-muted-foreground">
            Aún no has capturado series. Escanea con el lector y aparecerán aquí.
          </div>
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">#</th>
                  <th className="px-4 py-2.5 font-medium">Serie</th>
                  {pistoleoCampo !== "serie" && (
                    <th className="px-4 py-2.5 font-medium">
                      {pistoleoCampo === "serie_ua" ? "UA" : "MAC"}
                    </th>
                  )}
                  <th className="px-4 py-2.5 font-medium">Modelo detectado</th>
                  <th className="px-4 py-2.5 font-medium">Hora</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {pistoleoFilas.map((f, i) => {
                  const serie = f.valores[0] ?? "";
                  const extra = f.valores[1] ?? "";
                  const modeloDetectado =
                    pistoleoModelo.trim() ||
                    detectarModelo(serie, settings.pistoleoPrefijoEnabled) ||
                    "SIN MODELO";
                  return (
                    <tr
                      key={f.id}
                      className="group border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-[11px] tabular-nums text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-[12px] font-semibold">{serie}</span>
                      </td>
                      {pistoleoCampo !== "serie" && (
                        <td className="px-4 py-2.5">
                          {extra ? (
                            <span className="font-mono text-[12px] text-muted-foreground">{extra}</span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          <Cpu className="h-2.5 w-2.5" />
                          {modeloDetectado}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[11px] tabular-nums text-muted-foreground">
                        {new Date(f.timestamp).toLocaleTimeString("es-PE", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => deletePistoleoFila(f.id)}
                          className="press rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resumen */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ResumenCard label="Capturadas" value={String(pistoleoFilas.length)} tone="violet" />
        <ResumenCard
          label="Última serie"
          value={pistoleoFilas[0]?.valores[0] ?? "—"}
          mono
          tone="cyan"
        />
        <ResumenCard label="Modo" value={campoMeta.short} tone="amber" />
        <ResumenCard label="Estado destino" value={ESTADO_META[pistoleoEstado].short} tone="emerald" />
      </div>
    </div>
  );
}

function ResumenCard({
  label,
  value,
  tone,
  mono,
}: {
  label: string;
  value: string;
  tone: "violet" | "cyan" | "amber" | "emerald";
  mono?: boolean;
}) {
  const toneCls = {
    violet: "bg-muted text-primary",
    cyan: "bg-muted text-cyan-300",
    amber: "kpi-gradient-amber text-amber-300",
    emerald: "bg-muted text-emerald-300",
  }[tone];
  return (
    <div className={cn("rounded-2xl border border-border/60 bg-card p-3", toneCls)}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 truncate text-[14px] font-bold text-foreground", mono && "font-mono")}>
        {value}
      </p>
    </div>
  );
}
