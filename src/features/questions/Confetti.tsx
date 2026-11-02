import { m } from 'framer-motion';
import { useMemo } from 'react';

const COLORS = ['var(--accent)', 'var(--easy)', 'var(--medium)', 'var(--hard)', '#82aaff'];

/** A short, lightweight burst (no canvas); respects reduced-motion via global CSS. */
export function Confetti({ fire }: { fire: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: `${fire}-${i}`,
        x: (Math.random() - 0.5) * 360,
        y: -120 - Math.random() * 180,
        r: Math.random() * 540 - 270,
        c: COLORS[i % COLORS.length],
        d: 0.7 + Math.random() * 0.5,
      })),
    [fire],
  );
  if (!fire) return null;
  return (
    <div className="pointer-events-none fixed bottom-1/3 left-1/2 z-50" aria-hidden>
      {bits.map((b) => (
        <m.span
          key={b.id}
          className="absolute h-2.5 w-1.5 rounded-sm"
          style={{ background: b.c }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: b.x, y: [0, b.y, b.y + 260], opacity: [1, 1, 0], rotate: b.r }}
          transition={{ duration: b.d + 0.6, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}
