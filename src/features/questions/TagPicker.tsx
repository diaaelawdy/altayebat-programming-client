import { Chip, Field, Select } from '@/components/ui/Field';
import { useI18n } from '@/i18n';
import { DIFFICULTIES, FIELDS, LEVELS, STAGES, TOPICS } from '@/shared/constants';
import type { QuestionTagDraft } from '@/shared/types';
import { QuestionTags } from './QuestionTags';
import { specializationsOf } from './tags';

/** At most this many picks per multi-choice facet. */
const MAX = 3;

/** Sets a question's tags: the same control wherever tags are picked. Tags are English-only. */
export function TagPicker({
  value,
  onChange,
}: {
  value: QuestionTagDraft;
  onChange: (v: QuestionTagDraft) => void;
}) {
  const { t } = useI18n();
  const set = <K extends keyof QuestionTagDraft>(k: K, v: QuestionTagDraft[K]) =>
    onChange({ ...value, [k]: v });
  const toggle = (k: 'specializations' | 'levels' | 'topics', v: string) => {
    const cur = value[k];
    set(k, cur.includes(v) ? cur.filter((x) => x !== v) : cur.length < MAX ? [...cur, v] : cur);
  };
  // A new field drops the specializations that belong to the old one.
  const pickField = (field: string) =>
    onChange({
      ...value,
      field,
      specializations: value.specializations.filter((s) => specializationsOf(field).includes(s)),
    });
  const nothingPicked =
    !value.field &&
    !value.stage &&
    !value.difficulty &&
    !value.levels.length &&
    !value.topics.length;

  return (
    <div className="space-y-5">
      <ChipGroup
        label={t('contribute.field')}
        values={FIELDS}
        selected={value.field ? [value.field] : []}
        onToggle={pickField}
        single
      />
      {value.field === 'General' ? (
        <p className="text-subtle text-sm">{t('contribute.generalHint')}</p>
      ) : (
        value.field && (
          <ChipGroup
            label={t('contribute.specializations')}
            values={specializationsOf(value.field)}
            selected={value.specializations}
            onToggle={(v) => toggle('specializations', v)}
            optional
          />
        )
      )}
      <ChipGroup
        label={t('contribute.levels')}
        values={LEVELS}
        selected={value.levels}
        onToggle={(v) => toggle('levels', v)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('contribute.stage')}>
          {(id) => (
            <Select id={id} value={value.stage} onChange={(e) => set('stage', e.target.value)}>
              <option value="">—</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t('contribute.difficulty')}>
          {(id) => (
            <Select
              id={id}
              value={value.difficulty}
              onChange={(e) => set('difficulty', e.target.value as QuestionTagDraft['difficulty'])}
            >
              <option value="">—</option>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <ChipGroup
        label={t('contribute.topics')}
        values={TOPICS}
        selected={value.topics}
        onToggle={(v) => toggle('topics', v)}
      />
      <div>
        <p className="mb-2 text-sm font-medium">{t('contribute.tagsPreview')}</p>
        <div className="flex min-h-6 flex-wrap items-center gap-1.5">
          {nothingPicked ? (
            <span className="text-subtle text-sm">—</span>
          ) : (
            <QuestionTags q={value} />
          )}
        </div>
      </div>
    </div>
  );
}

/** `<option>`s for a native select: every specialization, grouped by field. */
export function SpecializationOptions() {
  return (
    <>
      {FIELDS.filter((f) => specializationsOf(f).length > 0).map((f) => (
        <optgroup key={f} label={f}>
          {specializationsOf(f).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

export function ChipGroup({
  label,
  values,
  selected,
  onToggle,
  optional,
  single,
}: {
  label: string;
  values: readonly string[];
  selected: string[];
  onToggle: (v: string) => void;
  optional?: boolean;
  /** Exactly one choice (radio buttons) instead of several toggles. */
  single?: boolean;
}) {
  const { t } = useI18n();
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">
        {label}{' '}
        {optional && <span className="text-subtle font-normal">({t('common.optional')})</span>}
      </legend>
      <div className="flex flex-wrap gap-2" role={single ? 'radiogroup' : undefined}>
        {values.map((v) => (
          <Chip key={v} active={selected.includes(v)} onClick={() => onToggle(v)} radio={single}>
            {v}
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}
