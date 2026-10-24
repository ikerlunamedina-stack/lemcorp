"use client";

import { useEffect, useState } from "react";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  // Leer el tema INMEDIATAMENTE (no en useEffect) — el inline script del <head>
  // ya aplicó la clase 'dark' antes de que React renderice
  const [bgColor] = useState(() => {
    if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) {
      return "#242220";
    }
    return "#FFFFFF";
  });

  // Timeline: la animación del HTML dura ~7.5s
  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 7200);
    const hideTimer = setTimeout(() => setVisible(false), 7900);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  // Bloquear scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: bgColor,
        opacity: fading ? 0 : 1,
        transition: "opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
        pointerEvents: fading ? "none" : "auto",
        overflow: "hidden",
        touchAction: "none",
        overscrollBehavior: "none",
      }}
    >
      <iframe
        src="/intro.html"
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          border: "none",
          margin: 0,
          padding: 0,
          background: "transparent",
        }}
        title="Intro LEMCORP Logistics"
      />
    </div>
  );
}
