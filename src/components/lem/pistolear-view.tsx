"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ScanLine,
  Trash2,
  Save,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Cpu,
  Hash,
  Settings2,
  CircleDot,
  Pencil,
  Eye,
  Search,
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

const ICON_PROPS = { strokeWidth: 1.5 } as const;

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
          description: "Toca el mensaje de abajo para ver el detalle.",
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
    <div className="anim-fade-in px-6 py-6 lg:px-8">
      {/* Header */}
      <header className="anim-slide-up mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Captura con lector óptico
          </p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-foreground">
            Pistolear series
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Cada lectura envía Enter automáticamente. Escanea y se acumulan en el lote.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowConfig((v) => !v)}
          className="h-9 rounded-md border-border bg-background px-3.5 text-[13px] font-medium hover:bg-muted"
        >
          <Settings2 className="mr-1.5 h-4 w-4" {...ICON_PROPS} />
          {showConfig ? "Ocultar config" : "Configuración"}
          {showConfig
            ? <ChevronDown className="ml-1 h-3.5 w-3.5" {...ICON_PROPS} />
            : <ChevronRight className="ml-1 h-3.5 w-3.5" {...ICON_PROPS} />}
        </Button>
      </header>

      {/* Panel de configuración rápida: equipo + prefijo (siempre visible) */}
      <div className="anim-slide-up mb-4 rounded-lg border border-border bg-background p-4">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Equipo del inventario */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <PackageSearch className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
              <div>
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Equipo del inventario
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Al que pertenecen las series que vas a pistolear
                </p>
              </div>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" {...ICON_PROPS} />
              <select
                value={modeloSeleccionado}
                onChange={(e) => setModeloSeleccionado(e.target.value)}
                className="h-9 w-full appearance-none rounded-md border border-border bg-background pl-8 pr-8 text-[13px] font-medium text-foreground outline-none focus:border-foreground"
              >
                <option value="">— Autodetectar por prefijo —</option>
                {productosUnicos.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} {p.sku ? `· ${p.sku}` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" {...ICON_PROPS} />
            </div>
            {modeloSeleccionado && (
              <button
                onClick={() => setModeloSeleccionado("")}
                className="press mt-2 inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-3 w-3" {...ICON_PROPS} /> Quitar selección
              </button>
            )}
          </div>

          {/* Prefijo (lo ingresa el usuario, ej: ZTE) */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
              <div>
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Prefijo de validación
                </Label>
                <p className="text-[11px] text-muted-foreground">
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
                className="h-9 flex-1 rounded-md border-border bg-background font-mono uppercase text-[13px]"
                disabled={!settings.pistoleoPrefijoEnabled}
              />
            </div>
            {!settings.pistoleoPrefijoEnabled && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Activar para validar que las series empiecen con el prefijo.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Config panel avanzado (colapsable) */}
      {showConfig && (
        <div className="anim-slide-up mb-4 rounded-lg border border-border bg-background p-4">
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Modelo y estado por defecto */}
            <div className="lg:col-span-1">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Modelo por defecto (opcional)
              </Label>
              <Input
                value={pistoleoModelo}
                onChange={(e) => setPistoleoConfig({ pistoleoModelo: e.target.value })}
                placeholder="Se autodetecta por prefijo si lo dejas vacío"
                className="mt-1.5 h-9 rounded-md border-border bg-background text-[13px]"
              />
              <Label className="mt-3 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Estado por defecto
              </Label>
              <Select
                value={pistoleoEstado}
                onValueChange={(v) => setPistoleoConfig({ pistoleoEstado: v as EstadoEquipo })}
              >
                <SelectTrigger className="mt-1.5 h-9 rounded-md border-border bg-background text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-md">
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
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Reglas de auto-detección
              </Label>
              <div className="mt-1.5 space-y-1.5">
                {REGLAS_PREFIJO.map((r) => (
                  <div
                    key={r.prefijo}
                    className="flex items-start gap-2 rounded-md border border-border bg-background px-2.5 py-2"
                  >
                    <CircleDot className="mt-0.5 h-3 w-3 text-muted-foreground" {...ICON_PROPS} />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] font-semibold text-foreground">{r.prefijo}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{r.modelo}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modo: botones de texto con underline */}
      <div className="anim-slide-up mb-4 flex flex-wrap items-end gap-x-5 gap-y-2 border-b border-border">
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
                "press -mb-px border-b-2 px-1 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {meta.label}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-2 pb-2 text-[11px] text-muted-foreground">
          {hayParcial ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
              Esperando: {campoMeta.campos[parcial.length]}… ({parcial.length}/{camposEsperados})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              Modo activo: <strong className="font-medium text-foreground">{campoMeta.label}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Input grande */}
      <div className="anim-slide-up mb-3">
        <div className="relative">
          <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" {...ICON_PROPS} />
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
            className="h-12 w-full rounded-md border border-border bg-background pl-11 pr-3 font-mono text-[15px] font-medium tracking-wide text-foreground outline-none transition-colors focus:border-foreground"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        {/* Live feedback */}
        <div className="mt-2 h-5">
          {feedbackVisible && feedback && (
            <div
              className={cn(
                "anim-fade-in inline-flex items-center gap-1.5 text-[12px] font-medium",
                feedback.ok ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {feedback.ok
                ? <Check className="h-3.5 w-3.5" {...ICON_PROPS} />
                : <AlertCircle className="h-3.5 w-3.5" {...ICON_PROPS} />}
              {feedback.text}
            </div>
          )}
        </div>
      </div>

      {/* Banner: series ya registradas en el sistema (clickeable) */}
      {duplicadosSistema.length > 0 && (
        <button
          onClick={() => setShowDuplicadosModal(true)}
          className="press anim-fade-in mb-3 flex w-full items-center gap-2.5 rounded-md border border-border bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground" {...ICON_PROPS} />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-foreground">
              {duplicadosSistema.length} serie(s) ya están registradas en tu sistema
            </p>
            <p className="text-[11px] text-muted-foreground">
              Toca este mensaje para ver el detalle.
            </p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" {...ICON_PROPS} />
        </button>
      )}

      {/* Banner: duplicados dentro del lote actual */}
      {duplicadosEnLote.length > 0 && (
        <div className="anim-fade-in mb-3 flex items-center gap-2.5 rounded-md border border-border bg-background px-3 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground" {...ICON_PROPS} />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-foreground">
              {duplicadosEnLote.length} serie(s) repetida(s) en esta sesión
            </p>
            <p className="text-[11px] text-muted-foreground">
              Revisa la tabla y elimina los duplicados antes de guardar.
            </p>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="anim-slide-up mb-4 flex flex-wrap items-center gap-2">
        <Button
          onClick={handleConfirmar}
          disabled={pistoleoFilas.length === 0}
          className="h-9 rounded-md bg-foreground px-3.5 text-[13px] font-medium text-background shadow-none hover:bg-foreground/90 disabled:opacity-40"
        >
          <Save className="mr-1.5 h-4 w-4" {...ICON_PROPS} /> Guardar en sistema ({pistoleoFilas.length})
        </Button>
        <Button
          variant="outline"
          onClick={handleClear}
          disabled={pistoleoFilas.length === 0}
          className="h-9 rounded-md border-border bg-background px-3.5 text-[13px] font-medium hover:bg-muted disabled:opacity-40"
        >
          <Trash2 className="mr-1.5 h-4 w-4" {...ICON_PROPS} /> Descartar captura
        </Button>
        <span className="ml-auto text-[11px] text-muted-foreground">
          Tip: pulsa{" "}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">
            Esc
          </kbd>{" "}
          para cancelar una lectura parcial
        </span>
      </div>

      {/* Aviso de límite */}
      {pistoleoFilas.length >= 900 && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2.5 text-[12px] text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" {...ICON_PROPS} />
          <span>
            Límite: {pistoleoFilas.length}/1000 series por lote. {1000 - pistoleoFilas.length} restantes.
            Guarda el lote actual antes de seguir capturando.
          </span>
        </div>
      )}

      {/* Tabla de capturas */}
      <div className="anim-slide-up overflow-hidden rounded-lg border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
            Series capturadas
          </h2>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {pistoleoFilas.length} captura(s)
          </span>
        </div>
        {pistoleoFilas.length === 0 ? (
          <div className="px-4 py-16 text-center text-[13px] text-muted-foreground">
            Aún no has capturado series. Escanea con el lector y aparecerán aquí.
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto scroll-thin">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
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
              <tbody className="divide-y divide-border">
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
                      <tr key={f.id} className="bg-muted/40">
                        <td className="px-3 py-2.5 text-[11px] tabular-nums text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2.5">
                          <Input
                            value={editingValores[0] ?? ""}
                            onChange={(e) => {
                              const next = [...editingValores];
                              next[0] = e.target.value;
                              setEditingValores(next);
                            }}
                            className="h-8 rounded-md border-border bg-background font-mono text-[12px]"
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
                              className="h-8 rounded-md border-border bg-background font-mono text-[12px]"
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
                              className="h-8 rounded-md border-border bg-background font-mono text-[12px]"
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
                              className="h-8 rounded-md border-border bg-background font-mono text-[12px]"
                            />
                          </td>
                        )}
                        <td className="px-3 py-2.5">
                          <select
                            value={editingModelo}
                            onChange={(e) => setEditingModelo(e.target.value)}
                            className="h-8 w-full rounded-md border border-border bg-background px-2 text-[11px] font-medium text-foreground outline-none focus:border-foreground"
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
                              className="press rounded-md p-1.5 text-foreground hover:bg-muted"
                              title="Guardar"
                            >
                              <Check className="h-3.5 w-3.5" {...ICON_PROPS} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="press rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              title="Cancelar"
                            >
                              <X className="h-3.5 w-3.5" {...ICON_PROPS} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={f.id}
                      className="group transition-colors hover:bg-muted/40"
                    >
                      <td className="px-3 py-2.5 text-[11px] tabular-nums text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[12px] font-medium text-foreground">{serie}</span>
                          {yaEnSistema && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground"
                              title="Ya registrada en el sistema"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                              registrada
                            </span>
                          )}
                          {dupEnLote && !yaEnSistema && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground"
                              title="Repetida en este lote"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                              repetida
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
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                          <Cpu className="h-3 w-3 text-muted-foreground" {...ICON_PROPS} />
                          {modeloDetectado}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] tabular-nums text-muted-foreground">
                        {new Date(f.timestamp).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => startEdit(f.id, f.valores, f.modeloSeleccionado)}
                            className="press rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" {...ICON_PROPS} />
                          </button>
                          <button
                            onClick={() => deletePistoleoFila(f.id)}
                            className="press rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" {...ICON_PROPS} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {hayMasFilas && (
              <div className="border-t border-border px-4 py-3 text-center">
                <button
                  onClick={() => setVisibleCount((c) => c + 100)}
                  className="press rounded-md border border-border bg-background px-4 py-2 text-[12px] font-medium text-foreground hover:bg-muted"
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
        <DialogContent className="max-h-[85vh] gap-0 overflow-hidden rounded-lg p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
              <Eye className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
              Vista previa — {pistoleoFilas.length} serie(s)
            </DialogTitle>
            <DialogDescription className="text-[12px] text-muted-foreground">
              Revisa antes de guardar en el sistema. Las series ya registradas se omitirán.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 px-5 py-4">
            {/* Resumen */}
            <div className="grid grid-cols-3 overflow-hidden rounded-md border border-border bg-background">
              <div className="border-r border-border p-3 text-center">
                <p className="text-[20px] font-semibold tabular-nums text-foreground">{pistoleoFilas.length}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total capturadas</p>
              </div>
              <div className="border-r border-border p-3 text-center">
                <p className="text-[20px] font-semibold tabular-nums text-foreground">{pistoleoFilas.length - duplicadosSistema.length}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">A guardar</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-[20px] font-semibold tabular-nums text-foreground">{duplicadosSistema.length}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ya registradas</p>
              </div>
            </div>
            {/* Lista scroll */}
            <div className="max-h-64 overflow-y-auto scroll-thin rounded-md border border-border bg-background">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
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
                <tbody className="divide-y divide-border">
                  {pistoleoFilas.map((f, i) => {
                    const serie = f.valores[0] ?? "";
                    const mac = f.valores[1] ?? "";
                    const cmMac = f.valores[2] ?? "";
                    const yaEnSistema = seriesExistentesSet.has(serie.trim().toLowerCase());
                    return (
                      <tr key={f.id} className="transition-colors hover:bg-muted/40">
                        <td className="px-3 py-2 text-[11px] tabular-nums text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2 font-mono text-[12px] font-medium text-foreground">{serie}</td>
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
                            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                              <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                              Ya registrada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                              <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
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
              <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2.5 text-[12px] text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" {...ICON_PROPS} />
                <span>
                  {duplicadosSistema.length} serie(s) ya están registradas en el sistema y se omitirán al guardar.
                </span>
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-border px-5 py-4 sm:justify-end">
            <DialogClose asChild>
              <Button variant="outline" className="h-9 rounded-md border-border bg-background px-3.5 text-[13px] font-medium hover:bg-muted">
                Cancelar
              </Button>
            </DialogClose>
            <Button
              onClick={handleConfirmarReal}
              className="h-9 rounded-md bg-foreground px-3.5 text-[13px] font-medium text-background shadow-none hover:bg-foreground/90"
            >
              <Save className="mr-1.5 h-4 w-4" {...ICON_PROPS} />
              {duplicadosSistema.length > 0
                ? `Guardar ${pistoleoFilas.length - duplicadosSistema.length} (omitir ${duplicadosSistema.length})`
                : `Guardar ${pistoleoFilas.length} serie(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Detalle de duplicados */}
      <Dialog open={showDuplicadosModal} onOpenChange={setShowDuplicadosModal}>
        <DialogContent className="max-h-[85vh] gap-0 overflow-hidden rounded-lg p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
              <AlertCircle className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
              {lastConfirmResult?.duplicados?.length ?? duplicadosSistema.length} serie(s) ya registradas
            </DialogTitle>
            <DialogDescription className="text-[12px] text-muted-foreground">
              Estas series ya existen en el sistema y no se guardaron de nuevo. Toca una para verla en el catálogo de equipos.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto scroll-thin px-5 py-4">
            <ul className="flex flex-col gap-1.5">
              {(lastConfirmResult?.duplicados ?? duplicadosSistema).map((s, i) => {
                const eq = findEquipmentBySerie(s);
                return (
                  <li
                    key={`${s}-${i}`}
                    className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2.5"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground" {...ICON_PROPS} />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[12px] font-medium text-foreground">{s}</p>
                      {eq && (
                        <p className="truncate text-[11px] text-muted-foreground">
                          {eq.modelo} · {ESTADO_META[eq.estado].label} · {new Date(eq.createdAt).toLocaleDateString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "numeric" })}
                        </p>
                      )}
                    </div>
                    {eq && (
                      <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {ESTADO_META[eq.estado].short}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          <DialogFooter className="border-t border-border px-5 py-4 sm:justify-end">
            <DialogClose asChild>
              <Button variant="outline" className="h-9 rounded-md border-border bg-background px-3.5 text-[13px] font-medium hover:bg-muted">
                Entendido
              </Button>
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
  // tone is intentionally accepted but visual styling is intentionally neutral
  // per minimalist design (all cards use the same border + background).
  void tone;
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-1 truncate text-[14px] font-medium text-foreground", mono && "font-mono")}>
        {value}
      </p>
    </div>
  );
}
