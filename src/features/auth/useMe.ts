import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { keys } from '@/lib/keys';
import type { MeResponse } from '@/shared/types';

export function useMeQuery() {
  return useQuery({
    queryKey: keys.me,
    queryFn: () => api.get<MeResponse>('/me'),
    staleTime: 30_000,
    // Picks up role/permission changes and new notifications without a reload.
    refetchInterval: 60_000,
  });
}

/** The signed-in user, or null. */
export function useMe() {
  const { data, isLoading } = useMeQuery();
  return {
    me: data?.user ?? null,
    loading: isLoading,
  };
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      qc.clear();
      window.location.assign('/');
    },
  });
}
