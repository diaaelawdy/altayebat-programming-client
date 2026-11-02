import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useI18n } from '@/i18n';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip, Input } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useCan } from '@/features/auth/Can';
import { useRoles } from './useMeta';
import { StatusActions, StatusLabel } from './BanDialog';
import type { UserBan, UserStatus } from '@/shared/types';

interface Found {
  id: string;
  username: string;
  status: UserStatus;
  ban?: UserBan | null;
  roleId: string | null;
  avatar?: string | null;
}

/** Role assignment by exact username — works without access to the private users page. */
export function AssignRolesPage() {
  const { t } = useI18n();
  const toast = useToast();
  const can = useCan();
  const qc = useQueryClient();
  const roles = useRoles();
  const [q, setQ] = useState('');
  const [user, setUser] = useState<Found | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const onError = (e: unknown) =>
    toast(e instanceof ApiError ? e.message : t('common.error'), 'error');

  const find = useMutation({
    mutationFn: () =>
      api.get<{ user: Found | null }>(`/admin/user-lookup?q=${encodeURIComponent(q.trim())}`),
    onSuccess: (r) => {
      setUser(r.user);
      setSel(r.user?.roleId ?? null);
      if (!r.user) toast(t('common.notFound'), 'error');
    },
    onError,
  });
  const save = useMutation({
    mutationFn: () => api.put(`/admin/users/${user!.id}/role`, { roleId: sel }),
    onSuccess: () => {
      toast(t('common.saved'));
      setUser((u) => u && { ...u, roleId: sel });
      void qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">{t('admin.roles.assign')}</h1>
      <form
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) find.mutate();
        }}
      >
        <div className="relative flex-1">
          <Search
            size={16}
            className="text-subtle pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('admin.roles.findUser')}
            className="ps-10"
            dir="ltr"
          />
        </div>
        <Button type="submit" loading={find.isPending}>
          {t('common.search')}
        </Button>
      </form>
      {user && (
        <Card className="mt-6 space-y-5 p-5">
          <div className="flex items-center gap-3">
            <Avatar name={user.username} avatar={user.avatar} size={40} />
            <div className="flex-1">
              <p className="font-semibold">@{user.username}</p>
              <p className="text-sm">
                <StatusLabel status={user.status} ban={user.ban} />
              </p>
            </div>
            <StatusActions
              user={user}
              onChange={(status, ban) => setUser((u) => u && { ...u, status, ban })}
            />
          </div>
          {can('users.assign_roles') && (
            <>
              <div
                role="radiogroup"
                aria-label={t('admin.users.role')}
                className="flex flex-wrap gap-2"
              >
                {roles.data?.items.map((r) => (
                  <Chip key={r.id} active={sel === r.id} onClick={() => setSel(r.id)}>
                    {r.name}
                  </Chip>
                ))}
              </div>
              <p className="text-subtle text-xs">{t('admin.users.oneRole')}</p>
              <Button
                variant="primary"
                onClick={() => save.mutate()}
                loading={save.isPending}
                disabled={!sel || sel === user.roleId}
              >
                {t('common.save')}
              </Button>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
