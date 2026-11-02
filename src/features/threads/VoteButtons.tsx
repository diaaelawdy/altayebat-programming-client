import { AnimatePresence, m } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useI18n } from '@/i18n';

export type VoteValue = -1 | 0 | 1;

/**
 * Up/down voting. The parent applies the change optimistically; clicking the
 * active arrow again clears the vote.
 */
export function VoteButtons({
  score,
  myVote,
  onVote,
  disabledReason,
  orientation = 'vertical',
}: {
  score: number;
  myVote: number;
  onVote: (v: VoteValue) => void;
  disabledReason?: string | null;
  orientation?: 'vertical' | 'horizontal';
}) {
  const { t, fmt } = useI18n();
  const click = (dir: 1 | -1) => {
    if (disabledReason) return;
    onVote(myVote === dir ? 0 : dir);
  };
  const btn =
    'grid h-8 w-8 place-items-center rounded-lg transition-[color,background-color,transform] active:scale-90';
  return (
    <div
      className={cn(
        'flex items-center',
        orientation === 'vertical' ? 'flex-col' : 'flex-row gap-0.5',
      )}
      title={disabledReason ?? undefined}
    >
      <button
        type="button"
        onClick={() => click(1)}
        aria-label={t('vote.up')}
        aria-pressed={myVote === 1}
        aria-disabled={Boolean(disabledReason)}
        className={cn(
          btn,
          myVote === 1
            ? 'bg-accent-soft text-accent'
            : 'text-subtle hover:bg-surface-2 hover:text-fg',
          disabledReason && 'cursor-not-allowed opacity-50',
        )}
      >
        <ChevronUp size={20} />
      </button>
      <span
        className="relative h-5 min-w-6 overflow-hidden text-center text-sm font-semibold tabular-nums"
        aria-live="polite"
      >
        <AnimatePresence initial={false} mode="popLayout">
          <m.span
            key={score}
            className={cn('block', myVote === 1 && 'text-accent', myVote === -1 && 'text-hard')}
            initial={{ y: myVote === -1 ? -14 : 14, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: myVote === -1 ? 14 : -14, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 520, damping: 30 }}
          >
            {fmt.compact(score)}
          </m.span>
        </AnimatePresence>
      </span>
      <button
        type="button"
        onClick={() => click(-1)}
        aria-label={t('vote.down')}
        aria-pressed={myVote === -1}
        aria-disabled={Boolean(disabledReason)}
        className={cn(
          btn,
          myVote === -1
            ? 'text-hard bg-[color-mix(in_oklab,var(--hard)_15%,transparent)]'
            : 'text-subtle hover:bg-surface-2 hover:text-fg',
          disabledReason && 'cursor-not-allowed opacity-50',
        )}
      >
        <ChevronDown size={20} />
      </button>
    </div>
  );
}
