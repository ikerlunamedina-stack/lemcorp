"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import {
  Package, Boxes, AlertTriangle, Download,
  TrendingUp, Clock, ArrowRight, DollarSign,
  Activity, Calendar, Warehouse, BarChart3,
  ArrowDownToLine, ArrowLeftRight, FileText, Info,
  Mail, RefreshCw, Loader2, AlertCircle, CheckCircle2,
  TrendingDown, Cpu, StickyNote,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import { fmtNum } from "@/lib/num";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ESTADO_META, type ActiveView, type EstadoEquipo } from "@/lib/types";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

const VIEW_PATH: Record<ActiveView, string> = {
  dashboard: "/", inventario: "/inventario", despachos: "/despachos",
  equipos: "/equipos", series: "/series", pistolear: "/pistolear",
  horario: "/horario", bloc: "/bloc", ia: "/ia", empresa: "/empresa",
  notificaciones: "/notificaciones", config: "/config",
};

function fmtSoles(n: number): string {
  return "S/ " + n.toLocaleString("es-PE", { maximumFractionDigits: 0 });
}

/** Hook de animación de conteo (cubic ease-out) — para el KPI principal */
function useCountUp(target: number, duration = 800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(start + (target - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

const ICON_PROPS = { strokeWidth: 1.5 } as const;

/** Mini gráfico de línea SVG (legacy, para compatibilidad) */
function MiniChart({ data, color = "var(--primary)", height = 40 }: {
  data: number[]; color?: string; height?: number;
}) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * 100;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  const areaPoints = `0,${height} ${points} 100,${height}`;
  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <polygon points={areaPoints} fill={color} opacity={0.1} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Tooltip personalizado para el gráfico de Velocidad Operativa (igual al SpaceCom) */
function VelocidadTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 text-[11px] shadow-lg">
      <p className="mb-1 font-medium text-foreground tabular-nums">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <strong className="text-foreground tabular-nums">S/ {Number(p.value).toLocaleString("es-PE", { maximumFractionDigits: 0 })}</strong>
        </div>
      ))}
    </div>
  );
}

/** Gráfico de Velocidad Operativa estilo SpaceCom — usa recharts (igual que el original) */
function VelocidadOperativaChart({
  dataDespachado,
  dataValor,
  fechas,
  height = 220,
}: {
  dataDespachado: number[];
  dataValor: number[];
  fechas: string[];
  height?: number;
}) {
  // Formatear el eje Y en Soles con separadores de miles
  const fmtSolesAxis = (v: number) => "S/ " + v.toLocaleString("es-PE", { maximumFractionDigits: 0 });

  // Construir data array para recharts: [{fecha, Despachado, Valor Desp.}, ...]
  const data = fechas.map((fecha, i) => ({
    fecha,
    Despachado: dataDespachado[i] || 0,
    "Valor Desp.": dataValor[i] || 0,
  }));

  // Colores exactos del SpaceCom
  const colorDespachado = "hsl(232 77% 66%)"; // azul/violeta
  const colorValor = "hsl(145 53% 58%)";   // verde esmeralda

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" vertical horizontal />
          <XAxis
            dataKey="fecha"
            tick={{ fontSize: 10, fill: "#666" }}
            tickLine={{ stroke: "#666" }}
            axisLine={{ stroke: "#666" }}
            height={30}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#666" }}
            tickLine={{ stroke: "#666" }}
            axisLine={{ stroke: "#666" }}
            width={60}
            tickFormatter={fmtSolesAxis}
            domain={[0, "auto"]}
          />
          <Tooltip content={<VelocidadTooltip />} cursor={{ stroke: "#ccc", strokeWidth: 1 }} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
            iconType="plainline"
            iconSize={14}
          />
          <Line
            type="monotone"
            dataKey="Despachado"
            stroke={colorDespachado}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
          />
          <Line
            type="monotone"
            dataKey="Valor Desp."
            stroke={colorValor}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut chart con conic-gradient */
function Donut({ segments, size = 100, centerLabel }: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  centerLabel?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const gradParts: string[] = [];
  segments.reduce((acc, s) => {
    const pct = (s.value / total) * 100;
    const start = acc;
    const end = acc + pct;
    gradParts.push(`${s.color} ${start}% ${end}%`);
    return end;
  }, 0);
  const grad = gradParts.join(", ");
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="rounded-full" style={{
        width: size, height: size,
        background: `conic-gradient(${grad})`,
      }} />
      <div className="absolute inset-[20%] rounded-full bg-card flex flex-col items-center justify-center">
        <span className="text-[16px] font-bold tabular-nums text-foreground leading-none">{centerLabel ?? total}</span>
        {centerLabel && (
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">total</span>
        )}
      </div>
    </div>
  );
}

/** Botón de Info circular muestra popover al click (no tooltip nativo del browser) */
function InfoButton({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground/70 hover:bg-muted hover:text-foreground transition-colors"
        >
          <Info className="h-3.5 w-3.5" {...ICON_PROPS} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-3 text-[12px] text-muted-foreground"
        align="start"
        sideOffset={4}
      >
        {title}
      </PopoverContent>
    </Popover>
  );
}

/** Tarjeta de marca de SpaceCom: rounded-xl border bg-card shadow hover:shadow-md transition-shadow */
function SpaceCard({
  className,
  children,
  style,
}: {
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <section
      className={cn(
        "press-card anim-slide-up rounded-xl border border-border bg-card text-card-foreground shadow hover:shadow-md transition-shadow",
        "flex h-full flex-col space-y-4 p-5",
        className,
      )}
      style={style}
    >
      {children}
    </section>
  );
}

/** Encabezado de tarjeta (label + optional Info button on the right) */
function CardHeader({
  title,
  infoText,
  right,
}: {
  title: string;
  infoText?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {infoText && <InfoButton title={infoText} />}
      </div>
      {right}
    </div>
  );
}

