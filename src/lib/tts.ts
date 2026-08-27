// TTS (text-to-speech) helper.
// Usa SOLO la voz del navegador (gratis, sin APIs externas, sin límites).
// Voz predeterminada: Google español de Estados Unidos (es-US) — voz de mujer.

function limpiarTexto(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}]/gu, "")
    .replace(/\*+/g, "")
    .replace(/#+\s?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Cache de voces cargadas
let vocesCargadas: SpeechSynthesisVoice[] | null = null;

/** Carga las voces del navegador (con retry si no están listas) */
async function cargarVoces(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];

  if (vocesCargadas && vocesCargadas.length > 0) return vocesCargadas;

  let voces = window.speechSynthesis.getVoices();

  if (voces.length === 0) {
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 1000);
      window.speechSynthesis.onvoiceschanged = () => {
        clearTimeout(timeout);
        resolve();
      };
    });
    voces = window.speechSynthesis.getVoices();
  }

  vocesCargadas = voces;
  return voces;
}

/** Busca la voz de Google español de Estados Unidos (es-US) — voz de mujer */
function buscarVozAlana(voces: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voces.length === 0) return null;

  // 1. Buscar "Google español de Estados Unidos" (es-US) — la voz que queremos
  const googleEsUS = voces.find((v) =>
    v.name.toLowerCase().includes("google") &&
    v.lang?.toLowerCase() === "es-us"
  );
  if (googleEsUS) return googleEsUS;

  // 2. Buscar cualquier voz de Google con es-US
  const googleEsUS2 = voces.find((v) =>
    v.name.toLowerCase().includes("google") &&
    v.lang?.toLowerCase().startsWith("es-us")
  );
  if (googleEsUS2) return googleEsUS2;

  // 3. Buscar cualquier voz con es-US
  const esUS = voces.find((v) => v.lang?.toLowerCase() === "es-us");
  if (esUS) return esUS;

  // 4. Fallback: Google español (cualquier variante)
  const googleEs = voces.find((v) =>
    v.name.toLowerCase().includes("google") &&
    v.lang?.toLowerCase().startsWith("es")
  );
  if (googleEs) return googleEs;

  // 5. Último recurso: cualquier voz en español
  const es = voces.find((v) => v.lang?.toLowerCase().startsWith("es"));
  if (es) return es;

  return null;
}

/** Habla el texto usando Google español de Estados Unidos (voz de mujer). */
export function speak(text: string, opts?: { lang?: string }): void {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;

  const cleanText = limpiarTexto(text);
  if (!cleanText) return;

  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(cleanText);
  utter.lang = "es-US";  // Español de Estados Unidos
  utter.rate = 0.95;
  utter.pitch = 1.1;
  utter.volume = 1.0;

  cargarVoces().then((voces) => {
    const voz = buscarVozAlana(voces);
    if (voz) {
      utter.voice = voz;
      utter.lang = voz.lang;
    }
    window.speechSynthesis.speak(utter);
  });

  // Fallback: si las voces tardan mucho, hablar igualmente después de 200ms
  setTimeout(() => {
    if (!window.speechSynthesis.speaking) {
      window.speechSynthesis.speak(utter);
    }
  }, 200);
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

/** Indica si TTS está disponible. */
export function ttsDisponible(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
