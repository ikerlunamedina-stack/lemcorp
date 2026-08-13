"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { Bell, BellOff } from "lucide-react";
import { useStore } from "@/lib/store";
import { computeNotifications } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export function NotificationBell() {
  const files = useStore((s) => s.files);
  const products = useStore((s) => s.products);
  const settings = useStore((s) => s.settings);
  const seenKeys = useStore((s) => s.seenNotificationKeys);
  const markSeen = useStore((s) => s.markNotificationsSeen);
  const setActiveView = useStore((s) => s.setActiveView);
  const openFile = useStore((s) => s.openFile);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const ref = useRef<HTMLDivElement>(null);

  const notifications = useMemo(
    () => computeNotifications(files, products, settings),
    [files, products, settings]
  );

  const seenSet = useMemo(() => new Set(seenKeys), [seenKeys]);
  const unread = notifications.filter((n) => !seenSet.has(n.key));

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // marcar como vistas al abrir
  useEffect(() => {
    if (open && notifications.length > 0) {
      const t = setTimeout(() => {
        markSeen(notifications.map((n) => n.key));
      }, 400);
      return () => clearTimeout(t);
    }
  }, [open, notifications, markSeen]);

  const handleAction = (n: (typeof notifications)[number]) => {
    setOpen(false);
    if (n.view === "editor") {
      // intentar abrir el archivo relacionado (para bajo stock / mismatches)
      const m = n.key.match(/^low:([^:]+):(\d+)$/) || n.key.match(/^mismatch:([^:]+):/);
      if (m) {
        openFile(m[1]);
        toast({ title: "Abriendo archivo" });
        return;
      }
    }
    if (n.view) setActiveView(n.view);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="press relative flex h-9 w-9 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-accent"
        title="Notificaciones"
        aria-label={`Notificaciones${unread.length > 0 ? ` · ${unread.length} sin leer` : ""}`}
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
        {unread.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-bold text-background anim-scale-in">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="anim-scale-in absolute right-0 top-11 z-50 w-[360px] overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
          {/* Cabecera */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="text-[13px] font-semibold">Notificaciones</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {notifications.length} en total
            </span>
          </div>

          {/* Lista */}
          <div className="max-h-[420px] overflow-y-auto scroll-thin">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <BellOff className="h-6 w-6 text-muted-foreground" />
                <p className="text-[12px] text-muted-foreground">
                  No hay notificaciones. Todo en orden.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col">
                {notifications.map((n) => {
                  const isUnread = !seenSet.has(n.key);
                  return (
                    <li key={n.key}>
                      <button
                        onClick={() => handleAction(n)}
                        className={cn(
                          "flex w-full items-start gap-2.5 border-b border-border/60 px-4 py-3 text-left transition-colors last:border-0 hover:bg-accent/50",
                          isUnread && "bg-accent/30"
                        )}
                      >
                        <span className="emoji mt-0.5 text-base leading-none">
                          {n.emoji}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-semibold leading-snug">
                            {n.title}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                            {n.description}
                          </p>
                        </div>
                        {isUnread && (
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Pie */}
          <div className="border-t border-border px-4 py-2.5">
            <button
              onClick={() => {
                setActiveView("config");
                setOpen(false);
              }}
              className="press text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              Administrar notificaciones en Configuración
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
