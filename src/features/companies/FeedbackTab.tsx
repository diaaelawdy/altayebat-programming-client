import { useMemo } from 'react';
import { Thread } from '@/features/threads/Thread';
import { feedbackThread } from '@/features/threads/api';
import { useI18n } from '@/i18n';

export default function FeedbackTab({ slug }: { slug: string }) {
  const { t } = useI18n();
  const cfg = useMemo(() => feedbackThread(slug), [slug]);
  return (
    <Thread
      cfg={cfg}
      title={t('thread.feedback')}
      subtitle={t('thread.feedbackSub')}
      emptyText={t('thread.emptyFeedback')}
      placeholder={t('thread.writeFeedback')}
    />
  );
}
