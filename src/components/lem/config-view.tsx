"use client";

import { useState } from "react";
import {
  Settings as SettingsIcon,
  Database,
  Trash2,
  Info,
  Download,
  User,
  Palette,
  Sun,
  Moon,
  Monitor,
  ScanLine,
  Sparkles,
  DatabaseZap,
  Check,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Tema } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const TEMAS: { value: Tema; label: string; icon: typeof Sun }[] = [
  { value: "claro", label: "Claro", icon: Sun },
  { value: "oscuro", label: "Oscuro", icon: Moon },
  { value: "sistema", label: "Sistema", icon: Monitor },
];

export function ConfigView() {
  const products = useStore((s) => s.products);
  const equipos = useStore((s) => s.equipos);
  const entradas = useStore((s) => s.entradas);
  const despachos = useStore((s) => s.despachos);
  const notas = useStore((s) => s.notas);
  const settings = useStore((s) => s.settings);
  const setSetting = useStore((s) => s.setSetting);
  const exportInventarioExcel = useStore((s) => s.exportInventarioExcel);
  const clearAllData = useStore((s) => s.clearAllData);
  const seedDemo = useStore((s) => s.seedDemo);
  const { toast } = useToast();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [seedConfirm, setSeedConfirm] = useState(false);

  const handleSeed = () => {
    seedDemo();
    toast({
      title: "Datos demo cargados",
      description: "10 productos · 7 equipos · 3 notas · 6 miembros",
    });
    setSeedConfirm(false);
  };

  return (
    <div className="px-4 py-6 lg:px-8">
      <div className="anim-fade-up mb-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <SettingsIcon className="h-5 w-5 text-violet-400" /> Configuración
        </h1>
        <p className="text-sm text-muted-foreground">Personaliza tu experiencia y gestiona los datos del sistema</p>
      </div>

      {/* ─── Personalización ─── */}
      <section className="anim-fade-up mb-5 rounded-3xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <User className="h-4 w-4 text-violet-400" /> Personalización
        </h2>
        <p className="mb-4 text-[11px] text-muted-foreground">
          Tu nombre aparece en el sub-header y en los saludos del asistente IA.
        </p>

        {/* Usuario */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cfg-usuario" className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Nombre del usuario
          </Label>
          <Input
            id="cfg-usuario"
            value={settings.usuario}
            onChange={(e) => setSetting("usuario", e.target.value)}
            placeholder="Ej: Admin, Carlos, Antonio…"
            className="max-w-sm rounded-xl"
          />
        </div>

        {/* Tema */}
        <div className="mt-4 flex flex-col gap-1.5">
          <Label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            <Palette className="h-3 w-3" /> Tema de la interfaz
          </Label>
          <div className="flex flex-wrap gap-2">
            {TEMAS.map((t) => {
              const Icon = t.icon;
              const active = settings.tema === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setSetting("tema", t.value)}
                  className={cn(
                    "press flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[12px] font-medium transition-all",
                    active
                      ? "border-violet-500/40 bg-violet-500/15 text-violet-300 shadow-sm"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                  {active && <Check className="h-3 w-3" />}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Tema actual: <strong className="text-foreground">{settings.tema}</strong>. El tema "sistema" sigue la preferencia de tu navegador.
          </p>
        </div>
      </section>

      {/* ─── Pistoleo ─── */}
      <section className="anim-fade-up mb-5 rounded-3xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <ScanLine className="h-4 w-4 text-violet-400" /> Pistoleo de series
        </h2>
        <p className="mb-4 text-[11px] text-muted-foreground">
          Configura el prefijo de validación para la captura rápida con lector óptico.
        </p>

        <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 p-3.5">
          <div className="flex-1">
            <p className="text-[13px] font-medium">Validación de prefijo</p>
            <p className="text-[11px] text-muted-foreground">
              Solo acepta series que empiecen con el prefijo configurado
            </p>
          </div>
          <Switch
            checked={settings.pistoleoPrefijoEnabled}
            onCheckedChange={(v) => setSetting("pistoleoPrefijoEnabled", v)}
          />
        </div>

        <div className="mt-3 max-w-sm">
          <Label htmlFor="cfg-prefijo" className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Prefijo (por defecto ZTEATV)
          </Label>
          <Input
            id="cfg-prefijo"
            value={settings.pistoleoPrefijo}
            onChange={(e) => setSetting("pistoleoPrefijo", e.target.value)}
            placeholder="ZTEATV"
            className="mt-1 rounded-xl font-mono uppercase"
            disabled={!settings.pistoleoPrefijoEnabled}
          />
        </div>
      </section>

      {/* ─── Alertas ─── */}
      <section className="anim-fade-up mb-5 rounded-3xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-violet-400" /> Alertas
        </h2>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 p-3.5">
          <div className="flex-1">
            <p className="text-[13px] font-medium">Alertas de bajo stock</p>
            <p className="text-[11px] text-muted-foreground">
              Muestra una insignia roja en la campana cuando un producto baja del mínimo
            </p>
          </div>
          <Switch
            checked={settings.lowStockAlerts}
            onCheckedChange={(v) => setSetting("lowStockAlerts", v)}
          />
        </div>
      </section>

      {/* ─── Datos del sistema ─── */}
      <section className="anim-fade-up mb-5 rounded-3xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <Database className="h-4 w-4 text-violet-400" /> Datos del sistema
        </h2>
        <p className="mb-4 text-[11px] text-muted-foreground">
          Guardados en este equipo (localStorage). No se envían a ningún servidor.
        </p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          <Stat label="Productos" value={products.length} />
          <Stat label="Equipos" value={equipos.length} />
          <Stat label="Entradas" value={entradas.length} />
          <Stat label="Despachos" value={despachos.length} />
          <Stat label="Notas" value={notas.length} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="press h-8 rounded-lg text-xs"
            onClick={() => exportInventarioExcel()}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" /> Exportar inventario
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="press h-8 rounded-lg text-xs"
            onClick={() => setSeedConfirm(true)}
          >
            <DatabaseZap className="mr-1.5 h-3.5 w-3.5" /> Cargar datos demo
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="press h-8 rounded-lg text-xs text-red-400 hover:text-red-400"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Borrar todo
          </Button>
        </div>
      </section>

      {/* ─── Acerca de ─── */}
      <section className="anim-fade-up rounded-3xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <Info className="h-4 w-4 text-violet-400" /> Acerca de
        </h2>
        <div className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Sistema</span>
            <span className="font-medium text-foreground">LEMCORP WMS</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Versión</span>
            <span className="font-mono">3.1.0 · REBUILD-1</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Entradas</span>
            <span className="font-medium">Formato SKU*cantidad</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Usuario activo</span>
            <span className="font-medium text-foreground">{settings.usuario || "Admin"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Tema</span>
            <span className="font-medium capitalize">{settings.tema}</span>
          </div>
        </div>
      </section>

      {/* Confirmar borrado */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="h-4 w-4" /> Borrar todos los datos
            </DialogTitle>
            <DialogDescription>
              Se eliminarán productos, equipos, entradas, despachos y notas. No se puede deshacer.
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
                toast({ title: "Datos borrados", description: "El sistema quedó vacío." });
              }}
              className="rounded-xl"
            >
              Sí, borrar todo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar carga demo */}
      <Dialog open={seedConfirm} onOpenChange={setSeedConfirm}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DatabaseZap className="h-4 w-4 text-violet-400" /> Cargar datos demo
            </DialogTitle>
            <DialogDescription>
              Se reemplazarán los datos actuales por el set de demostración (10 productos, 7 equipos, 3 notas, 6 miembros). Los datos existentes se perderán.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeedConfirm(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleSeed} className="btn-spacecom rounded-xl">
              Cargar demo
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
