"use client";

import { useState } from "react";
import { Settings as SettingsIcon, Database, Trash2, Info, Download } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export function ConfigView() {
  const products = useStore((s) => s.products);
  const equipos = useStore((s) => s.equipos);
  const entradas = useStore((s) => s.entradas);
  const notas = useStore((s) => s.notas);
  const settings = useStore((s) => s.settings);
  const setSetting = useStore((s) => s.setSetting);
  const exportInventarioExcel = useStore((s) => s.exportInventarioExcel);
  const clearAllData = useStore((s) => s.clearAllData);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="px-6 py-6">
      <div className="anim-fade-up mb-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight"><SettingsIcon className="h-5 w-5" />Configuración</h1>
      </div>

      <section className="anim-fade-up mb-5 rounded-3xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold"><Database className="h-4 w-4 text-muted-foreground" />Datos del sistema</h2>
        <p className="mb-4 text-[11px] text-muted-foreground">Guardados en este equipo (localStorage).</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat label="Productos" value={products.length} />
          <Stat label="Equipos" value={equipos.length} />
          <Stat label="Entradas" value={entradas.length} />
          <Stat label="Notas" value={notas.length} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="press h-8 rounded-lg text-xs" onClick={() => exportInventarioExcel()}>
            <Download className="mr-1.5 h-3.5 w-3.5" />Exportar inventario
          </Button>
          <Button variant="outline" size="sm" className="press h-8 rounded-lg text-xs text-destructive hover:text-destructive" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />Borrar todo
          </Button>
        </div>
      </section>

      <section className="anim-fade-up mb-5 rounded-3xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Alertas</h2>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 p-3.5">
          <div className="flex-1">
            <p className="text-[13px] font-medium">Alertas de bajo stock</p>
            <p className="text-[11px] text-muted-foreground">Avisa cuando un producto baja del mínimo</p>
          </div>
          <Switch checked={settings.lowStockAlerts} onCheckedChange={(v) => setSetting("lowStockAlerts", v)} />
        </div>
      </section>

      <section className="anim-fade-up rounded-3xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold"><Info className="h-4 w-4 text-muted-foreground" />Acerca de</h2>
        <div className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">
          <div className="flex items-center justify-between"><span>Sistema</span><span className="font-medium text-foreground">LEMCORP Almacén</span></div>
          <div className="flex items-center justify-between"><span>Versión</span><span className="font-mono">2.0</span></div>
          <div className="flex items-center justify-between"><span>Entradas</span><span className="font-medium">Formato SKU*cantidad</span></div>
        </div>
      </section>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-4 w-4" />Borrar todos los datos</DialogTitle>
            <DialogDescription>Se eliminarán productos, equipos, entradas y notas. No se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button variant="destructive" onClick={() => { clearAllData(); setConfirmOpen(false); }} className="rounded-xl">Sí, borrar todo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
