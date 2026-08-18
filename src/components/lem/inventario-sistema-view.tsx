"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  Hash,
  Download,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import { parseNum, fmtNum } from "@/lib/num";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export function InventarioView() {
  const products = useStore((s) => s.products);
  const addProduct = useStore((s) => s.addProduct);
  const updateProduct = useStore((s) => s.updateProduct);
  const deleteProduct = useStore((s) => s.deleteProduct);
  const findProductBySku = useStore((s) => s.findProductBySku);
  const exportInventarioExcel = useStore((s) => s.exportInventarioExcel);
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ sku: "", name: "", quantity: "", minStock: "", category: "", udm: "UNIDADES" });
  const [dupError, setDupError] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const sorted = [...products].sort((a, b) => a.sku.localeCompare(b.sku, undefined, { numeric: true }));
    if (!q) return sorted;
    return sorted.filter(
      (p) =>
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q)
    );
  }, [products, query]);

  const totalUnidades = products.reduce((s, p) => s + p.quantity, 0);

  const openCreate = () => {
    setEditing(null);
    setForm({ sku: "", name: "", quantity: "", minStock: "", category: "", udm: "UNIDADES" });
    setDupError(false);
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      sku: p.sku,
      name: p.name,
      quantity: String(p.quantity),
      minStock: p.minStock !== undefined ? String(p.minStock) : "",
      category: p.category ?? "",
      udm: p.udm ?? "UNIDADES",
    });
    setDupError(false);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const skuTrim = form.sku.trim();
    const nameTrim = form.name.trim();
    if (!skuTrim || !nameTrim) return;

    if (editing) {
      updateProduct(editing.id, {
        sku: skuTrim,
        name: nameTrim,
        quantity: parseNum(form.quantity) ?? 0,
        minStock: form.minStock.trim() ? parseNum(form.minStock) : undefined,
        category: form.category.trim() || undefined,
        udm: form.udm.trim() || undefined,
      });
      toast({ title: "Producto actualizado" });
    } else {
      if (findProductBySku(skuTrim)) {
        setDupError(true);
        return;
      }
      const id = addProduct(
        skuTrim,
        nameTrim,
        parseNum(form.quantity) ?? 0,
        form.minStock.trim() ? parseNum(form.minStock) : undefined,
        form.category.trim() || undefined,
        form.udm.trim() || undefined
      );
      if (!id) {
        setDupError(true);
        return;
      }
      toast({ title: "Producto añadido", description: `${skuTrim} · ${nameTrim}` });
    }
    setDialogOpen(false);
  };

  const handleDelete = (p: Product) => {
    deleteProduct(p.id);
    toast({ title: "Producto eliminado", description: `${p.sku} · ${p.name}` });
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      {/* Encabezado */}
      <div className="anim-fade-up mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Inventario</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} producto(s) · {fmtNum(totalUnidades)} unidades en stock
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-48">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar SKU o nombre…"
              className="h-9 rounded-xl bg-muted/50 pl-8 text-sm"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              exportInventarioExcel();
              toast({ title: "Exportando a Excel…" });
            }}
            className="press h-9 rounded-xl"
          >
            <Download className="mr-1.5 h-4 w-4" />
            Exportar
          </Button>
          <Button onClick={openCreate} className="press h-9 rounded-xl">
            <Plus className="mr-1.5 h-4 w-4" />
            Añadir
          </Button>
        </div>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
          {products.length === 0
            ? "No hay productos. Haz clic en \"Añadir\" para crear el primero."
            : "Sin coincidencias."}
        </div>
      ) : (
        <div className="anim-fade-up overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">SKU</th>
                  <th className="px-4 py-2.5 font-medium">Producto</th>
                  <th className="px-4 py-2.5 font-medium">Cat.</th>
                  <th className="px-4 py-2.5 text-right font-medium">Stock</th>
                  <th className="px-4 py-2.5 text-right font-medium">Mín.</th>
                  <th className="px-4 py-2.5 font-medium">UdM</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const bajo = p.minStock !== undefined && p.minStock > 0 && p.quantity <= p.minStock;
                  return (
                    <tr key={p.id} className="group border-b border-border/50 last:border-0 hover:bg-accent/30">
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-[12px] font-semibold">{p.sku}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[13px] font-medium">{p.name}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        {p.category && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {p.category}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span
                          className={cn(
                            "inline-flex min-w-[48px] justify-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold tabular-nums",
                            bajo
                              ? "bg-destructive/10 text-destructive"
                              : "bg-primary/10 text-primary"
                          )}
                        >
                          {fmtNum(p.quantity)}
                        </span>
                        {bajo && <AlertTriangle className="ml-1 inline h-3 w-3 text-destructive" />}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[12px] tabular-nums text-muted-foreground">
                        {p.minStock !== undefined ? fmtNum(p.minStock) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-muted-foreground">{p.udm ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => openEdit(p)}
                            className="press rounded-md p-1.5 text-muted-foreground hover:bg-accent"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="press rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
          </div>
        </div>
      )}

      {/* Dialog añadir/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              {editing ? "Editar producto" : "Añadir producto"}
            </DialogTitle>
            <DialogDescription>
              El SKU es el código único del producto. El stock se descuenta
              automáticamente al registrar despachos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-1">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="p-sku">SKU *</Label>
              <Input
                id="p-sku"
                value={form.sku}
                onChange={(e) => { setForm({ ...form, sku: e.target.value }); setDupError(false); }}
                placeholder="Ej. 4076358"
                className={cn("rounded-xl font-mono", dupError && "border-destructive")}
                autoFocus
              />
              {dupError && (
                <p className="flex items-center gap-1 text-[11px] text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  Ya existe un producto con este SKU
                </p>
              )}
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="p-name">Nombre del producto *</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. ROUTER ONT HG8145X6-13 HUAWEI"
                className="rounded-xl"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-qty">Stock actual</Label>
              <Input
                id="p-qty"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="Ej. 2768"
                inputMode="numeric"
                className="rounded-xl tabular-nums"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-min">Stock mínimo</Label>
              <Input
                id="p-min"
                value={form.minStock}
                onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                placeholder="Ej. 100"
                inputMode="numeric"
                className="rounded-xl tabular-nums"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-cat">Categoría</Label>
              <Input
                id="p-cat"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Ej. Router, Cable…"
                className="rounded-xl"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-udm">Unidad de medida</Label>
              <Input
                id="p-udm"
                value={form.udm}
                onChange={(e) => setForm({ ...form, udm: e.target.value })}
                placeholder="UNIDADES, METROS…"
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.sku.trim() || !form.name.trim()}
              className="rounded-xl"
            >
              {editing ? "Guardar cambios" : "Añadir producto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
