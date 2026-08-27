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

// Nombres de voces de HOMBRE que debemos EVITAR
const vocesHombre = [
  "pablo", "jorge", "juan", "carlos", "diego", "miguel",
  "male", "homme", "man", "javier", "raul", "pedro",
  "Microsoft Pablo", "Microsoft Jorge", "Google español Male",
];

/** Verifica si una voz es de hombre (para evitarla) */
function esVozHombre(voice: SpeechSynthesisVoice): boolean {
  const nombre = voice.name.toLowerCase();
  return vocesHombre.some((h) => nombre.includes(h.toLowerCase()));
}

/** Busca la mejor voz de mujer en español disponible */
function buscarMejorVoz(voces: SpeechSynthesisVoice[], vozURI?: string): SpeechSynthesisVoice | null {
  if (voces.length === 0) return null;

  // 0. Si el usuario eligió una voz específica, usarla
  if (vozURI) {
    const vozSeleccionada = voces.find((v) => v.voiceURI === vozURI || v.name === vozURI);
    if (vozSeleccionada) return vozSeleccionada;
  }

  // Prioridad de voces de mujer en español (de mejor a peor)
  const prioridadVoces = [
    "Google español",
    "Microsoft Helena",
    "Microsoft Sabina",
    "Microsoft Paulina",
    "Microsoft Esperanza",
    "Microsoft Hilda",
    "Mónica",
    "Conchita",
    "Lucia",
    "Lupe",
    "Mujer",
    "Female",
    "Carmen",
    "Paulina",
    "Esperanza",
    "Francisca",
    "Sara",
    "Monica",
  ];

  // 1. Buscar por nombre exacto (prioridad), evitando voces de hombre
  for (const nombreVoz of prioridadVoces) {
    const voz = voces.find((v) =>
      v.name.toLowerCase().includes(nombreVoz.toLowerCase()) &&
      v.lang?.toLowerCase().startsWith("es") &&
      !esVozHombre(v)
    );
    if (voz) return voz;
  }

  // 2. Buscar cualquier voz de Google en español que NO sea de hombre
  const googleVoz = voces.find((v) =>
    v.name.toLowerCase().includes("google") &&
    v.lang?.toLowerCase().startsWith("es") &&
    !esVozHombre(v)
  );
  if (googleVoz) return googleVoz;

  // 3. Buscar cualquier voz de Microsoft en español que NO sea de hombre
  const msVoz = voces.find((v) =>
    v.name.toLowerCase().includes("microsoft") &&
    v.lang?.toLowerCase().startsWith("es") &&
    !esVozHombre(v)
  );
  if (msVoz) return msVoz;

  // 4. Cualquier voz en español que NO sea de hombre
  const esNoHombre = voces.find((v) =>
    v.lang?.toLowerCase().startsWith("es") &&
    !esVozHombre(v)
  );
  if (esNoHombre) return esNoHombre;

  // 5. Cualquier voz en español (último recurso)
  const es = voces.find((v) => v.lang?.toLowerCase().startsWith("es"));
  if (es) return es;

  return null;
}

/** Habla el texto usando la mejor voz de mujer en español del navegador. */
export function speak(text: string, opts?: { lang?: string; vozURI?: string }): void {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;

  const cleanText = limpiarTexto(text);
  if (!cleanText) return;

  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(cleanText);
  utter.lang = opts?.lang ?? "es-ES";
  utter.rate = 0.95;
  utter.pitch = 1.15;  // Tono más alto para sonar más femenino
  utter.volume = 1.0;

  cargarVoces().then((voces) => {
    const mejorVoz = buscarMejorVoz(voces, opts?.vozURI);
    if (mejorVoz) {
      utter.voice = mejorVoz;
      utter.lang = mejorVoz.lang;
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

/** Obtiene todas las voces en español disponibles */
export async function obtenerVocesEspanol(): Promise<SpeechSynthesisVoice[]> {
  const voces = await cargarVoces();
  return voces.filter((v) => v.lang?.toLowerCase().startsWith("es"));
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
