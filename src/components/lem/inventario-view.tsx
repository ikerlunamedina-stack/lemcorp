"use client";

import { useMemo, useState } from "react";
import {
  Boxes,
  Search,
  BookMarked,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Sparkles,
  Hash,
  Upload,
  Info,
  Package as PackageIcon,
  ArrowRight,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { extractUnifiedInventory, type InventoryItem } from "@/lib/inventory";
import type { Product } from "@/lib/types";
import { fmtNum } from "@/lib/num";
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
  const files = useStore((s) => s.files);
  const products = useStore((s) => s.products);
  const openFile = useStore((s) => s.openFile);
  const createFile = useStore((s) => s.createFile);
  const getMismatches = useStore((s) => s.getMismatches);
  const getSuggestions = useStore((s) => s.getSuggestions);
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("todas");
  const [catalogOpen, setCatalogOpen] = useState(false);

  const { items, columns } = useMemo(
    () => extractUnifiedInventory(files),
    [files]
  );
  const mismatches = useMemo(() => getMismatches(), [getMismatches, files, products]);
  const suggestions = useMemo(() => getSuggestions(), [getSuggestions, files, products]);

  const invFiles = files.filter((f) => f.tag === "inventario");

  const categories = useMemo(() => {
    const s = new Set<string>();
    for (const it of items) if (it.category) s.add(it.category);
    return Array.from(s).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return items.filter((it) => {
      if (categoryFilter !== "todas" && it.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        it.sku.toLowerCase().includes(q) ||
        it.name.toLowerCase().includes(q) ||
        (it.almacen ?? "").toLowerCase().includes(q) ||
        (it.ubicacion ?? "").toLowerCase().includes(q) ||
        (it.category ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, query, categoryFilter]);

  const totals = useMemo(() => {
    const fisico = filtered.reduce((s, i) => s + (i.fisico ?? 0), 0);
    const disponible = filtered.reduce((s, i) => s + (i.disponible ?? 0), 0);
    const reservado = filtered.reduce((s, i) => s + (i.reservado ?? 0), 0);
    const transito = filtered.reduce((s, i) => s + (i.enTransito ?? 0), 0);
    return { fisico, disponible, reservado, transito };
  }, [filtered]);

  if (invFiles.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="anim-fade-up flex flex-col items-center gap-5 rounded-3xl border border-border bg-card p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Boxes className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold">Sin inventario cargado</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Importa un Excel de stock o crea un archivo de inventario. Los
              datos pasarán automáticamente al sistema y se verán aquí en una
              tabla unificada con todas sus columnas.
            </p>
          </div>
          <Button
            onClick={() => createFile("Inventario Total", "inventario")}
            className="press rounded-xl"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Crear inventario
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6">
      {/* Encabezado */}
      <div className="anim-fade-up mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Boxes className="h-5 w-5" />
            Inventario
          </h1>
          <p className="text-sm text-muted-foreground">
            {items.length} producto(s) en stock · {invFiles.length} archivo(s) ·{" "}
            {fmtNum(totals.fisico)} unidades físicas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar SKU, producto, almacén…"
              className="h-9 rounded-xl bg-muted/50 pl-8 text-sm"
            />
          </div>
          <Button
            variant="outline"
            className="press h-9 rounded-xl"
            onClick={() => setCatalogOpen(true)}
          >
            <BookMarked className="mr-1.5 h-4 w-4" />
            Catálogo
            {mismatches.length > 0 && (
              <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-background">
                {mismatches.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Tarjetas de totales */}
      <div className="anim-fade-up mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TotalsCard label="Stock físico" value={totals.fisico} highlight />
        <TotalsCard label="Disponible" value={totals.disponible} />
        <TotalsCard label="Reservado" value={totals.reservado} />
        <TotalsCard label="En tránsito" value={totals.transito} />
      </div>

      {/* Filtros de categoría */}
      {categories.length > 0 && (
        <div className="anim-fade-up mb-3 flex flex-wrap items-center gap-1.5">
          <FilterChip
            active={categoryFilter === "todas"}
            onClick={() => setCategoryFilter("todas")}
            label="Todas"
            count={items.length}
          />
          {categories.map((cat) => {
            const count = items.filter((i) => i.category === cat).length;
            return (
              <FilterChip
                key={cat}
                active={categoryFilter === cat}
                onClick={() => setCategoryFilter(cat)}
                label={cat}
                count={count}
              />
            );
          })}
        </div>
      )}

      {/* Tabla de inventario */}
      <div className="anim-fade-up overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="sticky left-0 z-10 bg-muted/40 px-4 py-2.5 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Hash className="h-3 w-3" />
                    SKU
                  </span>
                </th>
                <th className="px-4 py-2.5 font-medium">Producto</th>
                {columns.hasCategory && (
                  <th className="px-4 py-2.5 font-medium">Categoría</th>
                )}
                {columns.hasFisico && (
                  <th className="px-4 py-2.5 text-right font-medium">Físico</th>
                )}
                {columns.hasReservado && (
                  <th className="px-4 py-2.5 text-right font-medium">Reservado</th>
                )}
                {columns.hasTransito && (
                  <th className="px-4 py-2.5 text-right font-medium">Tránsito</th>
                )}
                {columns.hasDisponible && (
                  <th className="px-4 py-2.5 text-right font-medium">Disponible</th>
                )}
                {columns.hasUdm && (
                  <th className="px-4 py-2.5 font-medium">UdM</th>
                )}
                {columns.hasAlmacen && (
                  <th className="px-4 py-2.5 font-medium">Almacén</th>
                )}
                {columns.hasUbicacion && (
                  <th className="px-4 py-2.5 font-medium">Ubicación</th>
                )}
                <th className="px-4 py-2.5 font-medium">Origen</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it, i) => (
                <InventoryRow
                  key={`${it.fileId}-${it.row}-${i}`}
                  item={it}
                  columns={columns}
                  onOpen={() => {
                    openFile(it.fileId);
                    toast({ title: "Abriendo archivo", description: it.fileName });
                  }}
                />
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/40 text-xs font-semibold">
                  <td className="sticky left-0 z-10 bg-muted/40 px-4 py-2.5" colSpan={columns.hasFisico ? 0 : 2}>
                    Total
                  </td>
                  <td className="px-4 py-2.5" colSpan={(columns.hasFisico ? 0 : 2) - 1 + (columns.hasCategory ? 0 : 1)}>
                    {filtered.length} producto(s)
                  </td>
                  {columns.hasCategory && <td className="px-4 py-2.5"></td>}
                  {columns.hasFisico && (
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {fmtNum(totals.fisico)}
                    </td>
                  )}
                  {columns.hasReservado && (
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {fmtNum(totals.reservado)}
                    </td>
                  )}
                  {columns.hasTransito && (
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {fmtNum(totals.transito)}
                    </td>
                  )}
                  {columns.hasDisponible && (
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {fmtNum(totals.disponible)}
                    </td>
                  )}
                  {columns.hasUdm && <td className="px-4 py-2.5"></td>}
                  {columns.hasAlmacen && <td className="px-4 py-2.5"></td>}
                  {columns.hasUbicacion && <td className="px-4 py-2.5"></td>}
                  <td className="px-4 py-2.5"></td>
                  <td className="px-4 py-2.5"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Sugerencias (si hay SKUs sin catalogar) */}
      {suggestions.length > 0 && (
        <div className="anim-fade-up mt-4 rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <p className="text-[13px] font-semibold">
              {suggestions.length} SKU(s) del inventario no están en el catálogo maestro
            </p>
          </div>
          <p className="mb-2 text-[11px] text-muted-foreground">
            El catálogo maestro se usa para validar que un mismo SKU siempre
            tenga el mismo nombre en todos los archivos. Añádelos para activar la
            validación.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="press h-7 rounded-lg text-xs"
            onClick={() => {
              const added = useStore
                .getState()
                .importProductsBulk(
                  suggestions.map((s) => ({ sku: s.sku, name: s.name, quantity: s.quantity }))
                );
              toast({ title: `${added} producto(s) añadido(s) al catálogo` });
            }}
          >
            <Upload className="mr-1.5 h-3 w-3" />
            Añadir todos al catálogo
          </Button>
        </div>
      )}

      {/* Diálogo de catálogo maestro */}
      <CatalogDialog
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        products={products}
        mismatches={mismatches}
      />
    </div>
  );
}

function InventoryRow({
  item,
  columns,
  onOpen,
}: {
  item: InventoryItem;
  columns: ReturnType<typeof extractUnifiedInventory>["columns"];
  onOpen: () => void;
}) {
  return (
    <tr className="border-b border-border/50 last:border-0 group hover:bg-accent/30">
      <td className="sticky left-0 z-10 bg-card px-4 py-2.5 group-hover:bg-accent/30">
        <span className="font-mono text-[12px] font-semibold">{item.sku}</span>
      </td>
      <td className="px-4 py-2.5">
        <span className="text-[13px] font-medium">{item.name}</span>
      </td>
      {columns.hasCategory && (
        <td className="px-4 py-2.5">
          {item.category ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {item.category}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
      )}
      {columns.hasFisico && (
        <td className="px-4 py-2.5 text-right">
          <span className="inline-flex min-w-[44px] justify-center rounded-full bg-foreground px-2.5 py-0.5 text-[12px] font-semibold tabular-nums text-background">
            {fmtNum(item.fisico)}
          </span>
        </td>
      )}
      {columns.hasReservado && (
        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
          {fmtNum(item.reservado)}
        </td>
      )}
      {columns.hasTransito && (
        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
          {fmtNum(item.enTransito)}
        </td>
      )}
      {columns.hasDisponible && (
        <td className="px-4 py-2.5 text-right">
          <span className="tabular-nums font-medium">{fmtNum(item.disponible)}</span>
        </td>
      )}
      {columns.hasUdm && (
        <td className="px-4 py-2.5 text-[11px] text-muted-foreground">
          {item.udm ?? "—"}
        </td>
      )}
      {columns.hasAlmacen && (
        <td className="px-4 py-2.5 text-[11px] text-muted-foreground">
          {item.almacen ?? "—"}
        </td>
      )}
      {columns.hasUbicacion && (
        <td className="px-4 py-2.5 text-[11px] text-muted-foreground">
          {item.ubicacion ?? "—"}
        </td>
      )}
      <td className="px-4 py-2.5 text-[11px] text-muted-foreground">
        {item.fileName}
      </td>
      <td className="px-4 py-2.5 text-right">
        <Button
          size="sm"
          variant="ghost"
          className="press h-7 rounded-lg text-[11px] opacity-0 transition-opacity group-hover:opacity-100"
          onClick={onOpen}
        >
          Ver <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </td>
    </tr>
  );
}

function TotalsCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4",
        highlight ? "border-primary/30 bg-accent/40" : "border-border"
      )}
    >
      <p
        className={cn(
          "text-2xl font-semibold tabular-nums tracking-tight",
          highlight && "text-foreground"
        )}
      >
        {fmtNum(value)}
      </p>
      <p className="text-[11px] font-medium">{label}</p>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "press flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
        active
          ? "border-primary bg-accent text-foreground"
          : "border-border bg-muted/40 text-muted-foreground hover:bg-accent/50"
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 text-[10px]",
          active ? "bg-foreground/15" : "bg-background"
        )}
      >
        {count}
      </span>
    </button>
  );
}

