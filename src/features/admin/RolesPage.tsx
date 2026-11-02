import { useMutation, useQueryClient } from '@tanstack/react-query';
import { m } from 'framer-motion';
import { Crown, Lock, Pencil, Plus, Search, Shield, Trash2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '@/lib/api';
import { keys } from '@/lib/keys';
import { cn } from '@/lib/cn';
import { useI18n, type MessageKey } from '@/i18n';
import { PERMISSIONS, type Permission } from '@/shared/permissions';
import type { Role } from '@/shared/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { Switch } from '@/components/ui/Switch';
import { useMeta, useRoles } from './useMeta';
import { useConfirm } from '@/components/ui/confirmContext';

/** Permissions grouped by area; the group comes from the key prefix. */
const GROUPS: { key: MessageKey; prefixes: string[] }[] = [
  { key: 'admin.roles.group.questions', prefixes: ['questions'] },
  { key: 'admin.roles.group.discussion', prefixes: ['answers', 'comments'] },
  { key: 'admin.roles.group.companies', prefixes: ['companies', 'ratings'] },
  { key: 'admin.roles.group.moderation', prefixes: ['reports', 'moderation', 'messages', 'logs'] },
  { key: 'admin.roles.group.people', prefixes: ['users', 'roles'] },
];
const groupOf = (p: Permission) => GROUPS.findIndex((g) => g.prefixes.includes(p.split('.')[0]!));

type Editing = { role: Role | null; name: string; description: string } | null;

/** Master–detail: pick a role on the start side, edit its permissions on the other. */
export function RolesPage() {
  const confirm = useConfirm();
  const { t } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  const meta = useMeta();
  const { data, isLoading } = useRoles();
  const [params, setParams] = useSearchParams();
  const [roleQuery, setRoleQuery] = useState('');
  const [permQuery, setPermQuery] = useState('');
  const [editing, setEditing] = useState<Editing>(null);
  const onError = (e: unknown) =>
    toast(e instanceof ApiError ? e.message : t('common.error'), 'error');

  const roles = useMemo(() => data?.items ?? [], [data]);
  const selected =
    roles.find((r) => r.id === params.get('role')) ??
    roles.find((r) => r.isDefault) ??
    roles[0] ??
    null;
  const select = (id: string) =>
    setParams(
      (p) => {
        p.set('role', id);
        return p;
      },
      { replace: true },
    );

  const filteredRoles = roles.filter((r) =>
    r.name.toLowerCase().includes(roleQuery.trim().toLowerCase()),
  );

  const setPerms = useMutation({
    mutationFn: ({ role, permissions }: { role: Role; permissions: Permission[] }) =>
      api.patch(`/admin/roles/${role.id}`, { permissions }),
    onMutate: async ({ role, permissions }) => {
      const prev = qc.getQueryData<{ items: Role[] }>(keys.admin.roles);
      qc.setQueryData<{ items: Role[] }>(
        keys.admin.roles,
        (d) => d && { items: d.items.map((r) => (r.id === role.id ? { ...r, permissions } : r)) },
      );
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.admin.roles, ctx.prev);
      onError(e);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: keys.me }),
  });
  const save = useMutation({
    mutationFn: (e: NonNullable<Editing>) =>
      e.role
        ? api.patch<Role>(`/admin/roles/${e.role.id}`, { name: e.name, description: e.description })
        : // No permissions sent: a new role starts with Member's.
          api.post<Role>('/admin/roles', { name: e.name, description: e.description }),
    onSuccess: (role) => {
      setEditing(null);
      if (role?.id) select(role.id);
      void qc.invalidateQueries({ queryKey: keys.admin.roles });
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/roles/${id}`),
    onSuccess: () => {
      setParams((p) => {
        p.delete('role');
        return p;
      });
      void qc.invalidateQueries({ queryKey: keys.admin.roles });
    },
    onError,
  });

  const toggle = (role: Role, perms: Permission[], on: boolean) => {
    const set = new Set(role.permissions);
    for (const p of perms) {
      if (on) set.add(p);
      else set.delete(p);
    }
    setPerms.mutate({ role, permissions: PERMISSIONS.filter((p) => set.has(p)) });
  };

  const pq = permQuery.trim().toLowerCase();
  const visiblePerms = PERMISSIONS.filter(
    (p) =>
      !pq ||
      p.includes(pq) ||
      (meta.data?.permissions[p] ?? '').toLowerCase().includes(pq) ||
      t(`perm.${p}` as MessageKey)
        .toLowerCase()
        .includes(pq),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t('admin.roles.title')}</h1>
          <p className="text-subtle mt-1 text-sm">{t('admin.roles.founderNote')}</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setEditing({ role: null, name: '', description: '' })}
        >
          <Plus size={16} /> {t('admin.roles.new')}
        </Button>
      </div>

      {isLoading ? (
        <ListSkeleton className="mt-6" />
      ) : (
        <div className="mt-6 grid items-start gap-4 lg:grid-cols-[280px_1fr]">
          {/* Role list */}
          <Card className="p-2 lg:sticky lg:top-20">
            <div className="relative p-1">
              <Search
                size={15}
                className="text-subtle pointer-events-none absolute start-4 top-1/2 -translate-y-1/2"
              />
              <Input
                value={roleQuery}
                onChange={(e) => setRoleQuery(e.target.value)}
                placeholder={t('admin.roles.searchRoles')}
                aria-label={t('admin.roles.searchRoles')}
                className="h-10 py-2 ps-9 text-sm"
              />
            </div>
            <ul className="mt-1 max-h-[60vh] space-y-0.5 overflow-y-auto p-1" role="listbox">
              {filteredRoles.map((r) => {
                const active = r.id === selected?.id;
                const count = r.isFounder ? PERMISSIONS.length : r.permissions.length;
                return (
                  <li key={r.id} role="option" aria-selected={active}>
                    <button
                      onClick={() => select(r.id)}
                      className={cn(
                        'relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm transition-colors',
                        active ? 'text-fg' : 'text-muted hover:bg-surface-2',
                      )}
                    >
                      {active && (
                        <m.span
                          layoutId="role-active"
                          className="bg-surface-3 absolute inset-0 rounded-xl"
                          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                        />
                      )}
                      <RoleIcon role={r} className="relative shrink-0" />
                      <span className="relative min-w-0 flex-1">
                        <span className="block truncate font-medium">{r.name}</span>
                        <span className="text-subtle block text-xs">
                          {t('admin.roles.users', { n: r.userCount })}
                        </span>
                      </span>
                      <span className="text-subtle relative text-xs tabular-nums">
                        {count}/{PERMISSIONS.length}
                      </span>
                    </button>
                  </li>
                );
              })}
              {filteredRoles.length === 0 && (
                <li className="text-subtle px-3 py-6 text-center text-sm">
                  {t('common.noResults')}
                </li>
              )}
            </ul>
          </Card>

          {/* Selected role */}
          {selected && (
            <m.div
              key={selected.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              <Card className="flex flex-wrap items-center gap-4 p-5">
                <div className="bg-accent-soft text-accent grid h-12 w-12 place-items-center rounded-2xl">
                  <RoleIcon role={selected} size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-xl font-semibold">{selected.name}</h2>
                  <p className="text-subtle text-sm">
                    {selected.description || t('admin.roles.noDescription')}
                  </p>
                </div>
                <span className="text-subtle flex items-center gap-1.5 text-sm">
                  <Users size={15} /> {t('admin.roles.users', { n: selected.userCount })}
                </span>
                {!selected.isSystem && (
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t('common.edit')}
                      onClick={() =>
                        setEditing({
                          role: selected,
                          name: selected.name,
                          description: selected.description,
                        })
                      }
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="hover:text-danger"
                      aria-label={`${t('common.delete')} ${selected.name}`}
                      onClick={() =>
                        void confirm({
                          title: `${t('common.delete')} ${selected.name}?`,
                          body: t('admin.roles.deleteConfirm'),
                        }).then((ok) => ok && remove.mutate(selected.id))
                      }
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                )}
              </Card>

              <div className="relative">
                <Search
                  size={15}
                  className="text-subtle pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2"
                />
                <Input
                  value={permQuery}
                  onChange={(e) => setPermQuery(e.target.value)}
                  placeholder={t('admin.roles.searchPerms')}
                  aria-label={t('admin.roles.searchPerms')}
                  className="ps-10"
                />
              </div>

              {GROUPS.map((g, gi) => {
                const perms = visiblePerms.filter((p) => groupOf(p) === gi);
                if (!perms.length) return null;
                const onCount = perms.filter(
                  (p) => selected.isFounder || selected.permissions.includes(p),
                ).length;
                const allOn = onCount === perms.length;
                return (
                  <Card key={g.key} className="overflow-hidden">
                    <div className="border-border flex items-center gap-3 border-b px-5 py-3">
                      <h3 className="flex-1 text-sm font-semibold">{t(g.key)}</h3>
                      <span className="text-subtle text-xs tabular-nums">
                        {onCount}/{perms.length}
                      </span>
                      {!selected.isFounder && (
                        <button
                          onClick={() => toggle(selected, perms, !allOn)}
                          className="text-accent text-xs font-medium hover:underline"
                        >
                          {allOn ? t('admin.roles.disableAll') : t('admin.roles.enableAll')}
                        </button>
                      )}
                    </div>
                    <ul>
                      {perms.map((p) => {
                        const on = selected.isFounder || selected.permissions.includes(p);
                        return (
                          <li
                            key={p}
                            className="border-border hover:bg-surface-2 flex items-center gap-4 border-b px-5 py-3 transition-colors last:border-0"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">{t(`perm.${p}` as MessageKey)}</p>
                              <code className="text-subtle font-mono text-[11px]">{p}</code>
                            </div>
                            <Switch
                              on={on}
                              disabled={selected.isFounder}
                              onChange={() => toggle(selected, [p], !on)}
                              label={`${selected.name}: ${p}`}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                );
              })}
            </m.div>
          )}
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.role ? t('admin.roles.edit') : t('admin.roles.new')}
        description={editing && !editing.role ? t('admin.roles.newHint') : undefined}
      >
        {editing && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(editing);
            }}
          >
            <Input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder={t('admin.roles.name')}
              aria-label={t('admin.roles.name')}
              required
              minLength={2}
              maxLength={40}
              autoFocus
            />
            <Textarea
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              placeholder={t('admin.roles.description')}
              aria-label={t('admin.roles.description')}
              maxLength={200}
              className="min-h-20"
            />
            <div className="flex justify-end gap-2">
              <Button onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
              <Button type="submit" variant="primary" loading={save.isPending}>
                {t('common.save')}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function RoleIcon({
  role,
  size = 16,
  className,
}: {
  role: Role;
  size?: number;
  className?: string;
}) {
  if (role.isFounder) return <Crown size={size} className={cn('text-medium', className)} />;
  if (role.isSystem) return <Lock size={size} className={cn('text-subtle', className)} />;
  return <Shield size={size} className={cn('text-accent', className)} />;
}
