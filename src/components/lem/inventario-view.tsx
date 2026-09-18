"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Hash,
  Download,
  ArrowDownToLine,
  Trash,
  Check,
  X,
  Upload,
  Loader2,
  AlertCircle,
  ClipboardPaste,
  AlertTriangle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Clock,
  TrendingUp,
  Package,
  Boxes,
  DollarSign,
  Filter,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import { parseNum, fmtNum } from "@/lib/num";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/lem/use-confirm";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const ICON_PROPS = { strokeWidth: 1.5 } as const;

export function InventarioView() {
  const { confirm, ConfirmDialog } = useConfirm();
  const products = useStore((s) => s.products);
  const addProduct = useStore((s) => s.addProduct);
  const updateProduct = useStore((s) => s.updateProduct);
  const deleteProduct = useStore((s) => s.deleteProduct);
  const findProductBySku = useStore((s) => s.findProductBySku);
  const registrarEntrada = useStore((s) => s.registrarEntrada);
  const entradas = useStore((s) => s.entradas);
  const despachos = useStore((s) => s.despachos);
  const deleteEntrada = useStore((s) => s.deleteEntrada);
  const exportInventarioExcel = useStore((s) => s.exportInventarioExcel);

  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "bajo" | "agotados" | "sinMin" | "ok">("todos");
  const [tab, setTab] = useState<"inventario" | "recomendaciones" | "entradas">("inventario");
  const [pagina, setPagina] = useState(1);
  const PRODUCTOS_POR_PAGINA = 15;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ sku: "", name: "", quantity: "", minStock: "", udm: "UNIDADES" });
  const [dupError, setDupError] = useState(false);
  const [entradaOpen, setEntradaOpen] = useState(false);
  const [entradaText, setEntradaText] = useState("");
  const [entradaMsg, setEntradaMsg] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importingInv, setImportingInv] = useState(false);
  const [importPreview, setImportPreview] = useState<Array<{ sku: string; nombre: string; cantidad: number; udm?: string; existe: boolean }>>([]);
  const [importResult, setImportResult] = useState<{ ok: number; nuevos: number; actualizados: number; msg: string } | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return [...products]
      .sort((a, b) => a.sku.localeCompare(b.sku, undefined, { numeric: true }))
      .filter((p) => {
        if (q && !(p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))) return false;
        if (filtro === "agotados") return p.quantity === 0;
        if (filtro === "bajo") return !!p.minStock && p.minStock > 0 && p.quantity > 0 && p.quantity <= p.minStock;
        if (filtro === "sinMin") return !p.minStock || p.minStock === 0;
        if (filtro === "ok") return !!p.minStock && p.minStock > 0 && p.quantity > p.minStock;
        return true; // "todos"
      });
  }, [products, query, filtro]);

  // Resetear página a 1 cuando cambian los filtros o el query
  useEffect(() => {
    setPagina(1);
  }, [query, filtro, products]);

  // Cálculo de paginación: productos a mostrar en la página actual
  const totalPaginas = Math.max(1, Math.ceil(filtered.length / PRODUCTOS_POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const indiceInicio = (paginaActual - 1) * PRODUCTOS_POR_PAGINA;
  const paginaProductos = filtered.slice(indiceInicio, indiceInicio + PRODUCTOS_POR_PAGINA);

  const totalUnidades = useMemo(() => products.reduce((s, p) => s + p.quantity, 0), [products]);

  // ─── KPIs superiores ───
  const kpis = useMemo(() => {
    const valor = products.reduce((s, p) => s + (p.precio || 0) * p.quantity, 0);
    const bajoStock = products.filter((p) => !!p.minStock && p.minStock > 0 && p.quantity > 0 && p.quantity <= p.minStock).length;
    const agotados = products.filter((p) => p.quantity === 0).length;
    const sinMin = products.filter((p) => !p.minStock || p.minStock === 0).length;
    const ok = products.filter((p) => !!p.minStock && p.minStock > 0 && p.quantity > p.minStock).length;
    return { valor, bajoStock, agotados, sinMin, ok };
  }, [products]);

  // ─── Última entrada por SKU (para columna "Últ. entrada") ───
  const lastEntradaBySku = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entradas) {
      const cur = map.get(e.sku);
      if (cur === undefined || e.fecha > cur) map.set(e.sku, e.fecha);
    }
    return map;
  }, [entradas]);

  // ─── Recomendaciones Inteligentes ───
  const recomendaciones = useMemo(() => {
    const ahora = Date.now();
    const dias30 = ahora - 30 * 86400_000;

    // 1. Reponer urgentemente (agotados o bajo stock, con cálculo sugerido)
    const reponer = products
      .filter((p) => !!p.minStock && p.minStock > 0 && p.quantity <= p.minStock)
      .map((p) => {
        const consumo30 = despachos
          .filter((d) => d.sku === p.sku && d.fecha >= dias30)
          .reduce((s, d) => s + d.cantidad, 0);
        const consumoDiario = consumo30 / 30;
        const sugerido = Math.max(0, Math.ceil(p.minStock! * 2 + consumoDiario * 14 - p.quantity));
        return { ...p, consumo30, consumoDiario, sugerido };
      })
      .sort((a, b) => a.quantity / Math.max(a.minStock!, 1) - b.quantity / Math.max(b.minStock!, 1));

    // 2. Sin mínimo definido
    const sinMinimo = products.filter((p) => !p.minStock || p.minStock === 0);

    // 3. Stock sin movimiento (> 30 días sin despachos y con stock)
    const sinMovimiento = products
      .filter((p) => {
        if (p.quantity <= 0) return false;
        const ultimoDespacho = despachos
          .filter((d) => d.sku === p.sku)
          .sort((a, b) => b.fecha - a.fecha)[0];
        if (!ultimoDespacho) return true;
        return ultimoDespacho.fecha < dias30;
      })
      .slice(0, 5);

    // 4. Top 5 productos más consumidos últimos 30 días
    const consumoPorSku = new Map<string, { sku: string; nombre: string; unidades: number; eventos: number }>();
    for (const d of despachos) {
      if (d.fecha < dias30) continue;
      const cur = consumoPorSku.get(d.sku) ?? { sku: d.sku, nombre: d.producto || d.sku, unidades: 0, eventos: 0 };
      cur.unidades += d.cantidad;
      cur.eventos += 1;
      consumoPorSku.set(d.sku, cur);
    }
    const topConsumo = Array.from(consumoPorSku.values()).sort((a, b) => b.unidades - a.unidades).slice(0, 5);

    return { reponer, sinMinimo, sinMovimiento, topConsumo, ahora };
  }, [products, despachos]);

  // Helper: "hace X días" para fechas relativas
  const fmtRelativo = (ts: number | undefined) => {
    if (!ts) return "—";
    const dias = Math.floor((Date.now() - ts) / 86400_000);
    if (dias <= 0) return "hoy";
    if (dias === 1) return "hace 1 día";
    if (dias < 30) return `hace ${dias} días`;
    const meses = Math.floor(dias / 30);
    return meses === 1 ? "hace 1 mes" : `hace ${meses} meses`;
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ sku: "", name: "", quantity: "", minStock: "", udm: "UNIDADES" });
    setDupError(false);
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ sku: p.sku, name: p.name, quantity: String(p.quantity), minStock: p.minStock ? String(p.minStock) : "", udm: p.udm ?? "UNIDADES" });
    setDupError(false);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.sku.trim() || !form.name.trim()) return;
    if (editing) {
      updateProduct(editing.id, {
        sku: form.sku.trim(), name: form.name.trim(),
        quantity: parseNum(form.quantity) ?? 0,
        minStock: form.minStock.trim() ? parseNum(form.minStock) : undefined,
        udm: form.udm.trim() || undefined,
      });
    } else {
      if (findProductBySku(form.sku.trim())) { setDupError(true); return; }
      addProduct(form.sku.trim(), form.name.trim(), parseNum(form.quantity) ?? 0, form.minStock.trim() ? parseNum(form.minStock) : undefined, form.udm.trim() || undefined);
    }
    setDialogOpen(false);
  };

  const handleEntrada = () => {
    const result = registrarEntrada(entradaText);
    setEntradaMsg(result.msg);
    if (result.ok) {
      setEntradaText("");
      setTimeout(() => { setEntradaMsg(""); setEntradaOpen(false); }, 2000);
    }
  };

  const handleImportInventario = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingInv(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import-inventario", { method: "POST", body: formData });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      const preview = (data.productos || []).map((p: any) => ({
        sku: p.sku || "",
        nombre: p.nombre || "",
        cantidad: p.cantidad || 0,
        udm: p.udm,
        existe: !!findProductBySku(p.sku),
      }));
      setImportPreview(preview);
      setImportOpen(true);
    } catch (err: any) {
      setImportResult({ ok: 0, nuevos: 0, actualizados: 0, msg: "Error: " + err.message });
      setImportOpen(true);
    } finally {
      setImportingInv(false);
      if (importFileRef.current) importFileRef.current.value = "";
    }
  };

  const confirmImport = () => {
    let nuevos = 0;
    let actualizados = 0;
    for (const p of importPreview) {
      const existente = findProductBySku(p.sku);
      if (existente) {
        updateProduct(existente.id, { quantity: p.cantidad, udm: p.udm, name: p.nombre });
        actualizados++;
      } else {
        const id = addProduct(p.sku, p.nombre, p.cantidad, undefined, p.udm);
        if (id) nuevos++;
      }
    }
    setImportResult({ ok: nuevos + actualizados, nuevos, actualizados, msg: `${nuevos + actualizados} producto(s) importado(s): ${nuevos} nuevo(s), ${actualizados} actualizado(s)` });
    setTimeout(() => { setImportOpen(false); setImportResult(null); setImportPreview([]); }, 3000);
  };

  // ─── Live preview de la entrada (parseo SKU*cantidad, SKU<tab>cantidad, o solo SKU) ───
  const entradaPreview = useMemo(() => {
    const lines = entradaText.split("\n").map((l) => l.trim()).filter(Boolean);
    return lines.map((line, i) => {
      // Separar por * o por tab
      let parts: string[];
      if (line.includes("*")) {
        parts = line.split("*");
      } else if (line.includes("\t")) {
        parts = line.split("\t");
      } else {
        // Solo SKU → cantidad = 1
        parts = [line, "1"];
      }
      const sku = (parts[0] ?? "").trim();
      const cantidadRaw = (parts[1] ?? "1").trim();
      const cantidad = parseInt(cantidadRaw, 10);
      if (!sku) {
        return { i, line, sku: "", cantidad: NaN, producto: null, ok: false, motivo: "SKU vacío." };
      }
      if (isNaN(cantidad) || cantidad <= 0) {
        return { i, line, sku, cantidad: NaN, producto: null, ok: false, motivo: "Cantidad inválida." };
      }
      const prod = findProductBySku(sku);
      return {
        i,
        line,
        sku,
        cantidad,
        producto: prod,
        ok: true,
        motivo: prod ? "" : "SKU no encontrado en el catálogo (se registrará como SKU literal).",
      };
    });
  }, [entradaText, findProductBySku]);

  const validCount = entradaPreview.filter((p) => p.ok && p.producto).length;
  const invalidCount = entradaPreview.filter((p) => !p.ok || !p.producto).length;

  return (
    <div className="px-6 py-6 anim-fade-in">
      {/* Header */}
      <header className="anim-slide-up mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Inventario</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {products.length} producto(s) · {fmtNum(totalUnidades)} unidades
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={importFileRef} type="file" accept=".xlsx,.xls" onChange={handleImportInventario} className="hidden" />
          <div className="relative w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" {...ICON_PROPS} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar SKU o producto…"
              className="h-9 rounded-lg border-border bg-background pl-8 text-[13px]"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => importFileRef.current?.click()}
            disabled={importingInv}
            className="h-9 rounded-lg border-border bg-background px-3.5 text-[13px] font-medium hover:bg-muted"
          >
            {importingInv
              ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" {...ICON_PROPS} />
              : <Upload className="mr-1.5 h-4 w-4" {...ICON_PROPS} />}
            {importingInv ? "Importando…" : "Importar"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setEntradaOpen(true)}
            className="h-9 rounded-lg border-border bg-background px-3.5 text-[13px] font-medium hover:bg-muted"
          >
            <ClipboardPaste className="mr-1.5 h-4 w-4" {...ICON_PROPS} /> Importar SKUs
          </Button>
          <Button
            variant="outline"
            onClick={() => exportInventarioExcel()}
            className="h-9 rounded-lg border-border bg-background px-3.5 text-[13px] font-medium hover:bg-muted"
          >
            <Download className="mr-1.5 h-4 w-4" {...ICON_PROPS} /> Exportar
          </Button>
          {/* Botón "Añadir" eliminado — los materiales solo se pueden ingresar
              desde la página /recepciones con una guía de remisión PDF o manualmente.
              Esto evita inconsistencias de inventario por altas manuales sueltas. */}
        </div>
      </header>

      {/* Pestañas: Inventario | Recomendaciones | Entradas */}
      <div className="anim-slide-up mb-6 flex items-center gap-1 border-b border-border">
        {([
          ["inventario", "Inventario", products.length],
          ["recomendaciones", "Recomendaciones", (recomendaciones.reponer.length + recomendaciones.sinMinimo.length + recomendaciones.sinMovimiento.length)],
          ["entradas", "Entradas", entradas.length],
        ] as const).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "relative inline-flex h-10 items-center gap-2 px-4 text-[13px] font-medium transition-colors",
              tab === key ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                tab === key ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
              )}
            >
              {count}
            </span>
            {tab === key && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" />
            )}
          </button>
        ))}
      </div>

      {/* ─── TAB: INVENTARIO (KPIs + chips + tabla) ─── */}
      {tab === "inventario" && (
        <>
      {/* KPIs superiores */}
      <section className="anim-slide-up mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* 1. Productos en catálogo */}
        <div className="press-card anim-slide-up rounded-xl border border-border bg-card p-4 text-card-foreground shadow transition-shadow hover:shadow-md">
          <div className="flex items-center gap-1.5">
            <Package className="h-3 w-3 text-muted-foreground" {...ICON_PROPS} />
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Catálogo</p>
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{fmtNum(products.length)}</p>
        </div>
        {/* 2. Unidades totales */}
        <div className="press-card anim-slide-up rounded-xl border border-border bg-card p-4 text-card-foreground shadow transition-shadow hover:shadow-md">
          <div className="flex items-center gap-1.5">
            <Boxes className="h-3 w-3 text-muted-foreground" {...ICON_PROPS} />
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Unidades</p>
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{fmtNum(totalUnidades)}</p>
        </div>
        {/* 3. Valor del inventario */}
        <div className="press-card anim-slide-up rounded-xl border border-border bg-card p-4 text-card-foreground shadow transition-shadow hover:shadow-md">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3 w-3 text-muted-foreground" {...ICON_PROPS} />
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Valor</p>
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
            S/ {kpis.valor.toLocaleString("es-PE", { maximumFractionDigits: 0 })}
          </p>
        </div>
        {/* 4. Bajo stock */}
        <div className="press-card anim-slide-up rounded-xl border border-border bg-card p-4 text-card-foreground shadow transition-shadow hover:shadow-md">
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bajo stock</p>
            {kpis.bajoStock > 0 && <span className="h-2 w-2 rounded-full bg-amber-500" />}
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{fmtNum(kpis.bajoStock)}</p>
        </div>
        {/* 5. Agotados */}
        <div className="press-card anim-slide-up rounded-xl border border-border bg-card p-4 text-card-foreground shadow transition-shadow hover:shadow-md">
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Agotados</p>
            {kpis.agotados > 0 && <span className="h-2 w-2 rounded-full bg-destructive" />}
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{fmtNum(kpis.agotados)}</p>
        </div>
        {/* 6. Sin mínimo */}
        <div className="press-card anim-slide-up rounded-xl border border-border bg-card p-4 text-card-foreground shadow transition-shadow hover:shadow-md">
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sin mínimo</p>
            {kpis.sinMin > 0 && <span className="h-2 w-2 rounded-full bg-amber-500" />}
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{fmtNum(kpis.sinMin)}</p>
        </div>
      </section>

      {/* Chips de filtro por estado */}
      <div className="anim-slide-up mb-4 flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" {...ICON_PROPS} />
        {([
          ["todos", "Todos", products.length],
          ["bajo", "Bajo stock", kpis.bajoStock],
          ["agotados", "Agotados", kpis.agotados],
          ["sinMin", "Sin mínimo", kpis.sinMin],
          ["ok", "OK", kpis.ok],
        ] as const).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setFiltro(key)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition-colors",
              filtro === key
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-foreground hover:bg-muted",
            )}
          >
            {label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                filtro === key ? "bg-background/20 text-background" : "bg-muted text-muted-foreground",
              )}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Tabla inventario */}
      {filtered.length === 0 ? (
        <div className="anim-fade-in rounded-lg border border-dashed border-border bg-background px-4 py-16 text-center text-[13px] text-muted-foreground">
          {products.length === 0 ? (
            "No hay productos en el inventario. Ingresa materiales desde la página de Recepciones."
          ) : (
            <div className="space-y-2">
              <p>Sin coincidencias para el filtro.</p>
              <button
                onClick={() => { setQuery(""); setFiltro("todos"); }}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-muted"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="anim-slide-up overflow-x-auto scroll-thin rounded-lg border border-border bg-background">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">SKU</th>
                <th className="px-4 py-2.5 font-medium">Producto</th>
                <th className="px-4 py-2.5 text-right font-medium">Stock</th>
                <th className="px-4 py-2.5 text-right font-medium">Mín</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
                <th className="px-4 py-2.5 font-medium">Categoría</th>
                <th className="px-4 py-2.5 text-right font-medium">Precio</th>
                <th className="px-4 py-2.5 font-medium">Últ. entrada</th>
                <th className="px-4 py-2.5 font-medium">UdM</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginaProductos.map((p) => {
                const bajo = p.minStock !== undefined && p.minStock > 0 && p.quantity <= p.minStock;
                const agotado = p.quantity === 0;
                const sinMin = !p.minStock || p.minStock === 0;
                const ok = !sinMin && p.quantity > (p.minStock ?? 0);
                return (
                  <tr key={p.id} className="group transition-colors duration-150 hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-[12px] text-foreground">{p.sku}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">{p.name}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center justify-end gap-1.5 tabular-nums text-foreground">
                        {bajo && (
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-destructive"
                            aria-label="stock bajo mínimo"
                            title="Stock bajo el mínimo"
                          />
                        )}
                        {fmtNum(p.quantity)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {p.minStock ? fmtNum(p.minStock) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {agotado ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-medium text-destructive">
                          <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> Agotado
                        </span>
                      ) : sinMin ? (
                        <span className="text-[11px] text-muted-foreground">— Sin mínimo</span>
                      ) : bajo ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Bajo
                        </span>
                      ) : ok ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> OK
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground">
                      {p.categoria || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-[12px] tabular-nums text-muted-foreground">
                      {p.precio ? `S/ ${p.precio.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground">
                      {fmtRelativo(lastEntradaBySku.get(p.sku))}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground">{p.udm ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        <button
                          onClick={() => openEdit(p)}
                          aria-label="Editar producto"
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" {...ICON_PROPS} />
                        </button>
                        <button
                          onClick={async () => {
                            const ok = await confirm({
                              title: "Eliminar producto del catálogo",
                              description: `¿Eliminar "${p.name}" (SKU ${p.sku}) del catálogo?`,
                              critical: true,
                              details: `Stock actual: ${p.quantity} ${p.udm || "UNIDADES"}\nPrecio: S/ ${(p.precio || 0).toFixed(2)}\nCategoría: ${p.categoria || "—"}\n\nEsta acción se registrará en /auditoría y no se puede deshacer.`,
                            });
                            if (ok) deleteProduct(p.id);
                          }}
                          aria-label="Eliminar producto"
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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
        </div>
      )}

      {/* Controles de paginación — solo si hay más de 1 página */}
      {filtered.length > PRODUCTOS_POR_PAGINA && (
        <div className="anim-slide-up mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-[12px] text-muted-foreground">
            Mostrando <span className="font-semibold tabular-nums text-foreground">{indiceInicio + 1}</span>–
            <span className="font-semibold tabular-nums text-foreground">{Math.min(indiceInicio + PRODUCTOS_POR_PAGINA, filtered.length)}</span> de{" "}
            <span className="font-semibold tabular-nums text-foreground">{filtered.length}</span> productos
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
              aria-label="Página anterior"
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-background px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" {...ICON_PROPS} /> Anterior
            </button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPaginas || (p >= paginaActual - 1 && p <= paginaActual + 1))
              .map((p, i, arr) => (
                <span key={p} className="flex items-center">
                  {i > 0 && arr[i - 1] !== p - 1 && (
                    <span className="px-1 text-[12px] text-muted-foreground">…</span>
                  )}
                  <button
                    onClick={() => setPagina(p)}
                    aria-label={`Ir a página ${p}`}
                    className={cn(
                      "inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg border px-2 text-[12px] font-medium tabular-nums transition-colors",
                      p === paginaActual
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-foreground hover:bg-muted",
                    )}
                  >
                    {p}
                  </button>
                </span>
              ))}
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaActual === totalPaginas}
              aria-label="Página siguiente"
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-background px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente <ChevronRight className="h-3.5 w-3.5" {...ICON_PROPS} />
            </button>
          </div>
        </div>
      )}
        </>
      )}

      {/* ─── TAB: RECOMENDACIONES (las 4 cards inteligentes) ─── */}
      {tab === "recomendaciones" && (
        <>
          {(recomendaciones.reponer.length > 0 || recomendaciones.sinMinimo.length > 0 || recomendaciones.sinMovimiento.length > 0 || recomendaciones.topConsumo.length > 0) ? (
            <section className="anim-slide-up">
              <h2 className="mb-3 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                Recomendaciones Inteligentes
              </h2>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {/* Card 1: Reponer urgentemente */}
            <div className="press-card anim-slide-up rounded-xl border border-border bg-card p-5 text-card-foreground shadow transition-shadow hover:shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" {...ICON_PROPS} />
                  <h3 className="text-[13px] font-semibold text-foreground">Reponer urgentemente</h3>
                </div>
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-amber-600">
                  {recomendaciones.reponer.length}
                </span>
              </div>
              {recomendaciones.reponer.length === 0 ? (
                <p className="text-[12px] text-muted-foreground">Todo el inventario está por encima del mínimo</p>
              ) : (
                <div className="space-y-2.5">
                  {recomendaciones.reponer.slice(0, 6).map((p) => {
                    const pct = Math.min(100, Math.max(0, (p.quantity / Math.max(p.minStock!, 1)) * 100));
                    return (
                      <div key={p.id} className="space-y-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-[12px] font-medium text-foreground">{p.name}</span>
                          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{p.sku}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={cn("font-semibold tabular-nums", p.quantity === 0 ? "text-destructive" : "text-amber-600")}>
                            {fmtNum(p.quantity)} / {fmtNum(p.minStock)}
                          </span>
                          <span className="text-right text-muted-foreground">
                            {p.sugerido === 0 ? (
                              "Stock suficiente p/ 14 días"
                            ) : (
                              <>Pedir: <span className="font-semibold text-foreground">{fmtNum(p.sugerido)}</span> u.</>
                            )}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn("h-full rounded-full", p.quantity === 0 ? "bg-destructive" : "bg-amber-500")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {recomendaciones.reponer.length > 6 && (
                    <p className="text-[11px] text-muted-foreground">+{recomendaciones.reponer.length - 6} más</p>
                  )}
                  <div className="border-t border-border pt-2 text-[11px] text-muted-foreground">
                    Total: <span className="font-semibold text-foreground">{recomendaciones.reponer.length}</span> productos, ~
                    <span className="font-semibold tabular-nums text-foreground">{fmtNum(recomendaciones.reponer.reduce((s, p) => s + p.sugerido, 0))}</span> u. a pedir
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: Sin mínimo configurado */}
            {recomendaciones.sinMinimo.length > 0 && (
              <div className="press-card anim-slide-up rounded-xl border border-border bg-card p-5 text-card-foreground shadow transition-shadow hover:shadow-md">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
                    <h3 className="text-[13px] font-semibold text-foreground">Sin mínimo configurado</h3>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
                    {recomendaciones.sinMinimo.length}
                  </span>
                </div>
                <p className="mb-2 text-[12px] text-muted-foreground">Configura el stock mínimo para monitorearlos</p>
                <div className="space-y-1.5">
                  {recomendaciones.sinMinimo.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[12px] text-foreground">{p.name}</span>
                      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                        {fmtNum(p.quantity)} {p.udm || "u."}
                      </span>
                    </div>
                  ))}
                  {recomendaciones.sinMinimo.length > 5 && (
                    <p className="text-[11px] text-muted-foreground">+{recomendaciones.sinMinimo.length - 5} productos más</p>
                  )}
                </div>
              </div>
            )}

            {/* Card 3: Stock sin movimiento */}
            {recomendaciones.sinMovimiento.length > 0 && (
              <div className="press-card anim-slide-up rounded-xl border border-border bg-card p-5 text-card-foreground shadow transition-shadow hover:shadow-md">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
                    <h3 className="text-[13px] font-semibold text-foreground">Stock sin movimiento</h3>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
                    {recomendaciones.sinMovimiento.length}
                  </span>
                </div>
                <p className="mb-2 text-[12px] text-muted-foreground">Productos en stock sin despachos en 30+ días</p>
                <div className="space-y-1.5">
                  {recomendaciones.sinMovimiento.map((p) => {
                    const ultimoDespacho = despachos
                      .filter((d) => d.sku === p.sku)
                      .sort((a, b) => b.fecha - a.fecha)[0];
                    return (
                      <div key={p.id} className="flex items-baseline justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] text-foreground">{p.name}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">{p.sku}</span>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="block text-[11px] tabular-nums text-muted-foreground">
                            {fmtNum(p.quantity)} {p.udm || "u."}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {ultimoDespacho ? fmtRelativo(ultimoDespacho.fecha) : "Nunca despachado"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Card 4: Top consumo (30 días) */}
            {recomendaciones.topConsumo.length > 0 && (
              <div className="press-card anim-slide-up rounded-xl border border-border bg-card p-5 text-card-foreground shadow transition-shadow hover:shadow-md">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
                  <h3 className="text-[13px] font-semibold text-foreground">Top consumo (30 días)</h3>
                </div>
                <div className="space-y-2">
                  {recomendaciones.topConsumo.map((c, i) => {
                    const max = recomendaciones.topConsumo[0].unidades || 1;
                    const pct = Math.max(4, (c.unidades / max) * 100);
                    return (
                      <div key={c.sku} className="space-y-1">
                        <div className="flex items-baseline justify-between gap-2 text-[12px]">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{i + 1}.</span>
                            <span className="truncate font-medium text-foreground">{c.nombre}</span>
                          </span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {fmtNum(c.unidades)} u · {c.eventos} evt
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-foreground/60" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
              </div>
            </section>
          ) : (
            <div className="anim-fade-in rounded-lg border border-dashed border-border bg-background px-4 py-16 text-center text-[13px] text-muted-foreground">
              No hay recomendaciones activas. Todo el inventario está por encima del mínimo.
            </div>
          )}
        </>
      )}

      {/* ─── TAB: ENTRADAS (entradas recientes) ─── */}
      {tab === "entradas" && (
        <>
          {entradas.length > 0 ? (
            <section className="anim-slide-up">
              <h2 className="mb-3 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                Entradas recientes
              </h2>
              <div className="divide-y divide-border rounded-lg border border-border bg-background">
                {entradas.slice(0, 15).map((e) => {
                  const prodActual = findProductBySku(e.sku);
                  const nombreMostrar = prodActual?.name ?? e.producto;
                  const enCatalogo = !!prodActual;
                  return (
                    <div key={e.id} className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40">
                      <span className="font-mono text-[12px] tabular-nums text-foreground">+{e.cantidad}</span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 truncate text-[13px] font-medium text-foreground">
                          {nombreMostrar}
                          {!enCatalogo && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-normal text-muted-foreground">
                              <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                              no en catálogo
                            </span>
                          )}
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground">{e.sku}</p>
                      </div>
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {new Date(e.fecha).toLocaleDateString("es-PE")}
                      </span>
                      <button
                        onClick={async () => {
                          const ok = await confirm({
                            title: "Eliminar entrada de inventario",
                            description: `¿Eliminar la entrada de ${e.cantidad} × ${e.producto || e.sku}? Se descontará del stock.`,
                            critical: e.series && e.series.length > 0,
                            details: `Fecha: ${new Date(e.fecha).toLocaleString("es-PE")}\nSKU: ${e.sku}${e.nGuia ? `\nGuía: ${e.nGuia}` : ""}${e.series?.length ? `\nSeries: ${e.series.length}` : ""}\n\n${e.series?.length ? "Las series también se eliminarán." : "El stock será descontado."}`,
                          });
                          if (ok) deleteEntrada(e.id);
                        }}
                        aria-label="Eliminar entrada"
                        className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      >
                        <Trash className="h-3.5 w-3.5" {...ICON_PROPS} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : (
            <div className="anim-fade-in rounded-lg border border-dashed border-border bg-background px-4 py-16 text-center text-[13px] text-muted-foreground">
              No hay entradas registradas. Ingresa materiales desde la página de Recepciones.
            </div>
          )}
        </>
      )}



      {/* Dialog añadir/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-lg border-border p-0">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
              <Hash className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
              {editing ? "Editar producto" : "Añadir producto"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 px-6 py-5">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="p-sku" className="text-[12px] font-medium text-muted-foreground">SKU *</Label>
              <Input
                id="p-sku"
                value={form.sku}
                onChange={(e) => { setForm({ ...form, sku: e.target.value }); setDupError(false); }}
                placeholder="Ej. 1066990"
                className={cn("rounded-lg border-border font-mono text-[13px]", dupError && "border-destructive")}
                autoFocus
              />
              {dupError && (
                <p className="flex items-center gap-1 text-[11px] text-destructive">
                  <AlertCircle className="h-3 w-3" {...ICON_PROPS} />
                  Ya existe un producto con este SKU
                </p>
              )}
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="p-name" className="text-[12px] font-medium text-muted-foreground">Nombre del producto *</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. CONECTOR FIBRA OPTICA FTTH PPC"
                className="rounded-lg border-border text-[13px]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-qty" className="text-[12px] font-medium text-muted-foreground">Stock actual</Label>
              <Input
                id="p-qty"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="Ej. 41"
                inputMode="numeric"
                className="rounded-lg border-border text-[13px] tabular-nums"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-min" className="text-[12px] font-medium text-muted-foreground">Stock mínimo</Label>
              <Input
                id="p-min"
                value={form.minStock}
                onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                placeholder="Ej. 10"
                inputMode="numeric"
                className="rounded-lg border-border text-[13px] tabular-nums"
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="p-udm" className="text-[12px] font-medium text-muted-foreground">Unidad de medida</Label>
              <Input
                id="p-udm"
                value={form.udm}
                onChange={(e) => setForm({ ...form, udm: e.target.value })}
                placeholder="UNIDADES, METROS…"
                className="rounded-lg border-border text-[13px]"
              />
            </div>
          </div>
          <DialogFooter className="flex-row justify-end gap-2 border-t border-border px-6 py-4">
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="h-9 rounded-lg px-3.5 text-[13px] font-medium hover:bg-muted"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.sku.trim() || !form.name.trim()}
              className="h-9 rounded-lg bg-foreground px-3.5 text-[13px] font-medium text-background shadow-none hover:bg-foreground/90"
            >
              {editing ? "Guardar" : "Añadir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Importar SKUs (entrada masiva) */}
      <Dialog open={entradaOpen} onOpenChange={setEntradaOpen}>
        <DialogContent className="rounded-lg border-border p-0">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
              <ClipboardPaste className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
              Importar SKUs
            </DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground">
              Pega una lista de productos en formato <span className="font-mono text-foreground">SKU*Cantidad</span>, uno por linea.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5">
            {/* Botón pegar del portapapeles */}
            <div className="mb-3 flex items-center justify-between">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Texto a importar
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                      setEntradaText(text);
                      setEntradaMsg("");
                    }
                  } catch {
                    // permiso denegado — el usuario pega manualmente
                  }
                }}
                className="h-7 rounded-md border-border bg-background px-2.5 text-[11px] font-medium hover:bg-muted"
              >
                <ClipboardPaste className="mr-1 h-3 w-3" {...ICON_PROPS} /> Pegar
              </Button>
            </div>
            <Textarea
              value={entradaText}
              onChange={(e) => { setEntradaText(e.target.value); setEntradaMsg(""); }}
              placeholder={"SKU001*10\nSKU002*5\nSKU003*20"}
              className="min-h-[140px] rounded-lg border-border font-mono text-[13px]"
              autoFocus
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Formatos: <span className="font-mono text-foreground">SKU*QTY</span>, <span className="font-mono text-foreground">SKU&lt;tab&gt;QTY</span>, o solo <span className="font-mono text-foreground">SKU</span> (cantidad = 1)
            </p>

            {/* Live preview */}
            {entradaPreview.length > 0 && (
              <div className="mt-4 space-y-1">
                {entradaPreview.map((p) => (
                  <div
                    key={p.i}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px]",
                      p.ok && p.producto
                        ? "border-border bg-muted/40"
                        : "border-destructive/30 bg-destructive/5"
                    )}
                  >
                    {p.ok && p.producto ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-muted-foreground" {...ICON_PROPS} />
                    ) : (
                      <X className="h-3.5 w-3.5 shrink-0 text-destructive" {...ICON_PROPS} />
                    )}
                    <span className="font-mono text-[11px] text-foreground">{p.sku || "?"}</span>
                    <span className="text-muted-foreground">×</span>
                    <span className="tabular-nums text-foreground">{isNaN(p.cantidad) ? "?" : p.cantidad}</span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {p.producto ? p.producto.name : p.motivo}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Check className="h-3 w-3" {...ICON_PROPS} /> {validCount} válida(s)
                  </span>
                  {invalidCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-destructive">
                      <X className="h-3 w-3" {...ICON_PROPS} /> {invalidCount} con problema(s)
                    </span>
                  )}
                </div>
              </div>
            )}

            {entradaMsg && (
              <p className={cn("mt-4 text-[12px] font-medium", entradaMsg.includes("incorrecto") ? "text-destructive" : "text-foreground")}>
                {entradaMsg}
              </p>
            )}
          </div>

          <DialogFooter className="flex-row justify-end gap-2 border-t border-border px-6 py-4">
            <Button
              variant="ghost"
              onClick={() => setEntradaOpen(false)}
              className="h-9 rounded-lg px-3.5 text-[13px] font-medium hover:bg-muted"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEntrada}
              disabled={!entradaText.trim()}
              className="h-9 rounded-lg bg-foreground px-3.5 text-[13px] font-medium text-background shadow-none hover:bg-foreground/90"
            >
              <ClipboardPaste className="mr-1.5 h-4 w-4" {...ICON_PROPS} /> Importar SKUs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog importar inventario completo */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto scroll-thin rounded-lg border-border p-0">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
              <Upload className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
              Importar inventario desde Excel
            </DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground">
              Se detectaron {importPreview.length} producto(s). Los que ya existen se actualizarán con el stock del Excel.
            </DialogDescription>
          </DialogHeader>

          {/* Resumen */}
          <div className="flex flex-wrap gap-6 border-b border-border px-6 py-4 text-[12px]">
            <div>
              <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">Total</span>
              <span className="text-[15px] font-semibold tabular-nums text-foreground">{importPreview.length}</span>
            </div>
            <div>
              <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">A actualizar</span>
              <span className="text-[15px] font-semibold tabular-nums text-foreground">{importPreview.filter(p => p.existe).length}</span>
            </div>
            <div>
              <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">Nuevos</span>
              <span className="text-[15px] font-semibold tabular-nums text-foreground">{importPreview.filter(p => !p.existe).length}</span>
            </div>
          </div>

          {/* Vista previa */}
          <div className="max-h-[300px] overflow-y-auto scroll-thin">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2 font-medium">SKU</th>
                  <th className="px-4 py-2 font-medium">Producto</th>
                  <th className="px-4 py-2 text-right font-medium">Cantidad</th>
                  <th className="px-4 py-2 font-medium">UdM</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {importPreview.map((p, i) => (
                  <tr key={i} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-2 font-mono text-[11px] text-foreground">{p.sku}</td>
                    <td className="max-w-[220px] truncate px-4 py-2 text-foreground">{p.nombre}</td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums text-foreground">{fmtNum(p.cantidad)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{p.udm ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            p.existe ? "bg-foreground/60" : "bg-foreground"
                          )}
                        />
                        {p.existe ? "Actualizar" : "Nuevo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {importResult && (
            <div className="flex items-center gap-2 border-t border-border px-6 py-3 text-[13px] text-foreground">
              <Check className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
              {importResult.msg}
            </div>
          )}

          <DialogFooter className="sticky bottom-0 flex-row justify-end gap-2 border-t border-border bg-background px-6 py-4">
            <Button
              variant="ghost"
              onClick={() => setImportOpen(false)}
              className="h-9 rounded-lg px-3.5 text-[13px] font-medium hover:bg-muted"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmImport}
              disabled={importPreview.length === 0 || !!importResult}
              className="h-9 rounded-lg bg-foreground px-3.5 text-[13px] font-medium text-background shadow-none hover:bg-foreground/90"
            >
              <Check className="mr-1.5 h-4 w-4" {...ICON_PROPS} />
              Confirmar importación ({importPreview.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {ConfirmDialog}
    </div>
  );
}
