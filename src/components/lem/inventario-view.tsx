"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  Hash,
  Download,
  ArrowDownToLine,
  Trash,
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

  const filtered = [...products]
    .sort((a, b) => a.sku.localeCompare(b.sku, undefined, { numeric: true }))
    .filter((p) => {
      const q = query.toLowerCase().trim();
      if (!q) return true;
      return p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
    });

  const totalUnidades = products.reduce((s, p) => s + p.quantity, 0);

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

  return (
    <div className="px-6 py-6">
      <div className="anim-fade-up mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Inventario</h1>
          <p className="text-sm text-muted-foreground">{products.length} producto(s) · {fmtNum(totalUnidades)} unidades</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-48">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar SKU…" className="h-9 rounded-xl bg-muted/50 pl-8 text-sm" />
          </div>
          <Button variant="outline" onClick={() => setEntradaOpen(true)} className="press h-9 rounded-xl">
            <ArrowDownToLine className="mr-1.5 h-4 w-4" /> Entrada
          </Button>
          <Button variant="outline" onClick={() => exportInventarioExcel()} className="press h-9 rounded-xl">
            <Download className="mr-1.5 h-4 w-4" /> Exportar
          </Button>
          <Button onClick={openCreate} className="press h-9 rounded-xl">
            <Plus className="mr-1.5 h-4 w-4" /> Añadir
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
          {products.length === 0 ? "No hay productos. Haz clic en \"Añadir\"." : "Sin coincidencias."}
        </div>
      ) : (
        <div className="anim-fade-up overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">SKU</th>
                  <th className="px-4 py-2.5 font-medium">Producto</th>
                  <th className="px-4 py-2.5 text-right font-medium">Stock</th>
                  <th className="px-4 py-2.5 text-right font-medium">Mín</th>
                  <th className="px-4 py-2.5 font-medium">UdM</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const bajo = p.minStock !== undefined && p.minStock > 0 && p.quantity <= p.minStock;
                  return (
                    <tr key={p.id} className="group border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors duration-200">
                      <td className="px-4 py-2.5"><span className="font-mono text-[12px] font-semibold">{p.sku}</span></td>
                      <td className="px-4 py-2.5"><span className="text-[13px] font-medium">{p.name}</span></td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={cn("inline-flex min-w-[48px] justify-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold tabular-nums", bajo ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
                          {fmtNum(p.quantity)}
                        </span>
                        {bajo && <AlertTriangle className="ml-1 inline h-3 w-3 text-destructive" />}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[12px] tabular-nums text-muted-foreground">{p.minStock ? fmtNum(p.minStock) : "—"}</td>
                      <td className="px-4 py-2.5 text-[11px] text-muted-foreground">{p.udm ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button onClick={() => openEdit(p)} className="press rounded-md p-1.5 text-muted-foreground hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => deleteProduct(p.id)} className="press rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
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

      {/* Entradas recientes */}
      {entradas.length > 0 && (
        <div className="anim-fade-up mt-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Entradas recientes</h2>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto scroll-thin">
            {entradas.slice(0, 15).map((e) => (
              <div key={e.id} className="group flex items-center gap-2.5 rounded-xl border border-border/60 p-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary">+{e.cantidad}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium">{e.producto}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{e.sku}</p>
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(e.fecha).toLocaleDateString("es-PE")}</span>
                <button onClick={() => deleteEntrada(e.id)} className="press rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"><Trash className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dialog añadir/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Hash className="h-4 w-4" />{editing ? "Editar producto" : "Añadir producto"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-1">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="p-sku">SKU *</Label>
              <Input id="p-sku" value={form.sku} onChange={(e) => { setForm({ ...form, sku: e.target.value }); setDupError(false); }} placeholder="Ej. 1066990" className={cn("rounded-xl font-mono", dupError && "border-destructive")} autoFocus />
              {dupError && <p className="flex items-center gap-1 text-[11px] text-destructive"><AlertTriangle className="h-3 w-3" />Ya existe un producto con este SKU</p>}
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="p-name">Nombre del producto *</Label>
              <Input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. CONECTOR FIBRA OPTICA FTTH PPC" className="rounded-xl" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-qty">Stock actual</Label>
              <Input id="p-qty" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="Ej. 41" inputMode="numeric" className="rounded-xl tabular-nums" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-min">Stock mínimo</Label>
              <Input id="p-min" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} placeholder="Ej. 10" inputMode="numeric" className="rounded-xl tabular-nums" />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="p-udm">Unidad de medida</Label>
              <Input id="p-udm" value={form.udm} onChange={(e) => setForm({ ...form, udm: e.target.value })} placeholder="UNIDADES, METROS…" className="rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.sku.trim() || !form.name.trim()} className="rounded-xl">{editing ? "Guardar" : "Añadir"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog entrada rápida */}
      <Dialog open={entradaOpen} onOpenChange={setEntradaOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ArrowDownToLine className="h-4 w-4" />Entrada de mercadería</DialogTitle>
            <DialogDescription>
              Escribe una línea por entrada con el formato: <strong>SKU*cantidad</strong><br />
              Ejemplo: <code className="font-mono text-primary">1066990*100</code>
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={entradaText}
            onChange={(e) => { setEntradaText(e.target.value); setEntradaMsg(""); }}
            placeholder={"1066990*100\n1002900*50\n4076358*5"}
            className="min-h-[120px] rounded-xl font-mono text-[13px]"
            autoFocus
          />
          {entradaMsg && <p className={cn("text-[12px] font-medium", entradaMsg.includes("incorrecto") ? "text-destructive" : "text-primary")}>{entradaMsg}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntradaOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleEntrada} disabled={!entradaText.trim()} className="rounded-xl">Registrar entrada</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
