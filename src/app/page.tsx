"use client";

import { useStore } from "@/lib/store";
import { Navbar } from "@/components/lem/navbar";
import { SubHeader } from "@/components/lem/sub-header";
import { Footer } from "@/components/lem/footer";
import { DashboardView } from "@/components/lem/dashboard-view";
import { InventarioView } from "@/components/lem/inventario-view";
import { DespachosView } from "@/components/lem/despachos-view";
import { EquiposView } from "@/components/lem/equipos-view";
import { SeriesView } from "@/components/lem/series-view";
import { PistolearView } from "@/components/lem/pistolear-view";
import { IAView } from "@/components/lem/ia-view";
import { BlocView } from "@/components/lem/bloc-view";
import { EmpresaView } from "@/components/lem/empresa-view";
import { ConfigView } from "@/components/lem/config-view";
import { NotificationStack } from "@/components/lem/notification-stack";

export default function Home() {
  const activeView = useStore((s) => s.activeView);

  // La vista de IA tiene su propio layout (tipo ChatGPT), sin scroll de página
  const isChatView = activeView === "ia";

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Navbar />
      {!isChatView && <SubHeader />}
      <main className="relative flex-1 overflow-auto scroll-thin">
        {isChatView ? (
          <IAView />
        ) : (
          <div key={activeView} className="min-h-full pb-14 lg:pb-0 anim-fade-in">
            {activeView === "dashboard" && <DashboardView />}
            {activeView === "inventario" && <InventarioView />}
            {activeView === "despachos" && <DespachosView />}
            {activeView === "equipos" && <EquiposView />}
            {activeView === "series" && <SeriesView />}
            {activeView === "pistolear" && <PistolearView />}
            {activeView === "bloc" && <BlocView />}
            {activeView === "empresa" && <EmpresaView />}
            {activeView === "config" && <ConfigView />}
          </div>
        )}
      </main>
      {!isChatView && <Footer />}
      <NotificationStack />
    </div>
  );
}
