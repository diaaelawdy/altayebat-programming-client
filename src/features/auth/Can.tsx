import type { ReactNode } from 'react';
import type { Permission } from '@/shared/permissions';
import { useMe } from './useMe';

/** Returns a checker for the current user's effective permissions (from /me). */
export function useCan() {
  const { me } = useMe();
  const set = new Set(me?.permissions ?? []);
  return (...perms: Permission[]) => perms.every((p) => set.has(p));
}

/**
 * Renders children only when the user holds the permission(s). Without them,
 * the UI simply isn't there — no disabled buttons hinting at hidden powers.
 */
export function Can({
  permission,
  any,
  children,
  fallback = null,
}: {
  permission?: Permission | Permission[];
  any?: Permission[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const can = useCan();
  const all = permission ? (Array.isArray(permission) ? permission : [permission]) : [];
  const ok = (all.length === 0 || can(...all)) && (!any || any.some((p) => can(p)));
  return <>{ok ? children : fallback}</>;
}
