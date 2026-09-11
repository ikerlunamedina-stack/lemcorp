"use client";

import { useEffect, useState, useRef } from "react";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const wordRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  // Detectar tema
  useEffect(() => {
    try {
      const raw = localStorage.getItem("lemcorp-v3");
      let tema = "claro";
      if (raw) {
        const s = JSON.parse(raw);
        tema = s?.state?.settings?.tema || "claro";
      }
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      const dark = tema === "oscuro" || (tema === "sistema" && prefersDark);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsDark(dark);
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsDark(false);
    }
  }, []);

  // Timeline: logo 4s + letras 2s + fade 0.7s
  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 6500);
    const hideTimer = setTimeout(() => setVisible(false), 7200);
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

  // Animar letras DESPUES de que React monte el DOM
  useEffect(() => {
    if (!wordRef.current) return;
    const wordEl = wordRef.current;

    const text = "Resource Management Platform";
    const ICON_SETTLE = 3800;
    const LETTER_DURATION = 0.65;
    const LETTER_STEP = 0.035;

    // Limpiar por si acaso
    wordEl.innerHTML = "";

    // Crear cada letra
    const spans: HTMLSpanElement[] = [];
    for (const char of text) {
      const span = document.createElement("span");
      span.textContent = char === " " ? "\u00A0" : char;
      span.style.display = "inline-block";
      span.style.opacity = "0";
      wordEl.appendChild(span);
      spans.push(span);
    }

    // Preparar estado inicial de las letras
    const prepare = () => {
      spans.forEach(span => {
        span.style.transform = "translateY(12px) translateX(-8px)";
        span.style.filter = "blur(5px)";
      });
    };

    // Animar las letras
    const animate = () => {
      wordEl.style.opacity = "1";
      spans.forEach((span, i) => {
        const delay = i * LETTER_STEP;
        span.style.transition =
          `transform ${LETTER_DURATION}s cubic-bezier(.2,.8,.2,1) ${delay}s, ` +
          `opacity ${LETTER_DURATION * 0.8}s ease ${delay}s, ` +
          `filter ${LETTER_DURATION}s ease ${delay}s`;
        span.style.transform = "translateY(0) translateX(0)";
        span.style.opacity = "1";
        span.style.filter = "blur(0)";
      });
    };

    // Usar requestAnimationFrame para asegurar que el DOM está listo
    requestAnimationFrame(() => {
      prepare();
      setTimeout(animate, ICON_SETTLE);
    });

    // Cleanup
    return () => {
      wordEl.innerHTML = "";
    };
  }, []);

  if (!visible) return null;

  const bgColor = isDark ? "#121212" : "#fafafa";
  const strokeColor = isDark ? "#8a8d90" : "#4a4d50";
  const centerColor = isDark ? "#93a8b2" : "#6a7d88";
  const textColor = isDark ? "#e4e6e8" : "#1a1a1c";
  const vignetteColor = isDark ? "rgba(0,0,0,.45)" : "rgba(255,255,255,.4)";
  const dropShadow = isDark ? "rgba(147,168,178,.08)" : "rgba(100,120,130,.06)";

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
      <style>{`
        .vrs-scene {
          position: fixed;
          inset: 0;
          overflow: hidden;
        }

        .vrs-logo-container {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 16px;
          z-index: 10;
        }

        .vrs-logo {
          width: 46px;
          height: 46px;
          flex-shrink: 0;
          transform-origin: center center;
          animation: vrsSquareTumble 4s cubic-bezier(.25,.1,.25,1) both;
        }

        @keyframes vrsSquareTumble {
          0% { transform: rotateZ(0deg) scale(6); }
          100% { transform: rotateZ(720deg) scale(1); }
        }

        .vrs-icon {
          width: 46px;
          height: 46px;
          display: block;
        }

        .vrs-word {
          display: flex;
          font-family: 'Manrope', sans-serif;
          font-weight: 500;
          font-size: 20px;
          white-space: nowrap;
          opacity: 0;
        }

        @media (max-width: 640px) {
          .vrs-logo {
            width: 38px;
            height: 38px;
            animation: vrsSquareTumbleMobile 4s cubic-bezier(.25,.1,.25,1) both;
          }
          .vrs-icon {
            width: 38px;
            height: 38px;
          }
          .vrs-word {
            font-size: 14px;
          }
        }

        @keyframes vrsSquareTumbleMobile {
          0% { transform: rotateZ(0deg) scale(3.5); }
          100% { transform: rotateZ(720deg) scale(1); }
        }

        .vrs-vignette {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 50;
        }
      `}</style>

      <div className="vrs-scene" ref={sceneRef}>
        <div className="vrs-logo-container">
          <div className="vrs-logo" style={{ transform: "rotateZ(0deg) scale(6)" }}>
            <svg
              className="vrs-icon"
              viewBox="0 0 46 46"
              xmlns="http://www.w3.org/2000/svg"
              style={{ filter: `drop-shadow(0 0 12px ${dropShadow})` }}
            >
              <rect x="2" y="2" width="12" height="12" fill="none" stroke={strokeColor} strokeWidth="1.6" />
              <rect x="17" y="2" width="12" height="12" fill="none" stroke={strokeColor} strokeWidth="1.6" />
              <rect x="32" y="2" width="12" height="12" fill="none" stroke={strokeColor} strokeWidth="1.6" />
              <rect x="2" y="17" width="12" height="12" fill="none" stroke={strokeColor} strokeWidth="1.6" />
              <rect x="17" y="17" width="12" height="12" fill={centerColor} />
              <rect x="32" y="17" width="12" height="12" fill="none" stroke={strokeColor} strokeWidth="1.6" />
              <rect x="2" y="32" width="12" height="12" fill="none" stroke={strokeColor} strokeWidth="1.6" />
              <rect x="17" y="32" width="12" height="12" fill="none" stroke={strokeColor} strokeWidth="1.6" />
              <rect x="32" y="32" width="12" height="12" fill="none" stroke={strokeColor} strokeWidth="1.6" />
            </svg>
          </div>
          <div className="vrs-word" ref={wordRef} style={{ color: textColor }}></div>
        </div>
        <div className="vrs-vignette" style={{ background: `radial-gradient(circle at center, transparent 25%, ${vignetteColor} 100%)` }}></div>
      </div>
    </div>
  );
}
