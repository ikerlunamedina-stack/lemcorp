"use client";

import { useState } from "react";
import {
  Settings as SettingsIcon,
  Database,
  Trash2,
  Info,
  Download,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export function ConfigView() {
  const products = useStore((s) => s.products);
  const despachos = useStore((s) => s.despachos);
  const exportInventarioExcel = useStore((s) => s.exportInventarioExcel);
  const clearAllData = useStore((s) => s.clearAllData);
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <div className="anim-fade-up mb-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <SettingsIcon className="h-5 w-5" />
          Configuración
        </h1>
        <p className="text-sm text-muted-foreground">
          Sistema de inventario LEMCORP.
        </p>
      </div>

      {/* Datos */}
      <section className="anim-fade-up mb-5 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <Database className="h-4 w-4 text-muted-foreground" />
          Datos del sistema
        </h2>
        <p className="mb-4 text-[11px] text-muted-foreground">
          Todos los datos se guardan en este equipo (localStorage del navegador).
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
            <p className="text-xl font-semibold tabular-nums">{products.length}</p>
            <p className="text-[10px] font-medium text-muted-foreground">Productos</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
            <p className="text-xl font-semibold tabular-nums">{despachos.length}</p>
            <p className="text-[10px] font-medium text-muted-foreground">Despachos</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="press h-8 rounded-lg text-xs"
            onClick={() => {
              exportInventarioExcel();
              toast({ title: "Exportando a Excel…" });
            }}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Exportar inventario a Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="press h-8 rounded-lg text-xs text-destructive hover:text-destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Borrar todos los datos
          </Button>
        </div>
      </section>

      {/* Acerca de */}
      <section className="anim-fade-up rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <Info className="h-4 w-4 text-muted-foreground" />
          Acerca de
        </h2>
        <div className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Sistema</span>
            <span className="font-medium text-foreground">LEMCORP Inventario</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Versión</span>
            <span className="font-mono">3.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Persistencia</span>
            <span className="font-medium">localStorage</span>
          </div>
        </div>
      </section>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              Borrar todos los datos
            </DialogTitle>
            <DialogDescription>
              Se eliminarán todos los productos, despachos y configuración.
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                clearAllData();
                setConfirmOpen(false);
                toast({ title: "Todos los datos borrados" });
              }}
              className="rounded-xl"
            >
              Sí, borrar todo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
