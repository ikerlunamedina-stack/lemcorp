"use client";
import { AppShell } from "@/components/lem/app-shell";
import { useStore } from "@/lib/store";
import { Download, FileSpreadsheet, FileText, FileBarChart } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ExportarPage() {
  const exportInventarioExcel = useStore((s) => s.exportInventarioExcel);
  const exportarPistoleoExcel = useStore((s) => s.exportarPistoleoExcel);

  return (
    <AppShell>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-[22px] font-bold tracking-tight text-foreground">
            <Download className="h-5 w-5 text-primary" strokeWidth={1.5} /> Exportar
          </h1>
          <p className="text-[13px] text-muted-foreground">Descarga datos en Excel para análisis externo</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => exportInventarioExcel()}
            className="press-card flex flex-col items-start rounded-2xl bg-card p-6 shadow-sm hover:shadow-lg"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
              <FileSpreadsheet className="h-6 w-6 text-emerald-500" strokeWidth={1.5} />
            </div>
            <p className="text-[16px] font-bold text-foreground">Inventario Completo</p>
            <p className="mt-1 text-[12px] text-muted-foreground">Exporta todos los productos con stock, precios y estado</p>
            <span className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-500">Excel .xlsx</span>
          </button>

          <button
            onClick={() => exportarPistoleoExcel()}
            className="press-card flex flex-col items-start rounded-2xl bg-card p-6 shadow-sm hover:shadow-lg"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <FileBarChart className="h-6 w-6 text-primary" strokeWidth={1.5} />
            </div>
            <p className="text-[16px] font-bold text-foreground">Series Capturadas</p>
            <p className="mt-1 text-[12px] text-muted-foreground">Exporta las series pistoleadas con MAC, CM MAC, MTA MAC y UA</p>
            <span className="mt-3 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">Excel .xlsx</span>
          </button>

          <div className="press-card flex flex-col items-start rounded-2xl bg-card p-6 shadow-sm opacity-50">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
              <FileText className="h-6 w-6 text-amber-500" strokeWidth={1.5} />
            </div>
            <p className="text-[16px] font-bold text-foreground">Reporte de Despachos</p>
            <p className="mt-1 text-[12px] text-muted-foreground">Historial de despachos con albaranes</p>
            <span className="mt-3 rounded-lg bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-500">Próximamente</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
