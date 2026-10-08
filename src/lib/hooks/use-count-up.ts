import { useEffect, useRef, useState } from "react";

/**
 * Hook que anima un número de 0 (o desde valor previo) hasta `target`
 * con curva spring (cubic-bezier 0.34, 1.56, 0.64, 1) estilo Apple.
 *
 * Inspirado en las animaciones de count-up de Apple/iOS para
 * Dynamic Island y widgets. La duración por defecto es 700ms.
 *
 * @param target número final al que animar
 * @param duration duración en ms (default 700)
 * @param decimals decimales a mostrar (default 0)
 */
export function useCountUp(target: number, duration = 700, decimals = 0): number {
  const [display, setDisplay] = useState(0);
  const prevTargetRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevTargetRef.current;
    const to = target;
    if (from === to) {
      // Defer setDisplay to next frame to avoid cascading renders
      // (react-hooks/set-state-in-effect) — still syncs display to target
      // when no animation is required (e.g. same target on re-render).
      const syncId = requestAnimationFrame(() => {
        setDisplay(to);
        prevTargetRef.current = to;
      });
      return () => cancelAnimationFrame(syncId);
    }

    const start = performance.now();
    // Spring con overshoot + settle (cubic-bezier(0.34, 1.56, 0.64, 1))
    const ease = (t: number) => {
      const t1 = t - 1;
      return 1 + 2.56 * t1 * t1 * t1 + 1.56 * t1 * t1;
    };

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = ease(t);
      const value = from + (to - from) * eased;
      const finalValue = t >= 1 ? to : value;
      setDisplay(Number(finalValue.toFixed(decimals)));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevTargetRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      prevTargetRef.current = to;
    };
  }, [target, duration, decimals]);

  return display;
}
