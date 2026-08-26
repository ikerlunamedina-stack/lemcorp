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
  // Intentar con ElevenLabs primero
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
    // Si falla ElevenLabs, caer al fallback del navegador
  } catch {
    // Si falla la petición, usar el navegador
  }

  // Fallback: Web Speech API del navegador
  speakBrowser(text, opts);
}

/** Voz del navegador (fallback gratis) */
function speakBrowser(text: string, opts?: { lang?: string }): void {
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = opts?.lang ?? "es-ES";
    utter.rate = 1.0;
    utter.pitch = 1.0;
    utter.volume = 1.0;

    const voces = window.speechSynthesis.getVoices();
    const vozEs =
      voces.find((v) => v.lang?.toLowerCase().startsWith("es-es")) ||
      voces.find((v) => v.lang?.toLowerCase().startsWith("es-mx")) ||
      voces.find((v) => v.lang?.toLowerCase().startsWith("es"));
    if (vozEs) utter.voice = vozEs;

    window.speechSynthesis.speak(utter);
  } catch {
    /* noop */
  }
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
