// API route /api/sync — multi-device data sync for LEMCORP WMS
// Stores the entire Zustand store state as a JSON blob keyed by deviceId.
//
// - GET  /api/sync?deviceId=xxx       → returns the latest snapshot for that device
// - POST /api/sync { deviceId, payload, label? } → upserts the snapshot
//
// All requests use relative paths (the gateway adds X-TransformPort automatically when needed).

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

interface SyncPayload {
  products?: unknown[];
  equipos?: unknown[];
  entradas?: unknown[];
  despachos?: unknown[];
  notas?: unknown[];
  recordatorios?: unknown[];
  notificaciones?: unknown[];
  miembros?: unknown[];
  empresa?: unknown;
  settings?: unknown;
  pistoleoFilas?: unknown[];
  pistoleoCampo?: unknown;
  pistoleoModelo?: unknown;
  pistoleoEstado?: unknown;
  activeView?: unknown;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const deviceId = url.searchParams.get("deviceId");
    if (!deviceId) {
      return NextResponse.json(
        { ok: false, error: "Falta el parámetro deviceId" },
        { status: 400 }
      );
    }

    const snapshot = await db.deviceSnapshot.findUnique({
      where: { deviceId },
    });

    if (!snapshot) {
      return NextResponse.json({ ok: true, payload: null, updatedAt: null });
    }

    let payload: SyncPayload | null = null;
    try {
      payload = JSON.parse(snapshot.payload) as SyncPayload;
    } catch {
      payload = null;
    }

    return NextResponse.json({
      ok: true,
      payload,
      updatedAt: snapshot.updatedAt,
    });
  } catch (error: any) {
    console.error("Error en GET /api/sync:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Error interno" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deviceId, payload, label } = body ?? {};

    if (!deviceId || typeof deviceId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Falta deviceId" },
        { status: 400 }
      );
    }
    if (!payload || typeof payload !== "object") {
      return NextResponse.json(
        { ok: false, error: "Falta payload" },
        { status: 400 }
      );
    }

    const serialized = JSON.stringify(payload);
    const bytes = Buffer.byteLength(serialized, "utf8");

    // Upsert the snapshot for this device
    const snapshot = await db.deviceSnapshot.upsert({
      where: { deviceId },
      create: {
        deviceId,
        label: typeof label === "string" ? label : null,
        payload: serialized,
      },
      update: {
        label: typeof label === "string" ? label : undefined,
        payload: serialized,
      },
    });

    try {
      await db.syncLog.create({
        data: { deviceId, action: "push", bytes },
      });
    } catch {
      // best-effort log, ignore errors
    }

    return NextResponse.json({
      ok: true,
      updatedAt: snapshot.updatedAt,
      bytes,
    });
  } catch (error: any) {
    console.error("Error en POST /api/sync:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Error interno" },
      { status: 500 }
    );
  }
}
