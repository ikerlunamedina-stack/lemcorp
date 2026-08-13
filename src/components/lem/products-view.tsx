"use client";

import { useMemo, useState } from "react";
import {
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  Sparkles,
  Hash,
  Tag as TagIcon,
  Upload,
  Check,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export function ProductsView() {
  const products = useStore((s) => s.products);
  const files = useStore((s) => s.files);
  const addProduct = useStore((s) => s.addProduct);
  const updateProduct = useStore((s) => s.updateProduct);
  const deleteProduct = useStore((s) => s.deleteProduct);
  const importProductsBulk = useStore((s) => s.importProductsBulk);
  const findProductBySku = useStore((s) => s.findProductBySku);
  const getMismatches = useStore((s) => s.getMismatches);
  const getSuggestions = useStore((s) => s.getSuggestions);
  const openFile = useStore((s) => s.openFile);
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [dupError, setDupError] = useState(false);

  const mismatches = useMemo(() => getMismatches(), [getMismatches, files, products]);
  const suggestions = useMemo(() => getSuggestions(), [getSuggestions, files, products]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q)
    );
  }, [products, query]);

  const byCategory = useMemo(() => {
    const m: Record<string, Product[]> = {};
    for (const p of filtered) {
      const k = p.category || "Sin categoría";
      if (!m[k]) m[k] = [];
      m[k].push(p);
    }
    return m;
  }, [filtered]);

  const openCreate = () => {
    setEditing(null);
    setSku("");
    setName("");
    setCategory("");
    setDupError(false);
    setCreateOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setSku(p.sku);
    setName(p.name);
    setCategory(p.category ?? "");
    setDupError(false);
    setCreateOpen(true);
  };

  const handleSave = () => {
    if (!sku.trim() || !name.trim()) return;
    if (editing) {
      const clash = findProductBySku(sku.trim());
      if (clash && clash.id !== editing.id) {
        setDupError(true);
        return;
      }
      updateProduct(editing.id, sku, name, category);
      toast({ title: "Producto actualizado", description: name });
    } else {
      if (findProductBySku(sku.trim())) {
        setDupError(true);
        return;
      }
      const id = addProduct(sku, name, category);
      if (!id) {
        setDupError(true);
        return;
      }
      toast({ title: "Producto añadido", description: `${sku} · ${name}` });
    }
    setCreateOpen(false);
  };

  const handleAddSuggestion = (s: { sku: string; name: string }) => {
    if (findProductBySku(s.sku)) return;
    addProduct(s.sku, s.name);
    toast({
      title: "Producto añadido desde archivos",
      description: `${s.sku} · ${s.name}`,
    });
  };

  const handleAddAllSuggestions = () => {
    const added = importProductsBulk(
      suggestions.map((s) => ({ sku: s.sku, name: s.name }))
    );
    toast({
      title: `${added} producto(s) añadido(s)`,
      description:
        added === 0
          ? "No había sugerencias nuevas"
          : "Catálogo actualizado desde tus archivos",
    });
  };

  const handleDelete = (p: Product) => {
    deleteProduct(p.id);
    toast({ title: "Producto eliminado", description: `${p.sku} · ${p.name}` });
  };

  if (products.length === 0 && files.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="anim-fade-up flex flex-col items-center gap-5 rounded-3xl border border-border bg-card p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Package className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold">Catálogo de productos</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Registra aquí los productos de LEMCORP con su SKU (el código único,
              como el DNI del producto) y su nombre canónico. La app detecta el
              SKU en tus archivos y avisa si un mismo SKU aparece con distinto
              nombre.
            </p>
          </div>
          <Button onClick={openCreate} className="press rounded-xl">
            <Plus className="mr-1.5 h-4 w-4" />
            Añadir primer producto
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      {/* Encabezado */}
      <div className="anim-fade-up mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Catálogo de productos</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} producto(s) registrado(s) · {mismatches.length} discrepancia(s) detectada(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar SKU o nombre…"
              className="h-9 rounded-xl bg-muted/50 pl-8 text-sm"
            />
          </div>
          <Button onClick={openCreate} className="press rounded-xl">
            <Plus className="mr-1.5 h-4 w-4" />
            Añadir producto
          </Button>
        </div>
      </div>

      {/* Banner de discrepancias */}
      {mismatches.length > 0 && (
        <div className="anim-fade-up mb-4 flex flex-col gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-[13px] font-semibold text-destructive">
              {mismatches.length} discrepancia(s) de nombre para SKUs ya registrados
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Se encontraron filas donde el SKU existe en el catálogo pero el nombre
            no coincide. Revisa y corrige el dato en el archivo o actualiza el
            nombre canónico del producto.
          </p>
          <div className="mt-1 max-h-44 overflow-y-auto scroll-thin">
            <table className="w-full text-xs">
              <tbody>
                {mismatches.slice(0, 20).map((m, i) => (
                  <tr key={i} className="border-t border-border/50 first:border-0">
                    <td className="py-1.5 pr-2 font-mono text-[11px] text-muted-foreground">
                      {m.sku}
                    </td>
                    <td className="py-1.5 pr-2">
                      <span className="text-destructive line-through">
                        {m.actualName}
                      </span>
                    </td>
                    <td className="py-1.5 pr-2 text-muted-foreground">→</td>
                    <td className="py-1.5 pr-2 font-medium">{m.expectedName}</td>
                    <td className="py-1.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="press h-6 rounded-md text-[10px]"
                        onClick={() => openFile(m.fileId)}
                      >
                        {m.fileName} · fila {m.row + 1}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {mismatches.length > 20 && (
              <p className="px-1 py-1.5 text-[10px] text-muted-foreground">
                …y {mismatches.length - 20} más
              </p>
            )}
          </div>
        </div>
      )}

      {/* Sugerencias de SKUs no catalogados */}
      {suggestions.length > 0 && (
        <div className="anim-fade-up mb-4 rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <p className="text-[13px] font-semibold">
                {suggestions.length} SKU(s) detectados en archivos pero no en el catálogo
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="press h-7 rounded-lg text-xs"
              onClick={handleAddAllSuggestions}
            >
              <Upload className="mr-1.5 h-3 w-3" />
              Añadir todos
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.slice(0, 12).map((s) => (
              <button
                key={s.sku}
                onClick={() => handleAddSuggestion(s)}
                className="press group flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] transition-colors hover:bg-accent"
                title={`Añadir ${s.sku} desde ${s.fromFiles.join(", ")}`}
              >
                <span className="font-mono font-medium">{s.sku}</span>
                <span className="max-w-[180px] truncate text-muted-foreground">
                  {s.name}
                </span>
                <Plus className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
            {suggestions.length > 12 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="press rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium">
                    +{suggestions.length - 12} más
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto scroll-thin rounded-xl">
                  {suggestions.slice(12).map((s) => (
                    <DropdownMenuItem
                      key={s.sku}
                      onClick={() => handleAddSuggestion(s)}
                      className="flex items-center gap-2"
                    >
                      <span className="font-mono text-[11px]">{s.sku}</span>
                      <span className="max-w-[220px] truncate text-muted-foreground">
                        {s.name}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      )}

      {/* Lista de productos */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
          {products.length === 0
            ? "Aún no hay productos en el catálogo. Añade el primero o importa desde tus archivos."
            : "Sin coincidencias para tu búsqueda."}
        </div>
      ) : (
        <div className="anim-fade-up overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Hash className="h-3 w-3" />
                      SKU
                    </span>
                  </th>
                  <th className="px-4 py-2.5 font-medium">Nombre del producto</th>
                  <th className="px-4 py-2.5 font-medium">Categoría</th>
                  <th className="px-4 py-2.5 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byCategory).map(([cat, items]) => (
                  <ProductGroup
                    key={cat}
                    category={cat}
                    items={items}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal crear/editar */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              {editing ? "Editar producto" : "Añadir producto"}
            </DialogTitle>
            <DialogDescription>
              El SKU es el código único del producto (como su DNI). Si dos
              archivos usan el mismo SKU con distinto nombre, la app lanzará una
              advertencia.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-sku">SKU *</Label>
              <Input
                id="p-sku"
                value={sku}
                onChange={(e) => {
                  setSku(e.target.value);
                  setDupError(false);
                }}
                placeholder="Ej. 4076358"
                className={cn(
                  "rounded-xl font-mono",
                  dupError && "border-destructive focus-visible:ring-destructive/30"
                )}
                autoFocus
              />
              {dupError && (
                <p className="flex items-center gap-1 text-[11px] text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  Ya existe un producto con este SKU
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-name">Nombre del producto *</Label>
              <Input
                id="p-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. ROUTER ONT HG8145X6-13 HUAWEI"
                className="rounded-xl"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-cat">Categoría (opcional)</Label>
              <Input
                id="p-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ej. Router, ONT, Cable, Conector…"
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!sku.trim() || !name.trim()}
              className="rounded-xl"
            >
              {editing ? "Guardar cambios" : "Añadir al catálogo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductGroup({
  category,
  items,
  onEdit,
  onDelete,
}: {
  category: string;
  items: Product[];
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}) {
  return (
    <>
      <tr className="border-b border-border bg-muted/20">
        <td
          colSpan={4}
          className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
        >
          <span className="flex items-center gap-1.5">
            <TagIcon className="h-3 w-3" />
            {category} · {items.length}
          </span>
        </td>
      </tr>
      {items.map((p) => (
        <tr
          key={p.id}
          className="border-b border-border/50 last:border-0 group hover:bg-accent/30"
        >
          <td className="px-4 py-2.5">
            <span className="font-mono text-[12px] font-semibold">{p.sku}</span>
          </td>
          <td className="px-4 py-2.5">
            <span className="text-[13px] font-medium">{p.name}</span>
          </td>
          <td className="px-4 py-2.5">
            {p.category && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {p.category}
              </span>
            )}
          </td>
          <td className="px-4 py-2.5">
            <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => onEdit(p)}
                className="press rounded-md p-1.5 text-muted-foreground hover:bg-accent"
                title="Editar"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDelete(p)}
                className="press rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title="Eliminar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}
