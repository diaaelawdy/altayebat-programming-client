import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, UserCheck, X } from 'lucide-react';
import { useState } from 'react';
import { LoadMore, usePaged } from '@/lib/paged';
import { api, ApiError } from '@/lib/api';
import { keys } from '@/lib/keys';
import { useI18n } from '@/i18n';
import type { UserRef } from '@/shared/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Badges';
import { EmptyState } from '@/components/ui/EmptyState';
import { Textarea } from '@/components/ui/Field';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { UserChip } from '@/components/ui/UserChip';

interface RoleRequestItem {
  id: string;
  user: UserRef | null;
  roleId: string;
  role: string;
  reason: string;
  createdAt: string;
}

/** Pending role requests (`users.assign_roles`). */
export function RoleRequestsPage() {
  const { t } = useI18n();
  const list = usePaged<RoleRequestItem>(keys.admin.roleRequests, '/admin/role-requests');
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">{t('nav.roleRequests')}</h1>
      <p className="text-subtle mt-1 text-sm">{t('roleRequests.subtitle')}</p>
      {list.isLoading ? (
        <ListSkeleton className="mt-6" />
      ) : list.items.length ? (
        <div className="mt-6 space-y-4">
          {list.items.map((r) => (
            <RequestCard key={r.id} r={r} />
          ))}
          <LoadMore {...list} />
        </div>
      ) : (
        <EmptyState
          className="mt-6"
          icon={<UserCheck size={20} />}
          title={t('roleRequests.empty')}
        />
      )}
    </div>
  );
}

function RequestCard({ r }: { r: RoleRequestItem }) {
  const { t, fmt } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const done = () => {
    void qc.invalidateQueries({ queryKey: keys.admin.roleRequests });
    void qc.invalidateQueries({ queryKey: keys.admin.counts });
    void qc.invalidateQueries({ queryKey: keys.admin.roles });
  };
  const onError = (e: unknown) =>
    toast(e instanceof ApiError ? e.message : t('common.error'), 'error');
  const approve = useMutation({
    mutationFn: () => api.post(`/admin/role-requests/${r.id}/approve`, {}),
    onSuccess: done,
    onError,
  });
  const reject = useMutation({
    mutationFn: () => api.post(`/admin/role-requests/${r.id}/reject`, { note: note.trim() }),
    onSuccess: done,
    onError,
  });

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <UserChip user={r.user} size={20} />
        <span className="text-subtle">→</span>
        <Tag>{r.role}</Tag>
        <span className="text-subtle text-xs">· {fmt.relative(r.createdAt)}</span>
      </div>
      <p className="text-muted mt-3 text-sm whitespace-pre-line" dir="auto">
        {r.reason}
      </p>
      {rejecting ? (
        <form
          className="mt-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            reject.mutate();
          }}
        >
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('roleRequests.note')}
            maxLength={500}
            dir="auto"
          />
          <div className="flex gap-2">
            <Button type="submit" variant="danger" disabled={reject.isPending}>
              <X size={16} /> {t('admin.review.reject')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setRejecting(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-4 flex gap-2">
          <Button variant="primary" onClick={() => approve.mutate()} disabled={approve.isPending}>
            <Check size={16} /> {t('admin.review.approve')}
          </Button>
          <Button variant="ghost" onClick={() => setRejecting(true)}>
            <X size={16} /> {t('admin.review.reject')}
          </Button>
        </div>
      )}
    </Card>
  );
}
