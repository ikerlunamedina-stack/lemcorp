"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { Sidebar } from "@/components/lem/sidebar";
import { Topbar } from "@/components/lem/topbar";
import { Footer } from "@/components/lem/footer";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const seedDemoIfEmpty = useStore((s) => s.seedDemoIfEmpty);

  useEffect(() => { seedDemoIfEmpty(); }, [seedDemoIfEmpty]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="relative flex-1 overflow-hidden">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
