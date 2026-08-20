"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { Sidebar } from "@/components/lem/sidebar";
import { Topbar } from "@/components/lem/topbar";
import { Footer } from "@/components/lem/footer";
import { DashboardView } from "@/components/lem/dashboard-view";
import { InventarioView } from "@/components/lem/inventario-view";
import { EquiposView } from "@/components/lem/equipos-view";
import { SeriesView } from "@/components/lem/series-view";
import { IAView } from "@/components/lem/ia-view";
import { BlocView } from "@/components/lem/bloc-view";
import { EmpresaView } from "@/components/lem/empresa-view";
import { ConfigView } from "@/components/lem/config-view";

export default function Home() {
  const seedDemoIfEmpty = useStore((s) => s.seedDemoIfEmpty);
  const activeView = useStore((s) => s.activeView);

  useEffect(() => {
    seedDemoIfEmpty();
  }, [seedDemoIfEmpty]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="relative flex-1 overflow-hidden">
          <div key={activeView} className="h-full overflow-y-auto scroll-thin anim-fade-in">
            {activeView === "dashboard" && <DashboardView />}
            {activeView === "inventario" && <InventarioView />}
            {activeView === "equipos" && <EquiposView />}
            {activeView === "series" && <SeriesView />}
            {activeView === "ia" && <IAView />}
            {activeView === "bloc" && <BlocView />}
            {activeView === "empresa" && <EmpresaView />}
            {activeView === "config" && <ConfigView />}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
