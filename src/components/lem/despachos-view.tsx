"use client";

import { useMemo, useState } from "react";
import {
  TrendingDown, Search, Trash2, Check, AlertTriangle, Package, Users,
  Send, MapPin, ClipboardPaste, FileSpreadsheet, RotateCcw, Save,
  Sparkles, ChevronDown, ChevronRight, User, Hash,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { fmtNum } from "@/lib/num";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface LineaPegada {
  tecnico: string;
  sku: string;
  cantidad: number;
  producto: ReturnType<ReturnType<typeof useStore.getState>["findProductBySku"]>;
  ok: boolean;
  razon?: string;
}

// Formatos aceptados:
// 1. Pegado simple:    SKU*cantidad   (una línea por despacho, sin técnico)
// 2. Con técnico:       Técnico | SKU*cantidad   (separador: | o tab o coma)
// 3. Con técnico+dest:  Técnico | Destino | SKU*cantidad
function parsearLinea(linea: string): { tecnico?: string; destino?: string; sku?: string; cantidad?: number } | null {
  const trimmed = linea.trim();
  if (!trimmed) return null;

  // Intentar separar por tab primero (Excel copia con tabs)
  let parts: string[];
  if (trimmed.includes("\t")) {
    parts = trimmed.split("\t").map((p) => p.trim());
  } else if (trimmed.includes("|")) {
    parts = trimmed.split("|").map((p) => p.trim());
  } else if (trimmed.includes(",")) {
    // Si tiene comas Y asterisco: Técnico,SKU*cantidad  OR  Técnico,Destino,SKU*cantidad
    const commaCount = (trimmed.match(/,/g) || []).length;
    if (trimmed.includes("*") && commaCount >= 1) {
      parts = trimmed.split(",").map((p) => p.trim());
    } else {
      // Solo una línea SKU*cantidad sin comas
      parts = [trimmed];
    }
  } else {
    parts = [trimmed];
  }

  // Buscar el componente que tiene * (es el SKU*cantidad)
  let skuPartIdx = -1;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].includes("*")) {
      skuPartIdx = i;
      break;
    }
  }

  if (skuPartIdx === -1) {
    // No hay *, todo el string es SKU (cantidad 1 por defecto? no, error)
    return null;
  }

  const [sku, cantStr] = parts[skuPartIdx].split("*").map((s) => s.trim());
  const cantidad = parseInt(cantStr, 10);
  if (!sku || isNaN(cantidad) || cantidad <= 0) return null;

  // Los componentes antes del SKU son: tecnico, destino (en ese orden)
  const before = parts.slice(0, skuPartIdx);
  const tecnico = before[0] || undefined;
  const destino = before[1] || undefined;

  // Si solo hay un before y no parece un técnico (es numérico), entonces es SKU sin técnico
  return { tecnico, destino, sku, cantidad };
}

