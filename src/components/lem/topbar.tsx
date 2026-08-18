"use client";

import {
  LayoutDashboard,
  Boxes,
  Cpu,
  Settings as SettingsIcon,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { NotificationBell } from "./notification-bell";

export function Topbar() {
  const activeView = useStore((s) => s.activeView);

  const viewMeta =
    activeView === "dashboard"
      ? { icon: <LayoutDashboard className="h-4 w-4" />, title: "Dashboard" }
      : activeView === "inventario"
      ? { icon: <Boxes className="h-4 w-4" />, title: "Inventario" }
      : activeView === "equipos"
      ? { icon: <Cpu className="h-4 w-4" />, title: "Equipos" }
      : { icon: <SettingsIcon className="h-4 w-4" />, title: "Configuración" };

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/70 backdrop-blur-xl px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="text-muted-foreground">{viewMeta.icon}</span>
        <h1 className="truncate text-[15px] font-semibold tracking-tight">
          {viewMeta.title}
        </h1>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="mx-1 h-6 w-px bg-border" />
        <NotificationBell />
      </div>
    </header>
  );
}
