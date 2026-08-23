"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { Navbar } from "@/components/lem/navbar";
import { SubHeader } from "@/components/lem/sub-header";
import { Footer } from "@/components/lem/footer";
import { NotificationStack } from "@/components/lem/notification-stack";
import { SyncProvider } from "@/components/lem/sync-provider";
import { ConfigView } from "@/components/lem/config-view";

export default function Page() {
  const setActiveView = useStore((s) => s.setActiveView);

  useEffect(() => {
    setActiveView("config");
  }, [setActiveView]);

  const isChatView = "config" === "ia";

  return (
    <SyncProvider>
      <div className="flex h-screen flex-col bg-background text-foreground">
        <Navbar />
        {!isChatView && <SubHeader />}
        <main className="relative flex-1 overflow-auto scroll-thin">
          <div className="min-h-full pb-14 lg:pb-0 anim-fade-in">
            <ConfigView />
          </div>
        </main>
        {!isChatView && <Footer />}
        <NotificationStack />
      </div>
    </SyncProvider>
  );
}
