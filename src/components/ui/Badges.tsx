import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { Difficulty } from '@/shared/types';

const diff: Record<Difficulty, string> = {
  Easy: 'text-easy bg-[color-mix(in_oklab,var(--easy)_14%,transparent)]',
  Medium: 'text-medium bg-[color-mix(in_oklab,var(--medium)_14%,transparent)]',
  Hard: 'text-hard bg-[color-mix(in_oklab,var(--hard)_14%,transparent)]',
};

/** Difficulty is a question tag, so like every tag it's shown in English in both languages. */
export function DifficultyBadge({ value, className }: { value: Difficulty; className?: string }) {
  return (
    <span className={cn('rounded-md px-2 py-0.5 text-xs font-medium', diff[value], className)}>
      {value}
    </span>
  );
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('bg-surface-3 text-muted rounded-md px-2 py-0.5 text-xs', className)}>
      {children}
    </span>
  );
}
