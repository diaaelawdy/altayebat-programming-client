import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';

/** Gradient app tile with a soft glow (the "M" mark). */
export function BrandMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn('relative grid shrink-0 place-items-center', className)}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        background: 'var(--accent-gradient)',
        boxShadow: `0 ${size * 0.2}px ${size * 0.6}px -${size * 0.15}px color-mix(in oklab, var(--accent) 70%, transparent)`,
      }}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" width={size * 0.55} height={size * 0.55}>
        <path
          d="M8 22V10l8 7 8-7v12"
          fill="none"
          stroke="white"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Logo({ compact }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5 sm:gap-3">
      <BrandMark size={compact ? 34 : 42} />
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[17px] font-semibold tracking-tight">{t('app.name')}</span>
          <span className="text-subtle hidden text-xs sm:block">{t('nav.tagline')}</span>
        </span>
      )}
    </Link>
  );
}
