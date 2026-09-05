"use client";

import { useMemo, useState, useRef } from "react";
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
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import { parseNum, fmtNum } from "@/lib/num";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const ICON_PROPS = { strokeWidth: 1.5 } as const;

export function InventarioView() {
  const products = useStore((s) => s.products);
  const addProduct = useStore((s) => s.addProduct);
  const updateProduct = useStore((s) => s.updateProduct);
  const deleteProduct = useStore((s) => s.deleteProduct);
  const findProductBySku = useStore((s) => s.findProductBySku);
  const registrarEntrada = useStore((s) => s.registrarEntrada);
  const entradas = useStore((s) => s.entradas);
  const deleteEntrada = useStore((s) => s.deleteEntrada);
  const exportInventarioExcel = useStore((s) => s.exportInventarioExcel);

  const [query, setQuery] = useState("");
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
        if (!q) return true;
        return p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
      });
  }, [products, query]);

  const totalUnidades = useMemo(() => products.reduce((s, p) => s + p.quantity, 0), [products]);

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

  // ─── Live preview de la entrada (parseo SKU*cantidad) ───
  const entradaPreview = useMemo(() => {
    const lines = entradaText.split("\n").map((l) => l.trim()).filter(Boolean);
    return lines.map((line, i) => {
      const parts = line.split("*");
      if (parts.length < 2) {
        return { i, line, sku: "", cantidad: NaN, producto: null, ok: false, motivo: "Formato incorrecto. Usa SKU*cantidad." };
      }
      const sku = parts[0].trim();
      const cantidad = parseInt(parts[1].trim(), 10);
      if (!sku || isNaN(cantidad) || cantidad <= 0) {
        return { i, line, sku, cantidad, producto: null, ok: false, motivo: "Cantidad inválida." };
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
              className="h-9 rounded-md border-border bg-background pl-8 text-[13px]"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => importFileRef.current?.click()}
            disabled={importingInv}
            className="h-9 rounded-md border-border bg-background px-3.5 text-[13px] font-medium hover:bg-muted"
          >
            {importingInv
              ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" {...ICON_PROPS} />
              : <Upload className="mr-1.5 h-4 w-4" {...ICON_PROPS} />}
            {importingInv ? "Importando…" : "Importar"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setEntradaOpen(true)}
            className="h-9 rounded-md border-border bg-background px-3.5 text-[13px] font-medium hover:bg-muted"
          >
            <ArrowDownToLine className="mr-1.5 h-4 w-4" {...ICON_PROPS} /> Entrada
          </Button>
          <Button
            variant="outline"
            onClick={() => exportInventarioExcel()}
            className="h-9 rounded-md border-border bg-background px-3.5 text-[13px] font-medium hover:bg-muted"
          >
            <Download className="mr-1.5 h-4 w-4" {...ICON_PROPS} /> Exportar
          </Button>
          <Button
            onClick={openCreate}
            className="h-9 rounded-md bg-foreground px-3.5 text-[13px] font-medium text-background shadow-none hover:bg-foreground/90"
          >
            <Plus className="mr-1.5 h-4 w-4" {...ICON_PROPS} /> Añadir
          </Button>
        </div>
      </header>

      {/* Tabla inventario */}
      {filtered.length === 0 ? (
        <div className="anim-fade-in rounded-lg border border-dashed border-border bg-background px-4 py-16 text-center text-[13px] text-muted-foreground">
          {products.length === 0 ? "No hay productos. Pulsa “Añadir” para crear el primero." : "Sin coincidencias."}
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
                <th className="px-4 py-2.5 font-medium">UdM</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => {
                const bajo = p.minStock !== undefined && p.minStock > 0 && p.quantity <= p.minStock;
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
                    <td className="px-4 py-3 text-[12px] text-muted-foreground">{p.udm ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        <button
                          onClick={() => openEdit(p)}
                          aria-label="Editar producto"
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" {...ICON_PROPS} />
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id)}
                          aria-label="Eliminar producto"
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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

      {/* Entradas recientes */}
      {entradas.length > 0 && (
        <section className="anim-slide-up mt-10">
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
                    onClick={() => deleteEntrada(e.id)}
                    aria-label="Eliminar entrada"
                    className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash className="h-3.5 w-3.5" {...ICON_PROPS} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
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
                className={cn("rounded-md border-border font-mono text-[13px]", dupError && "border-destructive")}
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
                className="rounded-md border-border text-[13px]"
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
                className="rounded-md border-border text-[13px] tabular-nums"
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
                className="rounded-md border-border text-[13px] tabular-nums"
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="p-udm" className="text-[12px] font-medium text-muted-foreground">Unidad de medida</Label>
              <Input
                id="p-udm"
                value={form.udm}
                onChange={(e) => setForm({ ...form, udm: e.target.value })}
                placeholder="UNIDADES, METROS…"
                className="rounded-md border-border text-[13px]"
              />
            </div>
          </div>
          <DialogFooter className="flex-row justify-end gap-2 border-t border-border px-6 py-4">
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="h-9 rounded-md px-3.5 text-[13px] font-medium hover:bg-muted"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.sku.trim() || !form.name.trim()}
              className="h-9 rounded-md bg-foreground px-3.5 text-[13px] font-medium text-background shadow-none hover:bg-foreground/90"
            >
              {editing ? "Guardar" : "Añadir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog entrada rápida */}
      <Dialog open={entradaOpen} onOpenChange={setEntradaOpen}>
        <DialogContent className="rounded-lg border-border p-0">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
              <ArrowDownToLine className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
              Entrada de mercadería
            </DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground">
              Escribe una línea por entrada con el formato: <span className="font-mono text-foreground">SKU*cantidad</span>. Ejemplo:{" "}
              <span className="font-mono text-foreground">1066990*100</span>
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5">
            <Textarea
              value={entradaText}
              onChange={(e) => { setEntradaText(e.target.value); setEntradaMsg(""); }}
              placeholder={"1066990*100\n1002900*50\n4076358*5"}
              className="min-h-[120px] rounded-md border-border font-mono text-[13px]"
              autoFocus
            />

            {/* Live preview */}
            {entradaPreview.length > 0 && (
              <div className="mt-4 space-y-1">
                {entradaPreview.map((p) => (
                  <div
                    key={p.i}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-[12px]",
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
              className="h-9 rounded-md px-3.5 text-[13px] font-medium hover:bg-muted"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEntrada}
              disabled={!entradaText.trim()}
              className="h-9 rounded-md bg-foreground px-3.5 text-[13px] font-medium text-background shadow-none hover:bg-foreground/90"
            >
              Registrar entrada
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
              className="h-9 rounded-md px-3.5 text-[13px] font-medium hover:bg-muted"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmImport}
              disabled={importPreview.length === 0 || !!importResult}
              className="h-9 rounded-md bg-foreground px-3.5 text-[13px] font-medium text-background shadow-none hover:bg-foreground/90"
            >
              <Check className="mr-1.5 h-4 w-4" {...ICON_PROPS} />
              Confirmar importación ({importPreview.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
