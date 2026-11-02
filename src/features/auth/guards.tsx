import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Permission } from '@/shared/permissions';
import { useMe } from './useMe';
import { useCan } from './Can';
import { NotFoundPage } from '@/components/layout/NotFoundPage';
import { PageSkeleton } from '@/components/ui/Skeleton';

/** Signed-in routes. Guests go to the login page and come back afterwards. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { me, loading } = useMe();
  const loc = useLocation();
  if (loading) return <PageSkeleton />;
  if (!me)
    return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return <>{children}</>;
}

/** Permission-gated routes render a 404 — the page doesn't exist for you. */
export function RequirePermission({
  permission,
  any,
  children,
}: {
  permission?: Permission;
  any?: Permission[];
  children: ReactNode;
}) {
  const { me, loading } = useMe();
  const can = useCan();
  if (loading) return <PageSkeleton />;
  const ok = Boolean(me) && (!permission || can(permission)) && (!any || any.some((p) => can(p)));
  return ok ? <>{children}</> : <NotFoundPage />;
}
