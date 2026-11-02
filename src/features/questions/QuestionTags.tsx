import { DifficultyBadge, Tag } from '@/components/ui/Badges';
import type { QuestionTagDraft } from '@/shared/types';

/**
 * The standard tag line, the same everywhere a question is shown:
 * Field · Specialization · Level · Stage · Difficulty · Topic.
 * Tags are always in English, whatever the interface language.
 * Several values share one chip ("Junior / Mid"); facets with nothing in them are skipped.
 * Renders only the chips, so callers can put their own around them.
 */
export function QuestionTags({ q }: { q: QuestionTagDraft }) {
  return (
    <>
      {q.field && <Tag>{q.field}</Tag>}
      {q.specializations.length > 0 && <Tag>{q.specializations.join(' / ')}</Tag>}
      {q.levels.length > 0 && <Tag>{q.levels.join(' / ')}</Tag>}
      {q.stage && <Tag>{q.stage}</Tag>}
      {q.difficulty && <DifficultyBadge value={q.difficulty} />}
      {q.topics.length > 0 && <Tag>{q.topics.join(' / ')}</Tag>}
    </>
  );
}