export function DespachosView() {
  const products = useStore((s) => s.products);
  const despachos = useStore((s) => s.despachos);
  const miembros = useStore((s) => s.miembros);
  const findProductBySku = useStore((s) => s.findProductBySku);
  const registrarDespacho = useStore((s) => s.registrarDespacho);
  const deleteDespacho = useStore((s) => s.deleteDespacho);
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmResult, setConfirmResult] = useState<{ ok: number; fail: number; msg: string } | null>(null);
  const [expandedTecnico, setExpandedTecnico] = useState<string | null>(null);

  // Parsear líneas pegadas en tiempo real
  const lineasParseadas = useMemo((): LineaPegada[] => {
    if (!bulkText.trim()) return [];
    return bulkText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parsed = parsearLinea(line);
        if (!parsed || !parsed.sku) {
          return { tecnico: parsed?.tecnico ?? "", sku: "", cantidad: 0, producto: null, ok: false, razon: "Formato inválido" };
        }
        const producto = findProductBySku(parsed.sku);
        if (!producto) {
          return { tecnico: parsed.tecnico ?? "", sku: parsed.sku, cantidad: parsed.cantidad ?? 0, producto: null, ok: false, razon: "SKU no encontrado" };
        }
        if (producto.quantity < (parsed.cantidad ?? 0)) {
          return { tecnico: parsed.tecnico ?? "", sku: parsed.sku, cantidad: parsed.cantidad ?? 0, producto, ok: false, razon: `Stock insuficiente (disponible: ${producto.quantity})` };
        }
        return { tecnico: parsed.tecnico ?? "", sku: parsed.sku, cantidad: parsed.cantidad ?? 0, producto, ok: true };
      });
  }, [bulkText, findProductBySku]);

  const validas = lineasParseadas.filter((l) => l.ok);
  const invalidas = lineasParseadas.filter((l) => !l.ok);
  const totalUnidades = validas.reduce((s, l) => s + l.cantidad, 0);

  // Agrupar por técnico
  const porTecnico = useMemo(() => {
    const map: Record<string, LineaPegada[]> = {};
    for (const l of validas) {
      const key = l.tecnico || "(sin técnico)";
      if (!map[key]) map[key] = [];
      map[key].push(l);
    }
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [validas]);

  const filteredDespachos = despachos.filter((d) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return d.producto.toLowerCase().includes(q) ||
      d.sku.toLowerCase().includes(q) ||
      (d.tecnico ?? "").toLowerCase().includes(q) ||
      (d.destino ?? "").toLowerCase().includes(q);
  });

  const totalDespachado = despachos.reduce((s, d) => s + d.cantidad, 0);
  const tecnicosUnicos = new Set(despachos.map((d) => d.tecnico).filter(Boolean)).size;

  const openBulk = () => {
    setBulkText("");
    setConfirmResult(null);
    setBulkOpen(true);
  };

  const handleConfirm = () => {
    let ok = 0;
    let fail = 0;
    for (const l of validas) {
      const r = registrarDespacho({
        sku: l.sku,
        cantidad: l.cantidad,
        tecnico: l.tecnico || undefined,
        destino: undefined,
        observacion: undefined,
      });
      if (r.ok) ok++;
      else fail++;
    }
    setConfirmResult({ ok, fail, msg: `${ok} despacho(s) registrado(s) correctamente${fail > 0 ? `, ${fail} con error` : ""}` });
    if (ok > 0) {
      setTimeout(() => {
        setBulkOpen(false);
        setConfirmResult(null);
        setBulkText("");
        toast({ title: `✓ ${ok} despachos registrados`, description: `Se descontaron ${totalUnidades} unidades del inventario` });
      }, 1800);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1800px] px-4 py-5 lg:px-6">
      {/* Header */}
      <div className="anim-fade-up mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Despachos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{despachos.length}</span> despachos ·
            <span className="font-semibold text-foreground"> {fmtNum(totalDespachado)}</span> unidades enviadas ·
            <span className="font-semibold text-foreground"> {tecnicosUnicos}</span> técnicos
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar despacho…" className="h-10 rounded-lg bg-card pl-9 text-sm shadow-sm" />
          </div>
          <Button onClick={openBulk} className="btn-spacecom press h-10 rounded-lg border-0">
            <ClipboardPaste className="mr-1.5 h-4 w-4" /> Pegar despachos
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="anim-fade-up mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total despachos" value={despachos.length} icon={<Send className="h-4 w-4" />} />
        <StatCard label="Unidades enviadas" value={fmtNum(totalDespachado)} icon={<TrendingDown className="h-4 w-4" />} />
        <StatCard label="Productos catálogo" value={products.length} icon={<Package className="h-4 w-4" />} />
        <StatCard label="Técnicos activos" value={tecnicosUnicos} icon={<Users className="h-4 w-4" />} />
      </div>

      {/* Historial */}
      {filteredDespachos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-4 py-16 text-center shadow-sm">
          <ClipboardPaste className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-foreground">
            {despachos.length === 0 ? "No hay despachos registrados" : "Sin coincidencias"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {despachos.length === 0 ? "Pega tus despachos del día (formato Excel) y el sistema cuenta todo automáticamente" : "Prueba con otra búsqueda"}
          </p>
        </div>
      ) : (
        <div className="anim-fade-up overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
            <h3 className="flex items-center gap-2 text-[13px] font-bold text-foreground">
              <Send className="h-3.5 w-3.5 text-violet-400" /> Historial
              <span className="rounded-full bg-violet-500 px-2 py-0.5 text-[10px] font-bold text-white tabular-nums">{filteredDespachos.length}</span>
            </h3>
          </div>
          <div className="max-h-[600px] overflow-y-auto scroll-thin">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 font-semibold">Fecha</th>
                  <th className="px-4 py-2.5 font-semibold">Producto</th>
                  <th className="px-4 py-2.5 font-semibold">Técnico</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Cantidad</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filteredDespachos.map((d) => (
                  <tr key={d.id} className="group border-b border-border/40 hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-2.5 text-[11px] tabular-nums text-muted-foreground">
                      {new Date(d.fecha).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit" })}
                      <span className="block text-[9px]">{new Date(d.fecha).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-[13px] font-semibold text-foreground">{d.producto}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">SKU: {d.sku}</p>
                      {d.destino && <p className="mt-0.5 text-[10px] text-muted-foreground">📍 {d.destino}</p>}
                    </td>
                    <td className="px-4 py-2.5">
                      {d.tecnico ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/15 px-2 py-0.5 text-[11px] font-medium text-violet-300">
                          <User className="h-2.5 w-2.5" /> {d.tecnico}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="inline-flex min-w-[48px] justify-center rounded-md bg-rose-500/15 px-2.5 py-0.5 text-[12px] font-bold tabular-nums text-rose-400">
                        -{fmtNum(d.cantidad)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => deleteDespacho(d.id)}
                        title="Eliminar (devuelve stock)"
                        className="press rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialog PEGAR DESPACHOS MASIVAMENTE */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-4xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <ClipboardPaste className="h-5 w-5 text-violet-400" /> Pegar despachos masivamente
            </DialogTitle>
            <DialogDescription>
              Pega aquí tus despachos del día. El sistema detecta automáticamente el formato y cuenta todo.
            </DialogDescription>
          </DialogHeader>

          {/* Ejemplos de formatos */}
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              <FileSpreadsheet className="h-3 w-3" /> Formatos aceptados (uno por línea):
            </p>
            <div className="grid grid-cols-1 gap-1.5 text-[10px] font-mono text-muted-foreground">
              <div><span className="text-violet-400">•</span> SKU*cantidad</div>
              <div><span className="text-violet-400">•</span> Técnico | SKU*cantidad</div>
              <div><span className="text-violet-400">•</span> Técnico | Destino | SKU*cantidad</div>
              <div><span className="text-violet-400">•</span> Técnico [TAB] SKU*cantidad (copiado de Excel)</div>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              <strong className="text-foreground">Ejemplo:</strong> Pega directo de Excel con columnas: Técnico, SKU, Cantidad
            </p>
          </div>

          {/* Textarea grande */}
          <Textarea
            value={bulkText}
            onChange={(e) => { setBulkText(e.target.value); setConfirmResult(null); }}
            placeholder={"Pega aquí tus despachos (una línea por cada despacho):\n\nJ. Pérez\t1066990*20\nM. Luna\t1002900*50\nJ. Pérez\t4076358*3\nR. García\t1003101*100\n\nO con destino:\nJ. Pérez | Comas | 1066990*20\nM. Luna | Los Olivos | 1002900*50"}
            className="min-h-[180px] rounded-lg font-mono text-[12px] leading-relaxed shadow-inner"
            autoFocus
          />

          {/* Vista previa agrupada por técnico */}
          {lineasParseadas.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/30">
              {/* Header con contadores */}
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-violet-400" /> Resumen automático
                </p>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-400">
                    <Check className="h-2.5 w-2.5" /> {validas.length} válidos
                  </span>
                  {invalidas.length > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-rose-400">
                      <AlertTriangle className="h-2.5 w-2.5" /> {invalidas.length} con error
                    </span>
                  )}
                  <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-violet-300">
                    {porTecnico.length} técnico(s)
                  </span>
                  <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-cyan-300">
                    {fmtNum(totalUnidades)} und
                  </span>
                </div>
              </div>

              {/* Agrupado por técnico */}
              <div className="max-h-[280px] overflow-y-auto scroll-thin">
                {porTecnico.length === 0 ? (
                  <p className="px-3 py-4 text-center text-[11px] text-muted-foreground">No hay despachos válidos todavía</p>
                ) : (
                  porTecnico.map(([tecnico, items]) => {
                    const totalTecnico = items.reduce((s, l) => s + l.cantidad, 0);
                    const isExpanded = expandedTecnico === tecnico;
                    return (
                      <div key={tecnico} className="border-b border-border/40 last:border-0">
                        <button
                          onClick={() => setExpandedTecnico(isExpanded ? null : tecnico)}
                          className="press flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent/30 transition-colors"
                        >
                          {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/15 text-violet-300">
                            <User className="h-3 w-3" />
                          </span>
                          <span className="flex-1 text-[12px] font-semibold text-foreground">{tecnico}</span>
                          <span className="text-[10px] text-muted-foreground">{items.length} despacho(s)</span>
                          <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-[11px] font-bold tabular-nums text-violet-300">
                            {fmtNum(totalTecnico)} und
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="bg-muted/20 px-3 py-2">
                            {items.map((l, i) => (
                              <div key={i} className="flex items-center gap-2 py-1 text-[11px]">
                                <Check className="h-2.5 w-2.5 shrink-0 text-emerald-400" />
                                <code className="shrink-0 font-mono text-[11px] text-muted-foreground">{l.sku}</code>
                                <span className="min-w-0 flex-1 truncate text-foreground">{l.producto?.name}</span>
                                <span className="shrink-0 rounded-md bg-rose-500/15 px-1.5 py-0.5 font-bold tabular-nums text-rose-400">
                                  -{fmtNum(l.cantidad)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Errores */}
              {invalidas.length > 0 && (
                <div className="border-t border-border bg-rose-500/5 px-3 py-2">
                  <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold text-rose-400">
                    <AlertTriangle className="h-3 w-3" /> Despachos con error ({invalidas.length}):
                  </p>
                  <div className="max-h-[100px] overflow-y-auto scroll-thin">
                    {invalidas.slice(0, 10).map((l, i) => (
                      <div key={i} className="flex items-center gap-2 py-0.5 text-[10px]">
                        <X className="h-2.5 w-2.5 shrink-0 text-rose-400" />
                        {l.tecnico && <span className="text-muted-foreground">{l.tecnico}:</span>}
                        <code className="font-mono text-foreground">{l.sku || "(vacío)"}</code>
                        <span className="text-rose-400">— {l.razon}</span>
                      </div>
                    ))}
                    {invalidas.length > 10 && (
                      <p className="mt-1 text-[9px] italic text-muted-foreground">+ {invalidas.length - 10} más…</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resultado */}
          {confirmResult && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-[12px] font-semibold text-emerald-400">
              <Check className="mr-1.5 inline h-4 w-4" /> {confirmResult.msg}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)} className="rounded-lg">Cancelar</Button>
            <Button
              onClick={handleConfirm}
              disabled={validas.length === 0}
              className="btn-spacecom rounded-lg border-0"
            >
              <Save className="mr-1.5 h-4 w-4" /> Registrar {validas.length > 0 && `${validas.length} despacho(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="anim-fade-up rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">{icon}</span>
        <span className="text-xl font-bold tabular-nums text-foreground">{value}</span>
      </div>
      <p className="mt-2 text-xs font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
