"use client";

import { AppShell } from "@/components/lem/app-shell";
import { IAView } from "@/components/lem/ia-view";

export default function IAPage() {
  return (
    <AppShell isChat>
      <IAView />
    </AppShell>
  );
}
