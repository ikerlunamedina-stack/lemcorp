"use client";

import { useEffect, useState, useRef } from "react";
import { useStore } from "@/lib/store";
import { AlanaAvatar } from "@/components/lem/alana-avatar";
import { cn } from "@/lib/utils";
import { speak } from "@/lib/tts";
import { Power, Lock, Check, Loader2 } from "lucide-react";

const ENCENDIDO_START_KEY = "lemcorp-encendido-start";
const DURACION_TOTAL = 300; // 5 minutos en segundos

// Mensajes de Alana durante el encendido
function generarMensajesEncendido(usuario: string, products: any[], equipos: any[], despachos: any[], notas: any[], horario: any[]): { tiempo: number; texto: string }[] {
  const totalUnidades = products.reduce((s, p) => s + p.quantity, 0);
  const bajoStock = products.filter(p => p.minStock && p.minStock > 0 && p.quantity <= p.minStock);
  const agotados = products.filter(p => p.quantity === 0);
  const equiposAveriados = equipos.filter(e => e.estado === "averiado");
  const despachosHoy = despachos.filter(d => { try { return new Date(d.fecha).toDateString() === new Date().toDateString(); } catch { return false; } });
  const horarioHoy = horario.filter(h => {
    const dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
    return h.dia === dias[new Date().getDay()];
  });

  return [
    { tiempo: 0, texto: `Hola ${usuario}. Dame unos minutos para preparar todo...` },
    { tiempo: 15, texto: `Revisando el inventario... tienes ${products.length} productos en el catálogo.` },
    { tiempo: 35, texto: `Total de unidades en stock: ${totalUnidades.toLocaleString("es-PE")}.` },
    { tiempo: 55, texto: bajoStock.length > 0
      ? `Ojo: hay ${bajoStock.length} producto(s) bajo del mínimo. Hay que pedir pronto.`
      : `Stock bien, nada bajo del mínimo por ahora.` },
    { tiempo: 75, texto: agotados.length > 0
      ? `Alerta: ${agotados.length} producto(s) están en cero. Sin stock.`
      : `Ningún producto agotado. Todo bien.` },
    { tiempo: 95, texto: `Cargando los equipos... ${equipos.length} registrados en total.` },
    { tiempo: 115, texto: equiposAveriados.length > 0
      ? `Hay ${equiposAveriados.length} equipo(s) averiado(s) que necesitan revisión.`
      : `Todos los equipos están operativos.` },
    { tiempo: 135, texto: `Sincronizando con el servidor... un momento.` },
    { tiempo: 155, texto: `Preparando los despachos... ${despachosHoy.length} hechos hoy.` },
    { tiempo: 175, texto: `Revisando el bloc de notas... ${notas.length} nota(s) guardada(s).` },
    { tiempo: 195, texto: horarioHoy.length > 0
      ? `Hoy tienes ${horarioHoy.length} actividad(es) programada(s) en el horario.`
      : `No hay actividades programadas para hoy.` },
    { tiempo: 220, texto: `Configurando los avisos y recordatorios...` },
    { tiempo: 245, texto: `Revisando si hay que pedir algo urgente...` },
    { tiempo: 270, texto: `Optimizando todo para que vaya rápido...` },
    { tiempo: 290, texto: `Listo ${usuario}. Todo preparado. ${bajoStock.length > 0 ? `Recuerda que hay ${bajoStock.length} producto(s) con bajo stock.` : "Stock al día."} A trabajar.` },
  ];
}

