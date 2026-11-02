import { useQueryClient } from '@tanstack/react-query';
import { Bookmark, CheckCircle2, Flame, MessageSquare } from 'lucide-react';
import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Tag } from '@/components/ui/Badges';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import type { QuestionSummary } from '@/shared/types';
import { prefetchQuestion, type QuestionFilters } from './api';
import { QuestionTags } from './QuestionTags';

export const QuestionRow = memo(function QuestionRow({
  q,
  companySlug,
  ctx = {},
  showCompany,
}: {
  q: QuestionSummary;
  companySlug: string;
  ctx?: QuestionFilters;
  showCompany?: string;
}) {
  const { t, fmt } = useI18n();
  const qc = useQueryClient();
  const search = new URLSearchParams(ctx as Record<string, string>).toString();
  const prefetch = () => prefetchQuestion(qc, companySlug, q.slug, ctx);
  return (
    <Link
      to={`/c/${companySlug}/${q.slug}${search ? `?${search}` : ''}`}
      onMouseEnter={prefetch}
      onFocus={prefetch}
      className={cn(
        'group border-border bg-surface hover:border-border-strong hover:bg-surface-2 flex items-start gap-3 rounded-2xl border p-4 transition-[border-color,background-color,transform] duration-150 active:scale-[0.995]',
        q.studied && 'opacity-70 hover:opacity-100',
      )}
    >
      <span
        className={cn('mt-0.5 shrink-0', q.studied ? 'text-easy' : 'text-border-strong')}
        aria-label={q.studied ? t('q.studied') : undefined}
      >
        <CheckCircle2 size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <h3 className="group-hover:text-fg flex-1 leading-snug font-medium">{q.title}</h3>
          {q.bookmarked && (
            <Bookmark
              size={15}
              className="fill-accent text-accent mt-0.5 shrink-0"
              aria-label={t('q.bookmarked')}
            />
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {showCompany && <Tag className="text-fg">{showCompany}</Tag>}
          <QuestionTags q={q} />
        </div>
      </div>
      <div className="text-subtle hidden shrink-0 flex-col items-end gap-1 text-xs sm:flex">
        <span className="flex items-center gap-1" title={t('q.timesAsked', { n: q.timesAsked })}>
          <Flame size={13} className={cn(q.timesAsked >= 5 && 'text-medium')} />{' '}
          {t('q.timesAsked', { n: q.timesAsked })}
        </span>
        <span>{fmt.relative(q.lastAskedAt)}</span>
        {q.answerCount > 0 && (
          <span className="flex items-center gap-1">
            <MessageSquare size={12} /> {q.answerCount}
          </span>
        )}
      </div>
    </Link>
  );
});