// Diálogo del catálogo maestro de SKUs (para validación de nombres).
function CatalogDialog({
  open,
  onOpenChange,
  products,
  mismatches,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  products: Product[];
  mismatches: ReturnType<ReturnType<typeof useStore.getState>["getMismatches"]>;
}) {
  const addProduct = useStore((s) => s.addProduct);
  const updateProduct = useStore((s) => s.updateProduct);
  const deleteProduct = useStore((s) => s.deleteProduct);
  const findProductBySku = useStore((s) => s.findProductBySku);
  const [editing, setEditing] = useState<Product | null>(null);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [dupError, setDupError] = useState(false);

  const openEdit = (p: Product) => {
    setEditing(p);
    setSku(p.sku);
    setName(p.name);
    setDupError(false);
  };
  const openCreate = () => {
    setEditing(null);
    setSku("");
    setName("");
    setDupError(false);
  };
  const handleSave = () => {
    if (!sku.trim() || !name.trim()) return;
    if (editing) {
      const clash = findProductBySku(sku.trim());
      if (clash && clash.id !== editing.id) {
        setDupError(true);
        return;
      }
      updateProduct(editing.id, sku, name);
    } else {
      if (findProductBySku(sku.trim())) {
        setDupError(true);
        return;
      }
      addProduct(sku, name);
    }
    openCreate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto scroll-thin rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookMarked className="h-4 w-4" />
            Catálogo maestro de SKUs
          </DialogTitle>
          <DialogDescription>
            El catálogo valida que cada SKU tenga siempre el mismo nombre en
            todos los archivos. {products.length} producto(s) registrado(s).
          </DialogDescription>
        </DialogHeader>

        {mismatches.length > 0 && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
            <p className="text-[11px] leading-snug text-destructive">
              {mismatches.length} discrepancia(s) de nombre detectadas. Revisa
              los archivos afectados o actualiza el nombre canónico del SKU.
            </p>
          </div>
        )}

        <div className="max-h-[40vh] overflow-y-auto scroll-thin">
          {products.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              El catálogo está vacío.
            </p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 last:border-0 group">
                    <td className="py-2 pr-2 font-mono text-[12px] font-semibold">
                      {p.sku}
                    </td>
                    <td className="py-2 pr-2 text-[12px]">{p.name}</td>
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => openEdit(p)}
                          className="press rounded-md p-1 text-muted-foreground hover:bg-accent"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id)}
                          className="press rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold">
            {editing ? "Editar SKU" : "Añadir SKU al catálogo"}
          </p>
          <div className="flex flex-col gap-2">
            <Input
              value={sku}
              onChange={(e) => {
                setSku(e.target.value);
                setDupError(false);
              }}
              placeholder="SKU (ej. 4076358)"
              className={cn(
                "h-8 rounded-lg font-mono text-xs",
                dupError && "border-destructive"
              )}
            />
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre canónico (ej. ROUTER ONT HG8145X6-13 HUAWEI)"
              className="h-8 rounded-lg text-xs"
            />
            {dupError && (
              <p className="flex items-center gap-1 text-[10px] text-destructive">
                <AlertTriangle className="h-3 w-3" />
                Ya existe un producto con este SKU
              </p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!sku.trim() || !name.trim()}
                className="press h-8 rounded-lg text-xs"
              >
                {editing ? "Guardar" : "Añadir"}
              </Button>
              {editing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openCreate}
                  className="press h-8 rounded-lg text-xs"
                >
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
