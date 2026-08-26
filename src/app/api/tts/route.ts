// API route para TTS usando Google Translate TTS (gratis, sin API key)
// Devuelve audio MP3 con voz de mujer en español.
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { ok: false, error: "Falta el texto" },
        { status: 400 }
      );
    }

    // Limpiar texto (quitar emojis y markdown)
    const cleanText = text
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}]/gu, "")
      .replace(/\*+/g, "")
      .replace(/#+\s?/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) {
      return NextResponse.json(
        { ok: false, error: "Texto vacío después de limpiar" },
        { status: 400 }
      );
    }

    // Google Translate TTS tiene límite de ~200 caracteres por petición
    // Si el texto es más largo, lo dividimos y concatenamos
    const MAX_LEN = 200;
    const chunks: string[] = [];

    if (cleanText.length <= MAX_LEN) {
      chunks.push(cleanText);
    } else {
      // Dividir por frases (puntos) y luego por longitud si es necesario
      const sentences = cleanText.split(/(?<=[.!?])\s+/);
      let current = "";
      for (const sentence of sentences) {
        if ((current + " " + sentence).length > MAX_LEN) {
          if (current) chunks.push(current.trim());
          // Si la frase sola es muy larga, dividir por comas
          if (sentence.length > MAX_LEN) {
            const parts = sentence.split(/(?<=[,;])\s+/);
            let part = "";
            for (const p of parts) {
              if ((part + " " + p).length > MAX_LEN) {
                if (part) chunks.push(part.trim());
                part = p;
              } else {
                part = part ? part + " " + p : p;
              }
            }
            if (part) chunks.push(part.trim());
            current = "";
          } else {
            current = sentence;
          }
        } else {
          current = current ? current + " " + sentence : sentence;
        }
      }
      if (current) chunks.push(current.trim());
    }

    // Obtener audio de cada chunk
    const audioBuffers: Buffer[] = [];

    for (const chunk of chunks) {
      if (!chunk) continue;

      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=es&client=tw-ob&q=${encodeURIComponent(chunk)}`;

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "audio/mpeg, audio/*; q=0.9, */*; q=0.5",
          "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
          "Referer": "https://translate.google.com/",
        },
      });

      if (!response.ok) {
        console.error("Google TTS error:", response.status);
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      audioBuffers.push(buffer);
    }

    if (audioBuffers.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No se pudo generar el audio" },
        { status: 500 }
      );
    }

    // Si solo hay un chunk, devolverlo directamente
    if (audioBuffers.length === 1) {
      return new NextResponse(audioBuffers[0], {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "no-cache",
        },
      });
    }

    // Si hay múltiples chunks, concatenarlos
    // Los MP3 se pueden concatenar directamente (puede haber pequeños gaps)
    const totalLength = audioBuffers.reduce((sum, buf) => sum + buf.length, 0);
    const combined = Buffer.concat(audioBuffers, totalLength);

    return new NextResponse(combined, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("Error en TTS:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Error interno" },
      { status: 500 }
    );
  }
}
