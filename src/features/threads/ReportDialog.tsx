import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/api';
import { useI18n } from '@/i18n';

export type ReportTarget = 'answer' | 'comment' | 'review' | 'question' | 'message' | 'user';

/** Report anything; the reason is optional. */
export function ReportDialog({
  target,
  onClose,
}: {
  target: { type: ReportTarget; id: string } | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const send = useMutation({
    mutationFn: () =>
      api.post('/reports', { targetType: target!.type, targetId: target!.id, reason }),
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.error'), 'error'),
    onSuccess: () => {
      toast(t('report.sent'));
      setReason('');
      onClose();
    },
  });
  return (
    <Modal open={Boolean(target)} onClose={onClose} title={t('report.title')}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          send.mutate();
        }}
      >
        <label className="block text-sm font-medium">
          {t('report.reason')}{' '}
          <span className="text-subtle font-normal">({t('common.optional')})</span>
          <Textarea
            className="mt-1.5"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('report.placeholder')}
            maxLength={500}
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" variant="primary" loading={send.isPending}>
            {t('common.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
