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
  Settings2,
  CircleDot,
  Pencil,
  Eye,
  Search,
  PackageSearch,
  Download,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  ESTADO_META,
  REGLAS_PREFIJO,
  CAMPOS_PISTOLEO_META,
  ORDEN_CAMPOS,
  type EstadoEquipo,
  type CampoPistoleo,
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
import { speak } from "@/lib/tts";

const ICON_PROPS = { strokeWidth: 1.5 } as const;

const ESTADOS: EstadoEquipo[] = ["disponible", "averiado", "en_retiro", "en_reparacion"];

interface FeedbackMsg {
  ok: boolean;
  text: string;
  ts: number;
}

function detectarModelo(serie: string): string | null {
  const s = serie.trim().toUpperCase();
  for (const r of REGLAS_PREFIJO) {
    if (s.startsWith(r.prefijo.toUpperCase())) return r.modelo;
  }
  return null;
}

function validarPrefijo(serie: string, prefijo: string): boolean {
  if (!prefijo.trim()) return true;  // sin prefijo = no validar
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
  const pistoleoModelo = useStore((s) => s.pistoleoModelo);
  const pistoleoEstado = useStore((s) => s.pistoleoEstado);
  const pistoleoFilas = useStore((s) => s.pistoleoFilas);
  const pistoleoModeloSeleccionado = useStore((s) => s.pistoleoModeloSeleccionado);
  const pistoleoCamposMarcados = useStore((s) => s.pistoleoCamposMarcados);
  const equipos = useStore((s) => s.equipos);
  const products = useStore((s) => s.products);
  const findEquipmentBySerie = useStore((s) => s.findEquipmentBySerie);
  const setPistoleoConfig = useStore((s) => s.setPistoleoConfig);
  const addPistoleoFila = useStore((s) => s.addPistoleoFila);
  const updatePistoleoFila = useStore((s) => s.updatePistoleoFila);
  const deletePistoleoFila = useStore((s) => s.deletePistoleoFila);
  const clearPistoleoFilas = useStore((s) => s.clearPistoleoFilas);
  const confirmarPistoleo = useStore((s) => s.confirmarPistoleo);
  const exportarPistoleoExcel = useStore((s) => s.exportarPistoleoExcel);
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

  // Campos marcados ordenados según ORDEN_CAMPOS (serie, mac, cmMac, mtaMac, ua)
  const camposMarcadosOrdenados = useMemo(() => {
    return ORDEN_CAMPOS.filter((c) => pistoleoCamposMarcados.includes(c));
  }, [pistoleoCamposMarcados]);

  // Toggle de un campo marcado
  const toggleCampoMarcado = (campo: CampoPistoleo) => {
    const actuales = pistoleoCamposMarcados.includes(campo)
      ? pistoleoCamposMarcados.filter((c) => c !== campo)
      : [...pistoleoCamposMarcados, campo];
    // No permitir quitar todos — al menos uno
    if (actuales.length === 0) return;
    setPistoleoConfig({ pistoleoCamposMarcados: actuales });
    setParcial([]);
  };

  const inputRef = useRef<HTMLInputElement>(null);

  // Derivar el campoMeta de los campos marcados
  const camposEsperados = camposMarcadosOrdenados.length;
  const [parcial, setParcial] = useState<string[]>([]);

  // Foco automático al input
  useEffect(() => {
    inputRef.current?.focus();
  }, [pistoleoCamposMarcados]);

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

    // OBLIGATORIO: debe haber un equipo del inventario seleccionado
    if (!modeloSeleccionado) {
      const msg = "Falta seleccionar el equipo del inventario antes de pistolear.";
      pushFeedback(false, msg);
      // Voz de Alana (mujer) diciendo el error
      if (settings.vozActivada) speak(msg);
      setValor("");
      return;
    }

    // Límite de 1000 series por lote
    if (pistoleoFilas.length >= 1000) {
      pushFeedback(false, "Límite alcanzado: 1000 series por lote. Guarda primero.");
      setValor("");
      return;
    }

    const idxEnFila = parcial.length;
    const esSerie = idxEnFila === 0;
    const campoActual = camposMarcadosOrdenados[idxEnFila];

    // === DETECTAR DUPLICADO EN LA MISMA LECTURA ===
    // Si el valor actual ya fue escaneado en esta misma lectura (misma serie en MAC, CM MAC, etc.)
    // lo rechazamos para evitar errores de doble pistoleo
    if (parcial.some((valor) => valor.toUpperCase() === v.toUpperCase())) {
      const msg = `Rechazada: "${v}" repetida en esta lectura (¿doble escaneo?)`;
      pushFeedback(false, msg);
      if (settings.vozActivada) speak("Serie repetida, revisa");
      setValor("");
      return;
    }

    // Validar prefijo solo si está activado y el primer campo marcado es "serie"
    const primerCampoEsSerie = camposMarcadosOrdenados[0] === "serie";
    if (esSerie && primerCampoEsSerie && settings.pistoleoPrefijoEnabled && settings.pistoleoPrefijo && !validarPrefijo(v, settings.pistoleoPrefijo)) {
      const msg = `Rechazada: no empieza con ${settings.pistoleoPrefijo}`;
      pushFeedback(false, msg);
      if (settings.vozActivada) speak(`Rechazada, no empieza con ${settings.pistoleoPrefijo}`);
      setValor("");
      return;
    }

    if (esSerie && primerCampoEsSerie && findEquipmentBySerie(v)) {
      // Ya existe en el sistema → la añadimos igual pero marcamos como duplicada
      pushFeedback(false, `⚠ Esta serie YA está registrada en el sistema`);
    }

    if (esSerie && primerCampoEsSerie) {
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
      addPistoleoFila(nuevosParcial, modeloSeleccionado || undefined, camposMarcadosOrdenados);
      setParcial([]);
      const modeloDetectado = modeloSeleccionado
        || pistoleoModelo.trim()
        || detectarModelo(v)
        || "SIN MODELO";
      pushFeedback(true, `Aceptada · ${v} → ${modeloDetectado}`);
    } else {
      // Mostrar qué campo se acaba de escanear + su valor
      const campoRecienEscaneado = CAMPOS_PISTOLEO_META[campoActual].label;
      const siguienteCampo = CAMPOS_PISTOLEO_META[camposMarcadosOrdenados[nuevosParcial.length]].label;
      pushFeedback(true, `${campoRecienEscaneado}: ${v} — ahora escanea ${siguienteCampo}…`);
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

  // Todos los campos usados en todas las filas (unión) — para headers de tabla
  const camposTabla = useMemo(() => {
    const todos = new Set<string>(camposMarcadosOrdenados);
    for (const f of pistoleoFilas) {
      if (f.camposMarcados && f.camposMarcados.length > 0) {
        for (const c of f.camposMarcados) todos.add(c);
      }
    }
    return ORDEN_CAMPOS.filter((c) => todos.has(c));
  }, [pistoleoFilas, camposMarcadosOrdenados]);

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
    <div className="anim-fade-in px-6 py-6 lg:px-8 relative">
      {/* Fondo elegante: patrón de puntos sutil */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage: "radial-gradient(circle, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="relative z-10">
      {/* Header */}
      <header className="anim-slide-up mb-6 flex flex-wrap items-center justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => setShowConfig((v) => !v)}
          className="h-9 rounded-lg border-border bg-background px-3.5 text-[13px] font-medium hover:bg-muted"
        >
          <Settings2 className="mr-1.5 h-4 w-4" {...ICON_PROPS} />
          {showConfig ? "Ocultar" : "Configuración"}
          {showConfig
            ? <ChevronDown className="ml-1 h-3.5 w-3.5" {...ICON_PROPS} />
            : <ChevronRight className="ml-1 h-3.5 w-3.5" {...ICON_PROPS} />}
        </Button>
      </header>

      {/* Panel: seleccionar equipo del inventario */}
      <div className="anim-slide-up mb-4 rounded-lg bg-muted/30 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" {...ICON_PROPS} />
          <select
            value={modeloSeleccionado}
            onChange={(e) => setModeloSeleccionado(e.target.value)}
            className={cn(
              "h-10 w-full appearance-none rounded-lg border bg-background pl-8 pr-8 text-[13px] font-medium text-foreground outline-none transition-colors",
              modeloSeleccionado ? "border-foreground" : "border-border focus:border-foreground"
            )}
          >
            <option value="">Seleccionar equipo</option>
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
            className="press mt-2 inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3 w-3" {...ICON_PROPS} /> Cambiar
          </button>
        )}
      </div>

      {/* Panel: prefijo de validación (con toggle on/off) */}
      <div className="anim-slide-up mb-4 rounded-lg bg-muted/30 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Switch
            checked={settings.pistoleoPrefijoEnabled}
            onCheckedChange={(v) => setSetting("pistoleoPrefijoEnabled", v)}
          />
          <Input
            value={settings.pistoleoPrefijo}
            onChange={(e) => setSetting("pistoleoPrefijo", e.target.value.toUpperCase())}
            placeholder="Prefijo (ej: ZTE)"
            className="h-9 flex-1 rounded-lg border-border bg-background font-mono uppercase text-[13px]"
            disabled={!settings.pistoleoPrefijoEnabled}
          />
          {settings.pistoleoPrefijo && settings.pistoleoPrefijoEnabled && (
            <button
              onClick={() => setSetting("pistoleoPrefijo", "")}
              className="press inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3 w-3" {...ICON_PROPS} /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Config panel avanzado (colapsable) — solo estado de destino */}
      {showConfig && (
        <div className="anim-slide-up mb-4 rounded-lg bg-muted/30 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={pistoleoEstado}
              onValueChange={(v) => setPistoleoConfig({ pistoleoEstado: v as EstadoEquipo })}
            >
              <SelectTrigger className="h-9 rounded-lg border-border bg-background text-[13px] w-auto min-w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                {ESTADOS.map((est) => (
                  <SelectItem key={est} value={est}>
                    {ESTADO_META[est].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Checkboxes: marcar qué campos se van a pistolear */}
      <div className="anim-slide-up mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {ORDEN_CAMPOS.map((campo) => {
            const marcado = pistoleoCamposMarcados.includes(campo);
            return (
              <button
                key={campo}
                onClick={() => toggleCampoMarcado(campo)}
                className={cn(
                  "press flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors",
                  marcado
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full border",
                    marcado ? "border-background bg-background" : "border-muted-foreground"
                  )}
                >
                  {marcado && <Check className="h-2.5 w-2.5 text-foreground" {...ICON_PROPS} />}
                </span>
                {CAMPOS_PISTOLEO_META[campo].label}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
            {hayParcial && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                {parcial.length}/{camposEsperados}
              </span>
            )}
          </div>
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
                ? CAMPOS_PISTOLEO_META[camposMarcadosOrdenados[parcial.length]].label
                : CAMPOS_PISTOLEO_META[camposMarcadosOrdenados[0]]?.label ?? "Serie"
            }
            className="h-12 w-full rounded-lg border border-border bg-background pl-11 pr-3 font-mono text-[15px] font-medium tracking-wide text-foreground outline-none transition-colors focus:border-foreground"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        {/* Preview en vivo: qué llevo escaneado hasta ahora */}
        {hayParcial && (
          <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
            <div className="flex flex-wrap gap-2">
              {camposMarcadosOrdenados.map((c, idx) => {
                const val = parcial[idx];
                const escaneado = val !== undefined && val !== "";
                const esActual = idx === parcial.length;
                return (
                  <div
                    key={c}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px]",
                      escaneado
                        ? "border-foreground bg-foreground text-background"
                        : esActual
                          ? "border-foreground/40 bg-background text-foreground"
                          : "border-border bg-background text-muted-foreground"
                    )}
                  >
                    <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">
                      {CAMPOS_PISTOLEO_META[c].short}
                    </span>
                    {escaneado ? (
                      <span className="font-mono font-medium">{val}</span>
                    ) : esActual ? (
                      <span className="opacity-60">···</span>
                    ) : (
                      <span className="opacity-40">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* Live feedback */}
        <div className="mt-2 h-5">
          {feedbackVisible && feedback && (
            <div
              className={cn(
                "anim-fade-in inline-flex items-center gap-1.5 text-[12px] font-medium",
                feedback.ok ? "text-foreground" : "text-destructive"
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
          className="press anim-fade-in mb-3 flex w-full items-center gap-2.5 rounded-lg bg-muted/30 px-3 py-2.5 text-left transition-colors hover:bg-muted"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground" {...ICON_PROPS} />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-foreground">
              {duplicadosSistema.length} ya registradas
            </p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" {...ICON_PROPS} />
        </button>
      )}

      {/* Banner: duplicados dentro del lote actual */}
      {duplicadosEnLote.length > 0 && (
        <div className="anim-fade-in mb-3 flex items-center gap-2.5 rounded-lg bg-muted/30 px-3 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground" {...ICON_PROPS} />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-foreground">
              {duplicadosEnLote.length} repetida(s)
            </p>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="anim-slide-up mb-4 flex flex-wrap items-center gap-2">
        <Button
          onClick={handleConfirmar}
          disabled={pistoleoFilas.length === 0}
          className="h-9 rounded-lg bg-foreground px-3.5 text-[13px] font-medium text-background shadow-none hover:bg-foreground/90 disabled:opacity-40"
        >
          <Save className="mr-1.5 h-4 w-4" {...ICON_PROPS} /> Guardar ({pistoleoFilas.length})
        </Button>
        <Button
          variant="outline"
          onClick={handleClear}
          disabled={pistoleoFilas.length === 0}
          className="h-9 rounded-lg border-border bg-background px-3.5 text-[13px] font-medium hover:bg-muted disabled:opacity-40"
        >
          <Trash2 className="mr-1.5 h-4 w-4" {...ICON_PROPS} /> Descartar
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (pistoleoFilas.length === 0) {
              toast({ title: "No hay series para exportar", variant: "destructive" });
              return;
            }
            exportarPistoleoExcel();
            toast({ title: "Excel generado", description: `${pistoleoFilas.length} serie(s) exportadas` });
          }}
          disabled={pistoleoFilas.length === 0}
          className="h-9 rounded-lg border-border bg-background px-3.5 text-[13px] font-medium hover:bg-muted disabled:opacity-40"
        >
          <Download className="mr-1.5 h-4 w-4" {...ICON_PROPS} /> Exportar Excel
        </Button>
      </div>

      {/* Aviso de límite */}
      {pistoleoFilas.length >= 900 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2.5 text-[12px] text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" {...ICON_PROPS} />
          <span>{pistoleoFilas.length}/1000</span>
        </div>
      )}

      {/* Tabla de capturas */}
      <div className="anim-slide-up overflow-hidden rounded-lg bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {pistoleoFilas.length}
          </span>
        </div>
        {pistoleoFilas.length === 0 ? (
          <div className="px-4 py-16 text-center text-[13px] text-muted-foreground">
            —
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto scroll-thin">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2.5 font-medium">#</th>
                  {camposTabla.map((c) => (
                    <th key={c} className="px-3 py-2.5 font-medium">{CAMPOS_PISTOLEO_META[c].label}</th>
                  ))}
                  <th className="px-3 py-2.5 font-medium">Modelo</th>
                  <th className="px-3 py-2.5 font-medium">Hora</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filasVisibles.map((f, i) => {
                  // Campos de ESTA fila (no los globales)
                  const camposFila = (f.camposMarcados && f.camposMarcados.length > 0)
                    ? f.camposMarcados
                    : camposMarcadosOrdenados;
                  const camposOrdenFila = ORDEN_CAMPOS.filter((c) => camposFila.includes(c));
                  const idxFila = (campo: string) => camposOrdenFila.indexOf(campo);
                  // Mapear valores por campo de esta fila
                  const valoresPorCampo: Record<string, string> = {};
                  camposTabla.forEach((c) => {
                    const idx = idxFila(c);
                    valoresPorCampo[c] = idx >= 0 ? (f.valores[idx] ?? "") : "";
                  });
                  const serie = valoresPorCampo.serie ?? "";
                  const modeloDetectado =
                    f.modeloSeleccionado?.trim()
                    || pistoleoModelo.trim()
                    || detectarModelo(serie)
                    || "SIN MODELO";
                  const yaEnSistema = seriesExistentesSet.has(serie.trim().toLowerCase());
                  const dupEnLote = duplicadosEnLoteSet.has(serie.toUpperCase());

                  if (editingId === f.id) {
                    return (
                      <tr key={f.id} className="bg-muted/40">
                        <td className="px-3 py-2.5 text-[11px] tabular-nums text-muted-foreground">{i + 1}</td>
                        {camposTabla.map((c, idx) => {
                          const idxF = idxFila(c);
                          return (
                            <td key={c} className="px-3 py-2.5">
                              <Input
                                value={editingValores[idxF >= 0 ? idxF : idx] ?? ""}
                                onChange={(e) => {
                                  const next = [...editingValores];
                                  next[idxF >= 0 ? idxF : idx] = e.target.value;
                                  setEditingValores(next);
                                }}
                                className="h-8 rounded-lg border-border bg-background font-mono text-[12px]"
                                autoFocus={idx === 0}
                              />
                            </td>
                          );
                        })}
                        <td className="px-3 py-2.5">
                          <select
                            value={editingModelo}
                            onChange={(e) => setEditingModelo(e.target.value)}
                            className="h-8 w-full rounded-lg border border-border bg-background px-2 text-[11px] font-medium text-foreground outline-none focus:border-foreground"
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
                              className="press rounded-lg p-1.5 text-foreground hover:bg-muted"
                              title="Guardar"
                            >
                              <Check className="h-3.5 w-3.5" {...ICON_PROPS} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="press rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
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
                      {camposTabla.map((c) => {
                        const valor = valoresPorCampo[c] ?? "";
                        const esSerie = c === "serie";
                        const showBadge = esSerie && (yaEnSistema || (dupEnLote && !yaEnSistema));
                        return (
                          <td key={c} className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[12px] font-medium text-foreground">
                                {valor || <span className="text-muted-foreground/40">—</span>}
                              </span>
                              {showBadge && yaEnSistema && (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground"
                                  title="Ya registrada en el sistema"
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                                  registrada
                                </span>
                              )}
                              {showBadge && dupEnLote && !yaEnSistema && (
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
                        );
                      })}
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
                            className="press rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" {...ICON_PROPS} />
                          </button>
                          <button
                            onClick={() => deletePistoleoFila(f.id)}
                            className="press rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
                  className="press rounded-lg border border-border bg-background px-4 py-2 text-[12px] font-medium text-foreground hover:bg-muted"
                >
                  Cargar más
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
        <ResumenCard label="Campos" value={camposMarcadosOrdenados.map((c) => CAMPOS_PISTOLEO_META[c].short).join(" · ")} tone="warn" />
        <ResumenCard label="Estado destino" value={ESTADO_META[pistoleoEstado].short} tone="ok" />
      </div>

      {/* Modal: Preview antes de guardar */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-h-[85vh] gap-0 overflow-hidden rounded-lg p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
              <Eye className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
              {pistoleoFilas.length} serie(s)
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 px-5 py-4">
            {/* Resumen */}
            <div className="grid grid-cols-3 overflow-hidden rounded-lg bg-card shadow-sm">
              <div className="border-r border-border p-3 text-center">
                <p className="text-[20px] font-semibold tabular-nums text-foreground">{pistoleoFilas.length}</p>
              </div>
              <div className="border-r border-border p-3 text-center">
                <p className="text-[20px] font-semibold tabular-nums text-foreground">{pistoleoFilas.length - duplicadosSistema.length}</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-[20px] font-semibold tabular-nums text-foreground">{duplicadosSistema.length}</p>
              </div>
            </div>
            {/* Lista scroll */}
            <div className="max-h-64 overflow-y-auto scroll-thin rounded-lg border border-border bg-background">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 font-medium">#</th>
                    {camposTabla.map((c) => (
                      <th key={c} className="px-3 py-2 font-medium">{CAMPOS_PISTOLEO_META[c].label}</th>
                    ))}
                    <th className="px-3 py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pistoleoFilas.map((f, i) => {
                    // Campos de ESTA fila
                    const camposFila = (f.camposMarcados && f.camposMarcados.length > 0)
                      ? f.camposMarcados
                      : camposMarcadosOrdenados;
                    const camposOrdenFila = ORDEN_CAMPOS.filter((c) => camposFila.includes(c));
                    const idxFila = (campo: string) => camposOrdenFila.indexOf(campo);
                    const valoresPorCampo: Record<string, string> = {};
                    camposTabla.forEach((c) => {
                      const idx = idxFila(c);
                      valoresPorCampo[c] = idx >= 0 ? (f.valores[idx] ?? "") : "";
                    });
                    const serie = valoresPorCampo.serie ?? "";
                    const yaEnSistema = seriesExistentesSet.has(serie.trim().toLowerCase());
                    return (
                      <tr key={f.id} className="transition-colors hover:bg-muted/40">
                        <td className="px-3 py-2 text-[11px] tabular-nums text-muted-foreground">{i + 1}</td>
                        {camposTabla.map((c) => (
                          <td key={c} className="px-3 py-2 font-mono text-[12px] text-muted-foreground">
                            {valoresPorCampo[c] || "—"}
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          {yaEnSistema ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                              <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                              <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter className="border-t border-border px-5 py-4 sm:justify-end">
            <DialogClose asChild>
              <Button variant="outline" className="h-9 rounded-lg border-border bg-background px-3.5 text-[13px] font-medium hover:bg-muted">
                Cancelar
              </Button>
            </DialogClose>
            <Button
              onClick={handleConfirmarReal}
              className="h-9 rounded-lg bg-foreground px-3.5 text-[13px] font-medium text-background shadow-none hover:bg-foreground/90"
            >
              <Save className="mr-1.5 h-4 w-4" {...ICON_PROPS} />
              Guardar {pistoleoFilas.length}
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
              {lastConfirmResult?.duplicados?.length ?? duplicadosSistema.length} ya registradas
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto scroll-thin px-5 py-4">
            <ul className="flex flex-col gap-1.5">
              {(lastConfirmResult?.duplicados ?? duplicadosSistema).map((s, i) => {
                const eq = findEquipmentBySerie(s);
                return (
                  <li
                    key={`${s}-${i}`}
                    className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5"
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
              <Button variant="outline" className="h-9 rounded-lg border-border bg-background px-3.5 text-[13px] font-medium hover:bg-muted">
                Entendido
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  tone: "neutral" | "info" | "warn" | "ok";
  mono?: boolean;
}) {
  // tone is intentionally accepted but visual styling is intentionally neutral
  // per minimalist design (all cards use the same border + background).
  void tone;
  return (
    <div className="rounded-lg bg-muted/30 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-1 truncate text-[14px] font-medium text-foreground", mono && "font-mono")}>
        {value}
      </p>
    </div>
  );
}
