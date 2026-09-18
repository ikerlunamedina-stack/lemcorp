"use client";

import { useRef, useState, useMemo } from "react";
import { AppShell } from "@/components/lem/app-shell";
import { useStore } from "@/lib/store";
import {
  ArrowLeftRight, Upload, FileSpreadsheet, Loader2, AlertCircle,
  CheckCircle2, Package, Cpu, Trash2, ChevronDown, ChevronRight,
  MapPin, User, Calendar, Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/lem/use-confirm";
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle,
} from "@/components/ui/dialog";
import { fmtNum } from "@/lib/num";
import { cn } from "@/lib/utils";

const ICON_PROPS = { strokeWidth: 1.5 } as const;
const PAGE_SIZE = 50;

interface ItemOp {
  sku: string;
  producto: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  requiereSerie: boolean;
  series: string[];
  seriesFaltantes: number;
  seriesSobrantes: number;
  estado: "ok" | "falta_serie" | "sobran_series" | "sin_cantidad" | "sin_sku";
  observacion?: string;
}

interface OperacionAgrupada {
  nOperacion: string;
  flujo: "IN" | "OUT" | "INT";
  tipoOperacion: string;
  proyectoMacro?: string;
  obra?: string;
  codigoPep?: string;
  almacenOrigen: string;
  ubicacionOrigen: string;
  almacenDestino: string;
  ubicacionDestino: string;
  razonSocialDestino: string;
  rucDniDestino: string;
  guiaRemision: string;
  responsable: string;
  tecnico: string;
  fechaTraslado: number | null;
  estadoOp: string;
  observaciones: string;
  items: ItemOp[];
  totalUnidades: number;
  totalSeries: number;
  totalPrecio: number;
  itemsOK: number;
  itemsConError: number;
  seriesFaltantesTotal: number;
}

function fmtFecha(ts: number | null | undefined): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("es-PE", {
      timeZone: "America/Lima",
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return new Date(ts).toLocaleString("es-PE"); }
}

