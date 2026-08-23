// Multi-device sync helper for LEMCORP WMS.
// Stores data in localStorage (Zustand persist) and mirrors it to the server
// (Prisma + SQLite) so the same device-id shows the same data everywhere.
//
// The device id is generated once and stored in localStorage. The same id is
// used on every device the user logs in from — they share data across devices.
// To keep things simple, we use ONE shared device id ("lemcorp-shared") by
// default so the same inventory shows on every browser. The user can still
// override this by setting their own deviceId in localStorage.

const DEVICE_ID_KEY = "lemcorp-device-id";
// Fixed shared device id — every browser reads & writes to the same row,
// so all devices see the same data (matches the user's mental model:
// "one warehouse, many devices").
const SHARED_DEVICE_ID = "lemcorp-shared";

export function getDeviceId(): string {
  if (typeof window === "undefined") return SHARED_DEVICE_ID;
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing && existing.trim()) return existing;
    // Use the shared id by default — this makes data sync across devices.
    localStorage.setItem(DEVICE_ID_KEY, SHARED_DEVICE_ID);
    return SHARED_DEVICE_ID;
  } catch {
    return SHARED_DEVICE_ID;
  }
}

export interface SyncPayload {
  products: unknown[];
  equipos: unknown[];
  entradas: unknown[];
  despachos: unknown[];
  notas: unknown[];
  recordatorios: unknown[];
  notificaciones: unknown[];
  miembros: unknown[];
  empresa: unknown;
  settings: unknown;
  pistoleoFilas?: unknown[];
  pistoleoCampo?: unknown;
  pistoleoModelo?: unknown;
  pistoleoEstado?: unknown;
  horario?: unknown[];
  memoriaIA?: unknown[];
  bajoStockVisto?: number;
  activeView?: unknown;
  __syncedAt?: number;
}

export interface PullResult {
  ok: boolean;
  payload: SyncPayload | null;
  updatedAt: string | null;
  error?: string;
}

export async function pullFromServer(deviceId: string): Promise<PullResult> {
  try {
    const res = await fetch(`/api/sync?deviceId=${encodeURIComponent(deviceId)}`, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return { ok: false, payload: null, updatedAt: null, error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    return {
      ok: !!data.ok,
      payload: data.payload ?? null,
      updatedAt: data.updatedAt ?? null,
    };
  } catch (err: any) {
    return { ok: false, payload: null, updatedAt: null, error: err?.message || "network" };
  }
}

export interface PushResult {
  ok: boolean;
  updatedAt?: string;
  bytes?: number;
  error?: string;
}

export async function pushToServer(
  deviceId: string,
  payload: SyncPayload,
  label?: string
): Promise<PushResult> {
  try {
    const res = await fetch(`/api/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ deviceId, payload, label }),
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    return {
      ok: !!data.ok,
      updatedAt: data.updatedAt,
      bytes: data.bytes,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || "network" };
  }
}
