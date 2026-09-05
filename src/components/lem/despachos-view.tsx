"use client";

import { useMemo, useState, useRef } from "react";
import {
  TrendingDown, Search, Trash2, Check, AlertTriangle, Package, Users,
  Send, MapPin, ClipboardPaste, FileSpreadsheet, Save, Sparkles,
  ChevronDown, ChevronRight, User, Loader2, Calendar, FileUp,
  TrendingUp, Hash, Clock,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { fmtNum } from "@/lib/num";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const ICON_PROPS = { strokeWidth: 1.5 } as const;

interface DespachoImportado {
  sku: string;
  cantidad: number;
  tecnico?: string;
  destino?: string;
  producto?: string;
  fecha?: string;
}

function isSameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate();
}

function fechaCorta(ts: number): string {
  return new Date(ts).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

function diaSemana(ts: number): string {
  return new Date(ts).toLocaleDateString("es-PE", { weekday: "long" });
}

export function DespachosView() {
  const products = useStore((s) => s.products);
  const despachos = useStore((s) => s.despachos);
  const findProductBySku = useStore((s) => s.findProductBySku);
  const registrarDespachosBulk = useStore((s) => s.registrarDespachosBulk);
  const deleteDespacho = useStore((s) => s.deleteDespacho);
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [importingExcel, setImportingExcel] = useState(false);
  const [filterToday, setFilterToday] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [expandedTecnico, setExpandedTecnico] = useState<string | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [resultadoIA, setResultadoIA] = useState<{ ok: number; fail: number; fails: string[]; totalUnidades: number; porTecnico: Record<string, number>; porDia: Record<string, number> } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parsear texto pegado en tiempo real
  const lineasParseadas = useMemo((): DespachoImportado[] => {
    if (!bulkText.trim()) return [];
    return bulkText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        let parts: string[];
        if (line.includes("\t")) parts = line.split("\t").map((p) => p.trim());
        else if (line.includes("|")) parts = line.split("|").map((p) => p.trim());
        else if (line.includes(",") && line.includes("*")) parts = line.split(",").map((p) => p.trim());
        else parts = [line];

        let skuPartIdx = parts.findIndex((p) => p.includes("*"));
        if (skuPartIdx === -1) return { sku: "", cantidad: 0, tecnico: undefined, destino: undefined };
        const [sku, cantStr] = parts[skuPartIdx].split("*").map((s) => s.trim());
        const cantidad = parseInt(cantStr, 10);
        const before = parts.slice(0, skuPartIdx);
        return {
          sku: sku || "",
          cantidad: isNaN(cantidad) ? 0 : cantidad,
          tecnico: before[0] || undefined,
          destino: before[1] || undefined,
        };
      });
  }, [bulkText]);

  // Validar con catálogo
  const validacion = useMemo(() => {
    const validos: DespachoImportado[] = [];
    const invalidos: { d: DespachoImportado; razon: string }[] = [];
    const stockMap = new Map<string, number>();

    for (const d of lineasParseadas) {
      if (!d.sku || d.cantidad <= 0) {
        invalidos.push({ d, razon: "Formato inválido" });
        continue;
      }
      const producto = findProductBySku(d.sku);
      if (!producto) {
        invalidos.push({ d, razon: `SKU "${d.sku}" no encontrado` });
        continue;
      }
      const stockActual = stockMap.get(producto.id) ?? producto.quantity;
      if (stockActual < d.cantidad) {
        invalidos.push({ d, razon: `Stock insuficiente (disp: ${stockActual})` });
        continue;
      }
      stockMap.set(producto.id, stockActual - d.cantidad);
      validos.push({ ...d, producto: producto.name });
    }
    return { validos, invalidos };
  }, [lineasParseadas, findProductBySku]);

  // Filtrar despachos del historial
  const today = Date.now();
  const filteredDespachos = useMemo(() => {
    return despachos.filter((d) => {
      if (filterToday && !isSameDay(d.fecha, today)) return false;
      const q = query.toLowerCase().trim();
      if (!q) return true;
      return d.producto.toLowerCase().includes(q) ||
        d.sku.toLowerCase().includes(q) ||
        (d.tecnico ?? "").toLowerCase().includes(q) ||
        (d.destino ?? "").toLowerCase().includes(q);
    });
  }, [despachos, query, filterToday]);

  // Agrupar historial por día
  const porDia = useMemo(() => {
    const map: Record<string, typeof despachos> = {};
    for (const d of filteredDespachos) {
      const key = new Date(d.fecha).toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(d);
    }
    return Object.entries(map).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [filteredDespachos]);

  // Agrupar cada día por técnico
  const porDiaYTecnico = useMemo(() => {
    const result: Record<string, Array<[string, typeof despachos, number]>> = {};
    for (const [dia, items] of porDia) {
      const tecMap: Record<string, typeof despachos> = {};
      for (const d of items) {
        const key = d.tecnico || "(sin técnico)";
        if (!tecMap[key]) tecMap[key] = [];
        tecMap[key].push(d);
      }
      result[dia] = Object.entries(tecMap)
        .map(([tecnico, desps]) => [tecnico, desps, desps.reduce((s, d) => s + d.cantidad, 0)] as [string, typeof despachos, number])
        .sort((a, b) => b[2] - a[2]);
    }
    return result;
  }, [porDia]);

  // Stats
  const totalDespachado = despachos.reduce((s, d) => s + d.cantidad, 0);
  const despachosHoy = despachos.filter((d) => isSameDay(d.fecha, today));
  const totalDespachadoHoy = despachosHoy.reduce((s, d) => s + d.cantidad, 0);
  const tecnicosUnicos = new Set(despachos.map((d) => d.tecnico).filter(Boolean)).size;
  const diasConDespachos = new Set(despachos.map((d) => new Date(d.fecha).toDateString())).size;

  const openBulk = () => {
    setBulkText("");
    setResultadoIA(null);
    setBulkOpen(true);
  };

  // IA analiza y registra automáticamente
  const analizarYRegistrar = () => {
    setAnalizando(true);
    // Simular análisis IA con delay para feedback visual
    setTimeout(() => {
      const despachosValidos = validacion.validos.map((d) => ({
        sku: d.sku,
        cantidad: d.cantidad,
        tecnico: d.tecnico,
        destino: d.destino,
        fecha: d.fecha ? new Date(d.fecha).getTime() : Date.now(),
      }));
      const result = registrarDespachosBulk(despachosValidos);

      // Calcular agrupaciones para mostrar
      const porTecnico: Record<string, number> = {};
      const porDia: Record<string, number> = {};
      for (const d of despachosValidos) {
        const t = d.tecnico || "(sin técnico)";
        porTecnico[t] = (porTecnico[t] ?? 0) + d.cantidad;
        const dia = new Date(d.fecha || Date.now()).toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
        porDia[dia] = (porDia[dia] ?? 0) + d.cantidad;
      }

      setResultadoIA({
        ...result,
        porTecnico,
        porDia,
      });

      if (result.ok > 0) {
        toast({
          title: `✓ ${result.ok} despachos registrados`,
          description: `Se descontaron ${fmtNum(result.totalUnidades)} unidades del inventario`,
        });
        setTimeout(() => {
          setBulkOpen(false);
          setBulkText("");
          setResultadoIA(null);
        }, 3000);
      }
      setAnalizando(false);
    }, 1500);
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingExcel(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import-excel", { method: "POST", body: formData });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      // Convertir a texto pegado
      const lines = data.despachos.map((d: any) => {
        const parts = [d.tecnico, d.destino, `${d.sku}*${d.cantidad}`].filter(Boolean);
        return parts.join("|");
      });
      setBulkText(lines.join("\n"));
      setResultadoIA(null);
      setBulkOpen(true);
      toast({
        title: `✓ Excel procesado`,
        description: `${data.despachos.length} despachos detectados, ${data.skipped} filas omitidas`,
      });
    } catch (err: any) {
      toast({ title: "Error al importar Excel", description: err.message, variant: "destructive" });
    } finally {
      setImportingExcel(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="anim-fade-in mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="anim-slide-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Operaciones</p>
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground">Despachos</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            <span className="text-foreground">{despachos.length}</span> despachos ·
            <span className="text-foreground"> {fmtNum(totalDespachado)}</span> unidades ·
            <span className="text-foreground"> {diasConDespachos}</span> días ·
            <span className="text-foreground"> {tecnicosUnicos}</span> destinatarios
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importingExcel}
            className="h-9 rounded-md border-border bg-background text-[13px] font-medium text-foreground hover:bg-muted"
          >
            {importingExcel
              ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" {...ICON_PROPS} />
              : <FileUp className="mr-1.5 h-4 w-4" {...ICON_PROPS} />}
            {importingExcel ? "Procesando…" : "Subir Excel"}
          </Button>
          <Button
            onClick={openBulk}
            className="h-9 rounded-md bg-foreground text-[13px] font-medium text-background shadow-none hover:bg-foreground/90"
          >
            <ClipboardPaste className="mr-1.5 h-4 w-4" {...ICON_PROPS} /> Pegar despachos
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="anim-slide-up mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total despachos" value={despachos.length} icon={<Send className="h-4 w-4" {...ICON_PROPS} />} />
        <StatCard label="Unidades enviadas" value={fmtNum(totalDespachado)} icon={<TrendingDown className="h-4 w-4" {...ICON_PROPS} />} />
        <StatCard label="Hoy" value={despachosHoy.length} sub={`${fmtNum(totalDespachadoHoy)} und`} icon={<Calendar className="h-4 w-4" {...ICON_PROPS} />} highlight />
        <StatCard label="Días con despachos" value={diasConDespachos} icon={<Hash className="h-4 w-4" {...ICON_PROPS} />} />
        <StatCard label="Destinatarios" value={tecnicosUnicos} icon={<Users className="h-4 w-4" {...ICON_PROPS} />} />
      </div>

      {/* Toolbar historial */}
      <div className="anim-slide-up mt-6 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" {...ICON_PROPS} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por producto, destinatario, destino…"
            className="h-9 rounded-md border-border bg-background pl-9 text-[13px]"
          />
        </div>
        <button
          onClick={() => setFilterToday(!filterToday)}
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-3 py-1 text-[12px] font-medium transition-colors",
            filterToday
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Calendar className="h-3.5 w-3.5" {...ICON_PROPS} />
          {filterToday ? "Solo hoy" : "Ver todos"}
        </button>
        <span className="text-[11px] text-muted-foreground">
          {filteredDespachos.length} despacho(s) · {porDia.length} día(s)
        </span>
      </div>

      {/* Historial por día (timeline) */}
      {filteredDespachos.length === 0 ? (
        <div className="anim-fade-in mt-6 rounded-lg border border-dashed border-border bg-background px-4 py-16 text-center">
          <ClipboardPaste className="mx-auto h-10 w-10 text-muted-foreground/40" {...ICON_PROPS} />
          <p className="mt-3 text-[13px] font-medium text-foreground">
            {despachos.length === 0 ? "No hay despachos registrados" : (filterToday ? "No hay despachos hoy" : "Sin coincidencias")}
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {despachos.length === 0
              ? "Sube tu Excel de operaciones y la IA analizará y descontará todo automáticamente"
              : "Cambia el filtro o la búsqueda"}
          </p>
        </div>
      ) : (
        <div className="anim-fade-in mt-4 overflow-hidden rounded-lg border border-border bg-background">
          <div className="divide-y divide-border">
            {porDia.map(([dia, items]) => {
              const diaTs = new Date(dia).getTime();
              const totalDia = items.reduce((s, d) => s + d.cantidad, 0);
              const tecnicosDia = new Set(items.map((d) => d.tecnico).filter(Boolean)).size;
              const productosDia = new Set(items.map((d) => d.sku)).size;
              const isExpanded = expandedDay === dia || porDia.length === 1;
              const isToday = isSameDay(diaTs, today);

              return (
                <div key={dia}>
                  {/* Header del día */}
                  <button
                    onClick={() => setExpandedDay(isExpanded ? null : dia)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                  >
                    {isExpanded
                      ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" {...ICON_PROPS} />
                      : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" {...ICON_PROPS} />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium capitalize text-foreground">{fechaCorta(diaTs)}</p>
                        {isToday && (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                            Hoy
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] capitalize text-muted-foreground">{diaSemana(diaTs)}</p>
                    </div>
                    <div className="hidden items-center gap-6 text-[11px] sm:flex">
                      <div className="text-right">
                        <p className="font-medium tabular-nums text-foreground">{items.length}</p>
                        <p className="text-[10px] text-muted-foreground">despachos</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium tabular-nums text-foreground">{tecnicosDia}</p>
                        <p className="text-[10px] text-muted-foreground">destinatarios</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium tabular-nums text-foreground">{productosDia}</p>
                        <p className="text-[10px] text-muted-foreground">productos</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium tabular-nums text-foreground">{fmtNum(totalDia)}</p>
                        <p className="text-[10px] text-muted-foreground">unidades</p>
                      </div>
                    </div>
                  </button>

                  {/* Contenido del día: agrupado por técnico */}
                  {isExpanded && (
                    <div className="divide-y divide-border border-t border-border bg-muted/20">
                      {porDiaYTecnico[dia]?.map(([tecnico, desps, totalTec]) => {
                        const tecKey = `${dia}-${tecnico}`;
                        const isTecExpanded = expandedTecnico === tecKey || porDiaYTecnico[dia].length === 1;
                        return (
                          <div key={tecKey}>
                            <button
                              onClick={() => setExpandedTecnico(isTecExpanded ? null : tecKey)}
                              className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-muted/60"
                            >
                              {isTecExpanded
                                ? <ChevronDown className="h-3 w-3 text-muted-foreground" {...ICON_PROPS} />
                                : <ChevronRight className="h-3 w-3 text-muted-foreground" {...ICON_PROPS} />}
                              <User className="h-3.5 w-3.5 text-muted-foreground" {...ICON_PROPS} />
                              <span className="flex-1 text-[12px] font-medium text-foreground">{tecnico}</span>
                              <span className="text-[11px] text-muted-foreground">{desps.length} items</span>
                              <span className="text-[11px] font-medium tabular-nums text-foreground">{fmtNum(totalTec)} und</span>
                            </button>
                            {isTecExpanded && (
                              <div className="bg-background">
                                <table className="w-full text-[13px]">
                                  <tbody className="divide-y divide-border">
                                    {desps.map((d) => (
                                      <tr key={d.id} className="group">
                                        <td className="px-4 py-2.5 pr-3">
                                          <p className="text-[12px] font-medium text-foreground">{d.producto}</p>
                                          <p className="font-mono text-[10px] text-muted-foreground">SKU: {d.sku}</p>
                                        </td>
                                        <td className="py-2.5 pr-3 text-[11px] text-muted-foreground">
                                          {d.destino ? (
                                            <span className="inline-flex items-center gap-1">
                                              <MapPin className="h-2.5 w-2.5" {...ICON_PROPS} /> {d.destino}
                                            </span>
                                          ) : "—"}
                                        </td>
                                        <td className="py-2.5 pr-3 text-[10px] tabular-nums text-muted-foreground">
                                          {new Date(d.fecha).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                                        </td>
                                        <td className="py-2.5 pr-3 text-right">
                                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium tabular-nums text-foreground">
                                            <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                                            {fmtNum(d.cantidad)}
                                          </span>
                                        </td>
                                        <td className="py-2.5 pl-2 text-right">
                                          <button
                                            onClick={() => deleteDespacho(d.id)}
                                            title="Eliminar (devuelve stock)"
                                            className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                                          >
                                            <Trash2 className="h-3 w-3" {...ICON_PROPS} />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialog PEGAR/SUBIR DESPACHOS + IA */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl gap-0 overflow-y-auto rounded-lg p-0">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold">
              <ClipboardPaste className="h-4 w-4 text-foreground" {...ICON_PROPS} /> Analizar despachos con IA
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              Pega o sube tus despachos. La IA los analizará, validará el stock y los registrará automáticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 px-5 py-4">
            {/* Formatos */}
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Formatos: SKU*cantidad · Destinatario | SKU*cantidad · Destinatario [TAB] SKU*cantidad (de Excel)
              </p>
            </div>

            {/* Textarea */}
            <Textarea
              value={bulkText}
              onChange={(e) => { setBulkText(e.target.value); setResultadoIA(null); }}
              placeholder={"Pega tus despachos aquí (uno por línea):\n\nJ. Pérez|1066990*20\nM. Luna|1002900*50\n..."}
              className="max-h-[200px] rounded-md border-border bg-background font-mono text-[12px] leading-relaxed"
              autoFocus
            />

            {/* Análisis IA en vivo */}
            {lineasParseadas.length > 0 && !resultadoIA && (
              <div className="rounded-md border border-border">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                    <ClipboardPaste className="h-3.5 w-3.5 text-muted-foreground" {...ICON_PROPS} /> Análisis automático
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-[10px] font-medium">
                    <span className="flex items-center gap-1 text-foreground">
                      <Check className="h-3 w-3" {...ICON_PROPS} /> {validacion.validos.length} válidos
                    </span>
                    {validacion.invalidos.length > 0 && (
                      <span className="flex items-center gap-1 text-destructive">
                        <AlertTriangle className="h-3 w-3" {...ICON_PROPS} /> {validacion.invalidos.length} error
                      </span>
                    )}
                    <span className="tabular-nums text-muted-foreground">
                      {fmtNum(validacion.validos.reduce((s, d) => s + d.cantidad, 0))} und
                    </span>
                  </div>
                </div>
                {validacion.invalidos.length > 0 && (
                  <div className="max-h-[80px] overflow-y-auto px-3 py-2">
                    {validacion.invalidos.slice(0, 8).map((inv, i) => (
                      <div key={i} className="flex items-center gap-2 py-0.5 text-[10px]">
                        <AlertTriangle className="h-2.5 w-2.5 shrink-0 text-destructive" {...ICON_PROPS} />
                        {inv.d.tecnico && <span className="text-muted-foreground">{inv.d.tecnico}:</span>}
                        <code className="font-mono text-foreground">{inv.d.sku || "(vacío)"}</code>
                        <span className="text-destructive">— {inv.razon}</span>
                      </div>
                    ))}
                    {validacion.invalidos.length > 8 && (
                      <p className="mt-1 text-[9px] italic text-muted-foreground">+ {validacion.invalidos.length - 8} más…</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Resultado final IA */}
            {resultadoIA && (
              <div className="space-y-2">
                <div className={cn(
                  "rounded-md border px-3 py-2.5",
                  resultadoIA.ok > 0 ? "border-border bg-muted/30" : "border-destructive/30 bg-destructive/5"
                )}>
                  <p className={cn(
                    "flex items-center gap-2 text-[13px] font-medium",
                    resultadoIA.ok > 0 ? "text-foreground" : "text-destructive"
                  )}>
                    {resultadoIA.ok > 0
                      ? <Check className="h-4 w-4" {...ICON_PROPS} />
                      : <AlertTriangle className="h-4 w-4" {...ICON_PROPS} />}
                    {resultadoIA.ok > 0
                      ? `${resultadoIA.ok} despachos registrados · stock descontado`
                      : "No se pudieron registrar despachos"}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {fmtNum(resultadoIA.totalUnidades)} unidades descontadas del inventario
                    {resultadoIA.fail > 0 && ` · ${resultadoIA.fail} con error`}
                  </p>
                </div>

                {Object.keys(resultadoIA.porTecnico).length > 0 && (
                  <div className="rounded-md border border-border px-3 py-2.5">
                    <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Desglose por destinatario
                    </p>
                    <div className="grid max-h-[150px] grid-cols-1 gap-px overflow-y-auto bg-border sm:grid-cols-2">
                      {Object.entries(resultadoIA.porTecnico)
                        .sort((a, b) => b[1] - a[1])
                        .map(([tecnico, unidades]) => (
                          <div key={tecnico} className="flex items-center justify-between bg-background px-2 py-1.5 text-[11px]">
                            <span className="truncate text-foreground">{tecnico}</span>
                            <span className="shrink-0 font-medium tabular-nums text-foreground">{fmtNum(unidades)} und</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="sticky bottom-0 gap-2 border-t border-border bg-background px-5 py-3">
            <Button
              variant="outline"
              onClick={() => setBulkOpen(false)}
              className="h-9 rounded-md border-border bg-background text-[13px] font-medium text-foreground hover:bg-muted"
            >
              Cancelar
            </Button>
            <Button
              onClick={analizarYRegistrar}
              disabled={validacion.validos.length === 0 || analizando}
              className="h-9 rounded-md bg-foreground text-[13px] font-medium text-background shadow-none hover:bg-foreground/90"
            >
              {analizando ? (
                <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" {...ICON_PROPS} /> Analizando…</>
              ) : (
                <><ClipboardPaste className="mr-1.5 h-4 w-4" {...ICON_PROPS} /> Analizar y registrar {validacion.validos.length > 0 && `${validacion.validos.length}`}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, sub, icon, highlight }: { label: string; value: string | number; sub?: string; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={cn("bg-background px-4 py-3", highlight && "bg-muted/40")}>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-lg font-semibold tabular-nums text-foreground">{value}</span>
      </div>
      <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
    </div>
  );
}
