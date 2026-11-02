import { Star } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/cn';

export function Stars({
  value,
  size = 14,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      aria-label={`${value.toFixed(1)} / 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i + 1));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="text-border-strong absolute inset-0" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star size={size} className="fill-star text-star" />
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function StarInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex gap-1"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i}`}
          onMouseEnter={() => setHover(i)}
          onClick={() => onChange(i)}
          className="rounded-md p-0.5 transition-transform hover:scale-110 active:scale-95"
        >
          <Star
            size={24}
            className={cn(
              'transition-colors',
              i <= shown ? 'fill-star text-star' : 'text-border-strong',
            )}
          />
        </button>
      ))}
    </div>
  );
}
