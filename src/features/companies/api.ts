import { useQuery, type QueryClient } from '@tanstack/react-query';
import { api, qs } from '@/lib/api';
import { keys } from '@/lib/keys';
import type { Company } from '@/shared/types';

export const companyQuery = (slug: string) => ({
  queryKey: keys.company(slug),
  queryFn: () => api.get<Company>(`/companies/${slug}`),
});

export function useCompanies(q: string, sort: string) {
  return useQuery({
    queryKey: keys.companies(q, sort),
    queryFn: ({ signal }) => api.get<{ items: Company[] }>(`/companies${qs({ q, sort })}`, signal),
    placeholderData: (prev) => prev,
    staleTime: 2 * 60_000,
  });
}

export const useCompany = (slug: string) => useQuery(companyQuery(slug));

/** Hover/focus prefetch so the company page opens instantly. */
export function prefetchCompany(qc: QueryClient, slug: string) {
  void qc.prefetchQuery({ ...companyQuery(slug), staleTime: 60_000 });
}
