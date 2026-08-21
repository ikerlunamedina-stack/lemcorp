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

export default function Home() {
  const activeView = useStore((s) => s.activeView);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <SubHeader />
      <main className="relative flex-1">
        <div key={activeView} className="h-full overflow-y-auto scroll-thin anim-fade-in">
          {activeView === "dashboard" && <DashboardView />}
          {activeView === "inventario" && <InventarioView />}
          {activeView === "despachos" && <DespachosView />}
          {activeView === "equipos" && <EquiposView />}
          {activeView === "series" && <SeriesView />}
          {activeView === "pistolear" && <PistolearView />}
          {activeView === "ia" && <IAView />}
          {activeView === "bloc" && <BlocView />}
          {activeView === "empresa" && <EmpresaView />}
          {activeView === "config" && <ConfigView />}
        </div>
      </main>
      <Footer />
    </div>
  );
}
