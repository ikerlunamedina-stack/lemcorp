"use client";

import { useRef, useState, useMemo } from "react";
import { AppShell } from "@/components/lem/app-shell";
import { useStore } from "@/lib/store";
import type { TipoRecepcion } from "@/lib/types";
import {
  ArrowDownToLine, FileText, FileSpreadsheet, Upload, Loader2, AlertCircle,
  CheckCircle2, Trash2, ChevronDown, ChevronRight,
  Building2, Calendar, FileCheck, Package, Cpu, Plus, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/lem/use-confirm";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { fmtNum } from "@/lib/num";
import { cn } from "@/lib/utils";

const ICON_PROPS = { strokeWidth: 1.5 } as const;

interface MaterialItem {
  sku: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  requiereSerie: boolean;
  series: string[];
  estado: "ok" | "falta_serie" | "sin_cantidad" | "sin_sku";
  observacion?: string;
}

interface RecepcionPreview {
  nGuia: string;
  fechaTraslado: string;
  fechaEmision: string;
  motivoTraslado: string;
  descripcionMotivo: string;
  rucRemitente: string;
  nombreRemitente: string;
  puntoPartida: string;
  rucDestinatario: string;
  nombreDestinatario: string;
  puntoLlegada: string;
  observaciones: string;
  materiales: MaterialItem[];
  totalUnidades: number;
  totalSeries: number;
  itemsOK: number;
  itemsConError: number;
}

function fmtFecha(ts: number | string | null | undefined): string {
  if (!ts) return "—";
  if (typeof ts === "string" && ts.includes("/")) return ts;
  try {
    return new Date(Number(ts)).toLocaleString("es-PE", {
      timeZone: "America/Lima",
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return String(ts); }
}

export default function RecepcionesPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const entradas = useStore((s) => s.entradas) ?? [];
  const products = useStore((s) => s.products) ?? [];
  const equipos = useStore((s) => s.equipos) ?? [];
  const findProductBySku = useStore((s) => s.findProductBySku);
  const addProduct = useStore((s) => s.addProduct);
  const registrarRecepcion = useStore((s) => s.registrarRecepcion);
  const deleteRecepcion = useStore((s) => s.deleteRecepcion);

  const pdfRef = useRef<HTMLInputElement>(null);
  const stockRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importingStock, setImportingStock] = useState(false);
  const [preview, setPreview] = useState<RecepcionPreview | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [result, setResult] = useState<{
    ok: number; fail: number; fails: string[]; totalUnidades: number;
    totalSeries: number; entradasCreadas: number; productosCreados: number;
    productosActualizados: number; equiposRegistrados: number; recepcionId: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [expandedHist, setExpandedHist] = useState<string | null>(null);

  // ─── SKUs del PDF que NO existen en el catálogo ───
  // Validación previa: el usuario debe crearlos antes de confirmar la recepción
  const skusFaltantes = useMemo(() => {
    if (!preview) return [] as Array<{ sku: string; descripcion: string; unidad: string }>;
    const faltantes: Array<{ sku: string; descripcion: string; unidad: string }> = [];
    for (const m of preview.materiales) {
      if (!m.sku) continue;
      if (!findProductBySku(m.sku)) {
        faltantes.push({ sku: m.sku, descripcion: m.descripcion, unidad: m.unidad });
      }
    }
    return faltantes;
  }, [preview, findProductBySku]);

  // Crear todos los SKUs faltantes en el catálogo (con stock 0)
  // para que luego la recepción pueda sumarles cantidad
  const crearTodosLosSkusFaltantes = () => {
    let creados = 0;
    for (const f of skusFaltantes) {
      const id = addProduct(f.sku, f.descripcion, 0, undefined, f.unidad);
      if (id) creados++;
    }
    return creados;
  };

  // Modal manual
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    tipo: "ingreso_lemcorp" as TipoRecepcion,
    nGuia: "",
    fechaTraslado: new Date().toISOString().slice(0, 10),
    empresa: "",
    empresaRuc: "",
    albaran: "",
    observaciones: "",
  });
  const [manualItems, setManualItems] = useState<Array<{
    sku: string; producto: string; unidad: string; cantidad: string; series: string;
  }>>([{ sku: "", producto: "", unidad: "UNIDAD", cantidad: "1", series: "" }]);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError(null);
    setResult(null);
    setPreview(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import-recepcion-pdf", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error al parsear PDF");
      setPreview(data.recepcion);
      setPreviewOpen(true);
    } catch (err: any) {
      setError(err?.message || "Error al importar el PDF");
    } finally {
      setImporting(false);
      if (pdfRef.current) pdfRef.current.value = "";
    }
  };

  // ─── Importación masiva de Excel de stock (con series incluidas) ───
  // Carga inicial del almacén o actualización masiva. El Excel SpaceCom
  // "Stock Detalle" tiene 1 fila por item (con serie individual si aplica).
  // Las series duplicadas se ignoran (no se sobrescriben).
  const [stockPreview, setStockPreview] = useState<any>(null);
  const [stockPreviewOpen, setStockPreviewOpen] = useState(false);
  const [stockResult, setStockResult] = useState<any>(null);
  const importarStockMasivo = useStore((s) => s.importarStockMasivo);

  const handleStockUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingStock(true);
    setError(null);
    setStockResult(null);
    setStockPreview(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import-stock-excel", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error al procesar el Excel de stock");
      setStockPreview(data.stock);
      setStockPreviewOpen(true);
    } catch (err: any) {
      setError(err?.message || "Error al importar el Excel de stock");
    } finally {
      setImportingStock(false);
      if (stockRef.current) stockRef.current.value = "";
    }
  };

  const confirmarStockMasivo = async () => {
    if (!stockPreview) return;
    setConfirming(true);
    setError(null);
    try {
      // Filtrar items válidos (estado "ok")
      const itemsValidos = stockPreview.items.filter((it: any) => it.estado === "ok");
      if (itemsValidos.length === 0) {
        setError("No hay items válidos para importar");
        setConfirming(false);
        return;
      }
      const r = importarStockMasivo({
        almacen: stockPreview.almacen,
        ubicacion: stockPreview.ubicacionPrincipal,
        propiedad: stockPreview.propiedad,
        items: itemsValidos.map((it: any) => ({
          sku: it.sku,
          producto: it.producto,
          udm: it.udm,
          categoria: it.categoria,
          serie: it.serie || undefined,
          cantidad: it.disponible,
          requiereSerie: it.requiereSerie,
        })),
      });
      setStockResult(r);
    } catch (err: any) {
      setError(err?.message || "Error al importar el stock masivo");
    } finally {
      setConfirming(false);
    }
  };

  const cerrarStockPreview = () => {
    setStockPreviewOpen(false);
    setStockPreview(null);
    setStockResult(null);
    setError(null);
  };

  const confirmarIngreso = async () => {
    if (!preview) return;
    setConfirming(true);
    setError(null);
    try {
      // ─── Bloqueo: si hay SKUs del PDF que no existen en el catálogo,
      // NO se puede confirmar la recepción. El usuario debe crearlos primero
      // (botón "Crear SKUs faltantes") o crearlos manualmente en /inventario. ───
      if (skusFaltantes.length > 0) {
        setError(
          `Hay ${skusFaltantes.length} SKU(s) del PDF que no existen en el catálogo. ` +
          `Pulsa "Crear ${skusFaltantes.length} SKU(s) faltantes" para registrarlos automáticamente, ` +
          `o créalos manualmente en /inventario antes de confirmar la recepción.`
        );
        setConfirming(false);
        return;
      }
      // Para items con estado "falta_serie" o "sin_cantidad", los filtramos
      const itemsValidos = preview.materiales.filter(
        (m) => m.estado === "ok" || m.estado === "sin_cantidad"
      );
      if (itemsValidos.length === 0) {
        setError("No hay items válidos para registrar");
        setConfirming(false);
        return;
      }
      const r = registrarRecepcion({
        tipo: "ingreso_lemcorp",
        nGuia: preview.nGuia,
        fechaTraslado: preview.fechaTraslado,
        rucRemitente: preview.rucRemitente,
        nombreRemitente: preview.nombreRemitente,
        rucDestinatario: preview.rucDestinatario,
        nombreDestinatario: preview.nombreDestinatario,
        puntoPartida: preview.puntoPartida,
        puntoLlegada: preview.puntoLlegada,
        motivoTraslado: preview.descripcionMotivo,
        observaciones: preview.observaciones,
        items: itemsValidos.map((m) => ({
          sku: m.sku,
          producto: m.descripcion,
          unidad: m.unidad,
          cantidad: m.cantidad,
          series: m.requiereSerie ? m.series.slice(0, m.cantidad) : m.series,
          requiereSerie: m.requiereSerie,
        })),
      });
      setResult(r);
    } catch (err: any) {
      setError(err?.message || "Error al confirmar");
    } finally {
      setConfirming(false);
    }
  };

  const cerrarPreview = () => {
    setPreviewOpen(false);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  // ─── Recepción manual ───
  const addManualItem = () => {
    setManualItems([...manualItems, { sku: "", producto: "", unidad: "UNIDAD", cantidad: "1", series: "" }]);
  };
  const removeManualItem = (i: number) => {
    setManualItems(manualItems.filter((_, idx) => idx !== i));
  };
  const updateManualItem = (i: number, field: string, value: string) => {
    setManualItems(manualItems.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  };

  const confirmarRecepcionManual = () => {
    setConfirming(true);
    setError(null);
    try {
      const items = manualItems
        .filter((it) => it.sku.trim() && it.producto.trim() && Number(it.cantidad) > 0)
        .map((it) => ({
          sku: it.sku.trim(),
          producto: it.producto.trim(),
          unidad: it.unidad,
          cantidad: Number(it.cantidad),
          series: it.series.trim()
            ? it.series.split(/[\n,;\s]+/).map((s) => s.trim()).filter(Boolean)
            : [],
          requiereSerie: it.series.trim().length > 0,
        }));
      if (items.length === 0) {
        setError("No hay items válidos");
        setConfirming(false);
        return;
      }
      const r = registrarRecepcion({
        tipo: manualForm.tipo,
        nGuia: manualForm.nGuia.trim() || undefined,
        fechaTraslado: manualForm.fechaTraslado,
        empresa: manualForm.empresa.trim() || undefined,
        empresaRuc: manualForm.empresaRuc.trim() || undefined,
        albaran: manualForm.albaran.trim() || undefined,
        observaciones: manualForm.observaciones.trim() || undefined,
        items,
      });
      setResult(r);
      setManualOpen(false);
      // Reset form
      setManualForm({
        tipo: "ingreso_lemcorp",
        nGuia: "",
        fechaTraslado: new Date().toISOString().slice(0, 10),
        empresa: "",
        empresaRuc: "",
        albaran: "",
        observaciones: "",
      });
      setManualItems([{ sku: "", producto: "", unidad: "UNIDAD", cantidad: "1", series: "" }]);
    } catch (err: any) {
      setError(err?.message || "Error al registrar recepción manual");
    } finally {
      setConfirming(false);
    }
  };

  // ─── Stats ───
  const hoy = entradas.filter(e => {
    try { return new Date(e.fecha).toDateString() === new Date().toDateString(); }
    catch { return false; }
  }).length;
  const conGuia = entradas.filter(e => e.nGuia).length;
  const totalUnidades = entradas.reduce((s, e) => s + e.cantidad, 0);

  // ─── Historial agrupado por recepciónId ───
  const recepcionesAgrupadas = useMemo(() => {
    const map = new Map<string, {
      recepcionId: string;
      items: typeof entradas;
      fecha: number;
      nGuia?: string;
      empresa?: string;
      tipoRecepcion?: TipoRecepcion;
      rucRemitente?: string;
      nombreRemitente?: string;
      totalUnidades: number;
      totalSeries: number;
    }>();
    for (const e of entradas) {
      const key = e.recepcionId || e.id;
      if (!map.has(key)) {
        map.set(key, {
          recepcionId: key,
          items: [],
          fecha: e.fecha,
          nGuia: e.nGuia,
          empresa: e.empresa || e.nombreRemitente,
          tipoRecepcion: e.tipoRecepcion,
          rucRemitente: e.rucRemitente,
          nombreRemitente: e.nombreRemitente,
          totalUnidades: 0,
          totalSeries: 0,
        });
      }
      const r = map.get(key)!;
      r.items.push(e);
      r.totalUnidades += e.cantidad;
      r.totalSeries += (e.series?.length || 0);
    }
    return Array.from(map.values()).sort((a, b) => b.fecha - a.fecha);
  }, [entradas]);

  return (
    <AppShell>
      <div className="px-4 py-6 sm:px-6 lg:px-8 anim-fade-in">
        {/* Header */}
        <div className="anim-slide-up flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Almacén</p>
            <h1 className="text-[28px] font-semibold tracking-tight text-foreground flex items-center gap-2">
              <ArrowDownToLine className="h-7 w-7" strokeWidth={1.5} /> Recepciones
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Único punto de ingreso de materiales al inventario — con guía SUNAT PDF o manual
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={pdfRef} type="file" accept=".pdf" onChange={handlePdfUpload} className="hidden" />
            <input ref={stockRef} type="file" accept=".xlsx,.xls" onChange={handleStockUpload} className="hidden" />
            <Button
              onClick={() => pdfRef.current?.click()}
              disabled={importing || importingStock}
              className="h-9 rounded-lg bg-foreground px-3.5 text-[13px] font-medium text-background shadow-none hover:bg-foreground/90"
            >
              {importing
                ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" {...ICON_PROPS} />
                : <Upload className="mr-1.5 h-4 w-4" {...ICON_PROPS} />}
              {importing ? "Procesando PDF…" : "Subir PDF de guía SUNAT"}
            </Button>
            <Button
              variant="outline"
              onClick={() => stockRef.current?.click()}
              disabled={importing || importingStock}
              className="h-9 rounded-lg border-border bg-background px-3.5 text-[13px] font-medium hover:bg-muted"
              title="Importa un Excel de stock (con o sin series) — útil para carga inicial del almacén o actualización masiva"
            >
              {importingStock
                ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" {...ICON_PROPS} />
                : <FileSpreadsheet className="mr-1.5 h-4 w-4" {...ICON_PROPS} />}
              {importingStock ? "Procesando Excel…" : "Importar Excel de stock"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setManualOpen(true)}
              className="h-9 rounded-lg border-border bg-background px-3.5 text-[13px] font-medium hover:bg-muted"
            >
              <Plus className="mr-1.5 h-4 w-4" {...ICON_PROPS} /> Recepción manual
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="anim-slide-up grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
          <div className="bg-background px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Recepciones</p>
            <p className="mt-1 text-[24px] font-semibold tabular-nums text-foreground">{recepcionesAgrupadas.length}</p>
          </div>
          <div className="bg-background px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Hoy</p>
            <p className="mt-1 text-[24px] font-semibold tabular-nums text-emerald-600">{hoy}</p>
          </div>
          <div className="bg-background px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Con guía</p>
            <p className="mt-1 text-[24px] font-semibold tabular-nums text-primary">{conGuia}</p>
          </div>
          <div className="bg-background px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Unidades</p>
            <p className="mt-1 text-[24px] font-semibold tabular-nums text-foreground">{fmtNum(totalUnidades)}</p>
          </div>
        </div>

        {/* Estado inventario actual */}
        <div className="anim-slide-up mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 text-[12px] text-muted-foreground">
          <div className="rounded-lg border border-border bg-background px-3 py-2 flex items-center gap-2">
            <Package className="h-3.5 w-3.5" {...ICON_PROPS} />
            <span>Catálogo: <strong className="text-foreground tabular-nums">{products.length}</strong> productos</span>
          </div>
          <div className="rounded-lg border border-border bg-background px-3 py-2 flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5" {...ICON_PROPS} />
            <span>Equipos: <strong className="text-foreground tabular-nums">{equipos.length}</strong> en almacén</span>
          </div>
          <div className="rounded-lg border border-border bg-background px-3 py-2 flex items-center gap-2">
            <FileCheck className="h-3.5 w-3.5" {...ICON_PROPS} />
            <span>Entradas registradas: <strong className="text-foreground tabular-nums">{entradas.length}</strong></span>
          </div>
        </div>

        {/* Historial */}
        <div className="anim-slide-up mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-foreground">Historial por recepción</h2>
            {recepcionesAgrupadas.length > 0 && (
              <span className="text-[11px] text-muted-foreground">{recepcionesAgrupadas.length} recepción(es)</span>
            )}
          </div>

          {recepcionesAgrupadas.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-background px-4 py-16 text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" {...ICON_PROPS} />
              <p className="mt-2 text-[13px] text-muted-foreground">
                No hay recepciones registradas todavía.
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Sube un <strong className="text-foreground">PDF de guía de remisión SUNAT</strong> o usa el botón{" "}
                <strong className="text-foreground">"Recepción manual"</strong> para ingresar materiales.
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Este es el <strong className="text-foreground">único</strong> punto de ingreso al inventario.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recepcionesAgrupadas.map((r) => {
                const isExp = expandedHist === r.recepcionId;
                return (
                  <div key={r.recepcionId} className="overflow-hidden rounded-lg border border-border bg-background">
                    <button
                      onClick={() => setExpandedHist(isExp ? null : r.recepcionId)}
                      className="flex w-full items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                    >
                      {isExp
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" {...ICON_PROPS} />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" {...ICON_PROPS} />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-[14px] font-medium text-foreground">
                            {r.nGuia ? `Guía ${r.nGuia}` : (r.empresa || "Recepción manual")}
                          </span>
                          {r.tipoRecepcion && (
                            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {r.tipoRecepcion === "ingreso_lemcorp" ? "Ingreso Lemcorp" : "Regularización"}
                            </span>
                          )}
                          {r.nombreRemitente && (
                            <span className="text-[11px] text-muted-foreground">· {r.nombreRemitente}</span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-baseline gap-3 flex-wrap text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" {...ICON_PROPS} />
                            {fmtFecha(r.fecha)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" {...ICON_PROPS} />
                            {r.items.length} item(s)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-[12px]">
                        <div className="text-right">
                          <p className="tabular-nums text-foreground">{fmtNum(r.totalUnidades)}</p>
                          <p className="text-[10px] uppercase text-muted-foreground">unidades</p>
                        </div>
                        {r.totalSeries > 0 && (
                          <div className="text-right">
                            <p className="tabular-nums text-primary">{r.totalSeries}</p>
                            <p className="text-[10px] uppercase text-muted-foreground">series</p>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const label = r.nGuia ? `guía ${r.nGuia}` : "esta recepción";
                          const ok = await confirm({
                            title: "Eliminar recepción",
                            description: `¿Eliminar ${label}? Se restaurará el inventario y se eliminarán las series registradas.`,
                            critical: true,
                            details: `Items: ${r.items.length}\nUnidades: ${r.totalUnidades}\nSeries: ${r.totalSeries}${r.empresa ? `\nEmpresa: ${r.empresa}` : ""}\n\nEsta acción no se puede deshacer. Quedará registrada en /auditoría.`,
                          });
                          if (ok) {
                            deleteRecepcion(r.recepcionId);
                            setExpandedHist(null);
                          }
                        }}
                        className="ml-2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Eliminar recepción y restaurar inventario"
                      >
                        <Trash2 className="h-3.5 w-3.5" {...ICON_PROPS} />
                      </button>
                    </button>

                    {isExp && (
                      <div className="border-t border-border">
                        <div className="max-h-[400px] overflow-y-auto scroll-thin">
                          <table className="w-full text-[12px]">
                            <thead>
                              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                                <th className="px-4 py-2 font-medium">SKU</th>
                                <th className="px-4 py-2 font-medium">Producto</th>
                                <th className="px-4 py-2 text-right font-medium">Cant.</th>
                                <th className="px-4 py-2 font-medium">Series</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {r.items.map((it) => (
                                <tr key={it.id} className="hover:bg-muted/30">
                                  <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">{it.sku}</td>
                                  <td className="px-4 py-2.5 text-foreground">{it.producto}</td>
                                  <td className="px-4 py-2.5 text-right tabular-nums text-foreground">+{it.cantidad}</td>
                                  <td className="px-4 py-2.5">
                                    {it.series && it.series.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {it.series.slice(0, 5).map((s: string, i: number) => (
                                          <span key={i} className="inline-flex items-center rounded border border-border bg-muted/30 px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                                            {s}
                                          </span>
                                        ))}
                                        {it.series.length > 5 && (
                                          <span className="text-[10px] text-muted-foreground">
                                            +{it.series.length - 5} más
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-muted-foreground">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dialog de preview de PDF */}
        <Dialog open={previewOpen} onOpenChange={(o) => { if (!o) cerrarPreview(); }}>
          <DialogContent className="max-w-4xl p-0 gap-0 rounded-lg">
            <DialogHeader className="border-b border-border px-5 py-3.5">
              <DialogTitle className="text-[15px] font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" {...ICON_PROPS} />
                Recepción detectada del PDF
                {preview?.nGuia && <span className="text-[12px] font-mono text-muted-foreground">· {preview.nGuia}</span>}
              </DialogTitle>
            </DialogHeader>

            <div className="p-0 max-h-[70vh] overflow-y-auto scroll-thin">
              {preview && (
                <>
                  {/* Metadatos */}
                  <div className="border-b border-border px-5 py-4 bg-muted/20 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px] sm:grid-cols-3">
                    {preview.fechaTraslado && (
                      <div>
                        <span className="text-muted-foreground">Fecha traslado: </span>
                        <span className="text-foreground">{preview.fechaTraslado}</span>
                      </div>
                    )}
                    {preview.nombreRemitente && (
                      <div>
                        <span className="text-muted-foreground">Remitente: </span>
                        <span className="text-foreground">{preview.nombreRemitente}</span>
                      </div>
                    )}
                    {preview.rucRemitente && (
                      <div>
                        <span className="text-muted-foreground">RUC remitente: </span>
                        <span className="text-foreground font-mono">{preview.rucRemitente}</span>
                      </div>
                    )}
                    {preview.nombreDestinatario && (
                      <div>
                        <span className="text-muted-foreground">Destinatario: </span>
                        <span className="text-foreground">{preview.nombreDestinatario}</span>
                      </div>
                    )}
                    {preview.rucDestinatario && (
                      <div>
                        <span className="text-muted-foreground">RUC destinatario: </span>
                        <span className="text-foreground font-mono">{preview.rucDestinatario}</span>
                      </div>
                    )}
                    {preview.descripcionMotivo && (
                      <div>
                        <span className="text-muted-foreground">Motivo: </span>
                        <span className="text-foreground">{preview.descripcionMotivo}</span>
                      </div>
                    )}
                    {preview.puntoPartida && (
                      <div className="col-span-2 sm:col-span-3">
                        <span className="text-muted-foreground">Punto partida: </span>
                        <span className="text-foreground">{preview.puntoPartida}</span>
                      </div>
                    )}
                    {preview.puntoLlegada && (
                      <div className="col-span-2 sm:col-span-3">
                        <span className="text-muted-foreground">Punto llegada: </span>
                        <span className="text-foreground">{preview.puntoLlegada}</span>
                      </div>
                    )}
                    {preview.observaciones && (
                      <div className="col-span-2 sm:col-span-3">
                        <span className="text-muted-foreground">Obs: </span>
                        <span className="text-foreground">{preview.observaciones}</span>
                      </div>
                    )}
                  </div>

                  {/* Resumen */}
                  <div className="border-b border-border px-5 py-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Items OK</p>
                        <p className="mt-1 text-[20px] font-semibold tabular-nums text-emerald-600">{preview.itemsOK}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Con error</p>
                        <p className="mt-1 text-[20px] font-semibold tabular-nums text-rose-600">{preview.itemsConError}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Unidades</p>
                        <p className="mt-1 text-[20px] font-semibold tabular-nums text-foreground">{preview.totalUnidades}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Series</p>
                        <p className="mt-1 text-[20px] font-semibold tabular-nums text-primary">{preview.totalSeries}</p>
                      </div>
                    </div>
                  {/* Banner SKUs faltantes */}
                  {skusFaltantes.length > 0 && !result && (
                    <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" {...ICON_PROPS} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-amber-700 dark:text-amber-400">
                            {skusFaltantes.length} SKU(s) del PDF NO existen en el catálogo
                          </p>
                          <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                            Para controlar bien tu inventario, los SKUs deben registrarse primero.
                            Puedes crearlos automáticamente con stock 0 (la recepción les sumará cantidad),
                            o crearlos manualmente en /inventario.
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {skusFaltantes.slice(0, 8).map((f, i) => (
                              <span key={i} className="inline-flex items-center rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-700 dark:text-amber-400">
                                {f.sku}
                              </span>
                            ))}
                            {skusFaltantes.length > 8 && (
                              <span className="text-[10px] text-amber-700 dark:text-amber-400">
                                +{skusFaltantes.length - 8} más
                              </span>
                            )}
                          </div>
                          <Button
                            onClick={() => {
                              const n = crearTodosLosSkusFaltantes();
                              setError(null);
                              console.log(`Creados ${n} SKUs en el catálogo`);
                            }}
                            className="mt-2 h-8 rounded-md bg-amber-600 px-3 text-[12px] font-medium text-white shadow-none hover:bg-amber-700"
                          >
                            <Plus className="mr-1 h-3 w-3" {...ICON_PROPS} />
                            Crear {skusFaltantes.length} SKU(s) faltantes en el catálogo
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-[12px] text-rose-700 dark:text-rose-400 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" {...ICON_PROPS} />
                      <span>{error}</span>
                    </div>
                  )}
                  </div>

                  {/* Resultado */}
                  {result && (
                    <div className="border-b border-border px-5 py-4 bg-emerald-500/5">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" {...ICON_PROPS} />
                        <p className="text-[14px] font-semibold text-foreground">Recepción registrada en el inventario</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[12px]">
                        <div>
                          <span className="text-muted-foreground">Items: </span>
                          <strong className="text-foreground tabular-nums">{result.ok}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Unidades: </span>
                          <strong className="text-foreground tabular-nums">{result.totalUnidades}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Equipos con serie: </span>
                          <strong className="text-primary tabular-nums">{result.equiposRegistrados}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Productos nuevos: </span>
                          <strong className="text-foreground tabular-nums">{result.productosCreados}</strong>
                        </div>
                      </div>
                      {result.fails.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-[12px] text-rose-600">
                            {result.fails.length} error(es) no bloqueantes
                          </summary>
                          <ul className="mt-1 space-y-0.5 text-[11px] text-rose-600">
                            {result.fails.map((f, i) => <li key={i}>• {f}</li>)}
                          </ul>
                        </details>
                      )}
                    </div>
                  )}

                  {/* Tabla de items */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                          <th className="px-3 py-2 font-medium">Estado</th>
                          <th className="px-3 py-2 font-medium">SKU</th>
                          <th className="px-3 py-2 font-medium">Producto</th>
                          <th className="px-3 py-2 text-right font-medium">Cant.</th>
                          <th className="px-3 py-2 font-medium">Unidad</th>
                          <th className="px-3 py-2 font-medium">Series</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {preview.materiales.map((m, i) => {
                          const ok = m.estado === "ok";
                          const existeCatalogo = !m.sku || findProductBySku(m.sku);
                          return (
                            <tr key={i} className={cn("align-top", !existeCatalogo && "bg-amber-500/5")}>
                              <td className="px-3 py-2.5">
                                <span className={cn(
                                  "inline-flex items-center gap-1 text-[11px] font-medium",
                                  ok && existeCatalogo ? "text-emerald-600" : "text-rose-600"
                                )}>
                                  {ok && existeCatalogo
                                    ? <CheckCircle2 className="h-3.5 w-3.5" {...ICON_PROPS} />
                                    : <AlertCircle className="h-3.5 w-3.5" {...ICON_PROPS} />}
                                  {ok && existeCatalogo
                                    ? "OK"
                                    : !existeCatalogo
                                      ? "No en catálogo"
                                      : "Error"}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                                {m.sku}
                                {!existeCatalogo && (
                                  <span className="ml-1.5 inline-flex items-center rounded bg-amber-500/20 px-1 py-0.5 text-[9px] font-bold uppercase text-amber-700 dark:text-amber-400">
                                    Nuevo
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-foreground">
                                {m.descripcion}
                                {m.requiereSerie && (
                                  <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-primary">
                                    <Cpu className="h-2.5 w-2.5" {...ICON_PROPS} />
                                    requiere serie
                                  </span>
                                )}
                                {m.observacion && (
                                  <p className="mt-0.5 text-[10px] text-amber-600">{m.observacion}</p>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{m.cantidad}</td>
                              <td className="px-3 py-2.5 text-[11px] text-muted-foreground">{m.unidad}</td>
                              <td className="px-3 py-2.5">
                                {m.series.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 max-w-md">
                                    {m.series.slice(0, 8).map((s, j) => (
                                      <span key={j} className="inline-flex items-center rounded border border-border bg-muted/30 px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                                        {s}
                                      </span>
                                    ))}
                                    {m.series.length > 8 && (
                                      <span className="text-[10px] text-muted-foreground">
                                        +{m.series.length - 8} más
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">— sin serie —</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="border-t border-border px-5 py-3.5 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                onClick={cerrarPreview}
                className="h-9 rounded-lg border-border bg-background text-[13px] hover:bg-muted"
              >
                {result ? "Cerrar" : "Cancelar"}
              </Button>
              {!result ? (
                <Button
                  onClick={confirmarIngreso}
                  disabled={confirming || preview?.itemsOK === 0 || skusFaltantes.length > 0}
                  className="h-9 rounded-lg bg-foreground px-4 text-[13px] font-medium text-background shadow-none hover:bg-foreground/90 disabled:opacity-50"
                  title={skusFaltantes.length > 0 ? "Crea los SKUs faltantes antes de confirmar" : undefined}
                >
                  {confirming
                    ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" {...ICON_PROPS} />
                    : <CheckCircle2 className="mr-1.5 h-4 w-4" {...ICON_PROPS} />}
                  {confirming
                    ? "Procesando…"
                    : skusFaltantes.length > 0
                      ? `Crea los ${skusFaltantes.length} SKU(s) faltantes primero`
                      : `Confirmar ingreso al inventario (${preview?.itemsOK || 0} items)`}
                </Button>
              ) : (
                <Button
                  onClick={cerrarPreview}
                  className="h-9 rounded-lg bg-foreground px-4 text-[13px] font-medium text-background shadow-none hover:bg-foreground/90"
                >
                  Listo
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de recepción manual */}
        <Dialog open={manualOpen} onOpenChange={(o) => setManualOpen(o)}>
          <DialogContent className="max-w-3xl p-0 gap-0 rounded-lg">
            <DialogHeader className="border-b border-border px-5 py-3.5">
              <DialogTitle className="text-[15px] font-semibold flex items-center gap-2">
                <Plus className="h-4 w-4" {...ICON_PROPS} />
                Nueva recepción manual
              </DialogTitle>
            </DialogHeader>

            <div className="max-h-[70vh] overflow-y-auto scroll-thin px-5 py-4 space-y-4">
              {error && (
                <div className="rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-[12px] text-rose-700 dark:text-rose-400 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" {...ICON_PROPS} />
                  <span>{error}</span>
                </div>
              )}
              {result && (
                <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[12px] text-emerald-700 dark:text-emerald-400 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" {...ICON_PROPS} />
                  <span>
                    Recepción registrada: <strong>{result.ok} items</strong>,{" "}
                    <strong>{result.totalUnidades} unidades</strong>,{" "}
                    <strong>{result.equiposRegistrados} equipos con serie</strong>
                  </span>
                </div>
              )}

              {/* Tipo de recepción */}
              <div>
                <Label className="text-[12px] font-medium text-foreground mb-1.5 block">Tipo de recepción</Label>
                <Select
                  value={manualForm.tipo}
                  onValueChange={(v) => setManualForm({ ...manualForm, tipo: v as TipoRecepcion })}
                >
                  <SelectTrigger className="rounded-lg text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="ingreso_lemcorp">Ingreso Lemcorp (guía/albarán de compra)</SelectItem>
                    <SelectItem value="regularizacion">Regularización de material (ajuste de stock)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Datos del proveedor / documento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[12px] font-medium text-foreground mb-1.5 block">N° Guía/Albarán</Label>
                  <Input
                    value={manualForm.nGuia}
                    onChange={(e) => setManualForm({ ...manualForm, nGuia: e.target.value })}
                    placeholder="Ej. EG07-00005170"
                    className="rounded-lg font-mono text-[13px]"
                  />
                </div>
                <div>
                  <Label className="text-[12px] font-medium text-foreground mb-1.5 block">Fecha</Label>
                  <Input
                    type="date"
                    value={manualForm.fechaTraslado}
                    onChange={(e) => setManualForm({ ...manualForm, fechaTraslado: e.target.value })}
                    className="rounded-lg text-[13px]"
                  />
                </div>
                <div>
                  <Label className="text-[12px] font-medium text-foreground mb-1.5 block">Empresa</Label>
                  <Input
                    value={manualForm.empresa}
                    onChange={(e) => setManualForm({ ...manualForm, empresa: e.target.value })}
                    placeholder="Nombre del proveedor o remitente"
                    className="rounded-lg text-[13px]"
                  />
                </div>
                <div>
                  <Label className="text-[12px] font-medium text-foreground mb-1.5 block">RUC</Label>
                  <Input
                    value={manualForm.empresaRuc}
                    onChange={(e) => setManualForm({ ...manualForm, empresaRuc: e.target.value })}
                    placeholder="20123456789"
                    className="rounded-lg font-mono text-[13px]"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-[12px] font-medium text-foreground">Materiales</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addManualItem}
                    className="h-7 rounded-md text-[11px] border-border bg-background hover:bg-muted"
                  >
                    <Plus className="mr-1 h-3 w-3" {...ICON_PROPS} /> Agregar item
                  </Button>
                </div>
                <div className="space-y-2">
                  {manualItems.map((it, i) => (
                    <div key={i} className="rounded-lg border border-border bg-muted/20 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Item {i + 1}</span>
                        {manualItems.length > 1 && (
                          <button
                            onClick={() => removeManualItem(i)}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="h-3 w-3" {...ICON_PROPS} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <Input
                          value={it.sku}
                          onChange={(e) => updateManualItem(i, "sku", e.target.value)}
                          placeholder="SKU"
                          className="rounded-md font-mono text-[12px]"
                        />
                        <Input
                          value={it.producto}
                          onChange={(e) => updateManualItem(i, "producto", e.target.value)}
                          placeholder="Descripción"
                          className="rounded-md text-[12px]"
                        />
                        <Select
                          value={it.unidad}
                          onValueChange={(v) => updateManualItem(i, "unidad", v)}
                        >
                          <SelectTrigger className="rounded-md text-[12px]"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-md">
                            <SelectItem value="UNIDAD">UNIDAD</SelectItem>
                            <SelectItem value="METRO">METRO</SelectItem>
                            <SelectItem value="KILOGRAMO">KILOGRAMO</SelectItem>
                            <SelectItem value="LITRO">LITRO</SelectItem>
                            <SelectItem value="CAJA">CAJA</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          value={it.cantidad}
                          onChange={(e) => updateManualItem(i, "cantidad", e.target.value)}
                          placeholder="Cant."
                          className="rounded-md text-[12px] tabular-nums"
                        />
                      </div>
                      <div className="mt-2">
                        <Label className="text-[10px] text-muted-foreground mb-1 block">
                          Series (separadas por coma o salto de línea) — solo para equipos
                        </Label>
                        <textarea
                          value={it.series}
                          onChange={(e) => updateManualItem(i, "series", e.target.value)}
                          placeholder="Ej: M91821ER7903, MV2135VR3979, ... (dejar vacío si no requiere serie)"
                          rows={2}
                          className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[11px] resize-y"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <Label className="text-[12px] font-medium text-foreground mb-1.5 block">Observaciones</Label>
                <textarea
                  value={manualForm.observaciones}
                  onChange={(e) => setManualForm({ ...manualForm, observaciones: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows={2}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] resize-y"
                />
              </div>
            </div>

            <DialogFooter className="border-t border-border px-5 py-3.5 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setManualOpen(false);
                  setError(null);
                  setResult(null);
                }}
                className="h-9 rounded-lg border-border bg-background text-[13px] hover:bg-muted"
              >
                {result ? "Cerrar" : "Cancelar"}
              </Button>
              {!result && (
                <Button
                  onClick={confirmarRecepcionManual}
                  disabled={confirming}
                  className="h-9 rounded-lg bg-foreground px-4 text-[13px] font-medium text-background shadow-none hover:bg-foreground/90 disabled:opacity-50"
                >
                  {confirming
                    ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" {...ICON_PROPS} />
                    : <CheckCircle2 className="mr-1.5 h-4 w-4" {...ICON_PROPS} />}
                  {confirming ? "Procesando…" : "Registrar recepción"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de preview de Excel de stock masivo */}
        <Dialog open={stockPreviewOpen} onOpenChange={(o) => { if (!o) cerrarStockPreview(); }}>
          <DialogContent className="max-w-5xl p-0 gap-0 rounded-lg">
            <DialogHeader className="border-b border-border px-5 py-3.5">
              <DialogTitle className="text-[15px] font-semibold flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" {...ICON_PROPS} />
                Stock masivo detectado del Excel
                {stockPreview?.almacen && (
                  <span className="text-[12px] text-muted-foreground">· {stockPreview.almacen}</span>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="p-0 max-h-[70vh] overflow-y-auto scroll-thin">
              {stockPreview && (
                <>
                  {/* Resumen */}
                  <div className="border-b border-border px-5 py-4 bg-muted/20">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 text-center">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Filas</p>
                        <p className="mt-1 text-[20px] font-semibold tabular-nums text-foreground">{stockPreview.totalFilas}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Productos</p>
                        <p className="mt-1 text-[20px] font-semibold tabular-nums text-foreground">{stockPreview.totalProductos}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Con serie</p>
                        <p className="mt-1 text-[20px] font-semibold tabular-nums text-primary">{stockPreview.totalEquiposConSerie}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">A granel</p>
                        <p className="mt-1 text-[20px] font-semibold tabular-nums text-emerald-600">{stockPreview.totalItemsGranel}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Unidades</p>
                        <p className="mt-1 text-[20px] font-semibold tabular-nums text-foreground">{stockPreview.totalUnidades}</p>
                      </div>
                    </div>
                    {stockPreview.seriesDuplicadas?.length > 0 && (
                      <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[12px] text-amber-700 dark:text-amber-400 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" {...ICON_PROPS} />
                        <span>
                          <strong>{stockPreview.seriesDuplicadas.length} serie(s) duplicada(s)</strong> en el Excel.
                          Esas series se ignorarán (no se sobrescriben equipos ya registrados).
                        </span>
                      </div>
                    )}
                    {error && (
                      <div className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-[12px] text-rose-700 dark:text-rose-400 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" {...ICON_PROPS} />
                        <span>{error}</span>
                      </div>
                    )}
                  </div>

                  {/* Resultado */}
                  {stockResult && (
                    <div className="border-b border-border px-5 py-4 bg-emerald-500/5">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" {...ICON_PROPS} />
                        <p className="text-[14px] font-semibold text-foreground">Stock importado al inventario</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[12px]">
                        <div>
                          <span className="text-muted-foreground">Items procesados: </span>
                          <strong className="text-foreground tabular-nums">{stockResult.ok}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Equipos con serie: </span>
                          <strong className="text-primary tabular-nums">{stockResult.equiposRegistrados}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Productos nuevos: </span>
                          <strong className="text-foreground tabular-nums">{stockResult.productosCreados}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Series duplicadas (ignoradas): </span>
                          <strong className="text-amber-600 tabular-nums">{stockResult.equiposDuplicados}</strong>
                        </div>
                      </div>
                      {stockResult.fails.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-[12px] text-rose-600">
                            {stockResult.fails.length} error(es) no bloqueantes
                          </summary>
                          <ul className="mt-1 space-y-0.5 text-[11px] text-rose-600">
                            {stockResult.fails.map((f: string, i: number) => <li key={i}>• {f}</li>)}
                          </ul>
                        </details>
                      )}
                    </div>
                  )}

                  {/* Resumen por producto (agrupado) */}
                  <div className="px-5 py-4">
                    <h3 className="text-[13px] font-semibold text-foreground mb-2">
                      Resumen por producto ({stockPreview.productosResumen.length} productos)
                    </h3>
                    <div className="overflow-hidden rounded-md border border-border max-h-[300px] overflow-y-auto scroll-thin">
                      <table className="w-full text-[12px]">
                        <thead className="sticky top-0 bg-card">
                          <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                            <th className="px-3 py-2 font-medium">SKU</th>
                            <th className="px-3 py-2 font-medium">Producto</th>
                            <th className="px-3 py-2 font-medium">UdM</th>
                            <th className="px-3 py-2 text-right font-medium">Con serie</th>
                            <th className="px-3 py-2 text-right font-medium">A granel</th>
                            <th className="px-3 py-2 text-right font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {stockPreview.productosResumen.map((p: any, i: number) => (
                            <tr key={i} className="hover:bg-muted/30">
                              <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{p.sku}</td>
                              <td className="px-3 py-2 text-foreground">{p.producto}</td>
                              <td className="px-3 py-2 text-[11px] text-muted-foreground">{p.udm}</td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {p.conSerie > 0 ? <span className="text-primary font-semibold">{p.conSerie}</span> : <span className="text-muted-foreground">—</span>}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {p.cantidadGranel > 0 ? <span className="text-emerald-600 font-semibold">{p.cantidadGranel}</span> : <span className="text-muted-foreground">—</span>}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums font-bold text-foreground">{p.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="border-t border-border px-5 py-3.5 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                onClick={cerrarStockPreview}
                className="h-9 rounded-lg border-border bg-background text-[13px] hover:bg-muted"
              >
                {stockResult ? "Cerrar" : "Cancelar"}
              </Button>
              {!stockResult ? (
                <Button
                  onClick={confirmarStockMasivo}
                  disabled={confirming || !stockPreview?.itemsOK}
                  className="h-9 rounded-lg bg-foreground px-4 text-[13px] font-medium text-background shadow-none hover:bg-foreground/90 disabled:opacity-50"
                >
                  {confirming
                    ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" {...ICON_PROPS} />
                    : <CheckCircle2 className="mr-1.5 h-4 w-4" {...ICON_PROPS} />}
                  {confirming
                    ? "Procesando…"
                    : `Importar stock al inventario (${stockPreview?.itemsOK || 0} items)`}
                </Button>
              ) : (
                <Button
                  onClick={cerrarStockPreview}
                  className="h-9 rounded-lg bg-foreground px-4 text-[13px] font-medium text-background shadow-none hover:bg-foreground/90"
                >
                  Listo
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {ConfirmDialog}
      </div>
    </AppShell>
  );
}
