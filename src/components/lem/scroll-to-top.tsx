"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_PROPS = { strokeWidth: 1.5 } as const;

/**
 * Botón flotante "Volver arriba" estilo Apple.
 * Aparece con fade+spring cuando el scroll supera 400px.
 * Click anima el scroll hacia arriba con scrollTo({ behavior: "smooth" }).
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      onClick={scrollTop}
      aria-label="Volver arriba"
      className={cn(
        "scroll-top-btn inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-md hover:bg-muted",
        visible && "visible"
      )}
    >
      <ArrowUp className="h-4 w-4 text-foreground" {...ICON_PROPS} />
    </button>
  );
}
