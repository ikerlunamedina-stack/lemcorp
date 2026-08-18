"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { Sidebar } from "@/components/lem/sidebar";
import { Topbar } from "@/components/lem/topbar";
import { DashboardView } from "@/components/lem/dashboard-view";
import { InventarioView } from "@/components/lem/inventario-sistema-view";
import { EquiposView } from "@/components/lem/equipos-view";
import { ConfigView } from "@/components/lem/config-view";
import { Footer } from "@/components/lem/footer";

export default function Home() {
  const hydrated = useStore((s) => s.hydrated);
  const seedDemoIfEmpty = useStore((s) => s.seedDemoIfEmpty);
  const activeView = useStore((s) => s.activeView);

  useEffect(() => {
    if (hydrated) {
      seedDemoIfEmpty();
    }
  }, [hydrated, seedDemoIfEmpty]);

  if (!hydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-muted border-t-primary anim-pulse-soft" />
          <span className="text-xs text-muted-foreground tracking-wide">
            Cargando LEMCORP…
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="relative flex-1 overflow-hidden">
          {activeView === "dashboard" && (
            <div className="h-full overflow-y-auto scroll-thin">
              <DashboardView />
            </div>
          )}
          {activeView === "inventario" && (
            <div className="h-full overflow-y-auto scroll-thin">
              <InventarioView />
            </div>
          )}
          {activeView === "equipos" && (
            <div className="h-full overflow-y-auto scroll-thin">
              <EquiposView />
            </div>
          )}
          {activeView === "config" && (
            <div className="h-full overflow-y-auto scroll-thin">
              <ConfigView />
            </div>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}
