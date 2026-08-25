"use client";

import { SyncProvider } from "@/components/lem/sync-provider";
import { Navbar } from "@/components/lem/navbar";
import { SubHeader } from "@/components/lem/sub-header";
import { Footer } from "@/components/lem/footer";
import { NotificationStack } from "@/components/lem/notification-stack";

interface AppShellProps {
  children: React.ReactNode;
  /** Si la página es la del chat de IA, no se renderizan SubHeader ni Footer
   * para dar espacio completo al chat. */
  isChat?: boolean;
}

export function AppShell({ children, isChat = false }: AppShellProps) {
  return (
    <SyncProvider>
      <div className="flex h-screen flex-col bg-background text-foreground">
        <Navbar />
        {!isChat && <SubHeader />}
        <main className="relative flex-1 overflow-auto scroll-thin">
          {isChat ? (
            children
          ) : (
            <div className="min-h-full pb-14 lg:pb-0 anim-page-enter anim-fade-in">
              {children}
            </div>
          )}
        </main>
        {!isChat && <Footer />}
        <NotificationStack />
      </div>
    </SyncProvider>
  );
}
