"use client";

import { AppShell } from "@/components/lem/app-shell";
import { DashboardView } from "@/components/lem/dashboard-view";

export default function Home() {
  return (
    <AppShell>
      <DashboardView />
    </AppShell>
  );
}
