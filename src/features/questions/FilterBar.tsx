import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/Field';
import { Dropdown } from '@/components/ui/Dropdown';
import { Segmented } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { useDebounced } from '@/lib/hooks';
import { useI18n } from '@/i18n';
import {
  DIFFICULTIES,
  FIELDS,
  LEVELS,
  SPECIALIZATIONS,
  SPECIALIZATIONS_BY_FIELD,
  STAGES,
  TOPICS,
  fieldOf,
  type FieldName,
} from '@/shared/constants';
import { FILTER_KEYS } from './api';

/** Every filter except the sort order. */
const FILTERS = FILTER_KEYS.filter((k) => k !== 'sort');

/** All filter state lives in the URL, so lists are shareable and Back works. */
export function FilterBar() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const dq = useDebounced(q.trim(), 300);

  useEffect(() => {
    setParams(
      (p) => {
        if (dq) p.set('q', dq);
        else p.delete('q');
        return p;
      },
      { replace: true },
    );
  }, [dq, setParams]);

  /** Sets several params at once; an empty value removes the param. */
  const update = (values: Record<string, string>) =>
    setParams(
      (p) => {
        for (const [k, v] of Object.entries(values)) {
          if (v) p.set(k, v);
          else p.delete(k);
        }
        return p;
      },
      { replace: true },
    );

  // A specialization belongs to one field: picking it sets that field,
  // and picking another field drops a specialization that isn't in it.
  const field = params.get('field') ?? '';
  const specialization = params.get('specialization') ?? '';
  const pickField = (f: string) =>
    update({ field: f, specialization: fieldOf(specialization) === f ? specialization : '' });
  const pickSpecialization = (s: string) =>
    update(s ? { specialization: s, field: fieldOf(s) ?? '' } : { specialization: '' });

  // Tags are English in every language, so an option's label is its value.
  const opts = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));
  const specializations = field
    ? (SPECIALIZATIONS_BY_FIELD[field as FieldName] ?? [])
    : SPECIALIZATIONS;
  // Two rows: the position (field, specialization, level), then the interview.
  const selects = [
    { key: 'field', label: t('filters.field'), options: opts(FIELDS), onChange: pickField },
    {
      key: 'specialization',
      label: t('filters.specialization'),
      options: opts(specializations),
      onChange: pickSpecialization,
    },
    { key: 'level', label: t('filters.level'), options: opts(LEVELS) },
    { key: 'stage', label: t('filters.stage'), options: opts(STAGES) },
    { key: 'topic', label: t('filters.topic'), options: opts(TOPICS) },
    {
      key: 'difficulty',
      label: t('filters.difficulty'),
      options: opts(DIFFICULTIES),
    },
  ];
  const active = FILTERS.some((k) => params.get(k));

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="text-subtle pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('filters.search')}
            className="ps-10"
            aria-label={t('filters.search')}
          />
        </div>
        <Segmented
          label={t('filters.sort')}
          value={params.get('sort') ?? 'lastAsked'}
          onChange={(v) => update({ sort: v === 'lastAsked' ? '' : v })}
          items={[
            { value: 'lastAsked', label: t('sort.lastAsked') },
            { value: 'frequent', label: t('sort.frequent') },
            { value: 'newest', label: t('sort.newest') },
          ]}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {selects.map((s) => (
          <Dropdown
            key={s.key}
            label={s.label}
            value={params.get(s.key) ?? ''}
            onChange={s.onChange ?? ((v) => update({ [s.key]: v }))}
            options={[{ value: '', label: t('common.all') }, ...s.options]}
          />
        ))}
      </div>
      {active && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setQ('');
            setParams((p) => {
              FILTERS.forEach((k) => p.delete(k));
              return p;
            });
          }}
        >
          <X size={14} /> {t('filters.clear')}
        </Button>
      )}
    </div>
  );
}
