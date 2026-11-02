import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { keys } from '@/lib/keys';
import { useI18n, type MessageKey } from '@/i18n';
import { useMe } from '@/features/auth/useMe';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Badges';
import { Field, Textarea } from '@/components/ui/Field';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';

interface RequestableRole {
  id: string;
  name: string;
  description: string;
}
interface MyRequest {
  id: string;
  role: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  note: string;
  createdAt: string;
}

const MIN_REASON = 10;

/** A member picks a role and says why; staff approve or reject it. */
export function RequestRolePage() {
  const { t, fmt } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  const { me } = useMe();
  const roles = useQuery({
    queryKey: keys.requestableRoles,
    queryFn: () => api.get<{ items: RequestableRole[] }>('/roles/requestable'),
  });
  const mine = useQuery({
    queryKey: keys.myRoleRequests,
    queryFn: () => api.get<{ items: MyRequest[] }>('/me/role-requests'),
  });
  const [roleId, setRoleId] = useState('');
  const [reason, setReason] = useState('');
  const submit = useMutation({
    mutationFn: () => api.post('/role-requests', { roleId, reason: reason.trim() }),
    onSuccess: () => {
      setReason('');
      setRoleId('');
      toast(t('roleRequest.sent'));
      void qc.invalidateQueries({ queryKey: keys.myRoleRequests });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.error'), 'error'),
  });
  const pending = mine.data?.items.some((r) => r.status === 'pending');
  const current = me?.role?.name;
  const options = (roles.data?.items ?? []).filter((r) => r.name !== current);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">{t('roleRequest.title')}</h1>
      <p className="text-subtle mt-1 text-sm">{t('roleRequest.subtitle')}</p>

      <Card className="mt-6 p-6">
        {roles.isLoading ? (
          <ListSkeleton />
        ) : pending ? (
          <p className="text-muted text-sm">{t('roleRequest.pendingNote')}</p>
        ) : !options.length ? (
          <p className="text-muted text-sm">{t('roleRequest.none')}</p>
        ) : (
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              submit.mutate();
            }}
          >
            <div role="radiogroup" aria-label={t('roleRequest.pick')} className="space-y-2">
              <p className="text-sm font-medium">{t('roleRequest.pick')}</p>
              {options.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={roleId === r.id}
                  onClick={() => setRoleId(r.id)}
                  className={cn(
                    'border-border hover:bg-surface-2 w-full rounded-xl border p-3 text-start transition-colors',
                    roleId === r.id && 'border-accent bg-accent-soft',
                  )}
                >
                  <div className="font-medium">{r.name}</div>
                  {r.description && <div className="text-subtle text-sm">{r.description}</div>}
                </button>
              ))}
            </div>
            <Field label={t('roleRequest.reason')} hint={t('roleRequest.reasonHint')}>
              {(id) => (
                <Textarea
                  id={id}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  minLength={MIN_REASON}
                  maxLength={1000}
                  required
                  dir="auto"
                />
              )}
            </Field>
            <Button
              type="submit"
              variant="primary"
              disabled={!roleId || reason.trim().length < MIN_REASON || submit.isPending}
            >
              {t('roleRequest.submit')}
            </Button>
          </form>
        )}
      </Card>

      {!!mine.data?.items.length && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">{t('roleRequest.history')}</h2>
          <div className="mt-3 space-y-3">
            {mine.data.items.map((r) => (
              <Card key={r.id} className="p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.role}</span>
                  <Tag
                    className={cn(
                      r.status === 'approved' && 'text-easy',
                      r.status === 'rejected' && 'text-hard',
                    )}
                  >
                    {t(`roleRequest.status.${r.status}` as MessageKey)}
                  </Tag>
                  <span className="text-subtle text-xs">· {fmt.relative(r.createdAt)}</span>
                </div>
                <p className="text-muted mt-2 whitespace-pre-line" dir="auto">
                  {r.reason}
                </p>
                {r.note && (
                  <p className="mt-2" dir="auto">
                    <span className="text-subtle">{t('roleRequest.noteLabel')}</span> {r.note}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
