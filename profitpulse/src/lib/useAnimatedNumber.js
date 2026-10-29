import { useEffect, useRef, useState } from 'react';

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Smoothly tweens toward `target` (ease-out). Respects prefers-reduced-motion. */
export default function useAnimatedNumber(target, duration = 600) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  const raf = useRef(0);
  const current = useRef(target);

  useEffect(() => {
    if (!Number.isFinite(target)) { current.current = target; setValue(target); return undefined; }
    if (reduced() || !Number.isFinite(current.current)) { current.current = target; setValue(target); return undefined; }
    from.current = current.current;
    const start = performance.now();
    cancelAnimationFrame(raf.current);
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - p) ** 3;
      const v = from.current + (target - from.current) * eased;
      current.current = v;
      setValue(v);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return value;
}
