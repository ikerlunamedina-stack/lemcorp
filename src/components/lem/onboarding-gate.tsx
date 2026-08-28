"use client";

import { useEffect, useState } from "react";
import { Onboarding } from "@/components/lem/onboarding";

const ONBOARD_KEY = "lemcorp-onboarding-done-v1";

/** Gate que muestra el onboarding la primera vez (o cuando se resetea).
 *  Hydration-safe: renderiza children en el servidor y en el primer paint
 *  del cliente, y solo muestra el onboarding después de montar (si aplica). */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  // null = no decidido aún (servidor + primer paint cliente)
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const done = localStorage.getItem(ONBOARD_KEY) === "1";
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowOnboarding(!done);
    } catch {
      setShowOnboarding(false);
    }
  }, []);

  if (showOnboarding === null) {
    // Aún no sabemos — renderizamos children para evitar parpadeo/hydration mismatch
    return <>{children}</>;
  }

  if (showOnboarding) {
    return <Onboarding onDone={() => setShowOnboarding(false)} />;
  }

  return <>{children}</>;
}
