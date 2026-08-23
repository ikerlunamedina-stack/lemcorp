"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

export default function Home() {
  const router = useRouter();
  const activeView = useStore((s) => s.activeView);

  useEffect(() => {
    router.replace(`/${activeView || "dashboard"}`);
  }, [router, activeView]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <img src="/lemcorp-logo.png" alt="LEMCORP" className="h-16 w-16 rounded-xl object-contain" />
        <span className="text-[15px] font-bold text-foreground">LEMCORP</span>
        <span className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">WMS · Almacén</span>
      </div>
    </div>
  );
}
