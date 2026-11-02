import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n';
import { LEVELS, STAGES } from '@/shared/constants';
import { ApiError } from '@/lib/api';
import { useAskedMutation } from './api';
import { SpecializationOptions } from './TagPicker';

export function AskedDialog({
  open,
  onClose,
  questionId,
  defaultStage,
}: {
  open: boolean;
  onClose: () => void;
  questionId: string;
  defaultStage: string;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const thisMonth = new Date().toISOString().slice(0, 7);
  const [v, setV] = useState({
    month: thisMonth,
    specialization: '',
    level: '',
    stage: defaultStage,
    note: '',
  });
  const asked = useAskedMutation(questionId);
  return (
    <Modal open={open} onClose={onClose} title={t('asked.title')} description={t('asked.subtitle')}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          asked.mutate(v, {
            onSuccess: (r) => {
              toast(t('asked.thanks', { n: r.timesAsked }));
              onClose();
            },
            onError: (err) =>
              toast(err instanceof ApiError ? err.message : t('common.error'), 'error'),
          });
        }}
      >
        <Field label={t('asked.month')}>
          {(id) => (
            <Input
              id={id}
              type="month"
              max={thisMonth}
              min="2015-01"
              value={v.month}
              onChange={(e) => setV((s) => ({ ...s, month: e.target.value }))}
              required
            />
          )}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('asked.specialization')} optional={t('common.optional')}>
            {(id) => (
              <Select
                id={id}
                value={v.specialization}
                onChange={(e) => setV((s) => ({ ...s, specialization: e.target.value }))}
              >
                <option value="">—</option>
                <SpecializationOptions />
              </Select>
            )}
          </Field>
          <Field label={t('asked.level')} optional={t('common.optional')}>
            {(id) => (
              <Select
                id={id}
                value={v.level}
                onChange={(e) => setV((s) => ({ ...s, level: e.target.value }))}
              >
                <option value="">—</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('asked.stage')} optional={t('common.optional')}>
            {(id) => (
              <Select
                id={id}
                value={v.stage}
                onChange={(e) => setV((s) => ({ ...s, stage: e.target.value }))}
              >
                <option value="">—</option>
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label={t('asked.note')} optional={t('common.optional')}>
          {(id) => (
            <Textarea
              id={id}
              maxLength={300}
              value={v.note}
              onChange={(e) => setV((s) => ({ ...s, note: e.target.value }))}
              className="min-h-20"
            />
          )}
        </Field>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" variant="primary" loading={asked.isPending}>
            {t('common.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
