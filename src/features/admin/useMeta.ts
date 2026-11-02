import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { keys } from '@/lib/keys';
import type { Role } from '@/shared/types';

export const useMeta = () =>
  useQuery({
    queryKey: keys.meta,
    queryFn: () => api.get<{ permissions: Record<string, string> }>('/meta'),
    staleTime: Infinity,
  });

export const useRoles = () =>
  useQuery({
    queryKey: keys.admin.roles,
    queryFn: () => api.get<{ items: Role[] }>('/admin/roles'),
  });
