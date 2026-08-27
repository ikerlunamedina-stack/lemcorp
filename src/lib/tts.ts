// TTS (text-to-speech) helper.
// Usa SOLO la voz del navegador (gratis, sin APIs externas, sin límites).
// Busca automáticamente las mejores voces de mujer en español.

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
    // Esperar a que carguen (puede tardar en algunos navegadores)
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

/** Busca la mejor voz de mujer en español disponible */
function buscarMejorVoz(voces: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voces.length === 0) return null;

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
    // Microsoft Esperanza (mujer)
    "Microsoft Esperanza",
    // Microsoft Hilda (mujer)
    "Microsoft Hilda",
    // Voces de Amazon (mujer)
    "Mónica",
    "Conchita",
    "Lucia",
    "Lupe",
    // Nombres genéricos de voces de mujer
    "Mujer",
    "Female",
    "Carmen",
    "Paulina",
    "Esperanza",
    "Francisca",
    "Sara",
    "Monica",
  ];

  // 1. Buscar por nombre exacto (prioridad)
  for (const nombreVoz of prioridadVoces) {
    const voz = voces.find((v) =>
      v.name.toLowerCase().includes(nombreVoz.toLowerCase()) &&
      v.lang?.toLowerCase().startsWith("es")
    );
    if (voz) return voz;
  }

  // 2. Buscar cualquier voz de Google en español
  const googleVoz = voces.find((v) =>
    v.name.toLowerCase().includes("google") &&
    v.lang?.toLowerCase().startsWith("es")
  );
  if (googleVoz) return googleVoz;

  // 3. Buscar cualquier voz de Microsoft en español
  const msVoz = voces.find((v) =>
    v.name.toLowerCase().includes("microsoft") &&
    v.lang?.toLowerCase().startsWith("es")
  );
  if (msVoz) return msVoz;

  // 4. Cualquier voz en español de España
  const esEs = voces.find((v) => v.lang?.toLowerCase().startsWith("es-es"));
  if (esEs) return esEs;

  // 5. Cualquier voz en español mexicano
  const esMx = voces.find((v) => v.lang?.toLowerCase().startsWith("es-mx"));
  if (esMx) return esMx;

  // 6. Cualquier voz en español
  const es = voces.find((v) => v.lang?.toLowerCase().startsWith("es"));
  if (es) return es;

  return null;
}

/** Habla el texto usando la mejor voz de mujer en español del navegador. */
export function speak(text: string, opts?: { lang?: string }): void {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;

  const cleanText = limpiarTexto(text);
  if (!cleanText) return;

  // Cancelar cualquier voz en curso
  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(cleanText);
  utter.lang = opts?.lang ?? "es-ES";
  utter.rate = 0.95;  // Un poco más lento para que suene más natural
  utter.pitch = 1.1;  // Tono un poco más alto para que suene femenino
  utter.volume = 1.0;

  // Buscar la mejor voz (asíncrono, pero no bloquea)
  cargarVoces().then((voces) => {
    const mejorVoz = buscarMejorVoz(voces);
    if (mejorVoz) {
      utter.voice = mejorVoz;
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
