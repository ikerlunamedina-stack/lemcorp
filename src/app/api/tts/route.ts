// API route para TTS con ElevenLabs
// Recibe texto, devuelve audio MP3 usando la voz configurada de ElevenLabs.
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "2Lb1en5ujrODDIqmp7F3";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { ok: false, error: "Falta el texto" },
        { status: 400 }
      );
    }

    // Si no hay API key de ElevenLabs, devolver error
    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "ELEVENLABS_API_KEY no configurada" },
        { status: 500 }
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

    // Llamar a ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs error:", response.status, errText);
      return NextResponse.json(
        { ok: false, error: `ElevenLabs API error: ${response.status}` },
        { status: response.status }
      );
    }

    // Devolver el audio como MP3
    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
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
