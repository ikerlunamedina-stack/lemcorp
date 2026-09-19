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
  TrendingDown,
  Package,
  Boxes,
  Check,
  Undo,
  Filter,
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
import { AuroraSearchInput } from "@/components/lem/aurora-search-input";
import { EstadoIcon } from "@/components/lem/estado-icon";

const ICON_PROPS = { strokeWidth: 1.5 } as const;
const ESTADOS: EstadoEquipo[] = ["disponible", "averiado", "en_retiro"];

export function EquiposView() {
  const equipos = useStore((s) => s.equipos);
  const despachos = useStore((s) => s.despachos);
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<"todos" | EstadoEquipo>("todos");
  const [tab, setTab] = useState<"equipos" | "recomendaciones" | "movimientos">("equipos");
  const [pagina, setPagina] = useState(1);
  const PRODUCTOS_POR_PAGINA = 10;

  // Resetear página a 1 cuando cambian query/filtro/equipos
  useEffect(() => {
    setPagina(1);
  }, [query, estadoFilter, equipos]);

  // Filtrado por estado + query
  const filtered = useMemo(
    () =>
      equipos.filter((e) => {
        if (estadoFilter !== "todos" && e.estado !== estadoFilter) return false;
        const q = query.toLowerCase().trim();
        if (!q) return true;
        return (
          e.serie.toLowerCase().includes(q) ||
          e.modelo.toLowerCase().includes(q) ||
          (e.ubicacion ?? "").toLowerCase().includes(q)
        );
      }),
    [equipos, estadoFilter, query],
  );

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

  // Cálculo de paginación
  const totalPaginas = Math.max(1, Math.ceil(models.length / PRODUCTOS_POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const indiceInicio = (paginaActual - 1) * PRODUCTOS_POR_PAGINA;
  const paginaModels = models.slice(indiceInicio, indiceInicio + PRODUCTOS_POR_PAGINA);

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

    // Sin uso 60+d: equipos disponibles hace 60+ días sin despachar
    const ahora = Date.now();
    const dias60 = 60 * 86400_000;
    const sinUsoList = equipos.filter((e) => {
      if (e.estado !== "disponible") return false;
      const seriesEnDespachos = despachos.filter((d) => d.series?.includes(e.serie));
      const ultimoDespacho =
        seriesEnDespachos.length > 0 ? Math.max(...seriesEnDespachos.map((d) => d.fecha)) : 0;
      const referencia = ultimoDespacho || e.createdAt;
      return ahora - referencia >= dias60;
    });

    return {
      catalogo: equipos.length,
      disponibles,
      averiados: averiadosList.length,
      enRetiro,
      sinUso: sinUsoList.length,
      modelosDistintos,
      averiadosList,
      sinUsoList,
    };
  }, [equipos, despachos, modelosDistintos]);

  // ─── Recomendaciones Inteligentes ───
  const recomendaciones = useMemo(() => {
    const ahora = Date.now();

    // 1. Averiados a reparar (con días en estado averiado, usando updatedAt)
    const averiadosConDias = kpis.averiadosList
      .map((e) => ({
        equipo: e,
        dias: Math.max(0, Math.floor((ahora - (e.updatedAt || e.createdAt)) / 86400_000)),
      }))
      .sort((a, b) => b.dias - a.dias);

    // 2. Sin uso prolongado: disponibles con 60+ días sin despacho
    const sinUsoConDias = kpis.sinUsoList
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

    // 3. Tasa de averías por modelo (solo modelos con al menos 1 averiado)
    const porModelo = new Map<string, { modelo: string; total: number; averiados: number }>();
    for (const e of equipos) {
      const k = e.modelo || "Sin modelo";
      const cur = porModelo.get(k) ?? { modelo: k, total: 0, averiados: 0 };
      cur.total += 1;
      if (e.estado === "averiado") cur.averiados += 1;
      porModelo.set(k, cur);
    }
    const tasaAverias = Array.from(porModelo.values())
      .filter((m) => m.averiados > 0)
      .map((m) => ({ ...m, tasa: m.total > 0 ? (m.averiados / m.total) * 100 : 0 }))
      .sort((a, b) => b.tasa - a.tasa)
      .slice(0, 5);

    // 4. Top modelos más registrados
    const topModelos = Array.from(porModelo.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    const maxTopModelos = topModelos.length > 0 ? topModelos[0].total : 1;

    return { averiadosConDias, sinUsoConDias, tasaAverias, topModelos, maxTopModelos };
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

  const goSeries = () => router.push("/series");

  return (
    <div className="select-text cursor-text px-4 py-8 sm:px-6 lg:px-10 anim-fade-in">
      {/* Header */}
      <header className="anim-slide-up mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {equipos.length} equipos · {models.length} modelos
          </p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]">Equipos</h1>
        </div>
        <AuroraSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Buscar serie…"
          placeholderFocused="Escribe para filtrar series…"
          className="w-48"
          iconSize="h-3.5 w-3.5"
        />
      </header>

      {/* Pestañas: Equipos | Recomendaciones | Movimientos */}
      <div className="anim-slide-up mb-6 flex items-center gap-1 border-b border-border">
        {([
          ["equipos", "Equipos", equipos.length],
          ["recomendaciones", "Recomendaciones", kpis.averiados + kpis.sinUso + kpis.modelosDistintos],
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

      {/* ─── TAB: EQUIPOS (KPIs + chips + lista con paginación) ─── */}
      {tab === "equipos" && (
        <>
          {/* KPIs superiores — entrada escalonada con stagger delay */}
          <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {/* 1. Catálogo */}
            <div
              className="press-card anim-slide-up rounded-xl border border-border bg-card p-4 text-card-foreground shadow transition-shadow hover:shadow-md"
              style={{ animationDelay: "0ms" }}
            >
              <div className="flex items-center gap-1.5">
                <Package className="h-3 w-3 text-muted-foreground" {...ICON_PROPS} />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Catálogo</p>
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{fmtNum(equipos.length)}</p>
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
            {/* 3. Averiados — pulse dot si hay alerta */}
            <div
              className="press-card anim-slide-up rounded-xl border border-border bg-card p-4 text-card-foreground shadow transition-shadow hover:shadow-md"
              style={{ animationDelay: "120ms" }}
            >
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Averiados</p>
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
            {/* 5. Sin uso 60+d — pulse dot si hay alerta */}
            <div
              className="press-card anim-slide-up rounded-xl border border-border bg-card p-4 text-card-foreground shadow transition-shadow hover:shadow-md"
              style={{ animationDelay: "240ms" }}
            >
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sin uso 60+d</p>
                {kpis.sinUso > 0 && <span className="anim-pulse-dot h-2 w-2 rounded-full bg-amber-500" />}
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{fmtNum(kpis.sinUso)}</p>
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

          {/* Lista de modelos con paginación */}
          {models.length === 0 ? (
            <p className="py-12 text-center text-[13px] text-muted-foreground">
              {equipos.length === 0 ? "No hay equipos registrados. Los equipos se añaden automáticamente al recibir una guía de remisión SUNAT en la página de Recepciones." : "Sin coincidencias."}
            </p>
          ) : (
            <>
              <div className="divide-y divide-border border-y border-border">
                {paginaModels.map(([modelo, items], idx) => {
                  // ─── Antigüedad: contar equipos disponibles por nivel ───
                  const disp = items.filter((e) => e.estado === "disponible");
                  const ant = disp.map((e) => calcularAntiguedad(e.createdAt));
                  const antAdv = ant.filter((a) => a.nivel === "advertencia").length;
                  const antCrit = ant.filter((a) => a.nivel === "critico").length;
                  const antOld = ant.filter((a) => a.nivel === "antiguo").length;
                  const antTotal = antAdv + antCrit + antOld;
                  return (
                    <div
                      key={modelo}
                      className="anim-fade-in flex items-center gap-4 py-4"
                      style={{ animationDelay: `${idx * 25}ms` }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-medium text-foreground">{modelo}</p>
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                          {items.length} equipo(s) · {disp.length} disponibles
                          {items.some((e) => e.ubicacion) && (
                            <span className="ml-1.5 inline-flex items-center gap-1 text-[11px]">
                              <MapPin className="h-3 w-3" {...ICON_PROPS} />
                              {[...new Set(items.map((e) => e.ubicacion).filter(Boolean))].slice(0, 3).join(", ")}
                              {[...new Set(items.map((e) => e.ubicacion).filter(Boolean))].length > 3 && "…"}
                            </span>
                          )}
                          {antTotal > 0 && (
                            <span className="ml-1.5 inline-flex items-center gap-1 text-[11px]">
                              <Clock className="h-3 w-3" {...ICON_PROPS} />
                              {antTotal} con antigüedad
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="hidden items-center gap-3 sm:flex">
                        {ESTADOS.map((est) => {
                          const n = items.filter((e) => e.estado === est).length;
                          if (n === 0) return null;
                          return (
                            <span key={est} className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                              <EstadoIcon name={ESTADO_META[est].icon} className="h-3 w-3" />
                              {n}
                            </span>
                          );
                        })}
                        {/* Indicadores de antigüedad (solo si hay equipos disponibles) */}
                        {antAdv > 0 && (
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium", ANTIGUEDAD_META.advertencia.bg, ANTIGUEDAD_META.advertencia.text)}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", ANTIGUEDAD_META.advertencia.dot)} />
                            {antAdv} advert.
                          </span>
                        )}
                        {antCrit > 0 && (
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium", ANTIGUEDAD_META.critico.bg, ANTIGUEDAD_META.critico.text)}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", ANTIGUEDAD_META.critico.dot)} />
                            {antCrit} crít.
                          </span>
                        )}
                        {antOld > 0 && (
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium", ANTIGUEDAD_META.antiguo.bg, ANTIGUEDAD_META.antiguo.text)}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", ANTIGUEDAD_META.antiguo.dot)} />
                            {antOld} antiguos
                          </span>
                        )}
                      </div>
                      <span className="text-[15px] font-semibold tabular-nums text-foreground">{items.length}</span>
                      <button
                        onClick={goSeries}
                        className="press flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground"
                      >
                        Ver series <ArrowRight className="h-3 w-3" {...ICON_PROPS} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Controles de paginación */}
              {models.length > PRODUCTOS_POR_PAGINA && (
                <div className="anim-slide-up mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <p className="text-[12px] text-muted-foreground">
                    Mostrando <span className="font-semibold tabular-nums text-foreground">{indiceInicio + 1}</span>–
                    <span className="font-semibold tabular-nums text-foreground">{Math.min(indiceInicio + PRODUCTOS_POR_PAGINA, models.length)}</span> de{" "}
                    <span className="font-semibold tabular-nums text-foreground">{models.length}</span> modelos
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
        </>
      )}

      {/* ─── TAB: RECOMENDACIONES (4 cards inteligentes) ─── */}
      {tab === "recomendaciones" && (
        <>
          {recomendaciones.averiadosConDias.length > 0 ||
          recomendaciones.sinUsoConDias.length > 0 ||
          recomendaciones.tasaAverias.length > 0 ||
          recomendaciones.topModelos.length > 0 ? (
            <section className="anim-slide-up">
              <h2 className="mb-3 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                Recomendaciones Inteligentes
              </h2>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {/* Card 1: Averiados a reparar */}
                <div
                  className="press-card anim-slide-up rounded-xl border border-border bg-card p-5 text-card-foreground shadow transition-shadow hover:shadow-md"
                  style={{ animationDelay: "0ms" }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" {...ICON_PROPS} />
                      <h3 className="text-[13px] font-semibold text-foreground">Averiados a reparar</h3>
                    </div>
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-amber-600">
                      {recomendaciones.averiadosConDias.length}
                    </span>
                  </div>
                  {recomendaciones.averiadosConDias.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground">Todos los equipos están operativos</p>
                  ) : (
                    <div className="space-y-2.5">
                      {recomendaciones.averiadosConDias.slice(0, 6).map(({ equipo, dias }) => {
                        // 60 días = 100% (capped). El bar representa antigüedad en estado averiado.
                        const pct = Math.min(100, Math.max(2, (dias / 60) * 100));
                        return (
                          <div key={equipo.id} className="space-y-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="truncate text-[12px] font-medium text-foreground">{equipo.modelo || "Sin modelo"}</span>
                              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{equipo.serie}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="truncate text-muted-foreground">{equipo.ubicacion || "Sin ubicación"}</span>
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
                        Total: <span className="font-semibold text-foreground">{recomendaciones.averiadosConDias.length}</span> equipos averiados
                      </div>
                    </div>
                  )}
                </div>

                {/* Card 2: Sin uso prolongado */}
                <div
                  className="press-card anim-slide-up rounded-xl border border-border bg-card p-5 text-card-foreground shadow transition-shadow hover:shadow-md"
                  style={{ animationDelay: "80ms" }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
                      <h3 className="text-[13px] font-semibold text-foreground">Sin uso prolongado</h3>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
                      {recomendaciones.sinUsoConDias.length}
                    </span>
                  </div>
                  {recomendaciones.sinUsoConDias.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground">No hay equipos disponibles sin uso prolongado</p>
                  ) : (
                    <div className="space-y-2">
                      {recomendaciones.sinUsoConDias.slice(0, 6).map(({ equipo, ultimoDespacho }) => (
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
                      {recomendaciones.sinUsoConDias.length > 6 && (
                        <p className="text-[11px] text-muted-foreground">+{recomendaciones.sinUsoConDias.length - 6} más</p>
                      )}
                      <div className="border-t border-border pt-2 text-[11px] text-muted-foreground">
                        Total: <span className="font-semibold text-foreground">{recomendaciones.sinUsoConDias.length}</span> equipos sin uso 60+ días
                      </div>
                    </div>
                  )}
                </div>

                {/* Card 3: Tasa de averías por modelo */}
                <div
                  className="press-card anim-slide-up rounded-xl border border-border bg-card p-5 text-card-foreground shadow transition-shadow hover:shadow-md"
                  style={{ animationDelay: "160ms" }}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
                    <h3 className="text-[13px] font-semibold text-foreground">Tasa de averías por modelo</h3>
                  </div>
                  {recomendaciones.tasaAverias.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground">Sin averías registradas por modelo</p>
                  ) : (
                    <div className="space-y-2">
                      {recomendaciones.tasaAverias.map((m) => {
                        const pct = Math.max(4, m.tasa);
                        return (
                          <div key={m.modelo} className="space-y-1">
                            <div className="flex items-baseline justify-between gap-2 text-[12px]">
                              <span className="truncate font-medium text-foreground">{m.modelo}</span>
                              <span className="shrink-0 tabular-nums text-muted-foreground">
                                {m.averiados}/{m.total} ({Math.round(m.tasa)}%)
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div className="anim-draw-in h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Card 4: Top modelos más registrados */}
                <div
                  className="press-card anim-slide-up rounded-xl border border-border bg-card p-5 text-card-foreground shadow transition-shadow hover:shadow-md"
                  style={{ animationDelay: "240ms" }}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
                    <h3 className="text-[13px] font-semibold text-foreground">Top modelos más registrados</h3>
                  </div>
                  {recomendaciones.topModelos.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground">No hay modelos registrados</p>
                  ) : (
                    <div className="space-y-2">
                      {recomendaciones.topModelos.map((m, i) => {
                        const pct = Math.max(4, (m.total / recomendaciones.maxTopModelos) * 100);
                        return (
                          <div key={m.modelo} className="space-y-1">
                            <div className="flex items-baseline justify-between gap-2 text-[12px]">
                              <span className="flex min-w-0 items-center gap-1.5">
                                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{i + 1}.</span>
                                <span className="truncate font-medium text-foreground">{m.modelo}</span>
                              </span>
                              <span className="shrink-0 tabular-nums text-muted-foreground">
                                {fmtNum(m.total)} {m.total === 1 ? "equipo" : "equipos"}
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