export function DashboardView() {
  const products = useStore((s) => s.products) ?? [];
  const equipos = useStore((s) => s.equipos) ?? [];
  const entradas = useStore((s) => s.entradas) ?? [];
  const despachos = useStore((s) => s.despachos) ?? [];
  const notas = useStore((s) => s.notas) ?? [];
  const miembros = useStore((s) => s.miembros) ?? [];
  const horario = useStore((s) => s.horario) ?? [];
  const exportInventarioExcel = useStore((s) => s.exportInventarioExcel);
  const router = useRouter();
  const go = (v: ActiveView) => () => router.push(VIEW_PATH[v]);
  const [velocidadTab, setVelocidadTab] = useState<"7D" | "30D" | "3M" | "1A">("7D");

  // ─── Tick cada 60s para que la antigüedad de equipos se recalcule sola ───
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(i);
  }, []);

  const stats = useMemo(() => {
    const totalUnidades = products.reduce((s, p) => s + p.quantity, 0);
    const valorTotal = products.reduce((s, p) => s + (p.precio || 0) * p.quantity, 0);
    const valorPropio = products.filter(p => !p.categoria || p.categoria !== "consignado").reduce((s, p) => s + (p.precio || 0) * p.quantity, 0);
    const valorConsignado = products.filter(p => p.categoria === "consignado").reduce((s, p) => s + (p.precio || 0) * p.quantity, 0);
    const bajoStock = products.filter((p) => p.minStock && p.minStock > 0 && p.quantity <= p.minStock);
    const agotados = products.filter((p) => p.quantity === 0);

    // Categorías
    const catMap: Record<string, { valor: number; cantidad: number }> = {};
    for (const p of products) {
      const k = p.categoria || "Sin categoría";
      if (!catMap[k]) catMap[k] = { valor: 0, cantidad: 0 };
      catMap[k].valor += (p.precio || 0) * p.quantity;
      catMap[k].cantidad += p.quantity;
    }
    const categorias = Object.entries(catMap).sort((a, b) => b[1].valor - a[1].valor).slice(0, 5);

    // Despachos por técnico
    const tecMap: Record<string, { count: number; total: number; valor: number }> = {};
    for (const d of despachos) {
      const t = d.tecnico || d.destino || "Sin asignar";
      if (!tecMap[t]) tecMap[t] = { count: 0, total: 0, valor: 0 };
      tecMap[t].count++;
      tecMap[t].total += d.cantidad;
      const prod = products.find(p => p.sku === d.sku);
      tecMap[t].valor += (prod?.precio || 0) * d.cantidad;
    }
    const topTecnicos = Object.entries(tecMap).sort((a, b) => b[1].valor - a[1].valor).slice(0, 5);

    // Equipos por estado
    const eqEstado = {
      disponible: equipos.filter((e) => e.estado === "disponible").length,
      averiado: equipos.filter((e) => e.estado === "averiado").length,
      en_retiro: equipos.filter((e) => e.estado === "en_retiro").length,
    };

    // Despachos de hoy
    const hoy = despachos.filter(d => {
      try { return new Date(d.fecha).toDateString() === new Date().toDateString(); }
      catch { return false; }
    }).length;

    // Velocidad operativa (datos para gráfico)
    // 2 series por tab: unidades despachadas + valor despachado en soles
    // + array de fechas (formato dd/mm) para el eje X
    const ahora = Date.now();

    // Helper: calcula para un rango [desde, hasta) las unidades y el valor (precio * cantidad)
    const calcRango = (desde: number, hasta: number) => {
      let und = 0, val = 0;
      for (const d of despachos) {
        if (d.fecha >= desde && d.fecha < hasta) {
          und += d.cantidad;
          // Buscar el precio del producto al momento del despacho
          const prod = products.find(p => p.sku === d.sku);
          val += (prod?.precio || 0) * d.cantidad;
        }
      }
      return { und, val };
    };

    // Helper: fecha dd/mm para el centro del rango
    const fmtFecha = (ts: number) => {
      try {
        return new Date(ts).toLocaleDateString("es-PE", {
          timeZone: "America/Lima",
          day: "2-digit", month: "2-digit",
        });
      } catch { return ""; }
    };

    // 7D: 8 puntos de 1 día cada uno (últimos 7 días)
    const dias7Und: number[] = [], dias7Val: number[] = [], dias7Fechas: string[] = [];
    for (let i = 0; i < 8; i++) {
      const desde = ahora - (7 - i) * 86400000;
      const hasta = desde + 86400000;
      const r = calcRango(desde, hasta);
      dias7Und.push(r.und); dias7Val.push(r.val);
      dias7Fechas.push(fmtFecha(desde + 43200000));
    }

    // 30D: 8 puntos de ~4 días cada uno (últimos ~32 días) — igual al SpaceCom
    const dias30Und: number[] = [], dias30Val: number[] = [], dias30Fechas: string[] = [];
    for (let i = 0; i < 8; i++) {
      const desde = ahora - (7 - i) * 4 * 86400000;
      const hasta = desde + 4 * 86400000;
      const r = calcRango(desde, hasta);
      dias30Und.push(r.und); dias30Val.push(r.val);
      dias30Fechas.push(fmtFecha(desde + 2 * 86400000));
    }

    // 3M: 8 puntos de ~11 días cada uno (~3 meses = ~90 días)
    const meses3Und: number[] = [], meses3Val: number[] = [], meses3Fechas: string[] = [];
    for (let i = 0; i < 8; i++) {
      const desde = ahora - (7 - i) * 11 * 86400000;
      const hasta = desde + 11 * 86400000;
      const r = calcRango(desde, hasta);
      meses3Und.push(r.und); meses3Val.push(r.val);
      meses3Fechas.push(fmtFecha(desde + 5.5 * 86400000));
    }

    // 1A: 8 puntos de ~45 días cada uno (~1 año)
    const ano1Und: number[] = [], ano1Val: number[] = [], ano1Fechas: string[] = [];
    for (let i = 0; i < 8; i++) {
      const desde = ahora - (7 - i) * 45 * 86400000;
      const hasta = desde + 45 * 86400000;
      const r = calcRango(desde, hasta);
      ano1Und.push(r.und); ano1Val.push(r.val);
      ano1Fechas.push(fmtFecha(desde + 22.5 * 86400000));
    }

    // Antigüedad de stock
    const antig = { "0-45d": 0, "46-90d": 0, "91-360d": 0, "+360d": 0, "sf": 0 };
    for (const p of products) {
      const dias = Math.floor((ahora - (p.updatedAt || p.createdAt)) / 86400000);
      if (!p.updatedAt && !p.createdAt) antig.sf++;
      else if (dias <= 45) antig["0-45d"]++;
      else if (dias <= 90) antig["46-90d"]++;
      else if (dias <= 360) antig["91-360d"]++;
      else antig["+360d"]++;
    }
    const totalProd = products.length || 1;

    // Clasificación ABC
    const sortedByVal = [...products].sort((a, b) =>
      ((b.precio || 0) * b.quantity) - ((a.precio || 0) * a.quantity)
    );
    const valTotal = sortedByVal.reduce((s, p) => s + (p.precio || 0) * p.quantity, 0) || 1;
    let acum = 0, claseA = 0, claseB = 0, claseC = 0;
    for (const p of sortedByVal) {
      acum += (p.precio || 0) * p.quantity;
      const pct = acum / valTotal;
      if (pct <= 0.7) claseA++;
      else if (pct <= 0.9) claseB++;
      else claseC++;
    }

    // Tasa devolución
    const tasaDev = despachos.length > 0
      ? Math.round((entradas.length / (despachos.length + entradas.length)) * 100 * 10) / 10
      : 0;

    // Programación hoy
    const dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
    const diaHoy = dias[new Date().getDay()];
    const horarioHoy = horario.filter(h => h.dia === diaHoy);
    const horaStr = new Date().toLocaleTimeString("es-PE", {
      timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false
    });
    const limaHour = parseInt(new Date().toLocaleTimeString("en-US",
      { timeZone: "America/Lima", hour: "2-digit", hour12: false }), 10);
    const saludo = limaHour < 12 ? "Buenos días" : limaHour < 19 ? "Buenas tardes" : "Buenas noches";

    // ─── TOTAL VALOR DESPACHADO) ───
    // Suma histórica de todos los despachos valorizados al precio del producto
    const totalValorDespachado = despachos.reduce((s, d) => {
      const prod = products.find(p => p.sku === d.sku);
      return s + (prod?.precio || 0) * d.cantidad;
    }, 0);

    // ─── VALOR EN EQUIPOS") ───
    // Valor de equipos = precio * 1 (cada uno tiene serie) + stock a granel
    const valorEquipos = equipos.reduce((s, e) => {
      const prod = products.find(p => p.name === e.modelo || p.sku === e.modelo);
      return s + (prod?.precio || 0);
    }, 0);
    const valorEquiposStock = valorEquipos + valorConsignado;

    // ─── REGIONES (para la card "REGIONES") ───
    // Agrupa despachos por destino (región/ciudad) y suma el valor despachado
    const regMap: Record<string, number> = {};
    for (const d of despachos) {
      const r = (d.destino || d.almacenDestino || "").trim() || "Sin Región";
      // Simplificar: si la cadena contiene "LIMA", agrupar como "LIMA"
      const key = /LIMA/i.test(r) ? "LIMA" : r;
      const prod = products.find(p => p.sku === d.sku);
      regMap[key] = (regMap[key] || 0) + (prod?.precio || 0) * d.cantidad;
    }
    const regiones = Object.entries(regMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // ─── Antigüedad de equipos (verde / advertencia, naranja / crítico, rojo / antiguo, alerta crítica) ───
    // Recalculado en cada render — reactivo a cambios en `equipos` y al paso del tiempo
    // Reutiliza `ahora` definida arriba para Velocidad operativa
    let antiguosAdvertencia = 0; // 31-60 días
    let antiguosCritico = 0;     // 61-120 días
    let antiguosAntiguo = 0;     // > 120 días
    for (const e of equipos) {
      if (e.estado !== "disponible") continue; // solo disponibles cuentan para antigüedad en stock
      const diasEq = Math.floor((ahora - e.createdAt) / (1000 * 60 * 60 * 24));
      if (diasEq < 31) continue;
      if (diasEq < 61) antiguosAdvertencia++;
      else if (diasEq < 121) antiguosCritico++;
      else antiguosAntiguo++;
    }
    const antiguosCriticos = antiguosCritico + antiguosAntiguo;

    // ─── Operaciones (contadas por operación única, no por item individual) ───
    // Una recepción con 42 materiales = 1 recepción, no 42
    // Una transferencia con 519 items = 1 operación, no 519

    // Recepciones: agrupadas por recepcionId (cada PDF subido = 1 recepción)
    const recepcionesSet = new Set(entradas.map(e => e.recepcionId).filter(Boolean));
    const recepcionesUnicas = recepcionesSet.size;
    // Fallback: si hay entradas sin recepcionId (legacy), contamos cada una
    const recepcionesLegacy = entradas.filter(e => !e.recepcionId).length;
    const recepcionesTotal = recepcionesUnicas + recepcionesLegacy;

    // Transferencias: agrupadas por nOperacion (cada Excel subido = 1 operación)
    const transferenciasUnicas = new Set(
      despachos
        .filter(d => d.tipo === "transferencia" && d.nOperacion)
        .map(d => d.nOperacion)
    ).size;
    // Fallback: transferencias sin nOperacion
    const transferenciasLegacy = despachos.filter(d => d.tipo === "transferencia" && !d.nOperacion).length;
    const transferenciasTotal = transferenciasUnicas + transferenciasLegacy;

    // Items despachados (reemplaza a "Albaranes" — total de líneas de despacho)
    const itemsDespachados = despachos.length;

    // Top productos despachados (proyectos)
    const prodMap: Record<string, { count: number; valor: number }> = {};
    for (const d of despachos) {
      const k = d.producto || d.sku;
      if (!prodMap[k]) prodMap[k] = { count: 0, valor: 0 };
      prodMap[k].count += d.cantidad;
      const prod = products.find(p => p.sku === d.sku);
      prodMap[k].valor += (prod?.precio || 0) * d.cantidad;
    }
    const topProyectos = Object.entries(prodMap).sort((a, b) => b[1].valor - a[1].valor).slice(0, 5);

    return {
      totalUnidades, valorTotal, valorPropio, valorConsignado,
      bajoStock, agotados, categorias, topTecnicos, eqEstado, hoy,
      antig, totalProd, claseA, claseB, claseC, tasaDev,
      horarioHoy, horaStr, saludo,
      recepcionesTotal, transferenciasTotal, itemsDespachados, topProyectos,
      antiguosAdvertencia, antiguosCritico, antiguosAntiguo, antiguosCriticos,
      dias7Und, dias7Val, dias7Fechas,
      dias30Und, dias30Val, dias30Fechas,
      meses3Und, meses3Val, meses3Fechas,
      ano1Und, ano1Val, ano1Fechas,
      totalValorDespachado, valorEquiposStock, regiones,
    };
  }, [products, equipos, despachos, entradas, horario]);

  const c = useCountUp(stats.valorTotal);
  const u = useCountUp(stats.totalUnidades);
  const eqCount = useCountUp(equipos.length);
  const critCount = useCountUp(stats.bajoStock.length);
  const prodCount = useCountUp(products.length);
  const despCount = useCountUp(despachos.length);

  const velocidadUnd = velocidadTab === "7D" ? stats.dias7Und
    : velocidadTab === "30D" ? stats.dias30Und
    : velocidadTab === "3M" ? stats.meses3Und
    : stats.ano1Und;
  const velocidadVal = velocidadTab === "7D" ? stats.dias7Val
    : velocidadTab === "30D" ? stats.dias30Val
    : velocidadTab === "3M" ? stats.meses3Val
    : stats.ano1Val;
  const velocidadFechas = velocidadTab === "7D" ? stats.dias7Fechas
    : velocidadTab === "30D" ? stats.dias30Fechas
    : velocidadTab === "3M" ? stats.meses3Fechas
    : stats.ano1Fechas;

  // Datos para el donut de Composición (Propio vs Consignado)
  const composicionSegments: { label: string; value: number; color: string }[] = [
    { label: "Propio", value: stats.valorPropio, color: "oklch(0.55 0.20 270)" },
    { label: "Consignado", value: stats.valorConsignado, color: "oklch(0.70 0.13 200)" },
  ];
  const composicionTotal = (stats.valorPropio + stats.valorConsignado) || 1;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-10">
      {/* ─── Header: en móvil apilado, en desktop en fila ─── */}
      <div className="mb-6 flex flex-col lg:flex-row lg:items-stretch lg:justify-between gap-4">
        {/* Saludo */}
        <div className="w-full lg:w-auto lg:shrink-0 flex flex-col justify-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {stats.horaStr} · {new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima", weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight text-foreground sm:text-[32px]">
            {stats.saludo}, Iker
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Centro de Control Logístico</p>
        </div>

        {/* 2 recuadros: ocupan todo el espacio disponible entre el saludo y Exportar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 w-full lg:flex-1 min-w-0">
          {/* Recuadro Grande — Bandeja Importante */}
          <div className="sm:col-span-1 lg:col-span-8 bg-card border border-border rounded-xl p-4 shadow-sm">
            <AnunciosDelSistema products={products} notas={notas} horario={horario} />
          </div>
          {/* Recuadro Pequeño — Resumen */}
          <div className="sm:col-span-1 lg:col-span-4 bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex h-full flex-col gap-3">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Resumen</p>
                <InfoButton title="Resumen rápido del almacén: cantidad de productos en catálogo, equipos con serie registrados, despachos totales y notas activas." />
              </div>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <Package className="h-3.5 w-3.5 text-primary shrink-0" {...ICON_PROPS} />
                  <span className="text-[18px] font-bold tabular-nums text-foreground">{prodCount}</span>
                  <span className="text-[10px] text-muted-foreground">productos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Cpu className="h-3.5 w-3.5 text-primary shrink-0" {...ICON_PROPS} />
                  <span className="text-[18px] font-bold tabular-nums text-foreground">{eqCount}</span>
                  <span className="text-[10px] text-muted-foreground">equipos</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-3.5 w-3.5 text-primary shrink-0" {...ICON_PROPS} />
                  <span className="text-[18px] font-bold tabular-nums text-foreground">{despCount}</span>
                  <span className="text-[10px] text-muted-foreground">despachos</span>
                </div>
                <div className="flex items-center gap-2">
                  <StickyNote className="h-3.5 w-3.5 text-primary shrink-0" {...ICON_PROPS} />
                  <span className="text-[18px] font-bold tabular-nums text-foreground">{notas.length}</span>
                  <span className="text-[10px] text-muted-foreground">notas</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={() => exportInventarioExcel()}
          variant="outline"
          className="press h-9 rounded-lg border-border bg-card px-3 text-[13px] font-medium shadow-sm hover:bg-muted w-full lg:w-auto lg:shrink-0"
        >
          <Download className="mr-1.5 h-4 w-4" {...ICON_PROPS} /> Exportar
        </Button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          FILA 1 — 5 cards en grid xl:grid-cols-6 (Velocidad col-span-2)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* 1. VALOR TOTAL STOCK */}
        <SpaceCard>
          <CardHeader
            title="Valor Total Stock"
            infoText="Valor total del inventario actual (Propio + Consignado) en Soles."
          />
          <div className="flex items-baseline gap-1">
            <span className="text-[11px] text-muted-foreground">S/</span>
            <p className="text-2xl font-bold tabular-nums text-foreground anim-fade-in">
              {c.toLocaleString("es-PE")}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-1 border-t border-border pt-2">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: "oklch(0.55 0.20 270)" }} />
              <span className="text-muted-foreground">Propio:</span>
              <strong className="ml-auto tabular-nums text-foreground">{fmtSoles(stats.valorPropio)}</strong>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: "oklch(0.70 0.13 200)" }} />
              <span className="text-muted-foreground">Consignado:</span>
              <strong className="ml-auto tabular-nums text-foreground">{fmtSoles(stats.valorConsignado)}</strong>
            </div>
          </div>
        </SpaceCard>

        {/* 2. VELOCIDAD OPERATIVA — col-span-2 en xl (igual al SpaceCom) */}
        <SpaceCard className="sm:col-span-2  xl:col-span-2">
          <CardHeader
            title="Velocidad Operativa"
            infoText="Muestra el valor (S/) despachado por período. Cambia entre 7D, 30D, 3M o 1A. Haz click en un punto del gráfico para ver el detalle."
            right={
              <div className="flex gap-1">
                {(["7D", "30D", "3M", "1A"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setVelocidadTab(tab)}
                    className={cn(
                      "press rounded-md h-6 px-2 text-[11px] font-medium transition-colors",
                      velocidadTab === tab
                        ? "bg-primary text-primary-foreground shadow hover:bg-primary/90"
                        : "border border-border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            }
          />
          <p className="text-[11px] text-muted-foreground italic">
            Click en un punto para ver detalle
          </p>
          <div className="flex-1">
            <VelocidadOperativaChart
              dataDespachado={velocidadUnd}
              dataValor={velocidadVal}
              fechas={velocidadFechas}
            />
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
            <span>
              {velocidadTab === "7D" ? "Últimos 7 días" : velocidadTab === "30D" ? "Últimos 32 días" : velocidadTab === "3M" ? "Últimos 3 meses" : "Último año"}
            </span>
            <span className="font-bold tabular-nums text-foreground">
              {velocidadUnd.reduce((s, v) => s + v, 0).toLocaleString("es-PE")} und · S/ {velocidadVal.reduce((s, v) => s + v, 0).toLocaleString("es-PE", { maximumFractionDigits: 0 })}
            </span>
          </div>
        </SpaceCard>

        {/* 3. EQUIPOS EN STOCK */}
        <SpaceCard>
          <CardHeader
            title="Equipos en Stock"
            infoText="Cantidad de equipos con serie disponibles en el almacén. Cada equipo es trazable individualmente."
          />
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold tabular-nums text-foreground anim-fade-in">
               {eqCount}
            </p>
            <span className="text-[11px] text-muted-foreground">equipos</span>
          </div>
          <p className="text-[11px] text-muted-foreground italic">
            Equipos trazables con serie
          </p>
          <div className="mt-auto flex items-center gap-3 border-t border-border pt-2 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Disp:</span>
              <strong className="tabular-nums text-foreground">{equipos.filter(e => e.estado === "disponible").length}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span className="text-muted-foreground">Aver:</span>
              <strong className="tabular-nums text-foreground">{equipos.filter(e => e.estado === "averiado").length}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">Retiro:</span>
              <strong className="tabular-nums text-foreground">{equipos.filter(e => e.estado === "en_retiro").length}</strong>
            </span>
          </div>
        </SpaceCard>

        {/* 4. STOCK CRÍTICO  */}
        <SpaceCard>
          <CardHeader
            title="Stock Crítico"
            infoText="Productos con stock por debajo del mínimo. Requieren reposición urgente para evitar quiebres."
          />
          <div className="flex items-baseline gap-2">
            <p className={cn(
              "text-2xl font-bold tabular-nums anim-fade-in",
              stats.bajoStock.length > 0 ? "text-rose-600" : "text-emerald-600"
            )}>
               {critCount}
            </p>
            <span className="text-[11px] text-muted-foreground">producto(s)</span>
          </div>
          <p className="text-[11px] text-muted-foreground italic">
            Bajo del mínimo de stock
          </p>
          <div className="mt-auto space-y-1 border-t border-border pt-2 text-[11px]">
            {stats.bajoStock.length === 0 ? (
              <span className="text-emerald-600">Todos los productos tienen stock suficiente</span>
            ) : (
              <>
                {stats.bajoStock.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <span className="truncate text-muted-foreground">{p.name}</span>
                    <strong className="tabular-nums text-rose-600">
                      {p.quantity}/{p.minStock}
                    </strong>
                  </div>
                ))}
                {stats.bajoStock.length > 3 && (
                  <p className="text-[10px] text-muted-foreground">+{stats.bajoStock.length - 3} más…</p>
                )}
              </>
            )}
          </div>
        </SpaceCard>

        {/* 5. VALOR POR ESTADO DE EQUIPO (reemplaza COMPOSICIÓN — métrica de almacén) */}
        <SpaceCard>
          <CardHeader
            title="Estado de Equipos"
            infoText="Distribución de equipos por estado: disponibles, averiados y en retiro."
          />
          <div className="flex items-center gap-4">
            <Donut
              size={90}
              segments={[
                { label: "Disponible", value: equipos.filter(e => e.estado === "disponible").length, color: "oklch(0.65 0.18 145)" },
                { label: "Averiado", value: equipos.filter(e => e.estado === "averiado").length, color: "oklch(0.55 0.22 25)" },
                { label: "En retiro", value: equipos.filter(e => e.estado === "en_retiro").length, color: "oklch(0.70 0.15 85)" },
              ].filter(s => s.value > 0)}
              centerLabel={String(equipos.length)}
            />
            <div className="flex-1 space-y-1.5">
              {(() => {
                const disp = equipos.filter(e => e.estado === "disponible").length;
                const aver = equipos.filter(e => e.estado === "averiado").length;
                const ret = equipos.filter(e => e.estado === "en_retiro").length;
                const total = equipos.length || 1;
                return (
                  <>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: "oklch(0.65 0.18 145)" }} />
                      <span className="text-muted-foreground">Disponibles</span>
                      <strong className="ml-auto tabular-nums text-foreground">{disp} ({Math.round(disp/total*100)}%)</strong>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: "oklch(0.55 0.22 25)" }} />
                      <span className="text-muted-foreground">Averiados</span>
                      <strong className="ml-auto tabular-nums text-foreground">{aver} ({Math.round(aver/total*100)}%)</strong>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: "oklch(0.70 0.15 85)" }} />
                      <span className="text-muted-foreground">En retiro</span>
                      <strong className="ml-auto tabular-nums text-foreground">{ret} ({Math.round(ret/total*100)}%)</strong>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </SpaceCard>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          FILA 2 — 2 cards: Antiguedad + ABC (2 cols para no dejar espacio vacio)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* 7. ANTIGÜEDAD DE STOCK (con badge "X críticos") */}
        <SpaceCard>
          <CardHeader
            title="Antigüedad de Stock"
            infoText="Distribución de productos por antigüedad (días desde la última actualización). Productos en rangos altos requieren atención."
            right={
              stats.antiguosCriticos > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 anim-pulse-dot" />
                  {stats.antiguosCriticos} críticos
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  OK
                </span>
              )
            }
          />
          <div className="flex flex-1 items-center gap-4">
            <Donut
              size={90}
              segments={[
                { label: "0-45d", value: stats.antig["0-45d"], color: "oklch(0.7 0.15 150)" },
                { label: "46-90d", value: stats.antig["46-90d"], color: "oklch(0.65 0.15 200)" },
                { label: "91-360d", value: stats.antig["91-360d"], color: "oklch(0.7 0.15 60)" },
                { label: "+360d", value: stats.antig["+360d"], color: "oklch(0.6 0.2 25)" },
                { label: "S/F", value: stats.antig.sf, color: "oklch(0.5 0 0)" },
              ]}
              centerLabel={String(stats.totalProd)}
            />
            <div className="flex-1 space-y-1.5">
              {[
                { label: "0-45 días", val: stats.antig["0-45d"], color: "oklch(0.7 0.15 150)" },
                { label: "46-90 días", val: stats.antig["46-90d"], color: "oklch(0.65 0.15 200)" },
                { label: "91-360 días", val: stats.antig["91-360d"], color: "oklch(0.7 0.15 60)" },
                { label: "+360 días", val: stats.antig["+360d"], color: "oklch(0.6 0.2 25)" },
                { label: "Sin fecha", val: stats.antig.sf, color: "oklch(0.5 0 0)" },
              ].map(item => {
                const pct = (item.val / stats.totalProd) * 100;
                return (
                  <div key={item.label} className="flex items-center gap-2 text-[11px]">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
                    <span className="flex-1 text-muted-foreground">{item.label}</span>
                    <span className="font-bold tabular-nums text-foreground">{item.val} · {pct.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </SpaceCard>

        {/* 8. CLASIFICACIÓN ABC */}
        <SpaceCard>
          <CardHeader
            title="Clasificación ABC"
            infoText="Clasificación de productos por valor monetario acumulado: A (70% del valor), B (20%), C (10%)."
          />
          <div className="flex-1 space-y-2">
            {[
              { label: "Clase A", val: stats.claseA, pct: 70, color: "oklch(0.55 0.20 270)", bg: "bg-primary/10", text: "text-primary", desc: "alto valor" },
              { label: "Clase B", val: stats.claseB, pct: 20, color: "oklch(0.7 0.15 60)", bg: "bg-amber-500/10", text: "text-amber-500", desc: "valor medio" },
              { label: "Clase C", val: stats.claseC, pct: 10, color: "oklch(0.5 0 0)", bg: "bg-muted", text: "text-muted-foreground", desc: "bajo valor" },
            ].map(item => {
              const total = stats.claseA + stats.claseB + stats.claseC || 1;
              const widthPct = (item.val / total) * 100;
              return (
                <div key={item.label}>
                  <div className="mb-1 flex items-baseline justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                      <span className="font-medium text-foreground">{item.label}</span>
                      <span className="text-muted-foreground">· {item.desc}</span>
                    </div>
                    <strong className="tabular-nums text-foreground">{item.val} productos</strong>
                  </div>
                  <div className={cn("h-2 w-full overflow-hidden rounded-full", item.bg)}>
                    <div
                      className="anim-draw-in h-full rounded-full"
                      style={{ width: `${widthPct}%`, background: item.color, transformOrigin: "left" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-border pt-2 text-[11px] text-muted-foreground">
            {products.length} productos analizados por valor monetario
          </div>
        </SpaceCard>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          FILA 3 — 3 cards: Operaciones Pendientes + Entradas vs Salidas + Productos Mas Despachados
          ═══════════════════════════════════════════════════════════════ */}
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* 9. OPERACIONES PENDIENTES */}
        <SpaceCard>
          <CardHeader
            title="Operaciones Pendientes"
            infoText="Recepciones (entradas pendientes de procesar) y transferencias (operaciones en curso)."
          />
          <div className="flex-1 space-y-3">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
                  <ArrowDownToLine className="h-3.5 w-3.5 text-primary" {...ICON_PROPS} />
                  Recepciones
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600">
                  Pendientes
                </span>
              </div>
              <p className="text-2xl font-bold tabular-nums text-foreground">{stats.recepcionesTotal}</p>
              <p className="text-[11px] text-muted-foreground">{entradas.length} items recibidos</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
                  <ArrowLeftRight className="h-3.5 w-3.5 text-primary" {...ICON_PROPS} />
                  Transferencias
                </span>
              </div>
              <p className="text-2xl font-bold tabular-nums text-foreground">{stats.transferenciasTotal}</p>
              <p className="text-[11px] text-muted-foreground">{stats.itemsDespachados} items despachados</p>
            </div>
          </div>
        </SpaceCard>

        {/* 10. ENTRADAS VS SALIDAS */}
        <SpaceCard>
          <CardHeader
            title="Entradas vs Salidas"
            infoText="Comparacion de unidades que entraron (recepciones) vs que salieron (despachos) del almacen. Indica si el almacen esta creciendo o vaciandose."
          />
          <div className="flex-1 space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-500" {...ICON_PROPS} />
                  Entradas
                </span>
                <strong className="tabular-nums text-foreground">{entradas.reduce((s, e) => s + e.cantidad, 0)} und</strong>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${Math.min(100, (entradas.reduce((s, e) => s + e.cantidad, 0) / Math.max(entradas.reduce((s, e) => s + e.cantidad, 0) + despachos.reduce((s, d) => s + d.cantidad, 0), 1)) * 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <TrendingDown className="h-3.5 w-3.5 text-rose-500" {...ICON_PROPS} />
                  Salidas
                </span>
                <strong className="tabular-nums text-foreground">{despachos.reduce((s, d) => s + d.cantidad, 0)} und</strong>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-rose-500"
                  style={{ width: `${Math.min(100, (despachos.reduce((s, d) => s + d.cantidad, 0) / Math.max(entradas.reduce((s, e) => s + e.cantidad, 0) + despachos.reduce((s, d) => s + d.cantidad, 0), 1)) * 100)}%` }}
                />
              </div>
            </div>
            <div className="border-t border-border pt-2 text-[11px]">
              <span className="text-muted-foreground">Balance neto: </span>
              <strong className={cn("tabular-nums", entradas.reduce((s, e) => s + e.cantidad, 0) - despachos.reduce((s, d) => s + d.cantidad, 0) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {entradas.reduce((s, e) => s + e.cantidad, 0) - despachos.reduce((s, d) => s + d.cantidad, 0) >= 0 ? "+" : ""}
                {fmtNum(entradas.reduce((s, e) => s + e.cantidad, 0) - despachos.reduce((s, d) => s + d.cantidad, 0))} und
              </strong>
            </div>
          </div>
        </SpaceCard>

        {/* 11. PRODUCTOS MAS DESPACHADOS */}
        <SpaceCard>
          <CardHeader
            title="Productos Mas Despachados"
            infoText="Top 5 productos con mayor cantidad de unidades despachadas historicamente. Ayuda a identificar que se mueve mas en el almacen."
          />
          {(() => {
            const prodMap: Record<string, number> = {};
            for (const d of despachos) {
              const k = d.producto || d.sku;
              prodMap[k] = (prodMap[k] || 0) + d.cantidad;
            }
            const top = Object.entries(prodMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
            const max = top[0]?.[1] ?? 1;
            if (top.length === 0) {
              return <p className="flex-1 py-4 text-[13px] text-muted-foreground">Sin despachos registrados</p>;
            }
            return (
              <div className="flex-1 space-y-2.5">
                {top.map(([prod, cant], i) => (
                  <div key={prod}>
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="truncate text-[12px] font-medium text-foreground">
                        {i + 1}. {prod.length > 30 ? prod.slice(0, 30) + "..." : prod}
                      </span>
                      <span className="ml-2 shrink-0 text-[11px] font-bold tabular-nums text-primary">
                        {fmtNum(cant)} und
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary/60" style={{ width: `${(cant / max) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </SpaceCard>

      </div>

      {/* ═══════════════════════════════════════════════════════════════
          FILA 4 — 4 cards en 2 cols: Programación + Valor Categoría + Tasa Devolución + Resumen
          ═══════════════════════════════════════════════════════════════ */}
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">

        {/* 13. PROGRAMACIÓN HOY */}
        <SpaceCard>
          <CardHeader
            title="Programación Hoy"
            infoText="Actividades programadas para hoy en el almacén."
            right={
              <button onClick={go("horario")} className="press rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                <ArrowRight className="h-4 w-4" {...ICON_PROPS} />
              </button>
            }
          />
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <span className="text-[22px] font-bold tabular-nums text-primary">{stats.horarioHoy.length}</span>
            </div>
            <div>
              <p className="text-[13px] font-medium text-foreground">actividades</p>
              <p className="text-[11px] text-muted-foreground">{stats.horaStr} · {new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima", weekday: "long" })}</p>
            </div>
          </div>
          {stats.horarioHoy.length > 0 && (
            <div className="flex-1 space-y-1.5">
              {stats.horarioHoy.slice(0, 3).map(h => (
                <div key={h.id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5">
                  <Clock className="h-3 w-3 text-primary" {...ICON_PROPS} />
                  <span className="text-[11px] font-mono font-medium text-foreground">{h.horaInicio}</span>
                  <span className="truncate text-[11px] text-muted-foreground">{h.actividad}</span>
                </div>
              ))}
            </div>
          )}
        </SpaceCard>

        {/* 14. VALOR POR CATEGORÍA */}
        <SpaceCard>
          <CardHeader
            title="Valor por Categoría"
            infoText="Top 5 categorías de productos por valor monetario en stock."
          />
          {stats.categorias.length === 0 ? (
            <p className="flex-1 py-4 text-[13px] text-muted-foreground">Sin precios asignados</p>
          ) : (
            <div className="flex-1 space-y-2.5">
              {stats.categorias.map(([cat, data]) => {
                const maxVal = stats.categorias[0]?.[1].valor ?? 1;
                const pct = (data.valor / maxVal) * 100;
                return (
                  <div key={cat}>
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="truncate text-[12px] font-medium text-foreground">{cat}</span>
                      <span className="ml-2 shrink-0 text-[11px] font-bold tabular-nums text-primary">{fmtSoles(data.valor)}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="anim-draw-in h-full rounded-full bg-primary/40"
                        style={{ width: `${pct}%`, transformOrigin: "left" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SpaceCard>

        {/* 15. TASA DE DEVOLUCIÓN + Equipos por Estado */}
        <SpaceCard>
          <CardHeader
            title="Tasa de Devolución"
            infoText="Porcentaje de entradas vs salidas. Mide el flujo de retorno de materiales al almacén."
          />
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
              <span className="text-[20px] font-bold tabular-nums text-orange-500">{stats.tasaDev}%</span>
            </div>
            <div className="flex-1">
              <p className="text-[12px] text-muted-foreground">Entradas vs Salidas</p>
              <p className="text-[11px] text-muted-foreground">{entradas.length} entradas · {despachos.length} despachos</p>
            </div>
          </div>
          <div className="mt-auto border-t border-border pt-2">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Equipos por Estado</p>
            <div className="space-y-1.5">
              {(Object.keys(ESTADO_META) as EstadoEquipo[]).map((est) => {
                const n = stats.eqEstado[est];
                const total = equipos.length || 1;
                const pct = (n / total) * 100;
                const tone = ESTADO_META[est].tone === "danger" ? "bg-red-500"
                  : ESTADO_META[est].tone === "warn" ? "bg-amber-500"
                  : ESTADO_META[est].tone === "ok" ? "bg-emerald-500" : "bg-primary";
                return (
                  <div key={est} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-[11px] text-muted-foreground">{ESTADO_META[est].short}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className={cn("anim-draw-in h-full rounded-full", tone)}
                        style={{ width: `${pct}%`, transformOrigin: "left" }} />
                    </div>
                    <span className="w-8 shrink-0 text-right text-[11px] font-bold tabular-nums text-foreground">{n}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </SpaceCard>

        {/* 16. KPIs RÁPIDOS (Resumen) */}
        <SpaceCard>
          <CardHeader
            title="Resumen"
            infoText="Indicadores clave del almacén: unidades, equipos, despachos de hoy y tasa de devolución."
          />
          <div className="grid flex-1 grid-cols-2 gap-2">
            <div>
              <p className="text-[18px] font-bold tabular-nums text-foreground">{fmtNum(u)}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">unidades</p>
            </div>
            <div>
              <p className="text-[18px] font-bold tabular-nums text-foreground">{equipos.length}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">equipos</p>
            </div>
            <div>
              <p className="text-[18px] font-bold tabular-nums text-foreground">{stats.hoy}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">desp. hoy</p>
            </div>
            <div>
              <p className="text-[18px] font-bold tabular-nums text-foreground">{stats.tasaDev}%</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">devolución</p>
            </div>
          </div>
        </SpaceCard>
      </div>
    </div>
  );
}

/** Anuncios del Sistema muestra notas del Bloc, bajo stock, equipos antiguos */
function AnunciosDelSistema({ products, notas, horario }: { products: any[]; notas: any[]; horario: any[] }) {
  const [currentIdx, setCurrentIdx] = useState(0);

  const anuncios = useMemo(() => {
    const items: Array<{ titulo: string; texto: string; color: string; bg: string }> = [];

    // 1. Notas del Bloc (pinned primero, luego las ultimas)
    const pinned = notas.filter((n) => n.pinned);
    const otras = notas.filter((n) => !n.pinned);
    for (const n of pinned.slice(0, 5).concat(otras.slice(0, 3))) {
      items.push({
        titulo: n.pinned ? "NOTA DEL BLOC" : "APUNTE DEL BLOC",
        texto: n.texto.slice(0, 120),
        color: "text-amber-600",
        bg: "bg-amber-500/5 border-amber-500/20",
      });
    }

    // 2. Productos con bajo stock
    const bajoStock = products.filter((p) => p.minStock && p.minStock > 0 && p.quantity <= p.minStock);
    for (const p of bajoStock.slice(0, 5)) {
      items.push({
        titulo: "BAJO STOCK",
        texto: `${p.name} — queda ${p.quantity} de ${p.minStock} ${p.udm || "und"}. Pedir reposicion.`,
        color: "text-rose-600",
        bg: "bg-rose-500/5 border-rose-500/20",
      });
    }

    // 3. Equipos sin serie (productos que requieren serie pero no tienen equipos registrados)
    const sinSerie = products.filter((p) => {
      const nombre = (p.name || "").toUpperCase();
      return ["ROUTER", "MODEM", "DECODIFICADOR", "REPETIDOR", "ONT"].some(k => nombre.includes(k)) && p.quantity > 0;
    });
    for (const p of sinSerie.slice(0, 3)) {
      items.push({
        titulo: "VALIDAR EQUIPOS",
        texto: `${p.name} tiene ${p.quantity} und en stock pero sin series registradas. Validar.`,
        color: "text-blue-600",
        bg: "bg-blue-500/5 border-blue-500/20",
      });
    }

    // 4. Actividades del horario proximas
    const ahora = new Date();
    const diaHoy = ahora.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
    for (const h of horario) {
      if (h.dia !== diaHoy) continue;
      const [hi, mi] = (h.horaInicio || "0:0").split(":").map(Number);
      const minutosInicio = hi * 60 + (mi || 0);
      const diff = minutosInicio - horaActual;
      if (diff >= -30 && diff <= 180) {
        items.push({
          titulo: diff <= 0 ? "EN CURSO" : "PROXIMA ACTIVIDAD",
          texto: `${h.actividad} — programada ${h.horaInicio}-${h.horaFin}`,
          color: diff <= 0 ? "text-rose-600" : "text-blue-600",
          bg: diff <= 0 ? "bg-rose-500/5 border-rose-500/20" : "bg-blue-500/5 border-blue-500/20",
        });
        break;
      }
    }

    // 5. Productos sin precio asignado
    const sinPrecio = products.filter((p) => !p.precio || p.precio === 0);
    if (sinPrecio.length > 0) {
      items.push({
        titulo: "FALTA PRECIO",
        texto: `${sinPrecio.length} productos sin precio asignado. Actualizar en /inventario.`,
        color: "text-amber-600",
        bg: "bg-amber-500/5 border-amber-500/20",
      });
    }

    // 6. Si no hay nada, mostrar demo
    if (items.length === 0) {
      items.push(
        {
          titulo: "SISTEMA OK",
          texto: "No hay alertas pendientes. Todo bajo control.",
          color: "text-emerald-600",
          bg: "bg-emerald-500/5 border-emerald-500/20",
        },
        {
          titulo: "BLOC",
          texto: "Usa el Bloc para apuntar tareas: 'pedir 50 conectores', 'validar router X', etc.",
          color: "text-amber-600",
          bg: "bg-amber-500/5 border-amber-500/20",
        },
      );
    }

    return items;
  }, [products, notas, horario]);

  // Rotar cada 10 segundos
  useEffect(() => {
    if (anuncios.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % anuncios.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [anuncios.length]);

  const current = anuncios[currentIdx] || anuncios[0];

  return (
    <div className="h-full flex flex-col">
      <div className={cn(
        "flex-1 flex items-center gap-3 rounded-lg border p-3 transition-all duration-500 anim-fade-in",
        current?.bg || "border-border"
      )}>
        <div className="min-w-0 flex-1">
          <p className={cn("text-[9px] font-bold uppercase tracking-wider anim-slide-up", current?.color)}>
            {current?.titulo}
          </p>
          <p className="mt-0.5 text-[13px] font-medium text-foreground anim-slide-up" style={{ animationDelay: "100ms" }}>
            {current?.texto}
          </p>
        </div>
      </div>
      {anuncios.length > 1 && (
        <div className="mt-1.5 flex items-center justify-center gap-1.5">
          {anuncios.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === currentIdx ? "w-5 bg-foreground" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              aria-label={`Anuncio ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
