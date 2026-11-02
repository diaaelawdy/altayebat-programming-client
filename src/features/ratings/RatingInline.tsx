import { Stars } from '@/components/ui/Stars';
import { useI18n } from '@/i18n';
import type { Company } from '@/shared/types';

export function RatingInline({ rating }: { rating: Company['rating'] }) {
  const { t } = useI18n();
  if (!rating.count) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <Stars value={rating.overall} />
      <span className="font-medium tabular-nums">{rating.overall.toFixed(1)}</span>
      <span className="text-subtle">({t('companies.reviews', { n: rating.count })})</span>
    </span>
  );
}
