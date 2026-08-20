"use client";

import { useStore } from "@/lib/store";
import {
  Package,
  Boxes,
  AlertTriangle,
  Cpu,
  ArrowRight,
  Download,
  TrendingUp,
  Clock,
  Sparkles,
  Hash,
  StickyNote,
  Users,
} from "lucide-react";
import { fmtNum } from "@/lib/num";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ESTADO_META } from "@/lib/types";
import Link from "next/link";

export function DashboardView() {
  const products = useStore((s) => s.products) ?? [];
  const equipos = useStore((s) => s.equipos) ?? [];
  const entradas = useStore((s) => s.entradas) ?? [];
  const notas = useStore((s) => s.notas) ?? [];
  const miembros = useStore((s) => s.miembros) ?? [];
  const exportInventarioExcel = useStore((s) => s.exportInventarioExcel);

  const totalUnidades = products.reduce((s, p) => s + p.quantity, 0);
  const bajoStock = products.filter(
    (p) => p.minStock && p.minStock > 0 && p.quantity <= p.minStock
  );
  const numTecnicos = miembros.filter((m) => m.rol === "tecnico").length;
  const equiposDisponibles = equipos.filter((e) => e.estado === "disponible").length;

  // Categorías por UDM
  const catMap: Record<string, number> = {};
  for (const p of products) {
    const k = p.udm ?? "Sin UDM";
    catMap[k] = (catMap[k] ?? 0) + p.quantity;
  }
  const categorias = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxCat = categorias[0]?.[1] ?? 1;

  // Productos con menos stock (top 5)
  const topBajoStock = [...products].sort((a, b) => {
    const aPct = a.minStock ? a.quantity / a.minStock : 999;
    const bPct = b.minStock ? b.quantity / b.minStock : 999;
    return aPct - bPct;
  }).slice(0, 5);

  const kpis = [
    { label: "Productos", value: products.length, sub: "en catálogo", icon: <Package className="h-5 w-5" />, href: "/inventario", color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Unidades", value: fmtNum(totalUnidades), sub: "en stock", icon: <Boxes className="h-5 w-5" />, href: "/inventario", color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Equipos", value: equipos.length, sub: `${equiposDisponibles} disponibles`, icon: <Cpu className="h-5 w-5" />, href: "/equipos", color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Alertas", value: bajoStock.length, sub: bajoStock.length === 0 ? "Todo OK" : "bajo stock", icon: <AlertTriangle className="h-5 w-5" />, href: "/inventario", color: bajoStock.length > 0 ? "text-red-600" : "text-gray-400", bg: bajoStock.length > 0 ? "bg-red-50" : "bg-gray-50" },
  ];

  return (
    <div className="px-6 py-6 lg:px-8">
      {/* Header */}
      <div className="anim-fade-up mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Control de almacén LEMCORP · {new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <Button onClick={() => exportInventarioExcel()} className="press rounded-xl shadow-md">
          <Download className="mr-1.5 h-4 w-4" /> Exportar Excel
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <Link key={k.label} href={k.href}
            className="anim-fade-up group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
            style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-center justify-between">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110", k.bg)}>
                <span className={k.color}>{k.icon}</span>
              </div>
            </div>
            <p className="mt-4 text-3xl font-bold tabular-nums tracking-tight">{k.value}</p>
            <p className="text-sm font-semibold">{k.label}</p>
            <p className="text-xs text-muted-foreground">{k.sub}</p>
          </Link>
        ))}
      </div>

      {/* Grid principal */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Columna izquierda (2/3) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Productos con menos stock */}
          <div className="anim-fade-up rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Productos con menor stock relativo
              </h2>
              <Link href="/inventario" className="text-xs font-medium text-primary hover:underline">Ver todo</Link>
            </div>
            <div className="space-y-3">
              {topBajoStock.map((p) => {
                const pct = p.minStock ? Math.min(100, (p.quantity / Math.max(p.minStock * 2, 1)) * 100) : 100;
                const bajo = p.minStock && p.minStock > 0 && p.quantity <= p.minStock;
                return (
                  <div key={p.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-muted-foreground">{p.sku}</span>
                        <span className="font-medium">{p.name}</span>
                      </span>
                      <span className={cn("font-bold tabular-nums", bajo ? "text-red-600" : "text-foreground")}>
                        {fmtNum(p.quantity)} {p.udm ?? ""}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full transition-all duration-500", bajo ? "bg-red-500" : pct < 50 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Entradas recientes */}
          <div className="anim-fade-up rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Entradas recientes
              </h2>
              <Link href="/inventario" className="text-xs font-medium text-primary hover:underline">Ver todo</Link>
            </div>
            {entradas.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No hay entradas registradas.</p>
            ) : (
              <div className="space-y-2">
                {entradas.slice(0, 5).map((e) => (
                  <div key={e.id} className="flex items-center gap-3 rounded-xl border border-border/50 p-3 hover:bg-accent/30 transition-colors">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-600">+{e.cantidad}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.producto}</p>
                      <p className="font-mono text-xs text-muted-foreground">{e.sku}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(e.fecha).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit" })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha (1/3) */}
        <div className="space-y-6">
          {/* Equipos por estado */}
          {equipos.length > 0 && (
            <div className="anim-fade-up rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  Equipos por estado
                </h2>
                <Link href="/equipos" className="text-xs font-medium text-primary hover:underline">Ver</Link>
              </div>
              <div className="space-y-3">
                {(Object.keys(ESTADO_META) as (keyof typeof ESTADO_META)[]).map((est) => {
                  const n = equipos.filter((e) => e.estado === est).length;
                  const meta = ESTADO_META[est];
                  const pct = equipos.length > 0 ? (n / equipos.length) * 100 : 0;
                  return (
                    <div key={est}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className={cn("flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold",
                            (est === "averiado" || est === "en_retiro") ? "bg-red-50 text-red-600" : est === "disponible" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
                            {meta.icon}
                          </span>
                          {meta.label}
                        </span>
                        <span className="font-bold tabular-nums">{n}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full", (est === "averiado" || est === "en_retiro") ? "bg-red-500" : est === "disponible" ? "bg-emerald-500" : "bg-amber-500")} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock por categoría */}
          {categorias.length > 0 && (
            <div className="anim-fade-up rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Stock por unidad
              </h2>
              <div className="space-y-3">
                {categorias.map(([cat, qty]) => {
                  const pct = (qty / maxCat) * 100;
                  return (
                    <div key={cat}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{cat}</span>
                        <span className="tabular-nums text-muted-foreground">{fmtNum(qty)}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Accesos rápidos */}
          <div className="anim-fade-up rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold">Accesos rápidos</h2>
            <div className="grid grid-cols-2 gap-2">
              <QuickLink href="/ia" icon={<Sparkles className="h-4 w-4" />} label="Asistente IA" color="text-violet-600" bg="bg-violet-50" />
              <QuickLink href="/series" icon={<Hash className="h-4 w-4" />} label="Series" color="text-blue-600" bg="bg-blue-50" />
              <QuickLink href="/bloc" icon={<StickyNote className="h-4 w-4" />} label="Bloc" color="text-amber-600" bg="bg-amber-50" />
              <QuickLink href="/empresa" icon={<Users className="h-4 w-4" />} label="Empresa" color="text-emerald-600" bg="bg-emerald-50" />
            </div>
          </div>

          {/* Notas fijadas */}
          {notas.filter((n) => n.pinned).length > 0 && (
            <div className="anim-fade-up rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-700">
                <StickyNote className="h-4 w-4" />
                Notas fijadas
              </h2>
              <div className="space-y-2">
                {notas.filter((n) => n.pinned).slice(0, 3).map((n) => (
                  <div key={n.id} className="rounded-xl border border-amber-200/50 bg-white/60 p-3 text-xs leading-relaxed">
                    {n.texto}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickLink({ href, icon, label, color, bg }: { href: string; icon: React.ReactNode; label: string; color: string; bg: string }) {
  return (
    <Link href={href} className="press group flex flex-col items-center gap-2 rounded-xl border border-border p-3 transition-colors hover:bg-accent/50">
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-110", bg)}>
        <span className={color}>{icon}</span>
      </span>
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}
