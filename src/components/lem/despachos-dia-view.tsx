"use client";

import { useState, useMemo } from "react";
import {
  ClipboardPaste,
  Sparkles,
  ArrowRight,
  Check,
  AlertTriangle,
  Trash2,
  FileText,
  TrendingDown,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { parseNum, fmtNum } from "@/lib/num";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface ParsedDespacho {
  sku: string;
  producto: string;
  cantidad: number;
  filas: number;
}

export function DespachosDiaView() {
  const files = useStore((s) => s.files);
  const products = useStore((s) => s.products);
  const setCells = useStore((s) => s.setCells);
  const { toast } = useToast();

  const [textoPegado, setTextoPegado] = useState("");
  const [resumen, setResumen] = useState<ParsedDespacho[]>([]);
  const [procesado, setProcesado] = useState(false);
  const [aplicado, setAplicado] = useState(false);

  // Buscar el archivo de inventario (hoja Almacén)
  const inventario = useMemo(
    () => files.find((f) => f.tag === "inventario"),
    [files]
  );

  // Buscar producto por SKU en el catálogo
  const findProduct = (sku: string) => {
    const norm = sku.trim().toLowerCase();
    return products.find(
      (p) => p.sku.trim().toLowerCase() === norm
    );
  };

  // Obtener la hoja de almacén del archivo multi-hoja (si existe)
  const almSheet = useMemo(() => {
    if (!inventario?.sheets) return null;
    return inventario.sheets.find((s) => /almac[eé]n/i.test(s.name)) ??
      inventario.sheets.find((s) => /stock/i.test(s.name) && !/base/i.test(s.name)) ??
      null;
  }, [inventario]);

  // Buscar fila de un SKU en la hoja de almacén
  const findInvRow = (sku: string) => {
    const sheet = almSheet ?? inventario;
    if (!sheet) return -1;
    const norm = sku.trim().toLowerCase();
    for (let r = 1; r < sheet.rowCount; r++) {
      for (let c = 0; c < Math.min(sheet.colCount, 6); c++) {
        const v = (sheet.cells[`${r},${c}`] ?? "").trim().toLowerCase();
        if (v === norm) return r;
      }
    }
    return -1;
  };

  // Encontrar columna de stock en la hoja de almacén
  const findStockCol = () => {
    const sheet = almSheet ?? inventario;
    if (!sheet) return 5;
    for (let c = 0; c < sheet.colCount; c++) {
      const h = (sheet.cells[`0,${c}`] ?? "").toLowerCase();
      if (/stock\s*actual|f[ií]sico|stock/i.test(h)) return c;
    }
    return 5; // default: columna F
  };

  // Leer valor de stock de una celda (extrayendo valor precalculado de fórmulas)
  const readStock = (row: number, col: number) => {
    const sheet = almSheet ?? inventario;
    if (!sheet) return 0;
    let raw = sheet.cells[`${row},${col}`] ?? "0";
    const sepIdx = raw.indexOf("\u0001");
    if (sepIdx >= 0) raw = raw.slice(sepIdx + 1);
    return parseNum(raw) ?? 0;
  };

  // Procesar el texto pegado y extraer SKU + cantidad
  const procesar = () => {
    if (!textoPegado.trim()) {
      toast({ title: "Pega algo primero", variant: "destructive" });
      return;
    }

    const lineas = textoPegado.split("\n");
    const mapa = new Map<string, ParsedDespacho>();
    let filasProcesadas = 0;

    for (const linea of lineas) {
      const trimmed = linea.trim();
      if (!trimmed) continue;

      // Quitar fechas (formato YYYY-MM-DD o DD/MM/YYYY) para no confundirlas con SKU
      const sinFecha = trimmed.replace(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/g, " ");
      // Quitar números de modelo como RJ-45 (que tienen guiones y letras)
      const sinModelo = sinFecha.replace(/[A-Z]{1,3}-?\d{1,3}/gi, " ");

      // Detectar números puros en la línea (sin fecha ni modelo)
      const matches = sinModelo.match(/\d[\d.,]*\d|\d/g) || [];
      if (matches.length < 2) continue;

      // Buscar el SKU: el número MÁS LARGO de 4-10 dígitos puros
      // (el SKU es más largo que cualquier cantidad o día)
      let sku = "";
      let skuLen = 0;
      for (const n of matches) {
        const clean = n.replace(/[.,\s]/g, "");
        if (clean.length >= 4 && clean.length <= 12 && /^\d+$/.test(clean)) {
          if (clean.length > skuLen) {
            sku = clean;
            skuLen = clean.length;
          }
        }
      }

      // Si no encontramos SKU numérico, buscar código alfanumérico (ej: RT-001)
      if (!sku) {
        const alfa = trimmed.match(/[A-Z]{2,}[-]?\d{3,}/i);
        if (alfa) {
          sku = alfa[0];
          skuLen = sku.length;
        }
      }

      if (!sku) continue;

      // La cantidad: el ÚLTIMO número de la línea original (sin fecha)
      // que no sea el SKU
      let cantidad = 0;
      for (let i = matches.length - 1; i >= 0; i--) {
        const clean = matches[i].replace(/[.,\s]/g, "");
        if (clean !== sku) {
          cantidad = parseNum(matches[i]) || 0;
          if (cantidad > 0) break;
        }
      }

      if (cantidad > 0) {
        const exist = mapa.get(sku);
        if (exist) {
          exist.cantidad += cantidad;
          exist.filas += 1;
        } else {
          const prod = findProduct(sku);
          mapa.set(sku, {
            sku,
            producto: prod?.name ?? trimmed.slice(0, 50),
            cantidad,
            filas: 1,
          });
        }
        filasProcesadas++;
      }
    }

    const resultado = Array.from(mapa.values()).sort((a, b) => b.cantidad - a.cantidad);
    setResumen(resultado);
    setProcesado(true);
    setAplicado(false);
    toast({
      title: `${resultado.length} SKU(s) detectados`,
      description: `${filasProcesadas} línea(s) procesada(s)`,
    });
  };

  // Aplicar el resumen al stock (descontar del inventario)
  const aplicarAlStock = () => {
    if (!inventario) {
      toast({ title: "No hay archivo de inventario", variant: "destructive" });
      return;
    }
    const stockCol = findStockCol();
    if (stockCol < 0) {
      toast({ title: "No se encontró columna de stock", variant: "destructive" });
      return;
    }

    let actualizados = 0;
    let noEncontrados = 0;
    const updates: { row: number; col: number; value: string }[] = [];
    // Copia de las celdas de la hoja de almacén (para no mutar el estado)
    const newAlmCells: Record<string, string> = almSheet
      ? { ...almSheet.cells }
      : {};

    for (const item of resumen) {
      const row = findInvRow(item.sku);
      if (row < 0) {
        noEncontrados++;
        continue;
      }
      // Leer stock actual (usando copia si ya fue modificada)
      let raw = newAlmCells[`${row},${stockCol}`] ?? almSheet?.cells[`${row},${stockCol}`] ?? "0";
      const sepIdx = raw.indexOf("\u0001");
      if (sepIdx >= 0) raw = raw.slice(sepIdx + 1);
      const cur = parseNum(raw) ?? 0;
      const nuevo = cur - item.cantidad;
      // Guardar en la copia (como valor puro, sin fórmula)
      newAlmCells[`${row},${stockCol}`] = String(nuevo);
      updates.push({ row, col: stockCol, value: String(nuevo) });
      actualizados++;
    }

    if (updates.length > 0) {
      // Actualizar la hoja de almacén en el estado del store
      if (almSheet && inventario?.sheets) {
        const newSheets = inventario.sheets.map((s) =>
          s.name === almSheet.name ? { ...s, cells: newAlmCells } : s
        );
        useStore.setState({
          files: useStore.getState().files.map((f) =>
            f.id === inventario.id ? { ...f, sheets: newSheets } : f
          ),
        });
      }
      setCells(inventario.id, updates);
      setAplicado(true);
      toast({
        title: `Stock actualizado`,
        description: `${actualizados} producto(s) descontado(s)${
          noEncontrados > 0 ? `, ${noEncontrados} no encontrado(s)` : ""
        }`,
      });
    }
  };

  const limpiar = () => {
    setTextoPegado("");
    setResumen([]);
    setProcesado(false);
    setAplicado(false);
  };

  const totalDespachado = resumen.reduce((s, r) => s + r.cantidad, 0);

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      {/* Encabezado */}
      <div className="anim-fade-up mb-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <ClipboardPaste className="h-5 w-5" />
          Despachos del Día
        </h1>
        <p className="text-sm text-muted-foreground">
          Pega los despachos del día (de tu sistema o Excel) y el sistema los
          resume por SKU automáticamente. Luego los descuenta del stock.
        </p>
      </div>

      {/* Paso 1: Pegar texto */}
      <div className="anim-fade-up mb-4 rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground">
            1
          </span>
          <h2 className="text-sm font-semibold">Pegar despachos del día</h2>
        </div>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Copia de tu sistema o Excel (con SKU y cantidad) y pega aquí con
          Ctrl+V. El sistema detecta automáticamente los SKUs y cantidades.
        </p>
        <textarea
          value={textoPegado}
          onChange={(e) => {
            setTextoPegado(e.target.value);
            setProcesado(false);
          }}
          placeholder={`Ejemplo de lo que puedes pegar:

2026-08-15  1002900  CONECTOR PLUG RJ-45  10
2026-08-15  1002900  CONECTOR PLUG RJ-45  5
2026-08-15  1002950  ATADOR  20
2026-08-15  4076358  ROUTER ONT  2`}
          className="flex min-h-[160px] w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-[12px] outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <div className="mt-3 flex items-center gap-2">
          <Button
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                if (text) {
                  setTextoPegado(text);
                  setProcesado(false);
                  toast({ title: "Texto pegado", description: `${text.length} caracteres` });
                } else {
                  toast({ title: "Portapapeles vacío" });
                }
              } catch {
                toast({ title: "No se pudo leer el portapapeles", variant: "destructive" });
              }
            }}
            variant="outline"
            className="press rounded-xl"
          >
            <ClipboardPaste className="mr-1.5 h-4 w-4" />
            Pegar desde portapapeles
          </Button>
          <Button
            onClick={procesar}
            disabled={!textoPegado.trim()}
            className="press rounded-xl"
          >
            <Sparkles className="mr-1.5 h-4 w-4" />
            Resumir despachos
          </Button>
          <Button
            variant="outline"
            onClick={limpiar}
            className="press rounded-xl"
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Limpiar
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              const ej = "2026-08-15  1002900  CONECTOR PLUG RJ-45  10\n2026-08-15  1002900  CONECTOR PLUG RJ-45  5\n2026-08-15  1002950  ATADOR DE IDENTIFICACION  20\n2026-08-15  1003101  CABLE COAXIAL RG-6  50\n2026-08-15  4076358  ROUTER ONT HG8145X6  2\n2026-08-15  1002900  CONECTOR PLUG RJ-45  8";
              setTextoPegado(ej);
              setProcesado(false);
            }}
            className="press rounded-xl text-[11px]"
          >
            Usar ejemplo
          </Button>
        </div>
      </div>

      {/* Paso 2: Resumen */}
      {procesado && resumen.length > 0 && (
        <div className="anim-fade-up mb-4 rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground">
                2
              </span>
              <h2 className="text-sm font-semibold">Resumen por SKU</h2>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {resumen.length} SKU(s) · {fmtNum(totalDespachado)} unidades
              totales
            </span>
          </div>

          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">SKU</th>
                  <th className="px-3 py-2 font-medium">Producto</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Cantidad
                  </th>
                  <th className="px-3 py-2 text-right font-medium">Filas</th>
                  <th className="px-3 py-2 font-medium">En stock</th>
                </tr>
              </thead>
              <tbody>
                {resumen.map((item, i) => {
                  const invRow = findInvRow(item.sku);
                  const stockCol = findStockCol();
                  const stock =
                    invRow >= 0 && stockCol >= 0
                      ? parseNum(
                          inventario?.cells[`${invRow},${stockCol}`] ?? "0"
                        ) ?? 0
                      : null;
                  const baja = stock !== null && stock < item.cantidad;
                  return (
                    <tr
                      key={i}
                      className="border-b border-border/50 last:border-0 hover:bg-accent/30"
                    >
                      <td className="px-3 py-2.5 font-mono text-[12px] font-semibold">
                        {item.sku}
                      </td>
                      <td className="px-3 py-2.5 text-[12px]">
                        {item.producto}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="inline-flex min-w-[44px] justify-center rounded-full bg-primary px-2.5 py-0.5 text-[12px] font-semibold tabular-nums text-primary-foreground">
                          {fmtNum(item.cantidad)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-[11px] text-muted-foreground">
                        {item.filas}
                      </td>
                      <td className="px-3 py-2.5">
                        {stock !== null ? (
                          <span
                            className={cn(
                              "tabular-nums text-[12px] font-medium",
                              baja && "text-destructive"
                            )}
                          >
                            {fmtNum(stock)}
                            {baja && (
                              <AlertTriangle className="ml-1 inline h-3 w-3" />
                            )}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            No en stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/40 text-xs font-semibold">
                  <td className="px-3 py-2.5" colSpan={2}>
                    Total
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {fmtNum(totalDespachado)}
                  </td>
                  <td className="px-3 py-2.5"></td>
                  <td className="px-3 py-2.5"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Paso 3: Aplicar */}
          <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground">
              3
            </span>
            <Button
              onClick={aplicarAlStock}
              disabled={aplicado}
              className="press rounded-xl"
            >
              {aplicado ? (
                <>
                  <Check className="mr-1.5 h-4 w-4" />
                  Stock actualizado
                </>
              ) : (
                <>
                  <TrendingDown className="mr-1.5 h-4 w-4" />
                  Descontar del stock
                </>
              )}
            </Button>
            {aplicado && (
              <span className="flex items-center gap-1 text-[12px] font-medium text-primary">
                <Check className="h-3.5 w-3.5" />
                Los despachos se descontaron del almacén
              </span>
            )}
          </div>
        </div>
      )}

      {procesado && resumen.length === 0 && (
        <div className="anim-fade-up rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No se detectaron despachos. Asegúrate de que cada línea tenga un SKU
            (código de 4-10 dígitos) y una cantidad.
          </p>
        </div>
      )}

      {/* Sin inventario */}
      {!inventario && (
        <div className="anim-fade-up mt-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-[13px] font-semibold text-destructive">
              No hay archivo de inventario cargado
            </p>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Importa un Excel con stock para poder descontar los despachos.
          </p>
        </div>
      )}
    </div>
  );
}