function generarCodigo(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function SystemManager() {
  const sistemaEstado = useStore((s) => s.sistemaEstado);
  const apagarSistema = useStore((s) => s.apagarSistema);
  const iniciarEncendido = useStore((s) => s.iniciarEncendido);
  const completarEncendido = useStore((s) => s.completarEncendido);
  const usuario = useStore((s) => s.settings.usuario || "Iker");
  const products = useStore((s) => s.products);
  const equipos = useStore((s) => s.equipos);
  const despachos = useStore((s) => s.despachos);
  const notas = useStore((s) => s.notas);
  const horario = useStore((s) => s.horario);

  const [showShutdownDialog, setShowShutdownDialog] = useState(false);
  const [codigoEsperado, setCodigoEsperado] = useState("");
  const [codigoInput, setCodigoInput] = useState("");
  const [errorCodigo, setErrorCodigo] = useState(false);

  // Estado de encendido
  const [mensajeActual, setMensajeActual] = useState(0);
  const [progreso, setProgreso] = useState(0);
  const [segundosTranscurridos, setSegundosTranscurridos] = useState(0);
  const [mensajes, setMensajes] = useState<{ tiempo: number; texto: string }[]>(() => generarMensajesEncendido(usuario, products, equipos, despachos, notas, horario));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Iniciar encendido — guarda el timestamp en localStorage
  const handleIniciarEncendido = () => {
    const startTime = Date.now();
    try {
      localStorage.setItem(ENCENDIDO_START_KEY, String(startTime));
    } catch {}
    iniciarEncendido();
  };

  // Si el sistema está iniciando, correr la secuencia CON persistencia
  useEffect(() => {
    if (sistemaEstado !== "iniciando") return;

    // Leer el timestamp guardado (para continuar si se refrescó)
    let startTime = Date.now();
    try {
      const saved = localStorage.getItem(ENCENDIDO_START_KEY);
      if (saved) {
        startTime = Number(saved);
        if (isNaN(startTime) || startTime < 1) startTime = Date.now();
      } else {
        // No hay timestamp guardado — crearlo
        startTime = Date.now();
        localStorage.setItem(ENCENDIDO_START_KEY, String(startTime));
      }
    } catch {
      startTime = Date.now();
    }

    // Calcular segundos transcurridos
    const calcularSegundos = () => {
      const transcurridos = Math.floor((Date.now() - startTime) / 1000);
      return Math.max(0, transcurridos);
    };

    const segundosIniciales = calcularSegundos();

    // Si ya pasó el tiempo total, completar
    if (segundosIniciales >= DURACION_TOTAL) {
      completarEncendido();
      try { localStorage.removeItem(ENCENDIDO_START_KEY); } catch {}
      return;
    }

    // Interval principal — actualiza cada segundo
    intervalRef.current = setInterval(() => {
      const segundos = calcularSegundos();
      setSegundosTranscurridos(segundos);
      const pct = Math.min(100, (segundos / DURACION_TOTAL) * 100);
      setProgreso(pct);

      // Actualizar mensaje
      for (let i = mensajes.length - 1; i >= 0; i--) {
        if (segundos >= mensajes[i].tiempo) {
          setMensajeActual(i);
          break;
        }
      }

      // Completar encendido
      if (segundos >= DURACION_TOTAL) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        completarEncendido();
        try { localStorage.removeItem(ENCENDIDO_START_KEY); } catch {}
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sistemaEstado, completarEncendido, usuario, products, equipos, despachos, notas, horario]);

  // HABLA: cada vez que cambia el mensaje, Alana lo dice en voz alta
  const ultimoMensajeHablado = useRef(-1);
  useEffect(() => {
    if (sistemaEstado !== "iniciando") return;
    if (mensajeActual !== ultimoMensajeHablado.current && mensajeActual >= 0) {
      ultimoMensajeHablado.current = mensajeActual;
      const msg = mensajes[mensajeActual];
      if (msg) {
        setTimeout(() => {
          speak(msg.texto);
        }, 300);
      }
    }
  }, [mensajeActual, sistemaEstado]);

  // Abrir diálogo de apagado
  const handleApagarClick = () => {
    setCodigoEsperado(generarCodigo());
    setCodigoInput("");
    setErrorCodigo(false);
    setShowShutdownDialog(true);
  };

  const confirmarApagado = () => {
    if (codigoInput.toUpperCase().trim() === codigoEsperado) {
      setShowShutdownDialog(false);
      try { localStorage.removeItem(ENCENDIDO_START_KEY); } catch {}
      apagarSistema();
    } else {
      setErrorCodigo(true);
    }
  };

  // === PANTALLA: SISTEMA APAGADO ===
  if (sistemaEstado === "apagado") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        {/* Logo tenue */}
        <img
          src="/lemcorp-logo.png"
          alt="LEMCORP"
          className="h-16 w-16 rounded-2xl object-contain opacity-30"
          style={{ animation: "lem-loading-pulse 3s ease-in-out infinite" }}
        />
        <h1 className="mt-8 text-xl font-bold text-muted-foreground/40">SISTEMA APAGADO</h1>
        <p className="mt-1 text-[12px] text-muted-foreground/30">LEMCORP · Almacén</p>

        {/* Botón de encender estilo Apple */}
        <button
          onClick={handleIniciarEncendido}
          className="mt-12 flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/5 transition-all duration-300 hover:border-primary/40 hover:bg-primary/10 active:scale-90"
          title="Encender sistema"
        >
          <Power className="h-8 w-8 text-primary/50 transition-colors duration-300 group-hover:text-primary" />
        </button>
        <p className="mt-4 text-[11px] font-medium text-muted-foreground/40">Presiona para encender</p>
      </div>
    );
  }

  // === PANTALLA: SISTEMA INICIANDO (estilo Apple) ===
  if (sistemaEstado === "iniciando") {
    const msg = mensajes[mensajeActual];
    const minutosRestantes = Math.ceil((DURACION_TOTAL - segundosTranscurridos) / 60);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        {/* Avatar de Alana */}
        <div className="relative">
          {/* Glow sutil detrás del avatar */}
          <div
            className="absolute -inset-6 rounded-full bg-primary/10 blur-2xl"
            style={{ animation: "lem-loading-pulse 4s ease-in-out infinite" }}
          />
          <div className="relative">
            <AlanaAvatar size={72} />
          </div>
        </div>

        {/* Nombre */}
        <h1 className="mt-6 text-lg font-bold text-foreground">Alana</h1>

        {/* Mensaje actual */}
        <div className="mt-4 max-w-sm">
          <p className="text-center text-[14px] font-medium leading-relaxed text-foreground">
            {msg?.texto}
          </p>
        </div>

        {/* Barra de progreso estilo Apple — minimalista */}
        <div className="mt-8 w-full max-w-[240px]">
          {/* Barra */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
              style={{ width: `${progreso}%` }}
            />
          </div>

          {/* Porcentaje y tiempo */}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">
              {Math.floor(progreso)}%
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">
              {minutosRestantes > 0 ? `${minutosRestantes} min restantes` : "Casi listo..."}
            </span>
          </div>
        </div>

        {/* Pasos completados — minimalista */}
        <div className="mt-8 flex flex-col gap-2 w-full max-w-[280px]">
          {mensajes.slice(0, mensajeActual + 1).map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2.5 text-[12px] transition-opacity duration-500",
                i === mensajeActual
                  ? "text-foreground font-medium opacity-100"
                  : "text-muted-foreground opacity-50"
              )}
            >
              {i < mensajeActual ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
              ) : i === mensajeActual ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
              ) : (
                <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-muted-foreground/20" />
              )}
              <span className="truncate">{m.texto.length > 45 ? m.texto.slice(0, 45) + "..." : m.texto}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // === SISTEMA ENCENDIDO: botón de apagar ===
  return (
    <>
      <button
        onClick={handleApagarClick}
        className="press flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-500 sm:h-9 sm:w-9"
        title="Apagar sistema"
      >
        <Power className="h-4 w-4" />
      </button>

      {/* Dialog de confirmación de apagado */}
      {showShutdownDialog && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card shadow-2xl anim-page-enter">
            {/* Icono */}
            <div className="flex justify-center pt-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
                <Lock className="h-6 w-6 text-red-500" />
              </div>
            </div>

            {/* Título */}
            <div className="px-6 pt-4 text-center">
              <h2 className="text-lg font-bold text-foreground">Apagar sistema</h2>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Introduce este código para confirmar:
              </p>
            </div>

            {/* Código */}
            <div className="flex justify-center px-6 pt-4">
              <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 px-5 py-2.5">
                <span className="font-mono text-xl font-bold tracking-[0.25em] text-primary">
                  {codigoEsperado}
                </span>
              </div>
            </div>

            {/* Input */}
            <div className="px-6 pt-4">
              <input
                type="text"
                value={codigoInput}
                onChange={(e) => {
                  setCodigoInput(e.target.value.toUpperCase());
                  setErrorCodigo(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmarApagado();
                }}
                placeholder="Código"
                maxLength={6}
                autoFocus
                className={cn(
                  "h-12 w-full rounded-xl border-2 bg-background px-4 text-center font-mono text-lg font-bold tracking-[0.25em] outline-none transition-all",
                  errorCodigo
                    ? "border-red-500 text-red-500"
                    : "border-border focus:border-primary"
                )}
              />
              {errorCodigo && (
                <p className="mt-1.5 text-center text-[11px] text-red-500">
                  Código incorrecto
                </p>
              )}
            </div>

            {/* Botones */}
            <div className="flex gap-2 p-6 pt-4">
              <button
                onClick={() => setShowShutdownDialog(false)}
                className="press flex-1 rounded-xl border border-border bg-card py-2.5 text-[13px] font-semibold text-muted-foreground transition-all hover:bg-accent active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarApagado}
                disabled={codigoInput.length < 6}
                className="press flex-1 rounded-xl bg-red-500 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-red-600 active:scale-95 disabled:opacity-40"
              >
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
