import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { api, qs } from '@/lib/api';
import { keys } from '@/lib/keys';
import type {
  Company,
  Page,
  QuestionDetail,
  QuestionSummary,
  QuestionTagFields,
  Submission,
} from '@/shared/types';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n';

export const FILTER_KEYS = [
  'field',
  'specialization',
  'level',
  'stage',
  'topic',
  'difficulty',
  'q',
  'sort',
] as const;
export type QuestionFilters = Partial<Record<(typeof FILTER_KEYS)[number], string>>;

export function filtersFrom(params: URLSearchParams): QuestionFilters {
  const f: QuestionFilters = {};
  for (const k of FILTER_KEYS) {
    const v = params.get(k);
    if (v) f[k] = v;
  }
  return f;
}

export function useQuestionList(slug: string, filters: QuestionFilters) {
  return useInfiniteQuery({
    queryKey: keys.questions(slug, filters as Record<string, string>),
    queryFn: ({ pageParam, signal }) =>
      api.get<Page<QuestionSummary>>(
        `/companies/${slug}/questions${qs({ ...filters, cursor: pageParam, limit: 25 })}`,
        signal,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: (prev) => prev,
  });
}

const questionQuery = (slug: string, qslug: string, ctx: QuestionFilters) => ({
  queryKey: keys.question(slug, qslug, ctx as Record<string, string>),
  queryFn: () => api.get<QuestionDetail>(`/companies/${slug}/questions/${qslug}${qs(ctx)}`),
});

export const useQuestion = (slug: string, qslug: string, ctx: QuestionFilters) =>
  useQuery(questionQuery(slug, qslug, ctx));

export function prefetchQuestion(
  qc: QueryClient,
  slug: string,
  qslug: string,
  ctx: QuestionFilters,
) {
  void qc.prefetchQuery({ ...questionQuery(slug, qslug, ctx), staleTime: 60_000 });
}

/** Applies a patch to a question everywhere it's cached (lists and detail pages). */
type QuestionPatch = Partial<
  Pick<QuestionSummary, 'bookmarked' | 'studied' | 'timesAsked' | 'lastAskedAt'> & QuestionTagFields
>;
function patchQuestion(qc: QueryClient, id: string, patch: QuestionPatch) {
  qc.setQueriesData<InfiniteData<Page<QuestionSummary>>>(
    { queryKey: ['questions'] },
    (data) =>
      data && {
        ...data,
        pages: data.pages.map((p) => ({
          ...p,
          items: p.items.map((q) => (q.id === id ? { ...q, ...patch } : q)),
        })),
      },
  );
  qc.setQueriesData<QuestionDetail>({ queryKey: keys.questionAll }, (q) =>
    q && q.id === id ? { ...q, ...patch } : q,
  );
}

function snapshot(qc: QueryClient) {
  return [
    ...qc.getQueriesData({ queryKey: ['questions'] }),
    ...qc.getQueriesData({ queryKey: keys.questionAll }),
  ];
}

/** Bookmark / studied toggles with optimistic updates and rollback. */
export function useStudyToggle(kind: 'bookmark' | 'studied') {
  const qc = useQueryClient();
  const toast = useToast();
  const { t } = useI18n();
  return useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean; companySlug?: string }) =>
      on
        ? api.put<{ companyStudied?: number }>(`/questions/${id}/${kind}`)
        : api.delete<{ companyStudied?: number }>(`/questions/${id}/${kind}`),
    onMutate: async ({ id, on, companySlug }) => {
      await qc.cancelQueries({ queryKey: ['questions'] });
      const snap = snapshot(qc);
      const companySnap = companySlug
        ? qc.getQueryData<Company>(keys.company(companySlug))
        : undefined;
      patchQuestion(qc, id, kind === 'bookmark' ? { bookmarked: on } : { studied: on });
      if (kind === 'studied' && companySlug && companySnap) {
        qc.setQueryData<Company>(keys.company(companySlug), {
          ...companySnap,
          studied: Math.max(0, (companySnap.studied ?? 0) + (on ? 1 : -1)),
        });
      }
      return { snap, companySnap, companySlug };
    },
    onError: (_e, _v, ctx) => {
      ctx?.snap.forEach(([key, data]) => qc.setQueryData(key, data));
      if (ctx?.companySlug && ctx.companySnap)
        qc.setQueryData(keys.company(ctx.companySlug), ctx.companySnap);
      toast(t('common.error'), 'error');
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.me });
      void qc.invalidateQueries({ queryKey: ['my'] });
    },
  });
}

export function useAskedMutation(questionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      month: string;
      specialization?: string;
      level?: string;
      stage?: string;
      note?: string;
    }) =>
      api.post<{ timesAsked: number; lastAskedAt: string }>(`/questions/${questionId}/asked`, body),
    onSuccess: (r) => {
      patchQuestion(qc, questionId, { timesAsked: r.timesAsked, lastAskedAt: r.lastAskedAt });
      qc.setQueriesData<QuestionDetail>({ queryKey: keys.questionAll }, (q) =>
        q && q.id === questionId ? { ...q, askedByMe: true } : q,
      );
      void qc.invalidateQueries({ queryKey: keys.me });
    },
  });
}

/** A moderator fixing a question's tags (needs `questions.edit_any`). */
export function useEditTagsMutation(questionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tags: Partial<QuestionTagFields>) =>
      api.patch<Submission>(`/questions/${questionId}`, tags),
    onSuccess: ({ field, specializations, levels, stage, difficulty, topics }) => {
      patchQuestion(qc, questionId, { field, specializations, levels, stage, difficulty, topics });
      // Filtered lists may gain or lose the question.
      void qc.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}
