"use client";
import { AppShell } from "@/components/lem/app-shell";
import { useStore } from "@/lib/store";
import { DollarSign, TrendingUp, Package, BarChart3 } from "lucide-react";
import { useMemo } from "react";

export default function PreciosPage() {
  const products = useStore((s) => s.products);
  const setSetting = useStore((s) => s.setSetting);
  const updateProduct = useStore((s) => s.updateProduct);

  const data = useMemo(() => {
    const conPrecio = products.filter(p => p.precio && p.precio > 0);
    const sinPrecio = products.filter(p => !p.precio || p.precio === 0);
    const valorTotal = products.reduce((s, p) => s + (p.precio || 0) * p.quantity, 0);
    const promedio = conPrecio.length > 0 ? conPrecio.reduce((s, p) => s + (p.precio || 0), 0) / conPrecio.length : 0;
    return { conPrecio, sinPrecio, valorTotal, promedio };
  }, [products]);

  return (
    <AppShell>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">Precios</h1>
          <p className="text-[13px] text-muted-foreground">Gestión de precios y valorización del inventario</p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><DollarSign className="h-4 w-4 text-primary" strokeWidth={1.5} /></div>
            <p className="text-[24px] font-bold tabular-nums text-foreground">S/ {data.valorTotal.toLocaleString("es-PE", { maximumFractionDigits: 0 })}</p>
            <p className="text-[12px] font-medium text-muted-foreground">Valor Total</p>
          </div>
          <div className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm" style={{ animationDelay: "60ms" }}>
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10"><TrendingUp className="h-4 w-4 text-emerald-500" strokeWidth={1.5} /></div>
            <p className="text-[24px] font-bold tabular-nums text-foreground">S/ {data.promedio.toFixed(2)}</p>
            <p className="text-[12px] font-medium text-muted-foreground">Precio Promedio</p>
          </div>
          <div className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm" style={{ animationDelay: "120ms" }}>
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10"><Package className="h-4 w-4 text-amber-500" strokeWidth={1.5} /></div>
            <p className="text-[24px] font-bold tabular-nums text-foreground">{data.conPrecio.length}</p>
            <p className="text-[12px] font-medium text-muted-foreground">Con Precio</p>
          </div>
          <div className="press-card anim-slide-up rounded-2xl bg-card p-5 shadow-sm" style={{ animationDelay: "180ms" }}>
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10"><BarChart3 className="h-4 w-4 text-rose-500" strokeWidth={1.5} /></div>
            <p className="text-[24px] font-bold tabular-nums text-foreground">{data.sinPrecio.length}</p>
            <p className="text-[12px] font-medium text-muted-foreground">Sin Precio</p>
          </div>
        </div>

        <div className="mt-4">
          <section className="press-card anim-slide-up overflow-hidden rounded-2xl bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-[14px] font-semibold text-foreground">Lista de Precios</h2>
            </div>
            <div className="max-h-[500px] overflow-y-auto scroll-thin">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 font-medium">SKU</th>
                    <th className="px-3 py-2 font-medium">Producto</th>
                    <th className="px-3 py-2 text-right font-medium">Stock</th>
                    <th className="px-3 py-2 text-right font-medium">Precio</th>
                    <th className="px-3 py-2 text-right font-medium">Valor</th>
                    <th className="px-3 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Sin productos</td></tr>
                  ) : (
                    products.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono text-[11px] text-foreground">{p.sku}</td>
                        <td className="px-3 py-2 text-foreground">{p.name}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{p.quantity}</td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            defaultValue={p.precio || 0}
                            onBlur={(e) => updateProduct(p.id, { precio: parseFloat(e.target.value) || 0 })}
                            className="h-7 w-24 rounded-lg border border-border bg-background px-2 text-right text-[12px] font-medium tabular-nums focus:border-primary focus:outline-none"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-primary">S/ {((p.precio || 0) * p.quantity).toLocaleString("es-PE", { maximumFractionDigits: 0 })}</td>
                        <td className="px-3 py-2">
                          {p.precio && p.precio > 0 ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
