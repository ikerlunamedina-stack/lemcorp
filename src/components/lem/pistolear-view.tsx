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
  Pencil,
  Eye,
  Search,
  Info,
  PackageSearch,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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

/** Series ya registradas en el sistema (en equipos) que coinciden con las del lote actual */
function detectarDuplicadosEnSistema(
  pistoleoFilas: { valores: string[] }[],
  equipos: { serie: string }[]
): string[] {
  const existentes = new Set(equipos.map((e) => e.serie.trim().toLowerCase()));
  const dups: string[] = [];
  for (const f of pistoleoFilas) {
    const s = (f.valores[0] ?? "").trim();
    if (s && existentes.has(s.toLowerCase())) dups.push(s);
  }
  return dups;
}

/** Series duplicadas dentro del mismo lote actual */
function detectarDuplicadosEnLote(pistoleoFilas: { valores: string[] }[]): string[] {
  const seen = new Set<string>();
  const dups: string[] = [];
  for (const f of pistoleoFilas) {
    const s = (f.valores[0] ?? "").trim().toLowerCase();
    if (!s) continue;
    if (seen.has(s)) dups.push(f.valores[0].trim());
    else seen.add(s);
  }
  return dups;
}

export function PistolearView() {
  const settings = useStore((s) => s.settings);
  const setSetting = useStore((s) => s.setSetting);
  const pistoleoCampo = useStore((s) => s.pistoleoCampo);
  const pistoleoModelo = useStore((s) => s.pistoleoModelo);
  const pistoleoEstado = useStore((s) => s.pistoleoEstado);
  const pistoleoFilas = useStore((s) => s.pistoleoFilas);
  const pistoleoModeloSeleccionado = useStore((s) => s.pistoleoModeloSeleccionado);
  const equipos = useStore((s) => s.equipos);
  const products = useStore((s) => s.products);
  const findEquipmentBySerie = useStore((s) => s.findEquipmentBySerie);
  const setPistoleoConfig = useStore((s) => s.setPistoleoConfig);
  const addPistoleoFila = useStore((s) => s.addPistoleoFila);
  const updatePistoleoFila = useStore((s) => s.updatePistoleoFila);
  const deletePistoleoFila = useStore((s) => s.deletePistoleoFila);
  const clearPistoleoFilas = useStore((s) => s.clearPistoleoFilas);
  const confirmarPistoleo = useStore((s) => s.confirmarPistoleo);
  const { toast } = useToast();

  const [showConfig, setShowConfig] = useState(false);
  const [valor, setValor] = useState("");
  const [feedback, setFeedback] = useState<FeedbackMsg | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValores, setEditingValores] = useState<string[]>([]);
  const [editingModelo, setEditingModelo] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  /** Series ya registradas detectadas (para mostrar mensaje clickeable) */
  const [duplicadosSistema, setDuplicadosSistema] = useState<string[]>([]);
  /** Mostrar modal de detalle de duplicados */
  const [showDuplicadosModal, setShowDuplicadosModal] = useState(false);
  /** Resultado de la última confirmación */
  const [lastConfirmResult, setLastConfirmResult] = useState<{ ok: boolean; msg: string; duplicados?: string[] } | null>(null);
  /** Cuántas filas renderizar (paginación para listas grandes) */
  const [visibleCount, setVisibleCount] = useState(100);

  // Setter que actualiza el store (persiste al refrescar)
  const setModeloSeleccionado = (v: string) => setPistoleoConfig({ pistoleoModeloSeleccionado: v });
  const modeloSeleccionado = pistoleoModeloSeleccionado;

  const inputRef = useRef<HTMLInputElement>(null);

  const campoMeta = PISTOLEO_CAMPOS[pistoleoCampo];
  const camposEsperados = campoMeta.campos.length;
  const [parcial, setParcial] = useState<string[]>([]);

  // Foco automático al input
  useEffect(() => {
    inputRef.current?.focus();
  }, [pistoleoCampo]);

  // Detectar duplicados en sistema cada vez que cambian las filas
  useEffect(() => {
    const dups = detectarDuplicadosEnSistema(pistoleoFilas, equipos);
    setDuplicadosSistema(dups);
  }, [pistoleoFilas, equipos]);

  // Duplicados dentro del lote
  const duplicadosEnLote = useMemo(() => detectarDuplicadosEnLote(pistoleoFilas), [pistoleoFilas]);

  const pushFeedback = (ok: boolean, text: string) => {
    setFeedback({ ok, text, ts: Date.now() });
  };

  const handleScan = (raw: string) => {
    const v = raw.trim();
    if (!v) return;

    // Límite de 1000 series por lote
    if (pistoleoFilas.length >= 1000) {
      pushFeedback(false, "Límite alcanzado: 1000 series por lote. Guarda primero.");
      setValor("");
      return;
    }

    const idxEnFila = parcial.length;
    const esSerie = idxEnFila === 0;

    if (esSerie && !validarPrefijo(v, settings.pistoleoPrefijo, settings.pistoleoPrefijoEnabled)) {
      pushFeedback(false, `Rechazada: no empieza con ${settings.pistoleoPrefijo}`);
      setValor("");
      return;
    }

    if (esSerie && findEquipmentBySerie(v)) {
      // Ya existe en el sistema → la añadimos igual pero marcamos como duplicada
      pushFeedback(false, `⚠ Esta serie YA está registrada en el sistema`);
      // Aun así la añadimos para que el usuario la vea en el preview y decida
    }

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
      addPistoleoFila(nuevosParcial, modeloSeleccionado || undefined);
      setParcial([]);
      const modeloDetectado = modeloSeleccionado
        || pistoleoModelo.trim()
        || detectarModelo(v, settings.pistoleoPrefijoEnabled)
        || "SIN MODELO";
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
    // Mostrar preview primero
    setShowPreview(true);
  };

  const handleConfirmarReal = () => {
    const r = confirmarPistoleo();
    setLastConfirmResult({ ok: r.ok, msg: r.msg, duplicados: r.duplicados });
    if (r.ok) {
      toast({ title: "Series guardadas", description: r.msg });
      pushFeedback(true, r.msg);
      setShowPreview(false);
      if (r.duplicados && r.duplicados.length > 0) {
        // Mostrar toast de advertencia con acción de ver detalle
        toast({
          title: `${r.duplicados.length} serie(s) ya estaban registradas`,
          description: "Toca el mensaje naranja de abajo para ver el detalle.",
        });
      }
    } else {
      toast({ title: "Sin guardar", description: r.msg, variant: "destructive" });
      pushFeedback(false, r.msg);
      setShowPreview(false);
      if (r.duplicados && r.duplicados.length > 0) {
        setShowDuplicadosModal(true);
      }
    }
  };

  const handleClear = () => {
    if (pistoleoFilas.length === 0) return;
    clearPistoleoFilas();
    toast({ title: "Captura descartada" });
  };

  const startEdit = (id: string, valores: string[], modeloSel?: string) => {
    setEditingId(id);
    setEditingValores([...valores, ...Array(Math.max(0, camposEsperados - valores.length)).fill("")]);
    setEditingModelo(modeloSel ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingValores([]);
    setEditingModelo("");
  };

  const saveEdit = () => {
    if (!editingId) return;
    const trimmed = editingValores.map((v) => v.trim());
    if (!trimmed[0]) {
      toast({ title: "La serie no puede estar vacía", variant: "destructive" });
      return;
    }
    updatePistoleoFila(editingId, trimmed, editingModelo || undefined);
    setEditingId(null);
    setEditingValores([]);
    setEditingModelo("");
    toast({ title: "Fila actualizada" });
  };

  const hayParcial = parcial.length > 0;
  const feedbackVisible = feedback && Date.now() - feedback.ts < 4000;

  // Auto-ocultar feedback después de 4 segundos
  useEffect(() => {
    if (!feedback) return;
    const id = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(id);
  }, [feedback]);

  // Set de series existentes para lookup O(1) (evita O(n²) en render de tabla)
  const seriesExistentesSet = useMemo(() => {
    const set = new Set<string>();
    for (const e of equipos) {
      const s = e.serie.trim().toLowerCase();
      if (s) set.add(s);
    }
    return set;
  }, [equipos]);

  // Set de duplicados en lote para lookup O(1)
  const duplicadosEnLoteSet = useMemo(() => {
    const set = new Set<string>();
    for (const d of duplicadosEnLote) set.add(d.toUpperCase());
    return set;
  }, [duplicadosEnLote]);

  // Filas visibles (paginación para listas grandes)
  const filasVisibles = useMemo(
    () => pistoleoFilas.slice(0, visibleCount),
    [pistoleoFilas, visibleCount]
  );
  const hayMasFilas = pistoleoFilas.length > visibleCount;

  // Catálogo de productos para seleccionar el equipo/modelo
  const productosUnicos = useMemo(() => {
    const set = new Set<string>();
    return products.filter((p) => {
      const key = p.name.trim().toLowerCase();
      if (set.has(key)) return false;
      set.add(key);
      return true;
    });
  }, [products]);

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

      {/* Panel de configuración rápida: equipo + prefijo (siempre visible) */}
      <div className="anim-fade-up mb-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Equipo del inventario */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <PackageSearch className="h-4 w-4" />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Equipo del inventario
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Al que pertenecen las series que vas a pistolear
                </p>
              </div>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={modeloSeleccionado}
                onChange={(e) => setModeloSeleccionado(e.target.value)}
                className="h-10 w-full appearance-none rounded-xl border border-border bg-card pl-10 pr-8 text-[13px] font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">— Autodetectar por prefijo —</option>
                {productosUnicos.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} {p.sku ? `· ${p.sku}` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            {modeloSeleccionado && (
              <button
                onClick={() => setModeloSeleccionado("")}
                className="press mt-2 rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-accent"
              >
                <X className="mr-1 inline h-3 w-3" /> Quitar selección
              </button>
            )}
          </div>

          {/* Prefijo (lo ingresa el usuario, ej: ZTE) */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Hash className="h-4 w-4" />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Prefijo de validación
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Tú lo pones — ej: ZTE, ZTEATV. Solo acepta series que empiecen así.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.pistoleoPrefijoEnabled}
                onCheckedChange={(v) => setSetting("pistoleoPrefijoEnabled", v)}
              />
              <Input
                value={settings.pistoleoPrefijo}
                onChange={(e) => setSetting("pistoleoPrefijo", e.target.value.toUpperCase())}
                placeholder="Ej: ZTE"
                className="h-10 flex-1 rounded-xl font-mono uppercase"
                disabled={!settings.pistoleoPrefijoEnabled}
              />
            </div>
            {!settings.pistoleoPrefijoEnabled && (
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                Activar para validar que las series empiecen con el prefijo.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Config panel avanzado (colapsable) */}
      {showConfig && (
        <div className="anim-fade-up mb-4 rounded-2xl border border-border bg-card p-5">
          <div className="grid gap-4 lg:grid-cols-2">
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

      {/* Modo: botones */}
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
            className="h-14 w-full rounded-2xl border-2 border-primary/30 bg-card pl-14 pr-4 font-mono text-[16px] font-semibold tracking-wide outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15"
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

      {/* Banner: series ya registradas en el sistema (clickeable) */}
      {duplicadosSistema.length > 0 && (
        <button
          onClick={() => setShowDuplicadosModal(true)}
          className="anim-fade-up mb-3 flex w-full items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-left transition-all hover:bg-amber-500/15"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-amber-300">
              {duplicadosSistema.length} serie(s) ya están registradas en tu sistema
            </p>
            <p className="text-[11px] text-muted-foreground">
              Más información, dale click a este mensaje.
            </p>
          </div>
          <Info className="h-4 w-4 shrink-0 text-amber-400" />
        </button>
      )}

      {/* Banner: duplicados dentro del lote actual */}
      {duplicadosEnLote.length > 0 && (
        <div className="anim-fade-up mb-3 flex items-center gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-red-300">
              {duplicadosEnLote.length} serie(s) repetida(s) en esta sesión
            </p>
            <p className="text-[11px] text-muted-foreground">
              Revisa la tabla y elimina los duplicados antes de guardar.
            </p>
          </div>
        </div>
      )}

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

      {/* Aviso de límite */}
      {pistoleoFilas.length >= 900 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-[12px] text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Límite: {pistoleoFilas.length}/1000 series por lote. {1000 - pistoleoFilas.length} restantes.
            Guarda el lote actual antes de seguir capturando.
          </span>
        </div>
      )}

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
          <div className="max-h-96 overflow-y-auto scroll-thin">
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="border-b border-border bg-muted/80 text-left text-[10px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                  <th className="px-3 py-2.5 font-medium">#</th>
                  <th className="px-3 py-2.5 font-medium">Serie</th>
                  {pistoleoCampo !== "serie" && pistoleoCampo !== "serie_ua" && (
                    <th className="px-3 py-2.5 font-medium">MAC</th>
                  )}
                  {pistoleoCampo === "serie_ua" && (
                    <th className="px-3 py-2.5 font-medium">UA</th>
                  )}
                  {pistoleoCampo === "serie_mac_cm" && (
                    <th className="px-3 py-2.5 font-medium">CM MAC</th>
                  )}
                  <th className="px-3 py-2.5 font-medium">Modelo</th>
                  <th className="px-3 py-2.5 font-medium">Hora</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filasVisibles.map((f, i) => {
                  const serie = f.valores[0] ?? "";
                  const mac = f.valores[1] ?? "";
                  const cmMac = f.valores[2] ?? "";
                  const modeloDetectado =
                    f.modeloSeleccionado?.trim()
                    || pistoleoModelo.trim()
                    || detectarModelo(serie, settings.pistoleoPrefijoEnabled)
                    || "SIN MODELO";
                  const yaEnSistema = seriesExistentesSet.has(serie.trim().toLowerCase());
                  const dupEnLote = duplicadosEnLoteSet.has(serie.toUpperCase());

                  if (editingId === f.id) {
                    return (
                      <tr key={f.id} className="border-b border-border/50 bg-primary/5">
                        <td className="px-3 py-2.5 text-[11px] tabular-nums text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2.5">
                          <Input
                            value={editingValores[0] ?? ""}
                            onChange={(e) => {
                              const next = [...editingValores];
                              next[0] = e.target.value;
                              setEditingValores(next);
                            }}
                            className="h-8 rounded-md font-mono text-[12px]"
                            autoFocus
                          />
                        </td>
                        {(pistoleoCampo !== "serie" && pistoleoCampo !== "serie_ua") && (
                          <td className="px-3 py-2.5">
                            <Input
                              value={editingValores[1] ?? ""}
                              onChange={(e) => {
                                const next = [...editingValores];
                                next[1] = e.target.value;
                                setEditingValores(next);
                              }}
                              className="h-8 rounded-md font-mono text-[12px]"
                            />
                          </td>
                        )}
                        {pistoleoCampo === "serie_ua" && (
                          <td className="px-3 py-2.5">
                            <Input
                              value={editingValores[1] ?? ""}
                              onChange={(e) => {
                                const next = [...editingValores];
                                next[1] = e.target.value;
                                setEditingValores(next);
                              }}
                              className="h-8 rounded-md font-mono text-[12px]"
                            />
                          </td>
                        )}
                        {pistoleoCampo === "serie_mac_cm" && (
                          <td className="px-3 py-2.5">
                            <Input
                              value={editingValores[2] ?? ""}
                              onChange={(e) => {
                                const next = [...editingValores];
                                next[2] = e.target.value;
                                setEditingValores(next);
                              }}
                              className="h-8 rounded-md font-mono text-[12px]"
                            />
                          </td>
                        )}
                        <td className="px-3 py-2.5">
                          <select
                            value={editingModelo}
                            onChange={(e) => setEditingModelo(e.target.value)}
                            className="h-8 w-full rounded-md border border-border bg-card px-2 text-[11px] font-medium"
                          >
                            <option value="">Autodetectar</option>
                            {productosUnicos.map((p) => (
                              <option key={p.id} value={p.name}>{p.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2.5 text-[11px] tabular-nums text-muted-foreground">
                          {new Date(f.timestamp).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={saveEdit}
                              className="press rounded-md p-1.5 text-emerald-500 hover:bg-emerald-500/10"
                              title="Guardar"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="press rounded-md p-1.5 text-muted-foreground hover:bg-accent"
                              title="Cancelar"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={f.id}
                      className={cn(
                        "group border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors",
                        yaEnSistema && "bg-red-500/5",
                        dupEnLote && !yaEnSistema && "bg-amber-500/5"
                      )}
                    >
                      <td className="px-3 py-2.5 text-[11px] tabular-nums text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[12px] font-semibold">{serie}</span>
                          {yaEnSistema && (
                            <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-400" title="Ya registrada en el sistema">
                              Registrada
                            </span>
                          )}
                          {dupEnLote && !yaEnSistema && (
                            <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300" title="Repetida en este lote">
                              Repetida
                            </span>
                          )}
                        </div>
                      </td>
                      {(pistoleoCampo !== "serie" && pistoleoCampo !== "serie_ua") && (
                        <td className="px-3 py-2.5">
                          {mac ? (
                            <span className="font-mono text-[12px] text-muted-foreground">{mac}</span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </td>
                      )}
                      {pistoleoCampo === "serie_ua" && (
                        <td className="px-3 py-2.5">
                          {mac ? (
                            <span className="font-mono text-[12px] text-muted-foreground">{mac}</span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </td>
                      )}
                      {pistoleoCampo === "serie_mac_cm" && (
                        <td className="px-3 py-2.5">
                          {cmMac ? (
                            <span className="font-mono text-[12px] text-muted-foreground">{cmMac}</span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          <Cpu className="h-2.5 w-2.5" />
                          {modeloDetectado}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] tabular-nums text-muted-foreground">
                        {new Date(f.timestamp).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(f.id, f.valores, f.modeloSeleccionado)}
                            className="press rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-primary/10 hover:text-primary group-hover:opacity-100"
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deletePistoleoFila(f.id)}
                            className="press rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {hayMasFilas && (
              <div className="border-t border-border/60 bg-muted/40 px-4 py-3 text-center">
                <button
                  onClick={() => setVisibleCount((c) => c + 100)}
                  className="press rounded-xl border border-border bg-card px-4 py-2 text-[12px] font-semibold text-foreground hover:bg-accent"
                >
                  Cargar 100 más (mostrando {filasVisibles.length} de {pistoleoFilas.length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resumen */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ResumenCard label="Capturadas" value={String(pistoleoFilas.length)} tone="neutral" />
        <ResumenCard
          label="Última serie"
          value={pistoleoFilas[0]?.valores[0] ?? "—"}
          mono
          tone="info"
        />
        <ResumenCard label="Modo" value={campoMeta.short} tone="warn" />
        <ResumenCard label="Estado destino" value={ESTADO_META[pistoleoEstado].short} tone="ok" />
      </div>

      {/* Modal: Preview antes de guardar */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-h-[85vh] overflow-hidden rounded-2xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" /> Vista previa — {pistoleoFilas.length} serie(s)
            </DialogTitle>
            <DialogDescription>
              Revisa antes de guardar en el sistema. Las series en rojo ya están registradas y se omitirán.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {/* Resumen */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-2xl font-bold text-foreground">{pistoleoFilas.length}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total capturadas</p>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                <p className="text-2xl font-bold text-emerald-400">{pistoleoFilas.length - duplicadosSistema.length}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">A guardar</p>
              </div>
              <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
                <p className="text-2xl font-bold text-red-400">{duplicadosSistema.length}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Ya registradas</p>
              </div>
            </div>
            {/* Lista scroll */}
            <div className="max-h-64 overflow-y-auto scroll-thin rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0">
                  <tr className="border-b border-border bg-muted/80 text-left text-[10px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Serie</th>
                    {pistoleoCampo !== "serie" && pistoleoCampo !== "serie_ua" && (
                      <th className="px-3 py-2 font-medium">MAC</th>
                    )}
                    {pistoleoCampo === "serie_ua" && (
                      <th className="px-3 py-2 font-medium">UA</th>
                    )}
                    {pistoleoCampo === "serie_mac_cm" && (
                      <th className="px-3 py-2 font-medium">CM MAC</th>
                    )}
                    <th className="px-3 py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pistoleoFilas.map((f, i) => {
                    const serie = f.valores[0] ?? "";
                    const mac = f.valores[1] ?? "";
                    const cmMac = f.valores[2] ?? "";
                    const yaEnSistema = seriesExistentesSet.has(serie.trim().toLowerCase());
                    return (
                      <tr
                        key={f.id}
                        className={cn(
                          "border-b border-border/50 last:border-0",
                          yaEnSistema ? "bg-red-500/5" : "bg-card"
                        )}
                      >
                        <td className="px-3 py-2 text-[11px] tabular-nums text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2 font-mono text-[12px] font-semibold">{serie}</td>
                        {(pistoleoCampo !== "serie" && pistoleoCampo !== "serie_ua") && (
                          <td className="px-3 py-2 font-mono text-[12px] text-muted-foreground">{mac || "—"}</td>
                        )}
                        {pistoleoCampo === "serie_ua" && (
                          <td className="px-3 py-2 font-mono text-[12px] text-muted-foreground">{mac || "—"}</td>
                        )}
                        {pistoleoCampo === "serie_mac_cm" && (
                          <td className="px-3 py-2 font-mono text-[12px] text-muted-foreground">{cmMac || "—"}</td>
                        )}
                        <td className="px-3 py-2">
                          {yaEnSistema ? (
                            <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-red-400">
                              Ya registrada
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-400">
                              A guardar
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {duplicadosSistema.length > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-[12px] text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  {duplicadosSistema.length} serie(s) ya están registradas en el sistema y se omitirán al guardar.
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="rounded-xl">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleConfirmarReal} className="btn-spacecom rounded-xl">
              <Save className="mr-1.5 h-4 w-4" />
              {duplicadosSistema.length > 0
                ? `Guardar ${pistoleoFilas.length - duplicadosSistema.length} (omitir ${duplicadosSistema.length})`
                : `Guardar ${pistoleoFilas.length} serie(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Detalle de duplicados */}
      <Dialog open={showDuplicadosModal} onOpenChange={setShowDuplicadosModal}>
        <DialogContent className="max-h-[85vh] overflow-hidden rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              {lastConfirmResult?.duplicados?.length ?? duplicadosSistema.length} serie(s) ya registradas
            </DialogTitle>
            <DialogDescription>
              Estas series ya existen en el sistema y no se guardaron de nuevo. Toca una para verla en el catálogo de equipos.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto scroll-thin">
            <ul className="flex flex-col gap-1.5">
              {(lastConfirmResult?.duplicados ?? duplicadosSistema).map((s, i) => {
                const eq = findEquipmentBySerie(s);
                return (
                  <li
                    key={`${s}-${i}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-400">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[12px] font-semibold text-foreground">{s}</p>
                      {eq && (
                        <p className="truncate text-[11px] text-muted-foreground">
                          {eq.modelo} · {ESTADO_META[eq.estado].label} · {new Date(eq.createdAt).toLocaleDateString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "numeric" })}
                        </p>
                      )}
                    </div>
                    {eq && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {ESTADO_META[eq.estado].short}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="rounded-xl">Entendido</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  tone: "neutral" | "info" | "warn" | "ok";
  mono?: boolean;
}) {
  const toneCls = {
    neutral: "bg-muted text-primary",
    info: "bg-muted text-foreground",
    warn: "bg-muted text-foreground",
    ok: "bg-muted text-foreground",
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
