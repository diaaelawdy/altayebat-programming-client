import { m } from 'framer-motion';
import { cn } from '@/lib/cn';

export function Switch({
  on,
  onChange,
  disabled,
  label,
}: {
  on: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        on ? 'bg-accent' : 'bg-surface-3',
      )}
    >
      <m.span
        layout
        transition={{ type: 'spring', stiffness: 600, damping: 35 }}
        className={cn('h-4 w-4 rounded-full bg-white shadow', on ? 'ms-[18px]' : 'ms-0.5')}
      />
    </button>
  );
}
