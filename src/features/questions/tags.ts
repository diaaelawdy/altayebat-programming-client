import { SPECIALIZATIONS_BY_FIELD, type FieldName } from '@/shared/constants';
import type { QuestionTagDraft } from '@/shared/types';

export const emptyTags = (): QuestionTagDraft => ({
  field: '',
  specializations: [],
  levels: [],
  stage: '',
  difficulty: '',
  topics: [],
});

/** Every required facet is picked. Moderators fixing old questions may leave the level empty. */
export const tagsComplete = (v: QuestionTagDraft, { requireLevel = true } = {}) =>
  Boolean(v.field && v.stage && v.difficulty) &&
  v.topics.length > 0 &&
  (!requireLevel || v.levels.length > 0);

/** The specializations of a field (none for General or an unknown field). */
export const specializationsOf = (field: string): readonly string[] =>
  SPECIALIZATIONS_BY_FIELD[field as FieldName] ?? [];
