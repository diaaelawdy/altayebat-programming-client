import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { SearchX } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/i18n';
import { filtersFrom, useQuestionList } from './api';
import { QuestionRow } from './QuestionRow';

/** Window-virtualized, cursor-paginated list: stays smooth with thousands of rows. */
export function QuestionList({ companySlug }: { companySlug: string }) {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const filters = useMemo(() => filtersFrom(params), [params]);
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPlaceholderData,
  } = useQuestionList(companySlug, filters);
  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const listRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  useLayoutEffect(() => {
    setOffset(listRef.current?.offsetTop ?? 0);
  }, [isLoading]);

  const v = useWindowVirtualizer({
    count: items.length,
    estimateSize: () => 96,
    overscan: 8,
    scrollMargin: offset,
    gap: 10,
  });
  const vItems = v.getVirtualItems();
  const last = vItems[vItems.length - 1];

  useEffect(() => {
    if (last && last.index >= items.length - 6 && hasNextPage && !isFetchingNextPage)
      void fetchNextPage();
  }, [last, items.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) return <ListSkeleton />;
  if (isError)
    return (
      <EmptyState title={t('common.error')}>
        <Button onClick={() => void refetch()} className="mt-2">
          {t('common.retry')}
        </Button>
      </EmptyState>
    );
  if (!items.length) return <EmptyState icon={<SearchX size={20} />} title={t('q.empty')} />;

  return (
    <div
      ref={listRef}
      className={isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}
    >
      <div style={{ height: v.getTotalSize(), position: 'relative' }}>
        {vItems.map((row) => {
          const q = items[row.index]!;
          return (
            <div
              key={q.id}
              data-index={row.index}
              ref={v.measureElement}
              className="absolute inset-x-0"
              style={{ transform: `translateY(${row.start - v.options.scrollMargin}px)` }}
            >
              <QuestionRow q={q} companySlug={companySlug} ctx={filters} />
            </div>
          );
        })}
      </div>
      {isFetchingNextPage && <ListSkeleton rows={2} className="mt-3" />}
    </div>
  );
}
