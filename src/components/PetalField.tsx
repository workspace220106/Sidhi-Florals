import { useMemo, type CSSProperties } from "react";

/** Decorative falling petals. CSS-animated; hidden under prefers-reduced-motion (see index.css). */
export function PetalField({ count = 9 }: { count?: number }) {
  const petals = useMemo(() => Array.from({ length: count }, (_, i) => ({
    left: `${(i * 97) % 100}%`, size: 10 + ((i * 37) % 10), duration: 12 + ((i * 53) % 9), delay: -((i * 41) % 12),
    drift: (i % 2 ? 1 : -1) * (30 + ((i * 29) % 50)), opacity: 0.2 + ((i * 13) % 15) / 100,
  })), [count]);
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden>
      {petals.map((p, i) => (
        <img key={i} src="/petal.svg" alt="" className="petal" width={p.size} height={p.size}
          style={{ left: p.left, "--petal-duration": `${p.duration}s`, "--petal-delay": `${p.delay}s`, "--petal-drift": `${p.drift}px`, "--petal-opacity": p.opacity } as CSSProperties} />
      ))}
    </div>
  );
}
