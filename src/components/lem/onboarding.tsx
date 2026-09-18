"use client";

import { useEffect, useState } from "react";
import {
  Sparkles, ArrowRight, ArrowLeft, Check, User, Building2,
  Boxes, Users, MapPin, Palette, Volume2, Sun, Moon, Monitor,
  Wifi, ShoppingCart, Truck, Wrench, Rocket,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Tema } from "@/lib/types";

const ONBOARD_KEY = "lemcorp-onboarding-done-v1";

export function Onboarding({ onDone }: { onDone: () => void }) {
  // Estado de la máquina de estados del onboarding
  // boot -> welcome -> name -> company -> type -> techs -> zone -> theme -> voice -> done
  const [phase, setPhase] = useState<"boot" | "wizard" | "done">("boot");
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);

  // Respuestas del usuario
  const [nombre, setNombre] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [tipoNegocio, setTipoNegocio] = useState<"telecom" | "retail" | "logistica" | "otro">("telecom");
  const [numPersonal, setNumPersonal] = useState<"1-5" | "6-20" | "21-50" | "50+">("6-20");
  const [zona, setZona] = useState("");
  const [tema, setTema] = useState<Tema>("oscuro");
  const [voz, setVoz] = useState(false);

  const setSetting = useStore((s) => s.setSetting);
  const updateEmpresa = useStore((s) => s.updateEmpresa);
  const setPistoleoConfig = useStore((s) => s.setPistoleoConfig);

  // Cuando termina el boot (2.4s), pasa al wizard
  useEffect(() => {
    if (phase !== "boot") return;
    const t = setTimeout(() => setPhase("wizard"), 2600);
    return () => clearTimeout(t);
  }, [phase]);

  const goToNext = () => {
    setLeaving(true);
    setTimeout(() => {
      setLeaving(false);
      setStep((s) => s + 1);
    }, 350);
  };

  const goToPrev = () => {
    setLeaving(true);
    setTimeout(() => {
      setLeaving(false);
      setStep((s) => Math.max(0, s - 1));
    }, 350);
  };

  const finalizar = () => {
    // Aplicar todo al store según las respuestas
    if (nombre.trim()) setSetting("usuario", nombre.trim());
    if (empresa.trim()) updateEmpresa({ nombre: empresa.trim() });
    setSetting("tema", tema);
    setSetting("voz", voz);

    // Construir la descripción de la empresa según las respuestas
    const tipoLabel = {
      telecom: "Telecomunicaciones",
      retail: "Retail / Comercio",
      logistica: "Logística y Distribución",
      otro: "Otro rubro",
    }[tipoNegocio];
    const personalLabel = {
      "1-5": "1 a 5 personas",
      "6-20": "6 a 20 personas",
      "21-50": "21 a 50 personas",
      "50+": "Más de 50 personas",
    }[numPersonal];
    const zonaTxt = zona.trim() || "Lima, Perú";
    updateEmpresa({
      descripcion: `LEMCORP — ${tipoLabel}\nPropietario: ${empresa.trim() || "Lemcorp"}\nRubro: ${tipoLabel}\nPersonal del almacén: ${personalLabel}\nCobertura: ${zonaTxt}`,
    });

    // Reset pistoleo config (prefijo se define en onboarding según tipo de negocio)
    const prefijosPorTipo = {
      telecom: "ZTE",
      retail: "",
      logistica: "",
      otro: "",
    };
    setPistoleoConfig({ pistoleoModeloSeleccionado: "" });

    // Marcar onboarding como hecho
    try {
      localStorage.setItem(ONBOARD_KEY, "1");
    } catch {}

    // Animación de cierre y avisa al padre
    setPhase("done");
    setTimeout(() => onDone(), 1200);
  };

  // ===== Pantalla BOOT (logo animado tipo encendido) =====
  if (phase === "boot") {
    return (
      <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-black anim-boot-fade-out">
        {/* Glow de fondo */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="anim-boot-glow h-[420px] w-[420px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(180,180,180,0.18) 0%, rgba(120,120,120,0.06) 40%, transparent 70%)",
            }}
          />
        </div>

        {/* Logo + nombre */}
        <div className="relative z-10 flex flex-col items-center anim-boot-logo">
          <img
            src="/lemcorp-logo.png"
            alt="LEMCORP"
            className="h-24 w-24 rounded-2xl object-contain shadow-2xl"
          />
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-white">
            LEMCORP
          </h1>
          <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/60">
            Sistema de Almacén
          </p>
        </div>

        {/* Barra de progreso tipo encendido */}
        <div className="absolute bottom-[18%] z-10 h-[3px] w-44 overflow-hidden rounded-full bg-white/10">
          <div className="anim-boot-progress h-full rounded-full bg-white/70" />
        </div>
        <p className="absolute bottom-[14%] z-10 text-[10px] uppercase tracking-widest text-white/40">
          Iniciando…
        </p>
      </div>
    );
  }

  // ===== Pantalla final "¡Listo!" =====
  if (phase === "done") {
    return (
      <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-black">
        {/* Anillos concéntricos animados */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="anim-onboard-ring h-40 w-40 rounded-full border border-white/30" />
        </div>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="anim-onboard-ring h-40 w-40 rounded-full border border-white/30" style={{ animationDelay: "0.4s" }} />
        </div>

        {/* Check SVG animado */}
        <div className="relative z-10 flex flex-col items-center">
          <svg width="84" height="84" viewBox="0 0 84 84" className="anim-scale-in">
            <circle cx="42" cy="42" r="38" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <circle cx="42" cy="42" r="38" fill="none" stroke="white" strokeWidth="2" strokeDasharray="240" strokeDashoffset="0" strokeLinecap="round" transform="rotate(-90 42 42)" className="anim-onboard-check" />
            <path
              d="M28 42 L38 52 L58 32"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="100"
              className="anim-onboard-check"
            />
          </svg>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-white anim-fade-up">
            ¡Todo listo, {nombre.trim() || "Iker"}!
          </h1>
          <p className="mt-2 text-sm text-white/60 anim-fade-up" style={{ animationDelay: "0.2s" }}>
            Tu sistema LEMCORP está configurado y listo para usar.
          </p>
        </div>
      </div>
    );
  }

  // ===== Wizard (pasos) =====
  const steps = [
    // Step 0: Bienvenida — Hola soy Alana
    {
      icon: Sparkles,
      title: "¡Hola! Soy Alana",
      subtitle: "Tu asistente inteligente",
      body: (
        <p className="text-center text-[14px] leading-relaxed text-muted-foreground">
          Bienvenido a <span className="font-semibold text-foreground">LEMCORP</span>. En los próximos pasos te haré unas preguntas rápidas para configurar tu sistema a tu medida. Tómate tu tiempo — yo me encargo del resto.
        </p>
      ),
      canContinue: true,
    },
    // Step 1: ¿Cómo te llamas?
    {
      icon: User,
      title: "¿Cómo te llamas?",
      subtitle: "Tu nombre se usará para saludarte y firmar reportes",
      body: (
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Iker"
          autoFocus
          className="h-12 rounded-2xl text-center text-[18px] font-medium"
          onKeyDown={(e) => {
            if (e.key === "Enter" && nombre.trim()) goToNext();
          }}
        />
      ),
      canContinue: !!nombre.trim(),
    },
    // Step 2: ¿Cuál es tu empresa?
    {
      icon: Building2,
      title: "¿Cuál es tu empresa?",
      subtitle: "El nombre aparecerá en exportaciones y notificaciones",
      body: (
        <Input
          value={empresa}
          onChange={(e) => setEmpresa(e.target.value)}
          placeholder="Ej: Lemcorp, LPS, Claro…"
          autoFocus
          className="h-12 rounded-2xl text-center text-[18px] font-medium"
          onKeyDown={(e) => {
            if (e.key === "Enter" && empresa.trim()) goToNext();
          }}
        />
      ),
      canContinue: !!empresa.trim(),
    },
    // Step 3: ¿A qué te dedicas?
    {
      icon: Boxes,
      title: "¿A qué te dedicas?",
      subtitle: "Adaptaré las opciones según tu rubro",
      body: (
        <div className="grid grid-cols-2 gap-3">
          {[
            { v: "telecom" as const, label: "Telecomunicaciones", icon: Wifi, desc: "Routers, ONT, decodificadores" },
            { v: "retail" as const, label: "Retail / Comercio", icon: ShoppingCart, desc: "Productos terminados" },
            { v: "logistica" as const, label: "Logística", icon: Truck, desc: "Distribución y transporte" },
            { v: "otro" as const, label: "Otro", icon: Wrench, desc: "Lo personalizo luego" },
          ].map((opt) => {
            const active = tipoNegocio === opt.v;
            const Icon = opt.icon;
            return (
              <button
                key={opt.v}
                onClick={() => setTipoNegocio(opt.v)}
                className={cn(
                  "press flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all",
                  active
                    ? "border-primary bg-primary/10 shadow-md"
                    : "border-border bg-card hover:border-primary/40 hover:bg-accent/50"
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl",
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-foreground">{opt.label}</p>
                  <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      ),
      canContinue: true,
    },
    // Step 4: ¿Cuántas personas hay en el almacén?
    {
      icon: Users,
      title: "¿Cuántas personas hay en el almacén?",
      subtitle: "Para dimensionar el panel de despachos",
      body: (
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { v: "1-5" as const, label: "1 a 5", desc: "Equipo pequeño" },
            { v: "6-20" as const, label: "6 a 20", desc: "Equipo estándar" },
            { v: "21-50" as const, label: "21 a 50", desc: "Equipo grande" },
            { v: "50+" as const, label: "Más de 50", desc: "Gran escala" },
          ].map((opt) => {
            const active = numPersonal === opt.v;
            return (
              <button
                key={opt.v}
                onClick={() => setNumPersonal(opt.v)}
                className={cn(
                  "press flex flex-col items-center gap-1 rounded-2xl border-2 py-4 transition-all",
                  active
                    ? "border-primary bg-primary/10 shadow-md"
                    : "border-border bg-card hover:border-primary/40 hover:bg-accent/50"
                )}
              >
                <p className={cn("text-2xl font-bold tabular-nums", active ? "text-primary" : "text-foreground")}>
                  {opt.label}
                </p>
                <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      ),
      canContinue: true,
    },
    // Step 5: Zona de cobertura
    {
      icon: MapPin,
      title: "¿Cuál es tu zona de cobertura?",
      subtitle: "Aparecerá en la ficha de tu empresa",
      body: (
        <Input
          value={zona}
          onChange={(e) => setZona(e.target.value)}
          placeholder="Ej: Lima Norte, Comas, Los Olivos"
          autoFocus
          className="h-12 rounded-2xl text-center text-[16px] font-medium"
          onKeyDown={(e) => {
            if (e.key === "Enter" && zona.trim()) goToNext();
          }}
        />
      ),
      canContinue: !!zona.trim(),
    },
    // Step 6: Tema visual
    {
      icon: Palette,
      title: "Elige tu tema",
      subtitle: "Puedes cambiarlo cuando quieras",
      body: (
        <div className="grid grid-cols-3 gap-3">
          {([
            { v: "claro" as const, label: "Claro", icon: Sun },
            { v: "oscuro" as const, label: "Oscuro", icon: Moon },
            { v: "sistema" as const, label: "Sistema", icon: Monitor },
          ]).map((opt) => {
            const active = tema === opt.v;
            const Icon = opt.icon;
            return (
              <button
                key={opt.v}
                onClick={() => setTema(opt.v)}
                className={cn(
                  "press flex flex-col items-center gap-2 rounded-2xl border-2 py-5 transition-all",
                  active
                    ? "border-primary bg-primary/10 shadow-md"
                    : "border-border bg-card hover:border-primary/40 hover:bg-accent/50"
                )}
              >
                <Icon className={cn("h-6 w-6", active ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-[12px] font-semibold", active ? "text-primary" : "text-foreground")}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      ),
      canContinue: true,
    },
    // Step 7: ¿Activar voz de Alana?
    {
      icon: Volume2,
      title: "¿Activar voz de Alana?",
      subtitle: "Te leerá recordatorios y respuestas en voz alta",
      body: (
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => setVoz((v) => !v)}
            className={cn(
              "press relative flex h-20 w-20 items-center justify-center rounded-full border-2 transition-all",
              voz
                ? "border-primary bg-primary/15 shadow-lg"
                : "border-border bg-card"
            )}
          >
            <Volume2 className={cn("h-8 w-8 transition-colors", voz ? "text-primary" : "text-muted-foreground")} />
            {voz && (
              <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                <Check className="h-4 w-4" />
              </span>
            )}
          </button>
          <p className="text-[12px] text-muted-foreground">
            {voz ? "Voz activada — Alana te hablará" : "Voz desactivada — solo texto"}
          </p>
        </div>
      ),
      canContinue: true,
    },
  ];

  const current = steps[step];
  const Icon = current.icon;
  const progress = ((step + 1) / steps.length) * 100;
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center overflow-y-auto bg-background p-4">
      {/* Glow decorativo */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-0 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)" }}
        />
      </div>

      {/* Contenedor principal */}
      <div className="relative z-10 flex w-full max-w-md flex-col">
        {/* Cabecera: progreso */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/lemcorp-logo.png" alt="" className="h-6 w-6 rounded-md object-contain" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                LEMCORP
              </span>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">
              Paso {step + 1} de {steps.length}
            </span>
          </div>
          {/* Barra de progreso */}
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Dots */}
          <div className="mt-3 flex justify-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === step
                    ? "w-6 bg-primary anim-onboard-dot"
                    : i < step
                    ? "w-1.5 bg-primary/60"
                    : "w-1.5 bg-muted"
                )}
              />
            ))}
          </div>
        </div>

        {/* Tarjeta del paso */}
        <div
          key={step}
          className={cn(
            "rounded-3xl border border-border bg-card p-7 shadow-2xl",
            leaving ? "anim-onboard-out" : "anim-onboard-in"
          )}
        >
          {/* Icono del paso */}
          <div className="mb-5 flex justify-center">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Icon className="h-7 w-7 text-primary" />
              </div>
              <span className="absolute -inset-1 -z-10 rounded-2xl bg-primary/20 blur-md" />
            </div>
          </div>

          {/* Título */}
          <h2 className="mb-1 text-center text-xl font-bold tracking-tight text-foreground">
            {current.title}
          </h2>
          <p className="mb-6 text-center text-[12px] text-muted-foreground">
            {current.subtitle}
          </p>

          {/* Contenido */}
          <div className="mb-2">{current.body}</div>
        </div>

        {/* Botones */}
        <div className="mt-5 flex items-center gap-2">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={goToPrev}
              className="press h-11 rounded-2xl px-5"
              disabled={leaving}
            >
              <ArrowLeft className="h-4 w-4" />
              Atrás
            </Button>
          )}
          {isLast ? (
            <Button
              onClick={finalizar}
              disabled={!current.canContinue || leaving}
              className="press btn-spacecom h-11 flex-1 rounded-2xl"
            >
              <Rocket className="mr-1.5 h-4 w-4" />
              ¡Configurar mi sistema!
            </Button>
          ) : (
            <Button
              onClick={goToNext}
              disabled={!current.canContinue || leaving}
              className="press btn-spacecom h-11 flex-1 rounded-2xl"
            >
              Continuar
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Tip de Alana */}
        <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-border bg-muted/30 p-3">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Tip de Alana:</span>{" "}
            {step === 0 && "Puedes saltar pasos y configurarlos más tarde en Configuración."}
            {step === 1 && "Tu nombre aparecerá en el saludo de cada mañana y en los reportes."}
            {step === 2 && "La empresa se usará en exportaciones Excel y en datos de notificaciones."}
            {step === 3 && "Si trabajas con routers y ONT, elegir Telecom activa reglas de prefijo útiles."}
            {step === 4 && "Esto solo es informativo. Lo puedes ajustar después desde Empresa."}
            {step === 5 && "Tu zona de cobertura aparecerá en la ficha de tu empresa."}
            {step === 6 && "El tema oscuro gasta menos batería en pantallas OLED."}
            {step === 7 && "La voz de Alana usa el sintetizador del navegador — no gasta datos."}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Marcar onboarding como completado sin mostrarlo (para tests) */
export function skipOnboarding() {
  try {
    localStorage.setItem(ONBOARD_KEY, "1");
  } catch {}
}

/** Resetear el onboarding (lo muestra de nuevo la próxima vez) */
export function resetOnboarding() {
  try {
    localStorage.removeItem(ONBOARD_KEY);
  } catch {}
}
