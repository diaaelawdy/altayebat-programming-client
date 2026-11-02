import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ban, MailX, PauseCircle, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useI18n } from '@/i18n';
import type { UserBan, UserStatus } from '@/shared/types';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/components/ui/Toast';
import { useCan } from '@/features/auth/Can';
import { cn } from '@/lib/cn';

type Mode = Exclude<UserStatus, 'active'>;

/** Disable or ban, with a required reason, an optional link, and whether messaging stays on. */
export function BanDialog({
  userId,
  username,
  open,
  onClose,
  onDone,
  mode = 'banned',
  current,
  editing = false,
  defaultLink = '',
}: {
  userId: string;
  username: string;
  open: boolean;
  onClose: () => void;
  onDone?: (status: Mode, ban: UserBan) => void;
  mode?: Mode;
  /** Prefills the form when editing an existing restriction. */
  current?: UserBan | null;
  /** Changing an existing restriction rather than applying a new one. */
  editing?: boolean;
  defaultLink?: string;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const qc = useQueryClient();
  const [reason, setReason] = useState(current?.reason ?? '');
  const [link, setLink] = useState(current?.link ?? defaultLink);
  const [canMessage, setCanMessage] = useState(current?.canMessage ?? true);
  const ban = useMutation({
    mutationFn: () =>
      api.put(`/admin/users/${userId}/status`, {
        status: mode,
        reason: reason.trim(),
        link: link.trim(),
        canMessage,
      }),
    onSuccess: () => {
      toast(t(mode === 'banned' ? 'ban.done' : 'disable.done', { u: username }));
      void qc.invalidateQueries({ queryKey: ['admin'] });
      onDone?.(mode, {
        reason: reason.trim(),
        link: link.trim(),
        at: new Date().toISOString(),
        canMessage,
      });
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.error'), 'error'),
  });
  const banning = mode === 'banned';
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t(banning ? 'ban.title' : 'disable.title', { u: username })}
      description={t(banning ? 'ban.subtitle' : 'disable.subtitle')}
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (reason.trim().length >= 3) ban.mutate();
        }}
      >
        <Field label={t('ban.reason')} hint={t('ban.reasonHint')}>
          {(id) => (
            <Textarea
              id={id}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={3}
              maxLength={500}
              autoFocus
              className="min-h-24"
            />
          )}
        </Field>
        <Field label={t('ban.link')} optional={t('common.optional')} hint={t('ban.linkHint')}>
          {(id) => (
            <Input
              id={id}
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="/c/noon/two-sum"
              dir="ltr"
              maxLength={500}
            />
          )}
        </Field>
        <div className="bg-surface-2 flex items-start gap-3 rounded-xl p-3">
          <div className="flex-1">
            <p className="text-sm font-medium">{t('ban.canMessage')}</p>
            <p className="text-subtle text-xs">{t('ban.canMessageHint')}</p>
          </div>
          <Switch
            on={canMessage}
            onChange={() => setCanMessage((v) => !v)}
            label={t('ban.canMessage')}
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            type="submit"
            variant="danger"
            loading={ban.isPending}
            disabled={reason.trim().length < 3}
          >
            {banning ? <Ban size={16} /> : <PauseCircle size={16} />}{' '}
            {t(editing ? 'common.save' : banning ? 'admin.users.ban' : 'admin.users.disable')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Colored status label; a crossed-out mail icon when messaging is off. */
export function StatusLabel({ status, ban }: { status: UserStatus; ban?: UserBan | null }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1',
        status === 'active' ? 'text-easy' : status === 'disabled' ? 'text-medium' : 'text-danger',
      )}
    >
      {t(`admin.users.${status}`)}
      {status !== 'active' && ban?.canMessage === false && (
        <MailX size={13} aria-label={t('admin.users.messagesOff')} />
      )}
    </span>
  );
}

/** Disable / ban / reactivate for holders of `users.ban`. */
export function StatusActions({
  user,
  onChange,
}: {
  user: { id: string; username: string | null; status: UserStatus; ban?: UserBan | null };
  onChange?: (status: UserStatus, ban: UserBan | null) => void;
}) {
  const { t } = useI18n();
  const can = useCan();
  const toast = useToast();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<{ mode: Mode; edit: boolean } | null>(null);
  const reactivate = useMutation({
    mutationFn: () => api.put(`/admin/users/${user.id}/status`, { status: 'active' }),
    onSuccess: () => {
      toast(t('admin.users.reactivated', { u: user.username ?? '' }));
      void qc.invalidateQueries({ queryKey: ['admin'] });
      onChange?.('active', null);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.error'), 'error'),
  });
  if (!can('users.ban')) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {user.status === 'active' ? (
        <>
          <Button
            size="sm"
            onClick={() => setDialog({ mode: 'disabled', edit: false })}
          >
            <PauseCircle size={14} /> {t('admin.users.disable')}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => setDialog({ mode: 'banned', edit: false })}
          >
            <Ban size={14} /> {t('admin.users.ban')}
          </Button>
        </>
      ) : (
        <>
          <Button
            size="sm"
            onClick={() => reactivate.mutate()}
            loading={reactivate.isPending}
          >
            <RotateCcw size={14} /> {t('admin.users.reactivate')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDialog({ mode: user.status as Mode, edit: true })}
          >
            {t('common.edit')}
          </Button>
          {user.status === 'disabled' && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => setDialog({ mode: 'banned', edit: false })}
            >
              <Ban size={14} /> {t('admin.users.ban')}
            </Button>
          )}
        </>
      )}
      {dialog && (
        <BanDialog
          key={`${dialog.mode}-${dialog.edit}`}
          userId={user.id}
          username={user.username ?? ''}
          open
          mode={dialog.mode}
          current={user.status === 'active' ? null : user.ban}
          editing={dialog.edit}
          onClose={() => setDialog(null)}
          onDone={(s, b) => onChange?.(s, b)}
        />
      )}
    </div>
  );
}
