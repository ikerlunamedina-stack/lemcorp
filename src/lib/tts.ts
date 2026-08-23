// TTS (text-to-speech) helper using the Web Speech API.
// Browser-only. Safe to import from client components.

function limpiarTexto(text: string): string {
  // Quitar emojis y caracteres especiales comunes que la voz no lee bien
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}]/gu, "")
    .replace(/\*+/g, "")
    .replace(/#+\s?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Habla el texto en español usando la Web Speech API.
 * Corta cualquier voz en curso antes de empezar.
 */
export function speak(text: string, opts?: { lang?: string }): void {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(limpiarTexto(text));
    utter.lang = opts?.lang ?? "es-ES";
    utter.rate = 1.0;
    utter.pitch = 1.0;
    utter.volume = 1.0;

    // Intentar usar una voz en español si está disponible
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
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* noop */
  }
}

/** Indica si la Web Speech API está disponible en este navegador. */
export function ttsDisponible(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
