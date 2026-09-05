"use client";

import { useState } from "react";
import {
  Database,
  Trash2,
  Info,
  Download,
  User,
  UserCheck,
  Sun,
  Moon,
  Monitor,
  ScanLine,
  Sparkles,
  DatabaseZap,
  Check,
  Volume2,
  Brain,
  VolumeX,
  Square,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { PERMISO_META, ROL_META, type Permiso, type Tema } from "@/lib/types";
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
import { speak, stopSpeaking, ttsDisponible } from "@/lib/tts";

const TEMAS: { value: Tema; label: string; icon: typeof Sun }[] = [
  { value: "claro", label: "Claro", icon: Sun },
  { value: "oscuro", label: "Oscuro", icon: Moon },
  { value: "sistema", label: "Sistema", icon: Monitor },
];

const ICON_PROPS = { strokeWidth: 1.5 } as const;

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
  const memoriaIA = useStore((s) => s.memoriaIA);
  const deleteMemoria = useStore((s) => s.deleteMemoria);
  const clearMemoria = useStore((s) => s.clearMemoria);
  const { toast } = useToast();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [seedConfirm, setSeedConfirm] = useState(false);
  const [memConfirmOpen, setMemConfirmOpen] = useState(false);

  const ttsSoportado = typeof window !== "undefined" && ttsDisponible();

  const handleSeed = () => {
    seedDemo();
    toast({
      title: "Datos demo cargados",
      description: "10 productos · 7 equipos · 3 notas · 6 miembros · 10 horarios",
    });
    setSeedConfirm(false);
  };

  const toggleVoz = (on: boolean) => {
    setSetting("voz", on);
    if (on) {
      // Demo de voz
      speak("Hola, soy Alana, asistente del almacén Lemcorp.");
      toast({
        title: "Voz activada",
        description: "Alana leerá sus respuestas y los recordatorios en voz alta.",
      });
    } else {
      stopSpeaking();
      toast({
        title: "Voz desactivada",
        description: "Las respuestas solo se mostrarán en texto.",
      });
    }
  };

  const handleDeleteMemoria = (index: number) => {
    const item = memoriaIA[index];
    deleteMemoria(index);
    toast({
      title: "Aprendizaje eliminado",
      description: item.length > 60 ? item.slice(0, 60) + "…" : item,
    });
  };

  const handleClearMemoria = () => {
    clearMemoria();
    setMemConfirmOpen(false);
    toast({
      title: "Memoria borrada",
      description: "Alana olvidó todo lo que había aprendido.",
    });
  };

  return (
    <div className="anim-fade-in mx-auto w-full max-w-[760px] px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="anim-slide-up mb-6">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Sistema
        </p>
        <h1 className="text-[28px] font-semibold tracking-tight text-foreground">
          Configuración
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Personaliza tu experiencia y gestiona los datos del sistema
        </p>
      </div>

      {/* ─── Personalización ─── */}
      <section className="anim-slide-up mb-4 overflow-hidden rounded-lg border border-border bg-background">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
            <h2 className="text-[13px] font-medium text-foreground">Personalización</h2>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Tu nombre aparece en el sub-header y en los saludos del asistente IA.
          </p>
        </div>
        <div className="divide-y divide-border">
          {/* Usuario */}
          <div className="flex flex-col gap-1.5 px-4 py-3">
            <Label htmlFor="cfg-usuario" className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Nombre del usuario
            </Label>
            <Input
              id="cfg-usuario"
              value={settings.usuario}
              onChange={(e) => setSetting("usuario", e.target.value)}
              placeholder="Ej: Iker, Carlos, Antonio…"
              className="h-9 max-w-sm rounded-md border-border bg-background"
            />
          </div>
          {/* Tema */}
          <div className="flex flex-col gap-2 px-4 py-3">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Tema de la interfaz
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {TEMAS.map((t) => {
                const Icon = t.icon;
                const active = settings.tema === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setSetting("tema", t.value)}
                    className={cn(
                      "press inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-medium transition-colors",
                      active
                        ? "bg-foreground text-background"
                        : "border border-border bg-background text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" {...ICON_PROPS} />
                    {t.label}
                    {active && <Check className="h-3 w-3" {...ICON_PROPS} />}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Tema actual: <strong className="text-foreground">{settings.tema}</strong>. El tema "sistema" sigue la preferencia de tu navegador.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Sesión ─── */}
      <section className="anim-slide-up mb-4 overflow-hidden rounded-lg border border-border bg-background">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
            <h2 className="text-[13px] font-medium text-foreground">Sesión</h2>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Inicia sesión como un miembro del equipo para probar sus permisos. Si no hay sesión, eres el admin (dueño) con todos los permisos.
          </p>
        </div>
        <div className="px-4 py-3">
          <SesionSelector />
        </div>
      </section>

      {/* ─── Pistoleo ─── */}
      <section className="anim-slide-up mb-4 overflow-hidden rounded-lg border border-border bg-background">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
            <h2 className="text-[13px] font-medium text-foreground">Pistoleo de series</h2>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Configura el prefijo de validación para la captura rápida con lector óptico.
          </p>
        </div>
        <div className="divide-y divide-border">
          {/* Validación de prefijo */}
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-foreground">Validación de prefijo</p>
              <p className="text-[11px] text-muted-foreground">
                Solo acepta series que empiecen con el prefijo configurado
              </p>
            </div>
            <Switch
              checked={settings.pistoleoPrefijoEnabled}
              onCheckedChange={(v) => setSetting("pistoleoPrefijoEnabled", v)}
            />
          </div>
          {/* Prefijo */}
          <div className="flex flex-col gap-1.5 px-4 py-3">
            <Label htmlFor="cfg-prefijo" className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Prefijo (por defecto ZTEATV)
            </Label>
            <Input
              id="cfg-prefijo"
              value={settings.pistoleoPrefijo}
              onChange={(e) => setSetting("pistoleoPrefijo", e.target.value)}
              placeholder="ZTEATV"
              className="h-9 max-w-sm rounded-md border-border bg-background font-mono uppercase disabled:opacity-50"
              disabled={!settings.pistoleoPrefijoEnabled}
            />
          </div>
        </div>
      </section>

      {/* ─── Alertas ─── */}
      <section className="anim-slide-up mb-4 overflow-hidden rounded-lg border border-border bg-background">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
            <h2 className="text-[13px] font-medium text-foreground">Alertas</h2>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-foreground">Alertas de bajo stock</p>
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

      {/* ─── Voz de Alana ─── */}
      <section className="anim-slide-up mb-4 overflow-hidden rounded-lg border border-border bg-background">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            {settings.voz ? (
              <Volume2 className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
            ) : (
              <VolumeX className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
            )}
            <h2 className="text-[13px] font-medium text-foreground">Voz de Alana</h2>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Cuando la voz está activada, Alana lee sus respuestas en español y anuncia los recordatorios del horario en voz alta.
          </p>
        </div>
        <div className="divide-y divide-border">
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-foreground">Text-to-Speech (TTS)</p>
              <p className="text-[11px] text-muted-foreground">
                {ttsSoportado
                  ? "Usa la Web Speech API de tu navegador para leer en español."
                  : "Tu navegador no soporta Web Speech API — la función no estará disponible."}
              </p>
            </div>
            <Switch
              checked={settings.voz}
              onCheckedChange={toggleVoz}
              disabled={!ttsSoportado}
            />
          </div>
          {ttsSoportado && (
            <div className="flex flex-wrap gap-2 px-4 py-3">
              <button
                onClick={() => speak("Hola, soy Alana, asistente del almacén Lemcorp.")}
                className="press inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-[12px] font-medium text-foreground hover:bg-muted"
              >
                <Volume2 className="h-3.5 w-3.5" {...ICON_PROPS} />
                Probar voz
              </button>
              <button
                onClick={() => stopSpeaking()}
                className="press inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-[12px] font-medium text-foreground hover:bg-muted"
              >
                <Square className="h-3.5 w-3.5" {...ICON_PROPS} />
                Detener
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ─── Memoria de Alana ─── */}
      <section className="anim-slide-up mb-4 overflow-hidden rounded-lg border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
            <h2 className="text-[13px] font-medium text-foreground">Memoria de Alana</h2>
          </div>
          {memoriaIA.length > 0 && (
            <button
              onClick={() => setMemConfirmOpen(true)}
              className="press inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" {...ICON_PROPS} />
              Borrar todo
            </button>
          )}
        </div>
        <div className="px-4 py-3">
          <p className="mb-3 text-[11px] text-muted-foreground">
            Cosas que Alana ha aprendido de ti. Dile en el chat cosas como <em>"recuerda que…"</em> o <em>"aprende que…"</em> para que las guarde aquí.
          </p>

          {memoriaIA.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-background py-10 text-center">
              <Brain className="mb-2 h-7 w-7 text-muted-foreground/40" {...ICON_PROPS} />
              <p className="text-[12px] font-medium text-foreground">Todavía no has enseñado nada a Alana</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Abre la pestaña IA y prueba: <em>"Recuerda que el personal Pérez trabaja de lunes a miércoles"</em>
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-background">
              {memoriaIA.map((m, i) => (
                <li
                  key={i}
                  className="group flex items-start gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40"
                >
                  <span className="mt-0.5 shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="min-w-0 flex-1 break-words text-[12px] leading-relaxed text-foreground">{m}</p>
                  <button
                    onClick={() => handleDeleteMemoria(i)}
                    className="press shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    title="Eliminar este aprendizaje"
                  >
                    <Trash2 className="h-3.5 w-3.5" {...ICON_PROPS} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ─── Datos del sistema ─── */}
      <section className="anim-slide-up mb-4 overflow-hidden rounded-lg border border-border bg-background">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
            <h2 className="text-[13px] font-medium text-foreground">Datos del sistema</h2>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Tus datos se guardan localmente y se sincronizan automáticamente en la nube para que estén disponibles desde cualquier dispositivo.
          </p>
        </div>
        <div className="divide-y divide-border">
          {/* Sync indicator */}
          <div className="flex items-center gap-2 px-4 py-2.5 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground" aria-hidden />
            <span className="font-medium text-foreground">Sincronización entre dispositivos activada</span>
            <span className="text-muted-foreground">— los cambios se suben solos (~1s)</span>
          </div>
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-5">
            <Stat label="Productos" value={products.length} />
            <Stat label="Equipos" value={equipos.length} />
            <Stat label="Entradas" value={entradas.length} />
            <Stat label="Despachos" value={despachos.length} />
            <Stat label="Notas" value={notas.length} />
          </div>
          {/* Actions */}
          <div className="flex flex-wrap gap-2 px-4 py-3">
            <button
              onClick={() => exportInventarioExcel()}
              className="press inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-[12px] font-medium text-foreground hover:bg-muted"
            >
              <Download className="h-3.5 w-3.5" {...ICON_PROPS} />
              Exportar inventario
            </button>
            <button
              onClick={() => setSeedConfirm(true)}
              className="press inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-[12px] font-medium text-foreground hover:bg-muted"
            >
              <DatabaseZap className="h-3.5 w-3.5" {...ICON_PROPS} />
              Cargar datos demo
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              className="press inline-flex h-8 items-center gap-1.5 rounded-md border border-destructive/30 bg-background px-3 text-[12px] font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" {...ICON_PROPS} />
              Borrar todo
            </button>
          </div>
        </div>
      </section>

      {/* ─── Acerca de ─── */}
      <section className="anim-slide-up mb-4 overflow-hidden rounded-lg border border-border bg-background">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" {...ICON_PROPS} />
            <h2 className="text-[13px] font-medium text-foreground">Acerca de</h2>
          </div>
        </div>
        <div className="divide-y divide-border">
          <InfoRow label="Sistema" value="LEMCORP · Sistema de Almacén" />
          <InfoRow label="Asistente IA" value="Alana" />
          <InfoRow label="Versión" value="3.3.0 · ALANA" mono />
          <InfoRow label="Propietario" value="Lemcorp" />
          <InfoRow label="Entradas" value="Formato SKU*cantidad" />
          <InfoRow label="Usuario activo" value={settings.usuario || "Iker"} />
          <InfoRow label="Tema" value={settings.tema} capitalize />
          <InfoRow
            label="Voz (TTS)"
            value={settings.voz ? "Activada" : "Desactivada"}
            valueClass={settings.voz ? "text-foreground" : "text-muted-foreground"}
          />
          <InfoRow label="Memoria de Alana" value={`${memoriaIA.length} aprendizaje(s)`} />
          <InfoRow label="Sincronización" value="Activada" />
        </div>
        {/* Re-lanzar onboarding */}
        <div className="flex justify-end border-t border-border px-4 py-3">
          <button
            onClick={() => {
              try {
                localStorage.removeItem("lemcorp-onboarding-done-v1");
              } catch {}
              setTimeout(() => window.location.reload(), 200);
            }}
            className="press inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-[12px] font-medium text-foreground hover:bg-muted"
          >
            <Sparkles className="h-3.5 w-3.5" {...ICON_PROPS} />
            Repetir configuración inicial
          </button>
        </div>
      </section>

      {/* Confirmar borrado */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="gap-0 rounded-lg border-destructive/30 bg-background p-0">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
              <Trash2 className="h-4 w-4 text-destructive" {...ICON_PROPS} />
              Borrar todos los datos
            </DialogTitle>
            <DialogDescription className="mt-1 text-[12px] text-muted-foreground">
              Se eliminarán productos, equipos, entradas, despachos y notas. No se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t border-border px-5 py-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="h-9 rounded-md border-border bg-background hover:bg-muted"
            >
              Cancelar
            </Button>
            <button
              onClick={() => {
                clearAllData();
                setConfirmOpen(false);
                toast({ title: "Datos borrados", description: "El sistema quedó vacío." });
              }}
              className="press inline-flex h-9 items-center gap-1.5 rounded-md bg-destructive px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-destructive/90"
            >
              <Trash2 className="h-3.5 w-3.5" {...ICON_PROPS} />
              Sí, borrar todo
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar carga demo */}
      <Dialog open={seedConfirm} onOpenChange={setSeedConfirm}>
        <DialogContent className="gap-0 rounded-lg border-border bg-background p-0">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
              <DatabaseZap className="h-4 w-4 text-foreground" {...ICON_PROPS} />
              Cargar datos demo
            </DialogTitle>
            <DialogDescription className="mt-1 text-[12px] text-muted-foreground">
              Se reemplazarán los datos actuales por el set de demostración (10 productos, 7 equipos, 3 notas, 6 miembros, 10 horarios). Los datos existentes se perderán.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t border-border px-5 py-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setSeedConfirm(false)}
              className="h-9 rounded-md border-border bg-background hover:bg-muted"
            >
              Cancelar
            </Button>
            <button
              onClick={handleSeed}
              className="press inline-flex h-9 items-center gap-1.5 rounded-md bg-foreground px-3.5 text-[13px] font-medium text-background transition-colors hover:bg-foreground/90"
            >
              <DatabaseZap className="h-3.5 w-3.5" {...ICON_PROPS} />
              Cargar demo
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar borrado de memoria */}
      <Dialog open={memConfirmOpen} onOpenChange={setMemConfirmOpen}>
        <DialogContent className="gap-0 rounded-lg border-destructive/30 bg-background p-0">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
              <Brain className="h-4 w-4 text-destructive" {...ICON_PROPS} />
              Borrar memoria de Alana
            </DialogTitle>
            <DialogDescription className="mt-1 text-[12px] text-muted-foreground">
              Se eliminarán los {memoriaIA.length} aprendizaje(s) que Alana ha guardado. No se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t border-border px-5 py-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setMemConfirmOpen(false)}
              className="h-9 rounded-md border-border bg-background hover:bg-muted"
            >
              Cancelar
            </Button>
            <button
              onClick={handleClearMemoria}
              className="press inline-flex h-9 items-center gap-1.5 rounded-md bg-destructive px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-destructive/90"
            >
              <Trash2 className="h-3.5 w-3.5" {...ICON_PROPS} />
              Sí, borrar memoria
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-background px-4 py-3 text-center">
      <p className="text-[20px] font-semibold tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
  capitalize,
  valueClass,
}: {
  label: string;
  value: string;
  mono?: boolean;
  capitalize?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="w-28 shrink-0 text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "flex-1 text-[12px] font-medium text-foreground",
          mono && "font-mono",
          capitalize && "capitalize",
          valueClass
        )}
      >
        {value}
      </span>
    </div>
  );
}

function SesionSelector() {
  const miembros = useStore((s) => s.miembros);
  const sesionUsuarioId = useStore((s) => s.sesionUsuarioId);
  const iniciarSesion = useStore((s) => s.iniciarSesion);
  const cerrarSesion = useStore((s) => s.cerrarSesion);
  const tienePermiso = useStore((s) => s.tienePermiso);

  const miembroActual = sesionUsuarioId
    ? miembros.find((m) => m.id === sesionUsuarioId)
    : null;

  if (miembros.length === 0) {
    return (
      <p className="text-[12px] text-muted-foreground">
        No hay miembros del equipo registrados. Añádelos desde{" "}
        <Link href="/empresa" className="font-medium text-foreground underline-offset-4 hover:underline">
          Empresas
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Estado actual */}
      <div className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2.5">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-[11px] font-medium",
            !miembroActual ? "bg-foreground text-background" : "bg-background text-foreground"
          )}
        >
          {miembroActual ? miembroActual.nombre.charAt(0).toUpperCase() : "AD"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium text-foreground">
            {miembroActual?.nombre || "Admin (dueño)"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {miembroActual ? ROL_META[miembroActual.rol].label : "Acceso total al sistema"}
          </p>
        </div>
        {miembroActual && (
          <button
            onClick={cerrarSesion}
            className="press inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[12px] font-medium text-foreground hover:bg-muted"
          >
            <LogOut className="h-3.5 w-3.5" {...ICON_PROPS} />
            Cerrar sesión
          </button>
        )}
      </div>

      {/* Selector */}
      {!miembroActual && (
        <div>
          <Label className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">
            Iniciar sesión como
          </Label>
          <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {miembros.map((m) => {
              return (
                <button
                  key={m.id}
                  onClick={() => iniciarSesion(m.id)}
                  className="press flex items-center gap-2.5 bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[11px] font-medium text-foreground">
                    {m.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-foreground">{m.nombre}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{ROL_META[m.rol].label}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Al iniciar sesión verás el sistema como ese usuario (con sus permisos). Útil para probar configuraciones.
          </p>
        </div>
      )}

      {/* Info de permisos */}
      {miembroActual && (
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Tus permisos efectivos:
          </p>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(PERMISO_META) as Permiso[]).filter((p) => tienePermiso(p)).map((p) => (
              <span
                key={p}
                className="rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-foreground"
              >
                {PERMISO_META[p].label}
              </span>
            ))}
            {(Object.keys(PERMISO_META) as Permiso[]).filter((p) => !tienePermiso(p)).length > 0 && (
              <details className="w-full">
                <summary className="mt-1.5 cursor-pointer text-[10px] text-muted-foreground hover:text-foreground">
                  Ver permisos NO concedidos ({(Object.keys(PERMISO_META) as Permiso[]).filter((p) => !tienePermiso(p)).length})
                </summary>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {(Object.keys(PERMISO_META) as Permiso[]).filter((p) => !tienePermiso(p)).map((p) => (
                    <span
                      key={p}
                      className="rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground line-through"
                    >
                      {PERMISO_META[p].label}
                    </span>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
