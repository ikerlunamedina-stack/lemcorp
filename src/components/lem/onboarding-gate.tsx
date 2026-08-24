"use client";

import { useState } from "react";
import { Onboarding } from "@/components/lem/onboarding";

const ONBOARD_KEY = "lemcorp-onboarding-done-v1";

function readOnboardingDone(): boolean {
  try {
    return localStorage.getItem(ONBOARD_KEY) === "1";
  } catch {
    return true; // si localStorage falla, saltamos onboarding
  }
}

/** Gate que muestra el onboarding la primera vez (o cuando se resetea). */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(() => !readOnboardingDone());

  if (showOnboarding) {
    return <Onboarding onDone={() => setShowOnboarding(false)} />;
  }

  return <>{children}</>;
}
