"use client";

import { useEffect, useState } from "react";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // La animación dura: 4s (logo) + 0.65s + 27 letras * 0.035s ≈ 5.6s
    // Empezar fade-out a los 5.5s
    const fadeTimer = setTimeout(() => setFading(true), 5500);
    const hideTimer = setTimeout(() => setVisible(false), 6200);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#09090a",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        html, body { width: 100%; height: 100%; margin: 0; }

        .vrs-scene {
          position: fixed;
          inset: 0;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          perspective: 900px;
        }

        .vrs-logo-container {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          gap: 16px;
          z-index: 10;
        }

        .vrs-logo {
          width: 46px;
          height: 46px;
          animation: vrsSquareTumble 4s cubic-bezier(.25,.1,.25,1) forwards;
        }

        @keyframes vrsSquareTumble {
          0% { transform: rotateZ(0deg) scale(6); }
          100% { transform: rotateZ(720deg) scale(1); }
        }

        .vrs-icon {
          width: 46px;
          height: 46px;
          display: block;
          filter: drop-shadow(0 0 12px rgba(147,168,178,.08));
        }

        .vrs-word {
          display: flex;
          font-family: 'Manrope', sans-serif;
          font-weight: 500;
          font-size: 20px;
          color: #e4e6e8;
          white-space: nowrap;
          opacity: 0;
        }

        .vrs-vignette {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at center, transparent 25%, rgba(0,0,0,.45) 100%);
          z-index: 50;
        }
      `}</style>

      <link
        rel="preconnect"
        href="https://fonts.googleapis.com"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@500&display=swap"
        rel="stylesheet"
      />

      <div className="vrs-scene">
        <div className="vrs-logo-container">
          <div className="vrs-logo">
            <svg
              className="vrs-icon"
              viewBox="0 0 46 46"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="2" y="2" width="12" height="12" fill="none" stroke="#8a8d90" strokeWidth="1.6" />
              <rect x="17" y="2" width="12" height="12" fill="none" stroke="#8a8d90" strokeWidth="1.6" />
              <rect x="32" y="2" width="12" height="12" fill="none" stroke="#8a8d90" strokeWidth="1.6" />
              <rect x="2" y="17" width="12" height="12" fill="none" stroke="#8a8d90" strokeWidth="1.6" />
              <rect x="17" y="17" width="12" height="12" fill="#93a8b2" />
              <rect x="32" y="17" width="12" height="12" fill="none" stroke="#8a8d90" strokeWidth="1.6" />
              <rect x="2" y="32" width="12" height="12" fill="none" stroke="#8a8d90" strokeWidth="1.6" />
              <rect x="17" y="32" width="12" height="12" fill="none" stroke="#8a8d90" strokeWidth="1.6" />
              <rect x="32" y="32" width="12" height="12" fill="none" stroke="#8a8d90" strokeWidth="1.6" />
            </svg>
          </div>
          <div className="vrs-word" id="vrs-word"></div>
        </div>
        <div className="vrs-vignette"></div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            const text = "Resource Management Platform";
            const wordEl = document.getElementById("vrs-word");
            const ICON_SETTLE = 3800;
            const LETTER_DURATION = 0.65;
            const LETTER_STEP = 0.035;

            const spans = [...text].map(char => {
              const span = document.createElement("span");
              span.textContent = char === " " ? "\\u00A0" : char;
              span.style.display = "inline-block";
              span.style.opacity = "0";
              wordEl.appendChild(span);
              return span;
            });

            requestAnimationFrame(() => {
              spans.forEach(span => {
                span.style.transform = "translateY(12px) translateX(-8px)";
                span.style.filter = "blur(5px)";
              });

              setTimeout(() => {
                wordEl.style.opacity = "1";
                spans.forEach((span, i) => {
                  const delay = i * LETTER_STEP;
                  span.style.transition =
                    "transform " + LETTER_DURATION + "s cubic-bezier(.2,.8,.2,1) " + delay + "s, " +
                    "opacity " + (LETTER_DURATION * .8) + "s ease " + delay + "s, " +
                    "filter " + LETTER_DURATION + "s ease " + delay + "s";
                  span.style.transform = "translateY(0) translateX(0)";
                  span.style.opacity = "1";
                  span.style.filter = "blur(0)";
                });
              }, ICON_SETTLE);
            });
          `,
        }}
      />
    </div>
  );
}
