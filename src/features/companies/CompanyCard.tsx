import { useQueryClient } from '@tanstack/react-query';
import { m } from 'framer-motion';
import { ArrowRight, Star } from 'lucide-react';
import { memo } from 'react';
import { Link } from 'react-router-dom';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { useI18n } from '@/i18n';
import type { Company } from '@/shared/types';
import { prefetchCompany } from './api';

export const CompanyCard = memo(function CompanyCard({
  c,
  index = 0,
}: {
  c: Company;
  index?: number;
}) {
  const { t, fmt, companyName } = useI18n();
  const qc = useQueryClient();
  const prefetch = () => prefetchCompany(qc, c.slug);
  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.025, duration: 0.25 }}
    >
      <Link
        to={`/c/${c.slug}`}
        onMouseEnter={prefetch}
        onFocus={prefetch}
        className="group border-border bg-surface shadow-card relative flex h-full flex-col rounded-2xl border p-5 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--accent)_40%,var(--border))] hover:shadow-[0_12px_40px_-20px_var(--accent)]"
      >
        <div className="flex items-start gap-3">
          <CompanyLogo name={c.name} logoUrl={c.logoUrl} />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold">{companyName(c)}</h3>
            <p className="text-subtle truncate text-xs">{c.industry}</p>
          </div>
          {c.rating.count > 0 && (
            <span
              className="bg-surface-2 flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium"
              title={t('companies.reviews', { n: c.rating.count })}
            >
              <Star size={12} className="fill-star text-star" />
              {c.rating.overall.toFixed(1)}
            </span>
          )}
        </div>
        <div className="mt-5 flex items-end justify-between gap-2">
          <div>
            <p className="text-2xl font-semibold tabular-nums">{fmt.number(c.questionCount)}</p>
            <p className="text-subtle text-xs">
              {c.questionCount
                ? t('companies.updated', { t: fmt.relative(c.lastUpdatedAt) })
                : t('companies.noQuestions')}
            </p>
          </div>
          <span className="text-accent flex items-center gap-1 text-sm opacity-0 transition-all duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
            {t('companies.view')}{' '}
            <ArrowRight
              size={14}
              className="transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
            />
          </span>
        </div>
      </Link>
    </m.div>
  );
});
