"use client";

import { useState } from "react";
import {
  Settings as SettingsIcon,
  Bell,
  ScanSearch,
  Zap,
  Database,
  Trash2,
  ShieldAlert,
  Info,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Settings } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
  const settings = useStore((s) => s.settings);
  const setSetting = useStore((s) => s.setSetting);
  const files = useStore((s) => s.files);
  const products = useStore((s) => s.products);
  const clearAllData = useStore((s) => s.clearAllData);
  const seedDemoIfEmpty = useStore((s) => s.seedDemoIfEmpty);
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const totalCells = files.reduce((s, f) => s + Object.keys(f.cells).length, 0);

  const toggles: {
    key: keyof Settings;
    icon: React.ReactNode;
    title: string;
    desc: string;
  }[] = [
    {
      key: "skuDetection",
      icon: <ScanSearch className="h-4 w-4" />,
      title: "Detección de SKU en archivos",
      desc: "Valida que los SKUs de tus archivos coincidan con el catálogo maestro y avisa si un mismo SKU aparece con distinto nombre. También detecta SKUs no catalogados.",
    },
    {
      key: "lowStockAlerts",
      icon: <Bell className="h-4 w-4" />,
      title: "Alertas de bajo stock",
      desc: "Avisa cuando un producto del inventario esté por debajo del stock mínimo configurado.",
    },
    {
      key: "automation",
      icon: <Zap className="h-4 w-4" />,
      title: "Automatización despachos → inventario",
      desc: "Descuenta automáticamente del inventario cuando registras un despacho. Al desactivar, los despachos se guardan pero no modifican el inventario.",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <div className="anim-fade-up mb-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <SettingsIcon className="h-5 w-5" />
          Configuración
        </h1>
        <p className="text-sm text-muted-foreground">
          Personaliza el comportamiento de LEMCORP Gestor de Excel.
        </p>
      </div>

      {/* Sección: Detección y alertas */}
      <section className="anim-fade-up mb-5 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <Bell className="h-4 w-4 text-muted-foreground" />
          Detección y alertas
        </h2>
        <p className="mb-4 text-[11px] text-muted-foreground">
          Controla qué tipos de notificaciones y automatizaciones están activas.
          Las notificaciones aparecen en la campana de la esquina superior derecha.
        </p>
        <div className="flex flex-col gap-1">
          {toggles.map((t) => (
            <div
              key={t.key}
              className="flex items-start gap-3 rounded-xl border border-border/60 p-3.5 transition-colors hover:bg-accent/30"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                {t.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium">{t.title}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  {t.desc}
                </p>
              </div>
              <Switch
                checked={settings[t.key]}
                onCheckedChange={(v) => {
                  setSetting(t.key, v);
                  toast({
                    title: t.title,
                    description: v ? "Activado" : "Desactivado",
                  });
                }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Sección: Datos */}
      <section className="anim-fade-up mb-5 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <Database className="h-4 w-4 text-muted-foreground" />
          Datos
        </h2>
        <p className="mb-4 text-[11px] text-muted-foreground">
          Todos los datos se guardan en este equipo (localStorage del navegador).
        </p>
        <div className="grid grid-cols-3 gap-2.5">
          <Stat label="Archivos" value={files.length} />
          <Stat label="Productos" value={products.length} />
          <Stat label="Celdas" value={totalCells} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="press h-8 rounded-lg text-xs"
            onClick={() => {
              // forzar re-siembra: limpiar y recargar
              clearAllData();
              setTimeout(() => {
                seedDemoIfEmpty();
                toast({ title: "Datos demo restaurados" });
              }, 100);
            }}
          >
            Restaurar datos demo
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

      {/* Sección: Acerca de */}
      <section className="anim-fade-up rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <Info className="h-4 w-4 text-muted-foreground" />
          Acerca de
        </h2>
        <div className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Aplicación</span>
            <span className="font-medium text-foreground">LEMCORP Gestor de Excel</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Versión</span>
            <span className="font-mono">2.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Persistencia</span>
            <span className="font-medium">localStorage</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Lectura de Excel</span>
            <span className="font-medium">SheetJS (xlsx)</span>
          </div>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-muted/30 p-3">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="text-[11px] leading-snug text-muted-foreground">
            Los datos viven solo en este navegador. Si limpias el caché o usas
            otro equipo, los datos no estarán ahí. Exporta tus archivos a .xlsx
            para respaldarlos.
          </p>
        </div>
      </section>

      {/* Confirmación borrar todo */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              Borrar todos los datos
            </DialogTitle>
            <DialogDescription>
              Se eliminarán todos los archivos, productos, historial y
              configuración. Esta acción no se puede deshacer. Considera exportar
              tus archivos a .xlsx antes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="rounded-xl"
            >
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
