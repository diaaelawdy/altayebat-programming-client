import { Building2, Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { Input, Select } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDebounced } from '@/lib/hooks';
import { useI18n } from '@/i18n';
import { usePaged, LoadMore } from '@/lib/paged';
import { qs } from '@/lib/api';
import type { Company } from '@/shared/types';
import { CompanyCard } from './CompanyCard';
import { SuggestCompanyButton } from './SuggestCompany';

const SORTS = ['popular', 'rating', 'recent', 'name'] as const;

export function CompaniesPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const sort = params.get('sort') ?? 'popular';
  const dq = useDebounced(q.trim(), 200);
  const list = usePaged<Company>(
    ['companies', 'paged', dq, sort],
    `/companies${qs({ q: dq, sort })}`,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t('companies.title')}</h1>
          <p className="text-muted mt-2">{t('companies.subtitle')}</p>
        </div>
        <SuggestCompanyButton />
      </div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="text-subtle pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2"
          />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setParams((p) => (e.target.value ? p.set('q', e.target.value) : p.delete('q'), p), {
                replace: true,
              });
            }}
            placeholder={t('companies.search')}
            className="ps-10"
            aria-label={t('companies.search')}
          />
        </div>
        <Select
          value={sort}
          onChange={(e) => setParams((p) => (p.set('sort', e.target.value), p), { replace: true })}
          className="sm:w-52"
          aria-label={t('filters.sort')}
        >
          {SORTS.map((s) => (
            <option key={s} value={s}>
              {t(`companies.sort.${s}`)}
            </option>
          ))}
        </Select>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.isLoading
          ? Array.from({ length: 9 }, (_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)
          : list.items.map((c, i) => <CompanyCard key={c.id} c={c} index={i % 20} />)}
      </div>
      <LoadMore {...list} />
      {list.isSuccess && list.items.length === 0 && (
        <EmptyState
          className="mt-6"
          icon={<Building2 size={20} />}
          title={t('companies.empty', { q: dq })}
        />
      )}
    </div>
  );
}
