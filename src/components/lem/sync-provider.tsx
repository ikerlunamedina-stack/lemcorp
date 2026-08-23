"use client";

// SyncProvider — connects the Zustand store to the server so data is shared
// across all devices with the same device id.
//
// Strategy:
//   1. On mount, after the store has hydrated from localStorage, fetch the
//      latest snapshot from /api/sync and merge it in if it's newer than
//      what we have locally.
//   2. Subscribe to store changes and push a debounced snapshot to the server
//      every ~900ms after the last change.

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import {
  getDeviceId,
  pullFromServer,
  pushToServer,
  type SyncPayload,
} from "@/lib/sync";
import { CloudCheck, CloudOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type SyncStatus = "idle" | "pushing" | "synced" | "error";

const DEBOUNCE_MS = 900;
const PERIODIC_PULL_MS = 30_000; // pull every 30s for cross-device updates

function buildPayload(state: any): SyncPayload {
  return {
    products: state.products ?? [],
    equipos: state.equipos ?? [],
    entradas: state.entradas ?? [],
    despachos: state.despachos ?? [],
    notas: state.notas ?? [],
    recordatorios: state.recordatorios ?? [],
    notificaciones: state.notificaciones ?? [],
    miembros: state.miembros ?? [],
    empresa: state.empresa ?? {},
    settings: state.settings ?? {},
    pistoleoFilas: state.pistoleoFilas ?? [],
    pistoleoCampo: state.pistoleoCampo,
    pistoleoModelo: state.pistoleoModelo,
    pistoleoEstado: state.pistoleoEstado,
    horario: state.horario ?? [],
    memoriaIA: state.memoriaIA ?? [],
    activeView: state.activeView,
    __syncedAt: Date.now(),
  };
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastSync, setLastSync] = useState<number | null>(null);
  // ready=true means initial pull has completed and we can start subscribing.
  const [ready, setReady] = useState(false);
  const deviceIdRef = useRef<string>("");
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isApplyingRemote = useRef(false);

  // Initial pull + periodic pull
  useEffect(() => {
    const deviceId = getDeviceId();
    deviceIdRef.current = deviceId;

    const doPull = async () => {
      const result = await pullFromServer(deviceId);
      if (!result.ok) {
        setStatus("error");
        setReady(true);
        return;
      }
      if (result.payload) {
        const serverPayload = result.payload as any;
        const serverSyncedAt = Number(serverPayload.__syncedAt) || 0;
        const localSyncedAt = Number(localStorage.getItem("nuclon-synced-at")) || 0;
        // Apply server data if it's newer than what we have locally
        if (serverSyncedAt > localSyncedAt) {
          isApplyingRemote.current = true;
          try {
            const cur = useStore.getState();
            useStore.setState({
              products: serverPayload.products ?? [],
              equipos: serverPayload.equipos ?? [],
              entradas: serverPayload.entradas ?? [],
              despachos: serverPayload.despachos ?? [],
              notas: serverPayload.notas ?? [],
              recordatorios: serverPayload.recordatorios ?? [],
              notificaciones: serverPayload.notificaciones ?? [],
              miembros: serverPayload.miembros ?? [],
              empresa: serverPayload.empresa ?? cur.empresa,
              settings: serverPayload.settings
                ? { ...cur.settings, ...serverPayload.settings }
                : cur.settings,
              pistoleoFilas: serverPayload.pistoleoFilas ?? [],
              horario: serverPayload.horario ?? [],
              memoriaIA: serverPayload.memoriaIA ?? [],
            });
            localStorage.setItem("nuclon-synced-at", String(serverSyncedAt));
            setLastSync(Date.now());
          } finally {
            isApplyingRemote.current = false;
          }
        }
      }
      setStatus("synced");
      setReady(true);
    };

    doPull();

    const interval = setInterval(doPull, PERIODIC_PULL_MS);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to changes → debounced push (only after the first pull)
  useEffect(() => {
    if (!ready) return;
    const unsub = useStore.subscribe((state, prev) => {
      if (isApplyingRemote.current) return;
      // Quick equality check on top-level arrays to skip no-op updates
      // (prevents infinite push loops from re-renders).
      if (
        state.products === prev.products &&
        state.equipos === prev.equipos &&
        state.entradas === prev.entradas &&
        state.despachos === prev.despachos &&
        state.notas === prev.notas &&
        state.recordatorios === prev.recordatorios &&
        state.notificaciones === prev.notificaciones &&
        state.miembros === prev.miembros &&
        state.empresa === prev.empresa &&
        state.settings === prev.settings &&
        state.horario === prev.horario &&
        state.memoriaIA === prev.memoriaIA
      ) {
        return;
      }
      schedulePush();
    });
    return unsub;
  }, [ready]);

  const schedulePush = () => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    setStatus("pushing");
    pushTimer.current = setTimeout(async () => {
      const state = useStore.getState();
      const payload = buildPayload(state);
      const ts = payload.__syncedAt || Date.now();
      const result = await pushToServer(deviceIdRef.current, payload);
      if (result.ok) {
        localStorage.setItem("nuclon-synced-at", String(ts));
        setLastSync(Date.now());
        setStatus("synced");
      } else {
        setStatus("error");
      }
    }, DEBOUNCE_MS);
  };

  return (
    <>
      {children}
      <SyncIndicator status={status} lastSync={lastSync} />
    </>
  );
}

function SyncIndicator({ status, lastSync }: { status: SyncStatus; lastSync: number | null }) {
  if (status === "idle") return null;
  const Icon =
    status === "synced" ? CloudCheck : status === "error" ? CloudOff : RefreshCw;
  const color =
    status === "synced"
      ? "text-emerald-500"
      : status === "error"
      ? "text-rose-500"
      : "text-muted-foreground";
  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-12 left-2 z-30 flex items-center gap-1 rounded-full border border-border bg-card/85 px-2 py-0.5 text-[9px] font-medium shadow-sm backdrop-blur",
        color
      )}
      aria-hidden
      title={
        lastSync
          ? `Sincronizado: ${new Date(lastSync).toLocaleTimeString("es-PE")}`
          : "Sincronizando…"
      }
    >
      <Icon className={cn("h-3 w-3", status === "pushing" && "animate-spin")} />
      <span className="hidden sm:inline">
        {status === "synced" && lastSync
          ? `Sync ${new Date(lastSync).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}`
          : status === "pushing"
          ? "Sync…"
          : status === "error"
          ? "Sync error"
          : ""}
      </span>
    </div>
  );
}
