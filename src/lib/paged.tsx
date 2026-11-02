import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/Button';
import type { Page } from '@/shared/types';

/**
 * Every list on the site: pages of 20 from `{ items, nextCursor }` endpoints,
 * flattened, with the next page loaded by <LoadMore> as you scroll.
 */
export function usePaged<T>(key: QueryKey, path: string, opts: { enabled?: boolean } = {}) {
  const q = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam, signal }) => {
      const sep = path.includes('?') ? '&' : '?';
      return api.get<Page<T>>(
        pageParam ? `${path}${sep}cursor=${encodeURIComponent(pageParam)}` : path,
        signal,
      );
    },
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: opts.enabled ?? true,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  return { ...q, items };
}

/** Invisible trigger near the end of a list; falls back to a button if loading fails. */
export function LoadMore({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  isError,
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
  isError?: boolean;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !hasNextPage || isError) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isError]);

  if (!hasNextPage) return null;
  return (
    <div ref={ref} className="flex justify-center py-4">
      {isError ? (
        <Button variant="ghost" size="sm" onClick={() => void fetchNextPage()}>
          {t('common.loadMore')}
        </Button>
      ) : (
        <Loader2
          size={18}
          className={isFetchingNextPage ? 'text-subtle animate-spin' : 'text-subtle opacity-0'}
          aria-label={t('common.loading')}
        />
      )}
    </div>
  );
}