function fmtFechaCorta(ts: number | null | undefined): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleDateString("es-PE", {
      timeZone: "America/Lima",
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch { return new Date(ts).toLocaleDateString("es-PE"); }
}

const ESTADO_ITEM_META: Record<ItemOp["estado"], { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  ok: { label: "OK", tone: "text-emerald-600", icon: CheckCircle2 },
  falta_serie: { label: "Falta serie", tone: "text-rose-600", icon: AlertCircle },
  sobran_series: { label: "Series de más", tone: "text-amber-600", icon: AlertCircle },
  sin_cantidad: { label: "Sin cantidad", tone: "text-rose-600", icon: AlertCircle },
  sin_sku: { label: "Sin SKU", tone: "text-rose-600", icon: AlertCircle },
};

export default function TransferenciasPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const despachos = useStore((s) => s.despachos) ?? [];
  const products = useStore((s) => s.products) ?? [];
  const equipos = useStore((s) => s.equipos) ?? [];
  const findProductBySku = useStore((s) => s.findProductBySku);
  const findEquipmentBySerie = useStore((s) => s.findEquipmentBySerie);
  const registrarTransferencia = useStore((s) => s.registrarTransferencia);
  const deleteTransferencia = useStore((s) => s.deleteTransferencia);

  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [previewOps, setPreviewOps] = useState<OperacionAgrupada[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [expandedOp, setExpandedOp] = useState<string | null>(null);
  const [result, setResult] = useState<{
    ok: number; fail: number; fails: string[]; totalUnidades: number; totalSeries: number;
    despachosCreados: number; productosActualizados: number; equiposMarcados: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [expandedHist, setExpandedHist] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const transferencias = useMemo(
    () => despachos.filter((d) => d.tipo === "transferencia"),
    [despachos]
  );

  const opsAgrupadas = useMemo(() => {
    const map = new Map<string, {
      nOperacion: string;
      items: typeof despachos;
      tecnico?: string;
      destino?: string;
      fecha: number;
      guiaRemision?: string;
      tipoOperacion?: string;
      razonSocialDestino?: string;
      almacenOrigen?: string;
      almacenDestino?: string;
    }>();
    for (const t of transferencias) {
      const key = t.nOperacion || "(sin op)";
      if (!map.has(key)) {
        map.set(key, {
          nOperacion: key,
          items: [],
          tecnico: t.tecnico,
          destino: t.destino,
          fecha: t.fecha,
          guiaRemision: t.guiaRemision,
          tipoOperacion: t.tipoOperacion,
          razonSocialDestino: t.razonSocialDestino,
          almacenOrigen: t.almacenOrigen,
          almacenDestino: t.almacenDestino,
        });
      }
      map.get(key)!.items.push(t);
    }
    return Array.from(map.values()).sort((a, b) => b.fecha - a.fecha);
  }, [transferencias]);

  const totalUnidades = useMemo(
    () => transferencias.reduce((s, t) => s + t.cantidad, 0),
    [transferencias]
  );
  const totalSeries = useMemo(
    () => transferencias.reduce((s, t) => s + (t.series?.length || 0), 0),
    [transferencias]
  );
  const totalDestinatarios = useMemo(
    () => new Set(transferencias.map((t) => t.tecnico || t.razonSocialDestino).filter(Boolean)).size,
    [transferencias]
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError(null);
    setResult(null);
    setPreviewOps([]);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import-operaciones", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error al procesar Excel");
      setPreviewOps(data.operaciones || []);
      setPreviewOpen(true);
      setExpandedOp(null);
    } catch (err: any) {
      setError(err?.message || "Error al importar el Excel");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const confirmarImportacion = async () => {
    setConfirming(true);
    setError(null);
    try {
      // ─── Bloqueo: si hay series del Excel que no están en el inventario de equipos ───
      // Los routers/modems/etc NO se pueden despachar si sus series no están registradas.
      // El usuario debe recibir los equipos primero (PDF de guía en /recepciones).
      if (seriesFaltantesInventario.length > 0) {
        setError(
          `${seriesFaltantesInventario.length} serie(s) del Excel NO están registradas en el inventario de equipos. ` +
          `Recibe los equipos primero subiendo un PDF de guía SUNAT en /recepciones.`
        );
        setConfirming(false);
        return;
      }
      if (seriesNoDisponibles.length > 0) {
        setError(
          `${seriesNoDisponibles.length} serie(s) existen pero no están disponibles (averiadas o en retiro). ` +
          `No se pueden despachar equipos que no estén disponibles.`
        );
        setConfirming(false);
        return;
      }

      let ok = 0, fail = 0, totalUnd = 0, totalSer = 0;
      let despachosCreados = 0, productosActualizados = 0, equiposMarcados = 0;
      const allFails: string[] = [];

      for (const op of previewOps) {
        const itemsValidos = op.items.filter((it) => it.estado === "ok" || it.estado === "sobran_series");
        if (itemsValidos.length === 0) {
          allFails.push(`Operación ${op.nOperacion}: no hay items válidos`);
          continue;
        }
        const r = registrarTransferencia({
          nOperacion: op.nOperacion,
          flujo: op.flujo,
          tipoOperacion: op.tipoOperacion,
          almacenOrigen: op.almacenOrigen,
          ubicacionOrigen: op.ubicacionOrigen,
          almacenDestino: op.almacenDestino,
          ubicacionDestino: op.ubicacionDestino,
          razonSocialDestino: op.razonSocialDestino,
          rucDniDestino: op.rucDniDestino,
          guiaRemision: op.guiaRemision,
          responsable: op.responsable,
          tecnico: op.tecnico,
          fechaTraslado: op.fechaTraslado,
          observaciones: op.observaciones,
          items: itemsValidos.map((it) => ({
            sku: it.sku,
            producto: it.producto,
            unidad: it.unidad,
            cantidad: it.cantidad,
            precioUnitario: it.precioUnitario,
            series: it.requiereSerie ? it.series.slice(0, it.cantidad) : it.series,
            requiereSerie: it.requiereSerie,
          })),
        });
        ok += r.ok;
        fail += r.fail;
        totalUnd += r.totalUnidades;
        totalSer += r.totalSeries;
        despachosCreados += r.despachosCreados;
        productosActualizados += r.productosActualizados;
        equiposMarcados += r.equiposMarcados;
        if (r.fails.length) allFails.push(...r.fails.map((f) => `[${op.nOperacion}] ${f}`));
      }

      setResult({
        ok, fail, fails: allFails, totalUnidades: totalUnd, totalSeries: totalSer,
        despachosCreados, productosActualizados, equiposMarcados,
      });
    } catch (err: any) {
      setError(err?.message || "Error al confirmar");
    } finally {
      setConfirming(false);
    }
  };

  const cerrarPreview = () => {
    setPreviewOpen(false);
    setPreviewOps([]);
    setResult(null);
    setError(null);
    setExpandedOp(null);
  };

  const itemsPreviewOK = previewOps.reduce((s, o) => s + o.itemsOK, 0);
  const itemsPreviewError = previewOps.reduce((s, o) => s + o.itemsConError, 0);
  const faltanSeriesTotal = previewOps.reduce((s, o) => s + o.seriesFaltantesTotal, 0);

  // ─── Series del Excel que NO están registradas en el inventario de equipos ───
  // Para despachar routers/modems/decodificadores, las series TIENEN que existir
  // en /equipos. Si no existen → no se pueden despachar.
  const seriesFaltantesInventario = useMemo(() => {
    const faltantes: Array<{ serie: string; producto: string; sku: string }> = [];
    const vistas = new Set<string>();
    for (const op of previewOps) {
      for (const it of op.items) {
        if (!it.requiereSerie) continue;
        for (const serie of it.series) {
          const serieNorm = serie.trim().toLowerCase();
          if (vistas.has(serieNorm)) continue;
          vistas.add(serieNorm);
          if (!findEquipmentBySerie(serie)) {
            faltantes.push({ serie, producto: it.producto, sku: it.sku });
          }
        }
      }
    }
    return faltantes;
  }, [previewOps, findEquipmentBySerie]);

  // ─── Series del Excel que existen pero NO están "disponibles" (averiadas/en_retiro) ───
  const seriesNoDisponibles = useMemo(() => {
    const noDisp: Array<{ serie: string; estado: string; producto: string }> = [];
    const vistas = new Set<string>();
    for (const op of previewOps) {
      for (const it of op.items) {
        if (!it.requiereSerie) continue;
        for (const serie of it.series) {
          const serieNorm = serie.trim().toLowerCase();
          if (vistas.has(serieNorm)) continue;
          vistas.add(serieNorm);
          const eq = findEquipmentBySerie(serie);
          if (eq && eq.estado !== "disponible") {
            noDisp.push({ serie, estado: eq.estado, producto: it.producto });
          }
        }
      }
    }
    return noDisp;
  }, [previewOps, findEquipmentBySerie]);

  // ─── Paginación estilo SpaceCom ───
  const totalPages = Math.max(1, Math.ceil(opsAgrupadas.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const currentOps = useMemo(
    () => opsAgrupadas.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [opsAgrupadas, safePage]
  );

  return (
    <AppShell>
      <div className="px-4 py-6 sm:px-6 lg:px-8 anim-fade-in">
        {/* Header */}
        <div className="anim-slide-up flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Operaciones</p>
            <h1 className="text-[28px] font-semibold tracking-tight text-foreground flex items-center gap-2">
              <ArrowLeftRight className="h-7 w-7" strokeWidth={1.5} /> Transferencias
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Sube el Excel de operaciones → descuenta del inventario y marca equipos con serie
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="h-9 rounded-lg bg-foreground px-3.5 text-[13px] font-medium text-background shadow-none hover:bg-foreground/90"
            >
              {importing
                ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" {...ICON_PROPS} />
                : <Upload className="mr-1.5 h-4 w-4" {...ICON_PROPS} />}
              {importing ? "Procesando…" : "Subir Excel de operaciones"}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="anim-slide-up grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
          <div className="bg-background px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Operaciones</p>
            <p className="mt-1 text-[24px] font-semibold tabular-nums text-foreground">{opsAgrupadas.length}</p>
          </div>
          <div className="bg-background px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Unidades</p>
            <p className="mt-1 text-[24px] font-semibold tabular-nums text-foreground">{fmtNum(totalUnidades)}</p>
          </div>
          <div className="bg-background px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Series</p>
            <p className="mt-1 text-[24px] font-semibold tabular-nums text-primary">{totalSeries}</p>
          </div>
          <div className="bg-background px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Destinatarios</p>
            <p className="mt-1 text-[24px] font-semibold tabular-nums text-foreground">{totalDestinatarios}</p>
          </div>
        </div>

        {/* Estado inventario */}
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
            <ArrowLeftRight className="h-3.5 w-3.5" {...ICON_PROPS} />
            <span>Transferencias: <strong className="text-foreground tabular-nums">{transferencias.length}</strong> items</span>
          </div>
        </div>

        {/* Historial — Tabla estilo SpaceCom */}
        <div className="anim-slide-up mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-foreground">Historial por operación</h2>
            {opsAgrupadas.length > 0 && (
              <span className="text-[11px] text-muted-foreground">{opsAgrupadas.length} operación(es)</span>
            )}
          </div>

          {opsAgrupadas.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-background px-4 py-16 text-center">
              <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground/40" {...ICON_PROPS} />
              <p className="mt-2 text-[13px] text-muted-foreground">
                No hay transferencias registradas todavía.
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Pulsa <strong className="text-foreground">&ldquo;Subir Excel de operaciones&rdquo;</strong> para cargar tu archivo.
              </p>
            </div>
          ) : (
            <>
              <div className="border border-border rounded-xl overflow-hidden bg-background">
                <div className="max-h-[65vh] overflow-auto scroll-thin">
                  <table className="w-full text-[12px] border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-border bg-muted/30">
                        <th className="w-8 px-2 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground"></th>
                        <th className="px-2.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">OC Referencia</th>
                        <th className="px-2.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Tipo Movimiento</th>
                        <th className="px-2.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Proyecto/Obra</th>
                        <th className="px-2.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Guía Remisión</th>
                        <th className="px-2.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Almacén Origen</th>
                        <th className="px-2.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Ubic. Origen</th>
                        <th className="px-2.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Almacén Destino</th>
                        <th className="px-2.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Fecha Traslado</th>
                        <th className="px-2.5 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Estado</th>
                        <th className="px-2.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Responsable</th>
                        <th className="w-10 px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground"></th>
                      </tr>
                    </thead>
                    {currentOps.map((op) => {
                      const isExp = expandedHist === op.nOperacion;
                      const undTotal = op.items.reduce((s, i) => s + i.cantidad, 0);
                      const serTotal = op.items.reduce((s, i) => s + (i.series?.length || 0), 0);
                      const primer = op.items[0];
                      return (
                        <tbody key={op.nOperacion}>
                          <tr
                            onClick={() => setExpandedHist(isExp ? null : op.nOperacion)}
                            className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                          >
                            <td className="px-2 py-2.5 text-center align-middle">
                              {isExp
                                ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground inline" {...ICON_PROPS} />
                                : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground inline" {...ICON_PROPS} />}
                            </td>
                            <td className="px-2.5 py-2.5 font-mono text-[11px] text-foreground tabular-nums whitespace-nowrap">{op.nOperacion}</td>
                            <td className="px-2.5 py-2.5 text-foreground whitespace-nowrap">{op.tipoOperacion || primer?.tipoOperacion || "—"}</td>
                            <td className="px-2.5 py-2.5 text-foreground whitespace-nowrap">{op.destino || primer?.destino || "—"}</td>
                            <td className="px-2.5 py-2.5 font-mono text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">{op.guiaRemision || primer?.guiaRemision || "—"}</td>
                            <td className="px-2.5 py-2.5 text-foreground whitespace-nowrap">{op.almacenOrigen || primer?.almacenOrigen || "—"}</td>
                            <td className="px-2.5 py-2.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">{primer?.ubicacionOrigen || "—"}</td>
                            <td className="px-2.5 py-2.5 text-foreground whitespace-nowrap">{op.almacenDestino || primer?.almacenDestino || "—"}</td>
                            <td className="px-2.5 py-2.5 text-muted-foreground tabular-nums whitespace-nowrap">{fmtFechaCorta(op.fecha)}</td>
                            <td className="px-2.5 py-2.5 text-center align-middle">
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10" title="Listo">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" {...ICON_PROPS} />
                              </span>
                            </td>
                            <td className="px-2.5 py-2.5 text-foreground whitespace-nowrap">{op.tecnico || primer?.responsable || "—"}</td>
                            <td className="px-2 py-2.5 text-center align-middle">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const ok = await confirm({
                                    title: "Eliminar operación de transferencia",
                                    description: `¿Eliminar operación ${op.nOperacion}? Se restaurará el stock y se reactivarán las series.`,
                                    critical: true,
                                    details: `Items: ${op.items.length}\nUnidades: ${undTotal}${serTotal > 0 ? `\nSeries: ${serTotal}` : ""}\nTécnico: ${op.tecnico || "—"}\n\nEsta acción no se puede deshacer. Quedará registrada en /auditoría.`,
                                  });
                                  if (ok) {
                                    deleteTransferencia(op.nOperacion);
                                    setExpandedHist(null);
                                  }
                                }}
                                className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                title="Eliminar operación y restaurar stock"
                              >
                                <Trash2 className="h-3.5 w-3.5" {...ICON_PROPS} />
                              </button>
                            </td>
                          </tr>
                          {isExp && (
                            <tr className="bg-muted/20 border-b border-border">
                              <td colSpan={12} className="px-3 py-3">
                                <div className="mb-2 flex items-center justify-between px-1">
                                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                                    Items de la operación · {op.items.length}
                                  </p>
                                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                                    <span>Unidades: <strong className="text-foreground tabular-nums">{fmtNum(undTotal)}</strong></span>
                                    {serTotal > 0 && (
                                      <span>Series: <strong className="text-primary tabular-nums">{serTotal}</strong></span>
                                    )}
                                  </div>
                                </div>
                                <div className="overflow-hidden rounded-md border border-border bg-background">
                                  <div className="max-h-[280px] overflow-y-auto scroll-thin">
                                    <table className="w-full text-[12px]">
                                      <thead>
                                        <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                                          <th className="px-3 py-2 font-medium">SKU</th>
                                          <th className="px-3 py-2 font-medium">Producto</th>
                                          <th className="px-3 py-2 text-right font-medium">Cant.</th>
                                          <th className="px-3 py-2 font-medium">Series</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border">
                                        {op.items.map((it) => (
                                          <tr key={it.id} className="hover:bg-muted/30">
                                            <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">{it.sku || "—"}</td>
                                            <td className="px-3 py-2.5 text-foreground">{it.producto || "—"}</td>
                                            <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{it.cantidad}</td>
                                            <td className="px-3 py-2.5">
                                              {it.series && it.series.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                  {it.series.map((s: string, i: number) => (
                                                    <span key={i} className="inline-flex items-center gap-1 rounded border border-border bg-muted/30 px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                                                      <Hash className="h-2.5 w-2.5 text-muted-foreground" />
                                                      {s}
                                                    </span>
                                                  ))}
                                                </div>
                                              ) : (
                                                <span className="text-[10px] text-muted-foreground">— sin serie —</span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      );
                    })}
                  </table>
                </div>
              </div>

              {/* Paginación estilo SpaceCom */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="tabular-nums">
                  {currentOps.length} de {opsAgrupadas.length} registro(s)
                </span>
                <div className="flex items-center gap-1">
                  <span className="mr-2">
                    Pag. <strong className="text-foreground tabular-nums">{safePage}</strong> de{" "}
                    <strong className="text-foreground tabular-nums">{totalPages}</strong>
                  </span>
                  <button
                    onClick={() => setPage(1)}
                    disabled={safePage === 1}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Primera"
                  >
                    «
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Anterior"
                  >
                    &lt;
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Siguiente"
                  >
                    &gt;
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={safePage === totalPages}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Última"
                  >
                    »
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Dialog de preview */}
        <Dialog open={previewOpen} onOpenChange={(o) => { if (!o) cerrarPreview(); }}>
          <DialogContent className="max-w-5xl p-0 gap-0 rounded-lg">
            <DialogHeader className="border-b border-border px-5 py-3.5">
              <DialogTitle className="text-[15px] font-semibold flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" {...ICON_PROPS} />
                Vista previa — {previewOps.length} operación(es) detectada(s)
              </DialogTitle>
            </DialogHeader>

            <div className="p-0 max-h-[70vh] overflow-y-auto scroll-thin">
              {/* Resumen */}
              <div className="border-b border-border px-5 py-4 bg-muted/20">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 text-center">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Items OK</p>
                    <p className="mt-1 text-[20px] font-semibold tabular-nums text-emerald-600">{itemsPreviewOK}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Con error</p>
                    <p className="mt-1 text-[20px] font-semibold tabular-nums text-rose-600">{itemsPreviewError}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Series faltan</p>
                    <p className="mt-1 text-[20px] font-semibold tabular-nums text-amber-600">{faltanSeriesTotal}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Unidades</p>
                    <p className="mt-1 text-[20px] font-semibold tabular-nums text-foreground">
                      {previewOps.reduce((s, o) => s + o.totalUnidades, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Series</p>
                    <p className="mt-1 text-[20px] font-semibold tabular-nums text-primary">
                      {previewOps.reduce((s, o) => s + o.totalSeries, 0)}
                    </p>
                  </div>
                </div>
                {faltanSeriesTotal > 0 && (
                  <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[12px] text-amber-700 dark:text-amber-400 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" {...ICON_PROPS} />
                    <span>
                      <strong>{faltanSeriesTotal} serie(s) faltan</strong> en items que requieren serie obligatoria (routers, modems, decodificadores, etc.).
                      Esos items NO se procesarán. Los demás sí.
                    </span>
                  </div>
                )}

                {/* Series del Excel NO registradas en el inventario de equipos */}
                {seriesFaltantesInventario.length > 0 && (
                  <div className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/5 px-3 py-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" {...ICON_PROPS} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-rose-700 dark:text-rose-400">
                          {seriesFaltantesInventario.length} serie(s) del Excel NO están registradas en el inventario de equipos
                        </p>
                        <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">
                          Para despachar estos routers/modems/decodificadores, primero debes recibirlos en el almacén
                          subiendo su PDF de guía de remisión SUNAT en /recepciones. Sin esa recepción,
                          no hay trazabilidad de dónde salieron.
                        </p>
                        <div className="mt-2 max-h-[120px] overflow-y-auto scroll-thin">
                          <div className="flex flex-wrap gap-1">
                            {seriesFaltantesInventario.slice(0, 30).map((f, i) => (
                              <span key={i} className="inline-flex items-center rounded border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 font-mono text-[10px] text-rose-700 dark:text-rose-400" title={`${f.producto} (SKU ${f.sku})`}>
                                {f.serie}
                              </span>
                            ))}
                            {seriesFaltantesInventario.length > 30 && (
                              <span className="text-[10px] text-rose-700 dark:text-rose-400 self-center">
                                +{seriesFaltantesInventario.length - 30} más
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Series que existen pero NO están disponibles */}
                {seriesNoDisponibles.length > 0 && (
                  <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" {...ICON_PROPS} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-amber-700 dark:text-amber-400">
                          {seriesNoDisponibles.length} serie(s) NO disponibles
                        </p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                          Existen en el inventario pero su estado no es "disponible" (averiadas o en retiro).
                          No se pueden despachar equipos que no estén disponibles.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {seriesNoDisponibles.slice(0, 20).map((s, i) => (
                            <span key={i} className="inline-flex items-center rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-700 dark:text-amber-400" title={s.producto}>
                              {s.serie} · {s.estado}
                            </span>
                          ))}
                          {seriesNoDisponibles.length > 20 && (
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 self-center">
                              +{seriesNoDisponibles.length - 20} más
                            </span>
                          )}
                        </div>
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

              {/* Resultado de confirmación */}
              {result && (
                <div className="border-b border-border px-5 py-4 bg-emerald-500/5">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" {...ICON_PROPS} />
                    <p className="text-[14px] font-semibold text-foreground">Transferencia registrada</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[12px]">
                    <div>
                      <span className="text-muted-foreground">Items procesados: </span>
                      <strong className="text-foreground tabular-nums">{result.ok}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Unidades: </span>
                      <strong className="text-foreground tabular-nums">{result.totalUnidades}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Series marcadas: </span>
                      <strong className="text-primary tabular-nums">{result.equiposMarcados}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Productos actualizados: </span>
                      <strong className="text-foreground tabular-nums">{result.productosActualizados}</strong>
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

              {/* Lista de operaciones detectadas */}
              <div className="divide-y divide-border">
                {previewOps.map((op) => {
                  const isExp = expandedOp === op.nOperacion;
                  return (
                    <div key={op.nOperacion}>
                      <button
                        onClick={() => setExpandedOp(isExp ? null : op.nOperacion)}
                        className="flex w-full items-center gap-3 px-5 py-3 hover:bg-muted/40 text-left"
                      >
                        {isExp
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" {...ICON_PROPS} />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" {...ICON_PROPS} />}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-[14px] font-medium text-foreground tabular-nums">{op.nOperacion}</span>
                            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{op.flujo}</span>
                            {op.tipoOperacion && (
                              <span className="text-[11px] text-muted-foreground">{op.tipoOperacion}</span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-baseline gap-2 flex-wrap text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" {...ICON_PROPS} />
                              {op.tecnico || op.razonSocialDestino || "—"}
                            </span>
                            {op.almacenOrigen && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" {...ICON_PROPS} />
                                {op.almacenOrigen} → {op.almacenDestino}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-[11px]">
                          {op.itemsOK > 0 && (
                            <span className="text-emerald-600">{op.itemsOK}</span>
                          )}
                          {op.itemsConError > 0 && (
                            <span className="text-rose-600">✗ {op.itemsConError}</span>
                          )}
                          <span className="text-muted-foreground tabular-nums">{op.totalUnidades} und</span>
                          {op.totalSeries > 0 && (
                            <span className="text-primary tabular-nums">{op.totalSeries} ser</span>
                          )}
                        </div>
                      </button>

                      {isExp && (
                        <div className="bg-muted/20 px-5 pb-4">
                          {/* Metadatos de la operación */}
                          <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1.5 py-3 text-[11px] sm:grid-cols-3">
                            {op.obra && (
                              <div>
                                <span className="text-muted-foreground">Obra: </span>
                                <span className="text-foreground">{op.obra}</span>
                              </div>
                            )}
                            {op.guiaRemision && (
                              <div>
                                <span className="text-muted-foreground">Guía: </span>
                                <span className="text-foreground font-mono">{op.guiaRemision}</span>
                              </div>
                            )}
                            {op.rucDniDestino && (
                              <div>
                                <span className="text-muted-foreground">RUC/DNI: </span>
                                <span className="text-foreground font-mono">{op.rucDniDestino}</span>
                              </div>
                            )}
                            {op.responsable && (
                              <div>
                                <span className="text-muted-foreground">Responsable: </span>
                                <span className="text-foreground">{op.responsable}</span>
                              </div>
                            )}
                            {op.fechaTraslado && (
                              <div>
                                <span className="text-muted-foreground">Fecha traslado: </span>
                                <span className="text-foreground">{fmtFecha(op.fechaTraslado)}</span>
                              </div>
                            )}
                            {op.observaciones && (
                              <div className="col-span-2 sm:col-span-3">
                                <span className="text-muted-foreground">Obs: </span>
                                <span className="text-foreground">{op.observaciones}</span>
                              </div>
                            )}
                          </div>

                          {/* Items */}
                          <div className="overflow-hidden rounded-md border border-border bg-background">
                            <table className="w-full text-[12px]">
                              <thead>
                                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                                  <th className="px-3 py-2 font-medium">Estado</th>
                                  <th className="px-3 py-2 font-medium">SKU</th>
                                  <th className="px-3 py-2 font-medium">Producto</th>
                                  <th className="px-3 py-2 text-right font-medium">Cant.</th>
                                  <th className="px-3 py-2 font-medium">Series</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {op.items.map((it, i) => {
                                  const meta = ESTADO_ITEM_META[it.estado];
                                  const Icon = meta.icon;
                                  return (
                                    <tr key={i} className="align-top">
                                      <td className="px-3 py-2.5">
                                        <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", meta.tone)}>
                                          <Icon className="h-3.5 w-3.5" {...ICON_PROPS} />
                                          {meta.label}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">{it.sku || "—"}</td>
                                      <td className="px-3 py-2.5 text-foreground">
                                        {it.producto}
                                        {it.requiereSerie && (
                                          <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-primary">
                                            <Cpu className="h-2.5 w-2.5" {...ICON_PROPS} />
                                            serie
                                          </span>
                                        )}
                                        {it.observacion && (
                                          <p className="mt-0.5 text-[10px] text-amber-600">{it.observacion}</p>
                                        )}
                                      </td>
                                      <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{it.cantidad}</td>
                                      <td className="px-3 py-2.5">
                                        {it.series.length > 0 ? (
                                          <div className="flex flex-wrap gap-1">
                                            {it.series.map((s, j) => (
                                              <span key={j} className="inline-flex items-center gap-0.5 rounded border border-border bg-muted/30 px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                                                {s}
                                              </span>
                                            ))}
                                            {it.seriesFaltantes > 0 && (
                                              <span className="inline-flex items-center rounded border border-rose-500/30 bg-rose-500/5 px-1.5 py-0.5 font-mono text-[10px] text-rose-600">
                                                +{it.seriesFaltantes} faltante(s)
                                              </span>
                                            )}
                                          </div>
                                        ) : it.requiereSerie ? (
                                          <span className="text-[11px] text-rose-600">Sin series</span>
                                        ) : (
                                          <span className="text-[10px] text-muted-foreground">— no requiere —</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
                  onClick={confirmarImportacion}
                  disabled={confirming || itemsPreviewOK === 0 || seriesFaltantesInventario.length > 0 || seriesNoDisponibles.length > 0}
                  className="h-9 rounded-lg bg-foreground px-4 text-[13px] font-medium text-background shadow-none hover:bg-foreground/90 disabled:opacity-50"
                  title={
                    seriesFaltantesInventario.length > 0
                      ? `${seriesFaltantesInventario.length} series no están en el inventario`
                      : seriesNoDisponibles.length > 0
                        ? `${seriesNoDisponibles.length} series no están disponibles`
                        : undefined
                  }
                >
                  {confirming
                    ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" {...ICON_PROPS} />
                    : <CheckCircle2 className="mr-1.5 h-4 w-4" {...ICON_PROPS} />}
                  {confirming
                    ? "Procesando…"
                    : seriesFaltantesInventario.length > 0
                      ? `Recibe ${seriesFaltantesInventario.length} serie(s) faltantes primero`
                      : seriesNoDisponibles.length > 0
                        ? `${seriesNoDisponibles.length} serie(s) no disponibles`
                        : `Confirmar y descontar inventario (${itemsPreviewOK} items)`}
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
        {ConfirmDialog}
      </div>
    </AppShell>
  );
}
