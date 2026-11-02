import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n';
import { ApiError } from '@/lib/api';
import type { Difficulty, QuestionTagDraft, QuestionTagFields } from '@/shared/types';
import { useEditTagsMutation } from './api';
import { TagPicker } from './TagPicker';
import { tagsComplete } from './tags';

/**
 * A moderator fixing a published question's tags. Old imported questions have no level,
 * so the level may stay empty here (it's left unchanged); new submissions always have one.
 */
export function EditTagsDialog({
  onClose,
  questionId,
  initial,
}: {
  onClose: () => void;
  questionId: string;
  initial: QuestionTagFields;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [tags, setTags] = useState<QuestionTagDraft>(() => ({
    field: initial.field,
    specializations: initial.specializations,
    levels: initial.levels,
    stage: initial.stage,
    difficulty: initial.difficulty,
    topics: initial.topics,
  }));
  const save = useEditTagsMutation(questionId);

  return (
    <Modal open onClose={onClose} title={t('q.editTags')}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          const { levels, difficulty, ...rest } = tags;
          save.mutate(
            { ...rest, difficulty: difficulty as Difficulty, ...(levels.length ? { levels } : {}) },
            {
              onSuccess: () => {
                toast(t('q.tagsSaved'));
                onClose();
              },
              onError: (err) =>
                toast(err instanceof ApiError ? err.message : t('common.error'), 'error'),
            },
          );
        }}
      >
        <TagPicker value={tags} onChange={setTags} />
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            type="submit"
            variant="primary"
            loading={save.isPending}
            disabled={!tagsComplete(tags, { requireLevel: false })}
          >
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
