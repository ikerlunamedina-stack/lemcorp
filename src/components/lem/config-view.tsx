"use client";

import { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Database,
  Trash2,
  Info,
  Download,
  User,
  UserCheck,
  Palette,
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
  ChevronDown,
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
import { speak, stopSpeaking, ttsDisponible, obtenerVocesEspanol } from "@/lib/tts";

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
  const memoriaIA = useStore((s) => s.memoriaIA);
  const deleteMemoria = useStore((s) => s.deleteMemoria);
  const clearMemoria = useStore((s) => s.clearMemoria);
  const { toast } = useToast();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [seedConfirm, setSeedConfirm] = useState(false);
  const [memConfirmOpen, setMemConfirmOpen] = useState(false);
  const [vocesDisponibles, setVocesDisponibles] = useState<SpeechSynthesisVoice[]>([]);

  const ttsSoportado = typeof window !== "undefined" && ttsDisponible();

  // Cargar voces disponibles al montar
  useEffect(() => {
    if (!ttsSoportado) return;
    obtenerVocesEspanol().then((voces) => setVocesDisponibles(voces));
  }, [ttsSoportado]);

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
    <div className="px-4 py-6 lg:px-8">
      <div className="anim-fade-up mb-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <SettingsIcon className="h-5 w-5 text-primary" /> Configuración
        </h1>
        <p className="text-sm text-muted-foreground">Personaliza tu experiencia y gestiona los datos del sistema</p>
      </div>

      {/* ─── Personalización ─── */}
      <section className="anim-fade-up mb-5 rounded-3xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <User className="h-4 w-4 text-primary" /> Personalización
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
            placeholder="Ej: Iker, Carlos, Antonio…"
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
                      ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
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

      {/* ─── Sesión / Cambiar de usuario ─── */}
      <section className="anim-fade-up mb-5 rounded-3xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <UserCheck className="h-4 w-4 text-primary" /> Sesión
        </h2>
        <p className="mb-4 text-[11px] text-muted-foreground">
          Inicia sesión como un miembro del equipo para probar sus permisos. Si no hay sesión, eres el admin (dueño) con todos los permisos.
        </p>
        <SesionSelector />
      </section>

      {/* ─── Pistoleo ─── */}
      <section className="anim-fade-up mb-5 rounded-3xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <ScanLine className="h-4 w-4 text-primary" /> Pistoleo de series
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
          <Sparkles className="h-4 w-4 text-primary" /> Alertas
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

      {/* ─── Voz (TTS) ─── */}
      <section className="anim-fade-up mb-5 rounded-3xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          {settings.voz ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />} Voz de Alana
        </h2>
        <p className="mb-4 text-[11px] text-muted-foreground">
          Cuando la voz está activada, Alana lee sus respuestas en español y anuncia los recordatorios del horario en voz alta.
        </p>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 p-3.5">
          <div className="flex-1">
            <p className="text-[13px] font-medium">Text-to-Speech (TTS)</p>
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
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="press h-8 rounded-lg text-xs"
              onClick={() => speak("Hola, soy Alana, asistente del almacén Lemcorp.")}
            >
              <Volume2 className="mr-1.5 h-3.5 w-3.5" /> Probar voz
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="press h-8 rounded-lg text-xs"
              onClick={() => stopSpeaking()}
            >
              <Square className="mr-1.5 h-3.5 w-3.5" /> Detener
            </Button>
          </div>
        )}
      </section>

      {/* ─── Memoria de Alana (aprendizajes) ─── */}
      <section className="anim-fade-up mb-5 rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Brain className="h-4 w-4 text-primary" /> Memoria de Alana
          </h2>
          {memoriaIA.length > 0 && (
            <button
              onClick={() => setMemConfirmOpen(true)}
              className="press flex h-7 items-center gap-1 rounded-lg border border-border px-2 text-[10px] font-medium text-muted-foreground transition-colors hover:border-rose-500/40 hover:text-rose-400"
            >
              <Trash2 className="h-3 w-3" /> Borrar todo
            </button>
          )}
        </div>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Cosas que Alana ha aprendido de ti. Dile en el chat cosas como <em>"recuerda que…"</em> o <em>"aprende que…"</em> para que las guarde aquí.
        </p>

        {memoriaIA.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-8 text-center">
            <Brain className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-[12px] font-semibold text-muted-foreground">Todavía no has enseñado nada a Alana</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Abre la pestaña IA y prueba: <em>"Recuerda que el personal Pérez trabaja de lunes a miércoles"</em>
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {memoriaIA.map((m, i) => (
              <div
                key={i}
                className="group flex items-start gap-2.5 rounded-2xl border border-border bg-background/40 p-2.5"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-[10px] font-bold text-emerald-500">
                  {i + 1}
                </span>
                <p className="flex-1 break-words text-[12px] leading-snug text-foreground">{m}</p>
                <button
                  onClick={() => handleDeleteMemoria(i)}
                  className="press shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-rose-500 group-hover:opacity-100"
                  title="Eliminar este aprendizaje"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Datos del sistema ─── */}
      <section className="anim-fade-up mb-5 rounded-3xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <Database className="h-4 w-4 text-primary" /> Datos del sistema
        </h2>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Tus datos se guardan localmente y se sincronizan automáticamente en la nube para que estén disponibles desde cualquier dispositivo.
        </p>
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[11px]">
          <DatabaseZap className="h-3.5 w-3.5 text-emerald-500" />
          <span className="font-medium text-emerald-500">Sincronización entre dispositivos activada</span>
          <span className="text-muted-foreground">— los cambios se suben solos (~1s)</span>
        </div>
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
          <Info className="h-4 w-4 text-primary" /> Acerca de
        </h2>
        <div className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Sistema</span>
            <span className="font-medium text-foreground">LEMCORP · Sistema de Almacén</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Asistente IA</span>
            <span className="font-medium text-foreground">Alana</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Versión</span>
            <span className="font-mono">3.3.0 · ALANA</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Propietario</span>
            <span className="font-medium text-foreground">Lemcorp</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Entradas</span>
            <span className="font-medium">Formato SKU*cantidad</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Usuario activo</span>
            <span className="font-medium text-foreground">{settings.usuario || "Iker"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Tema</span>
            <span className="font-medium capitalize">{settings.tema}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Voz (TTS)</span>
            <span className={cn("font-medium", settings.voz ? "text-emerald-500" : "text-muted-foreground")}>
              {settings.voz ? "Activada" : "Desactivada"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Memoria de Alana</span>
            <span className="font-medium text-foreground">{memoriaIA.length} aprendizaje(s)</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Sincronización</span>
            <span className="font-medium text-emerald-500">Activada</span>
          </div>
        </div>

        {/* Re-lanzar onboarding */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => {
              try {
                localStorage.removeItem("lemcorp-onboarding-done-v1");
              } catch {}
              setTimeout(() => window.location.reload(), 200);
            }}
            className="press inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Sparkles className="h-3 w-3 text-primary" />
            Repetir configuración inicial
          </button>
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
              <DatabaseZap className="h-4 w-4 text-primary" /> Cargar datos demo
            </DialogTitle>
            <DialogDescription>
              Se reemplazarán los datos actuales por el set de demostración (10 productos, 7 equipos, 3 notas, 6 miembros, 10 horarios). Los datos existentes se perderán.
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

      {/* Confirmar borrado de memoria */}
      <Dialog open={memConfirmOpen} onOpenChange={setMemConfirmOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400">
              <Brain className="h-4 w-4" /> Borrar memoria de Alana
            </DialogTitle>
            <DialogDescription>
              Se eliminarán los {memoriaIA.length} aprendizaje(s) que Alana ha guardado. No se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemConfirmOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleClearMemoria} className="rounded-xl">
              Sí, borrar memoria
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
        <Link href="/empresa" className="font-semibold text-primary hover:underline">Empresas</Link>.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Estado actual */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
        <div className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold",
          !miembroActual ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        )}>
          {miembroActual ? miembroActual.nombre.charAt(0).toUpperCase() : "AD"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-foreground">
            {miembroActual?.nombre || "Admin (dueño)"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {miembroActual ? ROL_META[miembroActual.rol].label : "Acceso total al sistema"}
          </p>
        </div>
        {miembroActual && (
          <Button variant="outline" size="sm" onClick={cerrarSesion} className="press h-8 rounded-lg">
            <LogOut className="mr-1 h-3.5 w-3.5" /> Cerrar sesión
          </Button>
        )}
      </div>

      {/* Selector */}
      {!miembroActual && (
        <div>
          <Label className="mb-1.5 block text-[11px] uppercase tracking-wide text-muted-foreground">
            Iniciar sesión como
          </Label>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {miembros.map((m) => {
              const esAdmin = m.rol === "administrador";
              return (
                <button
                  key={m.id}
                  onClick={() => iniciarSesion(m.id)}
                  className={cn(
                    "press flex items-center gap-2.5 rounded-xl border border-border bg-card p-2.5 text-left transition-colors hover:bg-accent"
                  )}
                >
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold",
                    esAdmin ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {m.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold">{m.nombre}</p>
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
        <div className="rounded-xl border border-border bg-muted/30 p-3 text-[11px]">
          <p className="mb-1.5 font-semibold text-foreground">Tus permisos efectivos:</p>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(PERMISO_META) as Permiso[]).filter((p) => tienePermiso(p)).map((p) => (
              <span key={p} className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
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
                    <span key={p} className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400/80 line-through">
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
