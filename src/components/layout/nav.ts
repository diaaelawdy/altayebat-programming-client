import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { keys } from '@/lib/keys';
import { useCan } from '@/features/auth/Can';

const ADMIN_LINKS = [
  { to: '/admin/review', key: 'nav.review', perm: 'questions.review', count: 'pendingQuestions' },
  {
    to: '/admin/company-review',
    key: 'nav.companyReview',
    perm: 'companies.review',
    count: 'pendingCompanies',
  },
  {
    to: '/admin/reports?source=system',
    key: 'nav.flagged',
    perm: 'reports.review',
    count: 'flaggedContent',
  },
  { to: '/admin/reports', key: 'nav.reports', perm: 'reports.review', count: 'openReports' },
  { to: '/admin/companies', key: 'nav.companiesAdmin', perm: 'companies.edit' },
  { to: '/admin/roles', key: 'nav.roles', perm: 'roles.manage' },
  { to: '/admin/assign', key: 'admin.roles.assign', perm: 'users.assign_roles' },
  { to: '/admin/users', key: 'nav.users', perm: 'users.view_private' },
  { to: '/admin/analytics', key: 'nav.analytics', perm: 'analytics.view' },
] as const;

export type AdminLink = (typeof ADMIN_LINKS)[number];

/** Admin links the current user may see, plus their pending counts. */
export function useAdminLinks() {
  const can = useCan();
  const links = ADMIN_LINKS.filter((l) => can(l.perm));
  const counts = useQuery({
    queryKey: keys.admin.counts,
    queryFn: () =>
      api.get<{
        pendingQuestions: number | null;
        pendingCompanies: number | null;
        openReports: number | null;
        flaggedContent: number | null;
      }>('/admin/counts'),
    enabled: links.some((l) => 'count' in l),
    refetchInterval: 120_000,
  });
  const countOf = (l: AdminLink) => ('count' in l ? (counts.data?.[l.count] ?? 0) : 0);
  return { links, countOf };
}
