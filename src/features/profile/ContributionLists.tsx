import { Building2, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n, type MessageKey } from '@/i18n';
import type { CompanySubmission, FeedbackActivity } from '@/shared/types';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/cn';

/** Company feedback comments and replies, linking back to the company's feedback tab. */
export function FeedbackList({ items }: { items: FeedbackActivity[] }) {
  const { t, fmt, companyName } = useI18n();
  if (!items.length)
    return <EmptyState icon={<MessageSquare size={20} />} title={t('profile.noFeedback')} />;
  return (
    <ul className="space-y-2.5">
      {items.map((f) => (
        <li key={f.id}>
          <Link
            to={`/c/${f.company.slug}?tab=feedback`}
            className="border-border bg-surface hover:border-border-strong block rounded-2xl border p-4"
          >
            <p className="text-sm font-medium">
              {companyName(f.company)}
              {f.isReply && (
                <span className="text-subtle font-normal"> · {t('profile.reply')}</span>
              )}
            </p>
            <p className="text-muted mt-1 line-clamp-2 text-sm">{f.excerpt}</p>
            <p className="text-subtle mt-2 text-xs">
              ▲ {f.score} · {fmt.relative(f.createdAt)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const TONE = { pending: 'text-medium', approved: 'text-easy', rejected: 'text-hard' } as const;

/** Companies a user added; `showStatus` is for the owner's own view. */
export function CompanyList({
  items,
  showStatus = false,
}: {
  items: CompanySubmission[];
  showStatus?: boolean;
}) {
  const { t, fmt, companyName } = useI18n();
  if (!items.length)
    return <EmptyState icon={<Building2 size={20} />} title={t('profile.noCompanies')} />;
  return (
    <ul className="grid gap-2.5 sm:grid-cols-2">
      {items.map((c) => {
        const body = (
          <>
            <CompanyLogo name={c.name} logoUrl={c.logoUrl} size={40} className="rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{companyName(c)}</p>
              <p className="text-subtle text-xs">
                {c.industry && `${c.industry} · `}
                {fmt.relative(c.createdAt)}
              </p>
              {showStatus && c.status === 'rejected' && c.rejectionReason && (
                <p className="text-hard mt-1 text-xs">
                  {t('profile.rejectedReason', { r: c.rejectionReason })}
                </p>
              )}
            </div>
            {showStatus && (
              <span className={cn('text-xs font-medium', TONE[c.status])}>
                {t(`profile.status.${c.status}` as MessageKey)}
              </span>
            )}
          </>
        );
        const cls =
          'border-border bg-surface flex items-center gap-3 rounded-2xl border p-3.5 transition-colors';
        return (
          <li key={c.id}>
            {c.status === 'approved' ? (
              <Link to={`/c/${c.slug}`} className={cn(cls, 'hover:border-border-strong')}>
                {body}
              </Link>
            ) : (
              <div className={cls}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
