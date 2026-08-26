// TTS (text-to-speech) helper.
// Prioriza ElevenLabs (voz premium). Si no hay API key, usa Web Speech API del navegador.

function limpiarTexto(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}]/gu, "")
    .replace(/\*+/g, "")
    .replace(/#+\s?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Cache de audios para no repetir peticiones
const audioCache = new Map<string, HTMLAudioElement>();

/** Habla el texto. Usa ElevenLabs si hay API key, sino usa Web Speech API. */
export function speak(text: string, opts?: { lang?: string }): void {
  if (typeof window === "undefined") return;

  const cleanText = limpiarTexto(text);
  if (!cleanText) return;

  // Ejecutar async sin bloquear
  speakAsync(cleanText, opts).catch(() => {
    // Si todo falla, usar el navegador
    speakBrowser(cleanText, opts);
  });
}

/** Implementación async interna */
async function speakAsync(text: string, opts?: { lang?: string }): Promise<void> {
  // Intentar con /api/tts (Google Translate, voz de mujer) primero
  try {
    const cached = audioCache.get(text);
    if (cached) {
      if (!cached.paused) {
        window.speechSynthesis?.cancel();
      }
      cached.currentTime = 0;
      await cached.play();
      return;
    }

    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioCache.set(text, audio);

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      await audio.play();
      return;
    }
    // Si falla /api/tts, caer al navegador
  } catch {
    // Si falla la petición, usar el navegador
  }

  // Fallback: Web Speech API del navegador con voces premium
  speakBrowser(text, opts);
}

/** Voz del navegador (fallback gratis) — busca las mejores voces de mujer en español */
function speakBrowser(text: string, opts?: { lang?: string }): void {
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();

    // Cargar voces si no están cargadas aún
    let voces = window.speechSynthesis.getVoices();

    // Si no hay voces, esperar a que carguen
    if (voces.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        voces = window.speechSynthesis.getVoices();
        hablarConVoz(text, voces, opts);
      };
      // Intentar de todas formas después de 100ms
      setTimeout(() => {
        voces = window.speechSynthesis.getVoices();
        hablarConVoz(text, voces, opts);
      }, 100);
    } else {
      hablarConVoz(text, voces, opts);
    }
  } catch {
    /* noop */
  }
}

/** Busca y usa la mejor voz de mujer en español disponible */
function hablarConVoz(text: string, voces: SpeechSynthesisVoice[], opts?: { lang?: string }): void {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = opts?.lang ?? "es-ES";
  utter.rate = 0.95;  // Un poco más lento para que suene más natural
  utter.pitch = 1.1;  // Tono un poco más alto para que suene femenino
  utter.volume = 1.0;

  // Prioridad de voces de mujer en español (de mejor a peor)
  const prioridadVoces = [
    // Google español (mujer, suena natural)
    "Google español",
    // Microsoft Helena (mujer española)
    "Microsoft Helena",
    // Microsoft Sabina (mujer mexicana)
    "Microsoft Sabina",
    // Microsoft Paulina (mujer)
    "Microsoft Paulina",
    // Voces de Amazon (mujer)
    "Mónica",
    "Conchita",
    "Lucia",
    "Lupe",
    // Cualquier voz de mujer que empiece con estos nombres
    "Mujer",
    "Female",
    "Mónica",
    "Paulina",
    "Carmen",
    "Esperanza",
  ];

  let vozSeleccionada: SpeechSynthesisVoice | null = null;

  // 1. Buscar por nombre exacto (prioridad)
  for (const nombreVoz of prioridadVoces) {
    vozSeleccionada = voces.find((v) =>
      v.name.toLowerCase().includes(nombreVoz.toLowerCase()) &&
      v.lang?.toLowerCase().startsWith("es")
    ) || null;
    if (vozSeleccionada) break;
  }

  // 2. Si no encuentra, buscar cualquier voz de Google en español
  if (!vozSeleccionada) {
    vozSeleccionada = voces.find((v) =>
      v.name.toLowerCase().includes("google") &&
      v.lang?.toLowerCase().startsWith("es")
    ) || null;
  }

  // 3. Si no, buscar cualquier voz de Microsoft en español
  if (!vozSeleccionada) {
    vozSeleccionada = voces.find((v) =>
      v.name.toLowerCase().includes("microsoft") &&
      v.lang?.toLowerCase().startsWith("es")
    ) || null;
  }

  // 4. Si no, cualquier voz en español de España
  if (!vozSeleccionada) {
    vozSeleccionada = voces.find((v) => v.lang?.toLowerCase().startsWith("es-es")) || null;
  }

  // 5. Si no, cualquier voz en español mexicano
  if (!vozSeleccionada) {
    vozSeleccionada = voces.find((v) => v.lang?.toLowerCase().startsWith("es-mx")) || null;
  }

  // 6. Si no, cualquier voz en español
  if (!vozSeleccionada) {
    vozSeleccionada = voces.find((v) => v.lang?.toLowerCase().startsWith("es")) || null;
  }

  if (vozSeleccionada) {
    utter.voice = vozSeleccionada;
  }

  window.speechSynthesis.speak(utter);
}

/** Detiene cualquier voz en curso. */
export function stopSpeaking(): void {
  if (typeof window === "undefined") return;
  // Detener audios de ElevenLabs
  audioCache.forEach((audio) => {
    try { audio.pause(); } catch { /* noop */ }
  });
  // Detener Web Speech API
  if ("speechSynthesis" in window) {
    try { window.speechSynthesis.cancel(); } catch { /* noop */ }
  }
}

/** Indica si TTS está disponible (siempre true si hay navegador). */
export function ttsDisponible(): boolean {
  return typeof window !== "undefined";
}
