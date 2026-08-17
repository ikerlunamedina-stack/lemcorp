"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { Sidebar } from "@/components/lem/sidebar";
import { Topbar } from "@/components/lem/topbar";
import { SpreadsheetView } from "@/components/lem/spreadsheet";
import { SummaryView } from "@/components/lem/summary-view";
import { EquipmentView } from "@/components/lem/equipment-view";
import { InventarioView } from "@/components/lem/inventario-view";
import { DespachosDiaView } from "@/components/lem/despachos-dia-view";
import { SeriesView } from "@/components/lem/series-view";
import { ConfigView } from "@/components/lem/config-view";
import { Footer } from "@/components/lem/footer";
import { WelcomeOverlay } from "@/components/lem/welcome";

export default function Home() {
  const hydrated = useStore((s) => s.hydrated);
  const seedFromUserExcel = useStore((s) => s.seedFromUserExcel);
  const activeView = useStore((s) => s.activeView);

  useEffect(() => {
    if (hydrated) {
      // Carga el Excel real del usuario (stock HUB ALTAS - LIMA NORTE)
      // precargado en /public/stock-lemcorp-inicial.xlsx. Si ya hay datos,
      // no hace nada. Si falla, cae al seed demo.
      seedFromUserExcel();
    }
  }, [hydrated, seedFromUserExcel]);

  if (!hydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-muted border-t-foreground anim-pulse-soft" />
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
          {activeView === "editor" && <SpreadsheetView />}
          {activeView === "resumen" && (
            <div className="h-full overflow-y-auto scroll-thin">
              <SummaryView />
            </div>
          )}
          {activeView === "inventario" && (
            <div className="h-full overflow-y-auto scroll-thin">
              <InventarioView />
            </div>
          )}
          {activeView === "despachosdia" && (
            <div className="h-full overflow-y-auto scroll-thin">
              <DespachosDiaView />
            </div>
          )}
          {activeView === "equipos" && (
            <div className="h-full overflow-y-auto scroll-thin">
              <EquipmentView />
            </div>
          )}
          {activeView === "series" && (
            <div className="h-full overflow-y-auto scroll-thin">
              <SeriesView />
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
      <WelcomeOverlay />
    </div>
  );
}
