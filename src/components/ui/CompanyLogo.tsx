import { useState } from 'react';
import { cn } from '@/lib/cn';

/** Letter tile tinted by name; uses logoUrl when one is set and loads. */
export function CompanyLogo({
  name,
  logoUrl,
  size = 44,
  className,
}: {
  name: string;
  logoUrl?: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  let h = 0;
  for (const ch of name) h = (h * 33 + ch.charCodeAt(0)) % 360;
  const box = { width: size, height: size };
  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn('shrink-0 rounded-xl bg-white object-contain p-1', className)}
        style={box}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn('grid shrink-0 place-items-center rounded-xl font-semibold', className)}
      style={{
        ...box,
        fontSize: size * 0.4,
        color: `hsl(${h} 70% 70%)`,
        background: `color-mix(in oklab, hsl(${h} 60% 50%) 16%, var(--surface-2))`,
        border: `1px solid color-mix(in oklab, hsl(${h} 60% 50%) 25%, transparent)`,
      }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
