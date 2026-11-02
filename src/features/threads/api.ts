import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryKey,
} from '@tanstack/react-query';
import { api, ApiError, qs } from '@/lib/api';
import { keys } from '@/lib/keys';
import type { Page, Post, RootPost } from '@/shared/types';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n';
import type { VoteValue } from './VoteButtons';

export interface ThreadConfig {
  kind: 'answer' | 'comment';
  queryKey: (sort: string) => QueryKey;
  listUrl: string;
  postUrl: string;
  itemUrl: (id: string) => string;
}

export const answerThread = (questionId: string): ThreadConfig => ({
  kind: 'answer',
  queryKey: (sort) => keys.answers(questionId, sort),
  listUrl: `/questions/${questionId}/answers`,
  postUrl: `/questions/${questionId}/answers`,
  itemUrl: (id) => `/answers/${id}`,
});

export const feedbackThread = (slug: string): ThreadConfig => ({
  kind: 'comment',
  queryKey: (sort) => keys.comments(slug, sort),
  listUrl: `/companies/${slug}/comments`,
  postUrl: `/companies/${slug}/comments`,
  itemUrl: (id) => `/comments/${id}`,
});

type Data = InfiniteData<Page<RootPost>>;

/** Applies `fn` to the post with `id` wherever it is (root or reply). */
function mapPost(data: Data | undefined, id: string, fn: (p: Post) => Post): Data | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((pg) => ({
      ...pg,
      items: pg.items.map((r) =>
        r.id === id
          ? { ...r, ...fn(r) }
          : { ...r, replies: r.replies.map((x) => (x.id === id ? fn(x) : x)) },
      ),
    })),
  };
}

/** Drops deleted replies with no live reply under them, then roots left the same way. */
export function prune(data: Data | undefined): Data | undefined {
  if (!data) return data;
  const pages = data.pages.map((pg) => ({
    ...pg,
    items: pg.items.flatMap((r) => {
      let replies = r.replies;
      for (;;) {
        const parents = new Set(replies.map((x) => x.parentId));
        const kept = replies.filter((x) => !x.deleted || parents.has(x.id));
        if (kept.length === replies.length) break;
        replies = kept;
      }
      return r.deleted && replies.length === 0 ? [] : [{ ...r, replies }];
    }),
  }));
  return { ...data, pages };
}

export function useThread(cfg: ThreadConfig, sort: string) {
  return useInfiniteQuery({
    queryKey: cfg.queryKey(sort),
    queryFn: ({ pageParam, signal }) =>
      api.get<Page<RootPost>>(
        `${cfg.listUrl}${qs({ sort, cursor: pageParam, limit: 15 })}`,
        signal,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 20_000,
  });
}

export function useThreadMutations(cfg: ThreadConfig, sort: string) {
  const qc = useQueryClient();
  const toast = useToast();
  const { t } = useI18n();
  const key = cfg.queryKey(sort);
  const allKeys = { queryKey: cfg.queryKey('').slice(0, -1) };
  const onError = (e: unknown) =>
    toast(e instanceof ApiError ? e.message : t('common.error'), 'error');

  const vote = useMutation({
    mutationFn: ({ id, value }: { id: string; value: VoteValue }) =>
      api.put<{ score: number; myVote: number }>('/votes', {
        targetType: cfg.kind,
        targetId: id,
        value,
      }),
    onMutate: async ({ id, value }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Data>(key);
      qc.setQueryData<Data>(key, (d) =>
        mapPost(d, id, (p) => ({ ...p, myVote: value, score: p.score - p.myVote + value })),
      );
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      onError(e);
    },
    onSuccess: (r, { id }) =>
      qc.setQueryData<Data>(key, (d) =>
        mapPost(d, id, (p) => ({ ...p, score: r.score, myVote: r.myVote })),
      ),
  });

  const create = useMutation({
    mutationFn: (input: { body: string; parentId?: string | null }) =>
      api.post<RootPost>(cfg.postUrl, input),
    onSuccess: (post) => {
      // Insert immediately: new root posts at the top, replies under their root.
      qc.setQueryData<Data>(key, (d) => {
        if (!d) return d;
        const [first, ...rest] = d.pages;
        if (!first) return d;
        if (!post.parentId)
          return { ...d, pages: [{ ...first, items: [post, ...first.items] }, ...rest] };
        return {
          ...d,
          pages: d.pages.map((pg) => ({
            ...pg,
            items: pg.items.map((r) =>
              r.id === post.rootId ? { ...r, replies: [...r.replies, post] } : r,
            ),
          })),
        };
      });
      void qc.invalidateQueries({ ...allKeys, refetchType: 'none' });
      void qc.invalidateQueries({ queryKey: keys.me });
    },
    onError,
  });

  const edit = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      api.patch<Post>(cfg.itemUrl(id), { body }),
    onSuccess: (post) =>
      qc.setQueryData<Data>(key, (d) =>
        mapPost(d, post.id, (p) => ({
          ...p,
          body: post.body,
          bodyHtml: post.bodyHtml,
          edited: true,
        })),
      ),
    onError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(cfg.itemUrl(id)),
    onSuccess: (_r, id) => {
      qc.setQueryData<Data>(key, (d) =>
        prune(
          mapPost(d, id, (p) => ({ ...p, deleted: true, body: '', bodyHtml: '', author: null })),
        ),
      );
      // Other sort orders refetch next time they're shown.
      void qc.invalidateQueries({ ...allKeys, refetchType: 'none' });
    },
    onError,
  });

  return { vote, create, edit, remove };
}
