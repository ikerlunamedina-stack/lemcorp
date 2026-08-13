"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { getHeaderColumns } from "@/lib/detection";
import { recalcFile } from "@/lib/formulas";
import { parseNum, fmtNum } from "@/lib/num";
import type { SheetFile } from "@/lib/types";
import {
  Package,
  Layers,
  AlertTriangle,
  Boxes,
  TrendingDown,
  ArrowRight,
  FileSpreadsheet,
  PackageCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { TAG_META, type FileTag } from "@/lib/types";

const PRODUCT_COLS = [
  "producto", "sku", "codigo", "código", "articulo", "artículo",
  "descripcion", "descripción", "material", "item",
];
// Priorizamos Físico y Disponible porque los reportes reales de almacén
// (ej. HUB ALTAS - LIMA NORTE) usan esos nombres de columna.
const QTY_COLS = [
  "fisico", "disponible", "cantidad", "stock", "existencia", "saldo",
  "stock actual", "cant", "qty",
];
const MIN_COLS = ["stock minimo", "stock mínimo", "minimo", "mínimo", "min", "reorder"];

function normalize(s: string): string {
  return s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function findColIdx(headers: string[], candidates: string[]): number {
  // prioridad: coincidencia exacta por candidato, luego substring
  for (const c of candidates) {
    const nc = normalize(c);
    for (let i = 0; i < headers.length; i++) {
      if (normalize(headers[i]) === nc) return i;
    }
  }
  for (const c of candidates) {
    const nc = normalize(c);
    for (let i = 0; i < headers.length; i++) {
      const h = normalize(headers[i]);
      if (h.includes(nc)) return i;
    }
  }
  return -1;
}

interface InvItem {
  fileId: string;
  fileName: string;
  product: string;
  sku?: string;
  qty: number;
  min: number;
}

function extractInventory(file: SheetFile): InvItem[] {
  const headers = getHeaderColumns(file);
  const computed = recalcFile(file);
  const prodCol = findColIdx(headers, PRODUCT_COLS);
  const qtyCol = findColIdx(headers, QTY_COLS);
  if (prodCol < 0 || qtyCol < 0) return [];
  const minCol = findColIdx(headers, MIN_COLS);
  const skuCol = findColIdx(headers, ["sku", "codigo", "código"]);
  const items: InvItem[] = [];
  for (let r = 1; r < file.rowCount; r++) {
    const product = (file.cells[`${r},${prodCol}`] ?? "").trim();
    if (!product) continue;
    const qtyRaw = computed[`${r},${qtyCol}`] ?? file.cells[`${r},${qtyCol}`] ?? "";
    const qtyNum = parseNum(qtyRaw);
    const qty = isNaN(qtyNum) ? 0 : qtyNum;
    const minRaw = minCol >= 0 ? (file.cells[`${r},${minCol}`] ?? "") : "";
    const minNum = parseNum(minRaw);
    const min = isNaN(minNum) ? 0 : minNum;
    const sku = skuCol >= 0 ? (file.cells[`${r},${skuCol}`] ?? "").trim() : undefined;
    items.push({
      fileId: file.id,
      fileName: file.name,
      product,
      sku,
      qty,
      min,
    });
  }
  return items;
}

export function SummaryView() {
  const files = useStore((s) => s.files);
  const products = useStore((s) => s.products);
  const openFile = useStore((s) => s.openFile);
  const createFile = useStore((s) => s.createFile);
  const setActiveView = useStore((s) => s.setActiveView);
  const getMismatches = useStore((s) => s.getMismatches);
  const getSuggestions = useStore((s) => s.getSuggestions);
  const { toast } = useToast();

  const invFiles = files.filter((f) => f.tag === "inventario");
  const despFiles = files.filter((f) => f.tag === "despachos");
  const eqFiles = files.filter((f) => f.tag === "equipos");

  const allItems = useMemo(() => {
    return invFiles.flatMap(extractInventory);
  }, [invFiles]);

  const totalUnits = allItems.reduce((s, i) => s + i.qty, 0);
  const lowStock = allItems.filter((i) => i.min > 0 && i.qty <= i.min);

  const mismatches = useMemo(
    () => getMismatches(),
    [getMismatches, files, products]
  );
  const suggestions = useMemo(
    () => getSuggestions(),
    [getSuggestions, files, products]
  );

  // alertas por archivo
  const alertsByFile = useMemo(() => {
    const m: Record<string, InvItem[]> = {};
    for (const a of lowStock) {
      if (!m[a.fileId]) m[a.fileId] = [];
      m[a.fileId].push(a);
    }
    return m;
  }, [lowStock]);

  const stats: { icon: React.ReactNode; label: string; value: string; sub: string; tone: string }[] = [
    {
      icon: <Package className="h-5 w-5" />,
      label: "Productos en inventario",
      value: products.length.toString(),
      sub: `${suggestions.length} SKU(s) sin catalogar`,
      tone: "text-foreground",
    },
    {
      icon: <Layers className="h-5 w-5" />,
      label: "Unidades totales",
      value: totalUnits.toLocaleString("es-PE"),
      sub: "Suma de stock actual",
      tone: "text-foreground",
    },
    {
      icon: <Boxes className="h-5 w-5" />,
      label: "Despachos hoy",
      value: despFiles.length.toString(),
      sub: "Archivos de despacho",
      tone: "text-foreground",
    },
    {
      icon: <AlertTriangle className="h-5 w-5" />,
      label: "Alertas bajo stock",
      value: lowStock.length.toString(),
      sub: lowStock.length === 0 ? "Todo en buen nivel" : "Requieren reposición",
      tone: lowStock.length > 0 ? "text-destructive" : "text-muted-foreground",
    },
  ];

  if (files.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <EmptyHero
          title="Bienvenido a LEMCORP"
          desc="Centraliza tus planillas de inventario, despachos y equipos en una sola aplicación. Crea o importa tu primer archivo para empezar."
          cta={
            <div className="flex gap-2">
              <Button
                onClick={() => createFile("Inventario Total", "inventario")}
                className="press rounded-xl"
              >
                Crear inventario
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveView("equipos")}
                className="press rounded-xl"
              >
                Ver equipos
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      {/* Encabezado */}
      <div className="anim-fade-up mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Resumen general</h1>
        <p className="text-sm text-muted-foreground">
          Vista consolidada de todo el inventario y operaciones de LEMCORP.
        </p>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="anim-fade-up rounded-2xl border border-border bg-card p-4 press"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className={cn("text-muted-foreground", s.tone)}>{s.icon}</span>
            </div>
            <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight">
              {s.value}
            </p>
            <p className="text-[13px] font-medium text-foreground">{s.label}</p>
            <p className="text-[11px] text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Distribución por archivo */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 anim-fade-up rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Inventario por archivo</h2>
              <p className="text-[11px] text-muted-foreground">
                Unidades y SKUs por cada archivo de inventario
              </p>
            </div>
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </div>
          {invFiles.length === 0 ? (
            <EmptyBlock
              text="No hay archivos de inventario. Crea uno con la etiqueta «Inventario total»."
              cta={
                <Button
                  size="sm"
                  onClick={() => createFile("Inventario Total", "inventario")}
                  className="press rounded-lg"
                >
                  Crear inventario
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {invFiles.map((f) => {
                const items = extractInventory(f);
                const units = items.reduce((s, i) => s + i.qty, 0);
                const skus = new Set(items.map((i) => i.sku || i.product)).size;
                const low = items.filter((i) => i.min > 0 && i.qty <= i.min).length;
                const max = Math.max(units, 1);
                return (
                  <button
                    key={f.id}
                    onClick={() => openFile(f.id)}
                    className="press group flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:bg-accent/50"
                  >
                    <span className="emoji text-base">{TAG_META.inventario.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{f.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {skus} SKU · {units} unidades
                      </p>
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-foreground/70 transition-all"
                          style={{ width: `${(units / max) * 100}%` }}
                        />
                      </div>
                    </div>
                    {low > 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                        <AlertTriangle className="h-3 w-3" />
                        {low} bajo
                      </span>
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Distribución por etiqueta */}
        <div className="anim-fade-up rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Distribución</h2>
          <p className="text-[11px] text-muted-foreground">Archivos por tipo</p>
          <div className="mt-4 space-y-3">
            {(["inventario", "despachos", "equipos", "otro"] as FileTag[]).map((t) => {
              const count = files.filter((f) => f.tag === t).length;
              const pct = files.length ? (count / files.length) * 100 : 0;
              return (
                <div key={t}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="emoji">{TAG_META[t].icon}</span>
                      {TAG_META[t].short}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground/60 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Alertas de bajo stock */}
      <div className="mt-6 anim-fade-up rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Alertas de bajo stock
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Productos con cantidad menor o igual al stock mínimo
            </p>
          </div>
          {lowStock.length > 0 && (
            <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-medium text-destructive">
              {lowStock.length} producto(s)
            </span>
          )}
        </div>

        {lowStock.length === 0 ? (
          <EmptyBlock text="No hay alertas. Todos los productos están por encima del stock mínimo." />
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Producto</th>
                  <th className="pb-2 pr-3 font-medium">SKU</th>
                  <th className="pb-2 pr-3 text-right font-medium">Cantidad</th>
                  <th className="pb-2 pr-3 text-right font-medium">Mínimo</th>
                  <th className="pb-2 pr-3 font-medium">Origen</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((item, i) => (
                  <tr
                    key={`${item.fileId}-${i}`}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="py-2 pr-3 font-medium">{item.product}</td>
                    <td className="py-2 pr-3 font-mono text-[11px] text-muted-foreground">
                      {item.sku || "—"}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5",
                          item.qty === 0
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-foreground"
                        )}
                      >
                        {item.qty}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
                      {item.min}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <span className="emoji">{TAG_META.inventario.icon}</span>
                        {item.fileName}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="press h-7 rounded-lg text-[11px]"
                        onClick={() => {
                          openFile(item.fileId);
                          toast({
                            title: "Abriendo archivo",
                            description: item.fileName,
                          });
                        }}
                      >
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Validación de catálogo de productos */}
      <div className="mt-6 anim-fade-up rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Package className="h-4 w-4" />
              Validación de catálogo
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Cruza los SKUs de tus archivos contra el catálogo maestro de productos
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="press h-7 rounded-lg text-[11px]"
            onClick={() => setActiveView("inventario")}
          >
            Ver inventario · {products.length}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-2xl font-semibold tabular-nums">{products.length}</p>
            <p className="text-[11px] font-medium">Productos en inventario</p>
            <p className="text-[10px] text-muted-foreground">SKUs registrados</p>
          </div>
          <div
            className={cn(
              "rounded-xl border p-3",
              mismatches.length > 0
                ? "border-destructive/30 bg-destructive/5"
                : "border-border bg-muted/30"
            )}
          >
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums",
                mismatches.length > 0 && "text-destructive"
              )}
            >
              {mismatches.length}
            </p>
            <p className="text-[11px] font-medium">Discrepancias de nombre</p>
            <p className="text-[10px] text-muted-foreground">
              SKU con nombre distinto al catálogo
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-2xl font-semibold tabular-nums">{suggestions.length}</p>
            <p className="text-[11px] font-medium">SKUs sin catalogar</p>
            <p className="text-[10px] text-muted-foreground">
              En archivos pero no en catálogo
            </p>
          </div>
        </div>

        {mismatches.length > 0 ? (
          <div className="mt-4 overflow-x-auto scroll-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">SKU</th>
                  <th className="pb-2 pr-3 font-medium">En archivo</th>
                  <th className="pb-2 pr-3 font-medium">En catálogo</th>
                  <th className="pb-2 pr-3 font-medium">Origen</th>
                </tr>
              </thead>
              <tbody>
                {mismatches.slice(0, 8).map((m, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-3 font-mono text-[11px]">{m.sku}</td>
                    <td className="py-2 pr-3 text-destructive line-through">
                      {m.actualName}
                    </td>
                    <td className="py-2 pr-3 font-medium">{m.expectedName}</td>
                    <td className="py-2 pr-3 text-[11px] text-muted-foreground">
                      {m.fileName} · fila {m.row + 1}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {mismatches.length > 8 && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                …y {mismatches.length - 8} discrepancia(s) más.{" "}
                <button
                  className="underline"
                  onClick={() => setActiveView("inventario")}
                >
                  Ver todas
                </button>
              </p>
            )}
          </div>
        ) : suggestions.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              {suggestions.length} SKU(s) detectados en archivos sin catalogar:
            </span>
            {suggestions.slice(0, 6).map((s) => (
              <span
                key={s.sku}
                className="rounded-full border border-border bg-muted/40 px-2 py-0.5 font-mono text-[10px]"
              >
                {s.sku}
              </span>
            ))}
            <button
              className="text-[11px] underline text-muted-foreground"
              onClick={() => setActiveView("inventario")}
            >
              Añadir al catálogo
            </button>
          </div>
        ) : (
          <p className="mt-4 text-[11px] text-muted-foreground">
            Todos los SKUs de tus archivos coinciden con el catálogo maestro.
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyBlock({ text, cta }: { text: string; cta?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
      <FileSpreadsheet className="h-6 w-6 text-muted-foreground" />
      <p className="max-w-sm text-xs text-muted-foreground">{text}</p>
      {cta}
    </div>
  );
}

function EmptyHero({
  title,
  desc,
  cta,
}: {
  title: string;
  desc: string;
  cta: React.ReactNode;
}) {
  return (
    <div className="anim-fade-up flex flex-col items-center gap-5 rounded-3xl border border-border bg-card p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <span className="text-lg font-semibold">L</span>
      </div>
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="max-w-md text-sm text-muted-foreground">{desc}</p>
      </div>
      {cta}
    </div>
  );
}
