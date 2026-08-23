"use client";

import { useStore } from "@/lib/store";
import { Navbar } from "@/components/lem/navbar";
import { SubHeader } from "@/components/lem/sub-header";
import { Footer } from "@/components/lem/footer";
import { NotificationStack } from "@/components/lem/notification-stack";
import { SyncProvider } from "@/components/lem/sync-provider";
import { DashboardView } from "@/components/lem/dashboard-view";
import { InventarioView } from "@/components/lem/inventario-view";
import { DespachosView } from "@/components/lem/despachos-view";
import { EquiposView } from "@/components/lem/equipos-view";
import { SeriesView } from "@/components/lem/series-view";
import { PistolearView } from "@/components/lem/pistolear-view";
import { HorarioView } from "@/components/lem/horario-view";
import { IAView } from "@/components/lem/ia-view";
import { BlocView } from "@/components/lem/bloc-view";
import { EmpresaView } from "@/components/lem/empresa-view";
import { NotificacionesView } from "@/components/lem/notificaciones-view";
import { ConfigView } from "@/components/lem/config-view";

export default function Home() {
  const activeView = useStore((s) => s.activeView);
  const isChatView = activeView === "ia";

  return (
    <SyncProvider>
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
              {activeView === "horario" && <HorarioView />}
              {activeView === "bloc" && <BlocView />}
              {activeView === "empresa" && <EmpresaView />}
              {activeView === "notificaciones" && <NotificacionesView />}
              {activeView === "config" && <ConfigView />}
            </div>
          )}
        </main>
        {!isChatView && <Footer />}
        <NotificationStack />
      </div>
    </SyncProvider>
  );
}
