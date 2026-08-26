"use client";

import { Navbar } from "@/components/lem/navbar";
import { SubHeader } from "@/components/lem/sub-header";
import { Footer } from "@/components/lem/footer";
import { NotificationStack } from "@/components/lem/notification-stack";
import { SyncProvider } from "@/components/lem/sync-provider";
import { DashboardView } from "@/components/lem/dashboard-view";

export default function Page() {
  return (
    <SyncProvider>
      <div className="flex h-screen flex-col bg-background text-foreground">
        <Navbar />
        <SubHeader />
        <main className="relative flex-1 overflow-auto scroll-thin">
          <div className="min-h-full pb-14 lg:pb-0 anim-fade-in">
            <DashboardView />
          </div>
        </main>
        <Footer />
        <NotificationStack />
      </div>
    </SyncProvider>
  );
}
