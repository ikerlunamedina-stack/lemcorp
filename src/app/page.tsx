"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { Sidebar } from "@/components/lem/sidebar";
import { Topbar } from "@/components/lem/topbar";
import { Footer } from "@/components/lem/footer";
import { DashboardView } from "@/components/lem/dashboard-view";

export default function Home() {
  const seedDemoIfEmpty = useStore((s) => s.seedDemoIfEmpty);

  useEffect(() => { seedDemoIfEmpty(); }, [seedDemoIfEmpty]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="relative flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto scroll-thin">
            <DashboardView />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
