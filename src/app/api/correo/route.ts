// API route /api/correo — Lee correos importantes via IMAP (Gmail u Outlook)
//
// Usa imapflow (Node.js IMAP client) para conectarse al correo del usuario
// y devolver los últimos correos no leídos o que coincidan con filtros.
//
// Variables de entorno requeridas en Vercel:
//   CORREO_EMAIL         — ejemplo: iker@outlook.com
//   CORREO_APP_PASSWORD  — app password (no tu contraseña normal)

import { NextRequest, NextResponse } from "next/server";
import { ImapFlow } from "imapflow";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

// Detectar IMAP host por dominio del email
function detectImapHost(email: string): { host: string; port: number; tls: boolean } {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return { host: "imap.gmail.com", port: 993, tls: true };
  }
  if (domain === "outlook.com" || domain === "hotmail.com" || domain === "live.com" || domain === "msn.com") {
    return { host: "outlook.office365.com", port: 993, tls: true };
  }
  if (domain.endsWith(".onmicrosoft.com") || domain === "office365.com") {
    return { host: "outlook.office365.com", port: 993, tls: true };
  }
  if (domain === "yahoo.com" || domain === "yahoo.es") {
    return { host: "imap.mail.yahoo.com", port: 993, tls: true };
  }
  return { host: "outlook.office365.com", port: 993, tls: true };
}

interface CorreoImportante {
  id: string;
  from: string;
  fromName: string;
  subject: string;
  date: number;
  snippet: string;
  esDevolucion: boolean;
  esUrgente: boolean;
  noLeido: boolean;
}

const FILTROS_DEVOLUCION = ["devolucion", "devolver", "retorno", "devolución"];
const FILTROS_URGENTE = ["urgente", "alerta", "importante", "crítico", "critico", "inmediato"];
const FILTROS_GUIA = ["guia", "guía", "remision", "remisión", "albaran", "albarán"];
const FILTROS_DEFAULT = [...FILTROS_DEVOLUCION, ...FILTROS_URGENTE, ...FILTROS_GUIA];

export async function GET(req: NextRequest) {
  try {
    const email = process.env.CORREO_EMAIL;
    const password = process.env.CORREO_APP_PASSWORD;

    if (!email || !password) {
      return NextResponse.json(
        {
          ok: false,
          error: "Faltan variables de entorno CORREO_EMAIL o CORREO_APP_PASSWORD.",
          configurado: false,
          instrucciones: "Ve a Vercel → Settings → Environment Variables → agrega CORREO_EMAIL y CORREO_APP_PASSWORD",
        },
        { status: 200 }
      );
    }

    const host = process.env.CORREO_IMAP_HOST || detectImapHost(email).host;
    const port = Number(process.env.CORREO_IMAP_PORT) || 993;
    const diasAtras = Number(process.env.CORREO_DIAS) || 7;
    const filtrosRaw = process.env.CORREO_FILTROS || FILTROS_DEFAULT.join(",");
    const filtros = filtrosRaw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

    // Conectar al servidor IMAP con timeout de 20s
    const client = new ImapFlow({
      host,
      port,
      secure: port === 993,
      auth: { user: email, pass: password },
      logger: false,
      socketTimeout: 20000, // 20s timeout para Vercel serverless
      emitLogs: false,
    });

    try {
      await client.connect();
    } catch (connErr: any) {
      // Error específico de conexión IMAP
      const errMsg = connErr?.message || "";
      let userMsg = "No se pudo conectar al servidor de correo.";

      if (errMsg.includes("authentication") || errMsg.includes("auth") || errMsg.includes("Invalid") || errMsg.includes("credentials")) {
        userMsg = "Credenciales incorrectas. Verifica que CORREO_APP_PASSWORD sea un 'app password' de 16 caracteres, NO tu contraseña normal.";
      } else if (errMsg.includes("timeout") || errMsg.includes("Timeout")) {
        userMsg = "Tiempo de conexión agotado. Vercel podría estar bloqueando el puerto IMAP 993. Intenta de nuevo en 30s.";
      } else if (errMsg.includes("ECONNREFUSED") || errMsg.includes("ENOTFOUND")) {
        userMsg = `No se pudo conectar a ${host}:${port}. Verifica que el servidor IMAP sea correcto.`;
      } else if (errMsg.includes("EACCES") || errMsg.includes("permission")) {
        userMsg = "Vercel bloquea conexiones IMAP. Considera usar Gmail API (OAuth) en lugar de IMAP.";
      }

      return NextResponse.json(
        {
          ok: false,
          configurado: true,
          email,
          host,
          error: userMsg,
          errorTecnico: errMsg,
        },
        { status: 200 }
      );
    }

    const lock = await client.getMailboxLock("INBOX");
    const correos: CorreoImportante[] = [];

    try {
      const desde = new Date();
      desde.setDate(desde.getDate() - diasAtras);
      const uids = await client.search({ since: desde }, { uid: true });

      if (uids && uids.length > 0) {
        const uidsToFetch = uids.slice(-50).reverse();

        const messages = await client.fetch(
          uidsToFetch,
          { uid: true, flags: true, envelope: true, bodyStructure: true },
          { uid: true }
        );

        for await (const msg of messages) {
          if (!msg.envelope) continue;

          const subject = (msg.envelope.subject || "(sin asunto)").trim();
          const fromAddr = msg.envelope.from?.[0]?.address ?? "";
          const fromName = msg.envelope.from?.[0]?.name || fromAddr;
          const date = msg.envelope.date ? new Date(msg.envelope.date).getTime() : Date.now();
          const noLeido = !(msg.flags?.has("\\Seen"));

          const subjectLower = subject.toLowerCase();
          const esDevolucion = FILTROS_DEVOLUCION.some((f) => subjectLower.includes(f));
          const esUrgente = FILTROS_URGENTE.some((f) => subjectLower.includes(f));
          const esGuia = FILTROS_GUIA.some((f) => subjectLower.includes(f));
          const coincideFiltro = filtros.length === 0 || filtros.some((f) => subjectLower.includes(f));

          const incluir = (noLeido && coincideFiltro) || esDevolucion || esUrgente || esGuia;
          if (!incluir) continue;

          correos.push({
            id: String(msg.uid),
            from: fromAddr,
            fromName,
            subject,
            date,
            snippet: "",
            esDevolucion,
            esUrgente,
            noLeido,
          });
        }
      }
    } finally {
      lock.release();
    }

    try { await client.logout(); } catch {}

    correos.sort((a, b) => b.date - a.date);

    return NextResponse.json({
      ok: true,
      configurado: true,
      email,
      host,
      total: correos.length,
      devoluciones: correos.filter((c) => c.esDevolucion).length,
      urgentes: correos.filter((c) => c.esUrgente).length,
      noLeidos: correos.filter((c) => c.noLeido).length,
      correos: correos.slice(0, 20),
    });
  } catch (error: any) {
    console.error("Error en /api/correo:", error?.message);
    return NextResponse.json(
      {
        ok: false,
        configurado: !!process.env.CORREO_EMAIL && !!process.env.CORREO_APP_PASSWORD,
        error: error?.message || "Error al conectar con el correo.",
      },
      { status: 200 }
    );
  }
}
