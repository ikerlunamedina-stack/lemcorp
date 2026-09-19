"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  AlertTriangle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Clock,
  TrendingUp,
  Package,
  Boxes,
  Check,
  Undo,
  Filter,
  Calendar,
  MapPin,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  ESTADO_META,
  ANTIGUEDAD_META,
  calcularAntiguedad,
  type EstadoEquipo,
} from "@/lib/types";
import { fmtNum } from "@/lib/num";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AuroraSearchInput } from "@/components/lem/aurora-search-input";
import { EstadoIcon } from "@/components/lem/estado-icon";

const ICON_PROPS = { strokeWidth: 1.5 } as const;
const ESTADOS: EstadoEquipo[] = ["disponible", "averiado", "en_retiro"];
const SERIES_POR_MODELO_INICIAL = 50;

export function SeriesView() {
  const equipos = useStore((s) => s.equipos);
  const despachos = useStore((s) => s.despachos);
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<"todos" | EstadoEquipo>("todos");
  const [tab, setTab] = useState<"series" | "recomendaciones" | "movimientos">("series");
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});

  // Reset expandido cuando cambian query o filtros para evitar estados huérfanos
  useEffect(() => {
    setExpandido({});
  }, [query, estadoFilter, equipos]);

  // Filtrado por estado + query (serie / modelo / MAC / CM MAC)
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return equipos.filter((e) => {
      if (estadoFilter !== "todos" && e.estado !== estadoFilter) return false;
      if (!q) return true;
      return (
        e.serie.toLowerCase().includes(q) ||
        e.modelo.toLowerCase().includes(q) ||
        (e.mac ?? "").toLowerCase().includes(q) ||
        (e.cmMac ?? "").toLowerCase().includes(q)
      );
    });
  }, [equipos, query, estadoFilter]);

  // Agrupar por modelo (ordenado por cantidad descendente)
  const models = useMemo(() => {
    const byModel: Record<string, typeof equipos> = {};
    for (const e of filtered) {
      const k = e.modelo || "Sin modelo";
      if (!byModel[k]) byModel[k] = [];
      byModel[k].push(e);
    }
    return Object.entries(byModel).sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const toggleExpandido = (modelo: string) =>
    setExpandido((p) => ({ ...p, [modelo]: !p[modelo] }));

  // Cantidad de modelos únicos en el catálogo completo
  const modelosDistintos = useMemo(
    () => new Set(equipos.map((e) => e.modelo || "Sin modelo")).size,
    [equipos],
  );

  // ─── KPIs superiores ───
  const kpis = useMemo(() => {
    const disponibles = equipos.filter((e) => e.estado === "disponible").length;
    const averiadosList = equipos.filter((e) => e.estado === "averiado");
    const enRetiro = equipos.filter((e) => e.estado === "en_retiro").length;

    // Sin despachar 30+d: equipos disponibles hace 30+ días sin despacho
    const ahora = Date.now();
    const dias30 = 30 * 86400_000;
    const sinDespachar30List = equipos.filter((e) => {
      if (e.estado !== "disponible") return false;
      const seriesEnDespachos = despachos.filter((d) => d.series?.includes(e.serie));
      const ultimoDespacho =
        seriesEnDespachos.length > 0 ? Math.max(...seriesEnDespachos.map((d) => d.fecha)) : 0;
      const referencia = ultimoDespacho || e.createdAt;
      return ahora - referencia >= dias30;
    });

    return {
      total: equipos.length,
      disponibles,
      averiados: averiadosList.length,
      averiadosList,
      enRetiro,
      sinDespachar30: sinDespachar30List.length,
      sinDespachar30List,
      modelosDistintos,
    };
  }, [equipos, despachos, modelosDistintos]);

  // ─── Recomendaciones Inteligentes ───
  const recomendaciones = useMemo(() => {
    const ahora = Date.now();
    const dias30 = 30 * 86400_000;

    // 1. Sin despachar hace 30+ días (con días sin movimiento y últimoDespacho)
    const sinDespachar30ConDias = kpis.sinDespachar30List
      .map((e) => {
        const seriesEnDespachos = despachos.filter((d) => d.series?.includes(e.serie));
        const ultimoDespacho =
          seriesEnDespachos.length > 0 ? Math.max(...seriesEnDespachos.map((d) => d.fecha)) : 0;
        const referencia = ultimoDespacho || e.createdAt;
        return {
          equipo: e,
          ultimoDespacho: referencia,
          dias: Math.max(0, Math.floor((ahora - referencia) / 86400_000)),
        };
      })
      .sort((a, b) => b.dias - a.dias);

    // 2. Series averiadas (con días en estado averiado usando updatedAt)
    const averiadosConDias = kpis.averiadosList
      .map((e) => ({
        equipo: e,
        dias: Math.max(0, Math.floor((ahora - (e.updatedAt || e.createdAt)) / 86400_000)),
      }))
      .sort((a, b) => b.dias - a.dias);

    // 3. Antigüedad de stock: distribución por nivel (solo equipos disponibles)
    const ant = equipos
      .filter((e) => e.estado === "disponible")
      .map((e) => calcularAntiguedad(e.createdAt));
    const antNuevo = ant.filter((a) => a.nivel === "nuevo").length;
    const antAdv = ant.filter((a) => a.nivel === "advertencia").length;
    const antCrit = ant.filter((a) => a.nivel === "critico").length;
    const antOld = ant.filter((a) => a.nivel === "antiguo").length;
    const antSinMov = antAdv + antCrit + antOld;

    // 4. Top modelos más despachados 30d (por series únicas despachadas)
    const porModelo = new Map<string, { modelo: string; seriesUnicas: Set<string> }>();
    for (const d of despachos) {
      if (d.fecha < ahora - dias30) continue;
      if (!d.series || d.series.length === 0) continue;
      for (const serie of d.series) {
        const equipo = equipos.find((e) => e.serie === serie);
        const modelo = equipo?.modelo || "Sin modelo";
        const cur = porModelo.get(modelo) ?? { modelo, seriesUnicas: new Set<string>() };
        cur.seriesUnicas.add(serie);
        porModelo.set(modelo, cur);
      }
    }
    const topDespachados = Array.from(porModelo.values())
      .map((m) => ({ modelo: m.modelo, count: m.seriesUnicas.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const maxTopDespachados = topDespachados.length > 0 ? topDespachados[0].count : 1;

    return {
      sinDespachar30ConDias,
      averiadosConDias,
      antNuevo,
      antAdv,
      antCrit,
      antOld,
      antSinMov,
      topDespachados,
      maxTopDespachados,
    };
  }, [kpis, despachos, equipos]);

  // Helper: tiempo relativo "hace X días/meses"
  const fmtRelativo = (ts?: number) => {
    if (!ts) return "—";
    const diff = Date.now() - ts;
    const dias = Math.floor(diff / 86400_000);
    if (dias < 1) return "hoy";
    if (dias === 1) return "ayer";
    if (dias < 7) return `hace ${dias} días`;
    if (dias < 30) return `hace ${Math.floor(dias / 7)} sem`;
    const meses = Math.floor(dias / 30);
    return meses === 1 ? "hace 1 mes" : `hace ${meses} meses`;
  };

  // Count total para la pestaña "Recomendaciones"
  const recomendacionesCount =
    kpis.sinDespachar30 + kpis.averiados + recomendaciones.antSinMov + recomendaciones.topDespachados.length;

  const goEquipos = () => router.push("/equipos");

  return (
    <div className="select-text cursor-text px-4 py-8 sm:px-6 lg:px-10 anim-fade-in">
      {/* Header */}
      <header className="anim-slide-up mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {equipos.length} series · {kpis.modelosDistintos} modelos
          </p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]">Series</h1>
        </div>
        <AuroraSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Buscar serie, modelo, MAC…"
          placeholderFocused="Escribe para filtrar series…"
          className="w-56"
          iconSize="h-3.5 w-3.5"
        />
      </header>

      {/* Pestañas: Series | Recomendaciones | Movimientos */}
      <div className="anim-slide-up mb-6 flex items-center gap-1 border-b border-border">
        {([
          ["series", "Series", equipos.length],
          ["recomendaciones", "Recomendaciones", recomendacionesCount],
          ["movimientos", "Movimientos", despachos.length],
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
            {tab === key && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" />}
          </button>
        ))}
      </div>

      {/* ─── TAB: SERIES (KPIs + chips + tabla expandible por modelo) ─── */}
      {tab === "series" && (
        <>
          {/* KPIs superiores — entrada escalonada con stagger delay */}
          <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {/* 1. Total series */}
            <div
              className="press-card anim-slide-up rounded-xl border border-border bg-card p-4 text-card-foreground shadow transition-shadow hover:shadow-md"
              style={{ animationDelay: "0ms" }}
            >
              <div className="flex items-center gap-1.5">
                <Package className="h-3 w-3 text-muted-foreground" {...ICON_PROPS} />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total series</p>
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{fmtNum(kpis.total)}</p>
            </div>
            {/* 2. Disponibles */}
            <div
              className="press-card anim-slide-up rounded-xl border border-border bg-card p-4 text-card-foreground shadow transition-shadow hover:shadow-md"
              style={{ animationDelay: "60ms" }}
            >
              <div className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-muted-foreground" {...ICON_PROPS} />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Disponibles</p>
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{fmtNum(kpis.disponibles)}</p>
            </div>
            {/* 3. Averiadas — pulse dot si hay alerta */}
            <div
              className="press-card anim-slide-up rounded-xl border border-border bg-card p-4 text-card-foreground shadow transition-shadow hover:shadow-md"
              style={{ animationDelay: "120ms" }}
            >
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Averiadas</p>
                {kpis.averiados > 0 && <span className="anim-pulse-dot h-2 w-2 rounded-full bg-destructive" />}
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{fmtNum(kpis.averiados)}</p>
            </div>
            {/* 4. En retiro */}
            <div
              className="press-card anim-slide-up rounded-xl border border-border bg-card p-4 text-card-foreground shadow transition-shadow hover:shadow-md"
              style={{ animationDelay: "180ms" }}
            >
              <div className="flex items-center gap-1.5">
                <Undo className="h-3 w-3 text-muted-foreground" {...ICON_PROPS} />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">En retiro</p>
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{fmtNum(kpis.enRetiro)}</p>
            </div>
            {/* 5. Sin despachar 30+d — pulse dot si hay alerta */}
            <div
              className="press-card anim-slide-up rounded-xl border border-border bg-card p-4 text-card-foreground shadow transition-shadow hover:shadow-md"
              style={{ animationDelay: "240ms" }}
            >
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sin despachar 30+d</p>
                {kpis.sinDespachar30 > 0 && <span className="anim-pulse-dot h-2 w-2 rounded-full bg-amber-500" />}
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{fmtNum(kpis.sinDespachar30)}</p>
            </div>
            {/* 6. Modelos */}
            <div
              className="press-card anim-slide-up rounded-xl border border-border bg-card p-4 text-card-foreground shadow transition-shadow hover:shadow-md"
              style={{ animationDelay: "300ms" }}
            >
              <div className="flex items-center gap-1.5">
                <Boxes className="h-3 w-3 text-muted-foreground" {...ICON_PROPS} />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Modelos</p>
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{fmtNum(kpis.modelosDistintos)}</p>
            </div>
          </section>

          {/* Chips de filtro por estado */}
          <div className="anim-slide-up mb-6 flex flex-wrap items-center gap-1">
            <Filter className="mr-1 h-3.5 w-3.5 text-muted-foreground" {...ICON_PROPS} />
            <FilterChip active={estadoFilter === "todos"} onClick={() => setEstadoFilter("todos")} label="Todos" count={equipos.length} />
            {ESTADOS.map((est) => {
              const n = equipos.filter((e) => e.estado === est).length;
              return <FilterChip key={est} active={estadoFilter === est} onClick={() => setEstadoFilter(est)} label={ESTADO_META[est].short} count={n} />;
            })}
          </div>

          {/* Lista de series agrupadas por modelo (expandible) */}
          {models.length === 0 ? (
            <p className="py-12 text-center text-[13px] text-muted-foreground">
              {equipos.length === 0 ? "No hay series registradas. Las series se añaden automáticamente al recibir equipos en la página de Recepciones." : "Sin coincidencias."}
            </p>
          ) : (
            <div className="space-y-10">
              {models.map(([modelo, items]) => {
                const mostrarTodas = expandido[modelo] || items.length <= SERIES_POR_MODELO_INICIAL;
                const itemsVisibles = mostrarTodas ? items : items.slice(0, SERIES_POR_MODELO_INICIAL);
                return (
                  <section key={modelo}>
                    <div className="mb-3 flex items-baseline justify-between">
                      <h2 className="text-[15px] font-medium text-foreground">{modelo}</h2>
                      <span className="text-[12px] tabular-nums text-muted-foreground">{items.length}</span>
                    </div>
                    <div className="overflow-x-auto scroll-thin">
                      <table className="w-full text-[13px]">
                        <thead>
                          <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                            <th className="py-2 pr-3 font-medium">#</th>
                            <th className="py-2 pr-3 font-medium">Serie</th>
                            <th className="py-2 pr-3 font-medium">MAC</th>
                            <th className="py-2 pr-3 font-medium">CM MAC</th>
                            <th className="py-2 pr-3 font-medium">Estado</th>
                            <th className="py-2 pr-3 font-medium">Antig.</th>
                            <th className="py-2 pr-3 font-medium">Ubicación</th>
                            <th className="py-2 font-medium">Observación</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {itemsVisibles.map((e, idx) => {
                            const ant = e.estado === "disponible" ? calcularAntiguedad(e.createdAt) : null;
                            return (
                              <tr key={e.id} className="anim-fade-in transition-colors hover:bg-muted/30" style={{ animationDelay: `${idx * 25}ms` }}>
                                <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">{idx + 1}</td>
                                <td className="py-2.5 pr-3 font-mono text-[12px] font-medium text-foreground">{e.serie}</td>
                                <td className="py-2.5 pr-3 font-mono text-[11px] text-muted-foreground">{e.mac ?? "—"}</td>
                                <td className="py-2.5 pr-3 font-mono text-[11px] text-muted-foreground">{e.cmMac ?? "—"}</td>
                                <td className="py-2.5 pr-3">
                                  <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                                    <EstadoIcon name={ESTADO_META[e.estado].icon} className="h-3 w-3" />
                                    {ESTADO_META[e.estado].short}
                                  </span>
                                </td>
                                <td className="py-2.5 pr-3">
                                  {ant ? (
                                    <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium", ant.bg, ant.text)} title={ant.label}>
                                      <span className={cn("h-1.5 w-1.5 rounded-full", ant.dot)} />
                                      {ant.dias}d
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 pr-3 text-[12px] text-muted-foreground">{e.ubicacion ?? "—"}</td>
                                <td className="py-2.5 text-[12px] text-muted-foreground">{e.observacion ?? "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {!mostrarTodas && (
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleExpandido(modelo)}
                          className="press h-8 rounded-lg border-border bg-background text-[12px] font-medium hover:bg-muted"
                        >
                          Ver {items.length - SERIES_POR_MODELO_INICIAL} más
                        </Button>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── TAB: RECOMENDACIONES (4 cards inteligentes) ─── */}
      {tab === "recomendaciones" && (
        <>
          {recomendaciones.sinDespachar30ConDias.length > 0 ||
          recomendaciones.averiadosConDias.length > 0 ||
          recomendaciones.antSinMov > 0 ||
          recomendaciones.topDespachados.length > 0 ? (
            <section className="anim-slide-up">
              <h2 className="mb-3 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                Recomendaciones Inteligentes
              </h2>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {/* Card 1: Sin despachar hace 30+ días */}
                <div
                  className="press-card anim-slide-up rounded-xl border border-border bg-card p-5 text-card-foreground shadow transition-shadow hover:shadow-md"
                  style={{ animationDelay: "0ms" }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
                      <h3 className="text-[13px] font-semibold text-foreground">Sin despachar hace 30+ días</h3>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
                      {recomendaciones.sinDespachar30ConDias.length}
                    </span>
                  </div>
                  {recomendaciones.sinDespachar30ConDias.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground">No hay series disponibles sin despachar hace 30+ días</p>
                  ) : (
                    <div className="space-y-2">
                      {recomendaciones.sinDespachar30ConDias.slice(0, 6).map(({ equipo, ultimoDespacho }) => (
                        <div key={equipo.id} className="flex items-baseline justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-medium text-foreground">{equipo.modelo || "Sin modelo"}</p>
                            <p className="font-mono text-[10px] text-muted-foreground">{equipo.serie}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[11px] tabular-nums text-muted-foreground">{fmtRelativo(ultimoDespacho)}</p>
                            <p className="text-[10px] text-muted-foreground">sin movimiento</p>
                          </div>
                        </div>
                      ))}
                      {recomendaciones.sinDespachar30ConDias.length > 6 && (
                        <p className="text-[11px] text-muted-foreground">+{recomendaciones.sinDespachar30ConDias.length - 6} más</p>
                      )}
                      <div className="border-t border-border pt-2 text-[11px] text-muted-foreground">
                        Total: <span className="font-semibold text-foreground">{recomendaciones.sinDespachar30ConDias.length}</span> series sin despachar 30+ días
                      </div>
                    </div>
                  )}
                </div>

                {/* Card 2: Series averiadas */}
                <div
                  className="press-card anim-slide-up rounded-xl border border-border bg-card p-5 text-card-foreground shadow transition-shadow hover:shadow-md"
                  style={{ animationDelay: "80ms" }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" {...ICON_PROPS} />
                      <h3 className="text-[13px] font-semibold text-foreground">Series averiadas</h3>
                    </div>
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-amber-600">
                      {recomendaciones.averiadosConDias.length}
                    </span>
                  </div>
                  {recomendaciones.averiadosConDias.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground">No hay series averiadas</p>
                  ) : (
                    <div className="space-y-2.5">
                      {recomendaciones.averiadosConDias.slice(0, 6).map(({ equipo, dias }) => {
                        // 90 días = 100% (capped). El bar representa antigüedad en estado averiado.
                        const pct = Math.min(100, Math.max(2, (dias / 90) * 100));
                        return (
                          <div key={equipo.id} className="space-y-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="truncate text-[12px] font-medium text-foreground">{equipo.modelo || "Sin modelo"}</span>
                              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{equipo.serie}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="truncate text-muted-foreground">
                                <MapPin className="mr-1 inline h-3 w-3 align-text-bottom" {...ICON_PROPS} />
                                {equipo.ubicacion || "Sin ubicación"}
                              </span>
                              <span className="shrink-0 font-semibold tabular-nums text-amber-600">{dias}d</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div className="anim-draw-in h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                      {recomendaciones.averiadosConDias.length > 6 && (
                        <p className="text-[11px] text-muted-foreground">+{recomendaciones.averiadosConDias.length - 6} más</p>
                      )}
                      <div className="border-t border-border pt-2 text-[11px] text-muted-foreground">
                        Total: <span className="font-semibold text-foreground">{recomendaciones.averiadosConDias.length}</span> series averiadas
                      </div>
                    </div>
                  )}
                </div>

                {/* Card 3: Antigüedad de stock */}
                <div
                  className="press-card anim-slide-up rounded-xl border border-border bg-card p-5 text-card-foreground shadow transition-shadow hover:shadow-md"
                  style={{ animationDelay: "160ms" }}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
                    <h3 className="text-[13px] font-semibold text-foreground">Antigüedad de stock</h3>
                  </div>
                  {kpis.disponibles === 0 ? (
                    <p className="text-[12px] text-muted-foreground">No hay series disponibles para analizar antigüedad</p>
                  ) : (
                    <div className="space-y-2">
                      {recomendaciones.antNuevo > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] text-muted-foreground">Nuevo (0-30 días)</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium tabular-nums text-emerald-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {recomendaciones.antNuevo}
                          </span>
                        </div>
                      )}
                      {recomendaciones.antAdv > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] text-muted-foreground">Advertencia (31-60)</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium tabular-nums text-amber-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            {recomendaciones.antAdv}
                          </span>
                        </div>
                      )}
                      {recomendaciones.antCrit > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] text-muted-foreground">Crítico (61-120)</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-medium tabular-nums text-rose-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            {recomendaciones.antCrit}
                          </span>
                        </div>
                      )}
                      {recomendaciones.antOld > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] text-muted-foreground">Antiguo (120+)</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-medium tabular-nums text-red-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            {recomendaciones.antOld}
                          </span>
                        </div>
                      )}
                      <div className="border-t border-border pt-2 text-[11px] text-muted-foreground">
                        Total disponibles: <span className="font-semibold text-foreground">{kpis.disponibles}</span> series
                      </div>
                    </div>
                  )}
                </div>

                {/* Card 4: Top modelos más despachados 30d */}
                <div
                  className="press-card anim-slide-up rounded-xl border border-border bg-card p-5 text-card-foreground shadow transition-shadow hover:shadow-md"
                  style={{ animationDelay: "240ms" }}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
                    <h3 className="text-[13px] font-semibold text-foreground">Top modelos más despachados 30d</h3>
                  </div>
                  {recomendaciones.topDespachados.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground">No hay despachos con series en los últimos 30 días</p>
                  ) : (
                    <div className="space-y-2">
                      {recomendaciones.topDespachados.map((m, i) => {
                        const pct = Math.max(4, (m.count / recomendaciones.maxTopDespachados) * 100);
                        return (
                          <div key={m.modelo} className="space-y-1">
                            <div className="flex items-baseline justify-between gap-2 text-[12px]">
                              <span className="flex min-w-0 items-center gap-1.5">
                                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{i + 1}.</span>
                                <span className="truncate font-medium text-foreground">{m.modelo}</span>
                              </span>
                              <span className="shrink-0 tabular-nums text-muted-foreground">
                                {fmtNum(m.count)} {m.count === 1 ? "serie" : "series"}
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div className="anim-draw-in h-full rounded-full bg-foreground/60" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>
          ) : (
            <div className="anim-fade-in rounded-lg border border-dashed border-border bg-background px-4 py-16 text-center text-[13px] text-muted-foreground">
              No hay recomendaciones activas. Todo está en orden.
            </div>
          )}
        </>
      )}

      {/* ─── TAB: MOVIMIENTOS (últimos despachos con serie asociada) ─── */}
      {tab === "movimientos" && (
        <>
          {despachos.filter((d) => d.series && d.series.length > 0).length > 0 ? (
            <section className="anim-slide-up">
              <h2 className="mb-3 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                Últimos despachos con serie
              </h2>
              <div className="scroll-thin divide-y divide-border rounded-lg border border-border bg-background">
                {despachos
                  .filter((d) => d.series && d.series.length > 0)
                  .sort((a, b) => b.fecha - a.fecha)
                  .slice(0, 15)
                  .map((d) => {
                    const serie = d.series![0];
                    const equipo = equipos.find((e) => e.serie === serie);
                    return (
                      <div
                        key={d.id}
                        className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40"
                      >
                        <span className="font-mono text-[12px] tabular-nums text-foreground">
                          {new Date(d.fecha).toLocaleDateString("es-PE")}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-foreground">
                            {equipo?.modelo || d.producto || "—"}
                          </p>
                          <p className="font-mono text-[11px] text-muted-foreground">{serie}</p>
                        </div>
                        <div className="hidden text-right sm:block">
                          {d.destino && (
                            <p className="truncate text-[11px] text-muted-foreground">{d.destino}</p>
                          )}
                          {d.tecnico && (
                            <p className="text-[10px] text-muted-foreground">{d.tecnico}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          ) : (
            <div className="anim-fade-in rounded-lg border border-dashed border-border bg-background px-4 py-16 text-center text-[13px] text-muted-foreground">
              No hay despachos con series asociadas.
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div className="mt-8 border-t border-border pt-6">
        <Button variant="ghost" onClick={goEquipos} className="press rounded-lg text-[13px] font-medium text-muted-foreground hover:text-foreground">
          Gestionar equipos <ArrowRight className="ml-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "press flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      {label}
      <span className={cn("tabular-nums", active ? "text-background/70" : "text-muted-foreground")}>{count}</span>
    </button>
  );
}
