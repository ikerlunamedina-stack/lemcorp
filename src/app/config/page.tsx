"use client";

import { AppShell } from "@/components/lem/app-shell";
import { ConfigView } from "@/components/lem/config-view";

export default function ConfigPage() {
  return (
    <AppShell>
      <ConfigView />
    </AppShell>
  );
}
