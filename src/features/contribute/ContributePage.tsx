import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, m } from 'framer-motion';
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  Check,
  Download,
  FileJson,
  FileText,
  PartyPopper,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '@/lib/api';
import { useI18n } from '@/i18n';
import { BULK_MAX_KB, BULK_MAX_QUESTIONS, LINKEDIN_RE, questionFormSchema } from '@/shared/schemas';
import { DIFFICULTIES, LEVELS, SPECIALIZATIONS_BY_FIELD, STAGES, TOPICS } from '@/shared/constants';
import type { Company, Difficulty, QuestionTagDraft } from '@/shared/types';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { useToast } from '@/components/ui/Toast';
import { useMe } from '@/features/auth/useMe';
import { useCan } from '@/features/auth/Can';
import { useCompanies } from '@/features/companies/api';
import { TagPicker } from '@/features/questions/TagPicker';
import { emptyTags, tagsComplete } from '@/features/questions/tags';
import { cn } from '@/lib/cn';
import { useDebounced } from '@/lib/hooks';
import { useDrafts } from '@/features/drafts/drafts';
import { DraftList, useUnsavedGuard } from '@/features/drafts/UnsavedGuard';
import { SectionTitle } from '@/components/ui/Card';

interface Form {
  company: Company | null;
  newCompany: string;
  newCompanyLinkedin: string;
  title: string;
  tags: QuestionTagDraft;
  askedMonth: string;
  problem: string;
  examples: { input: string; output: string; explanation: string }[];
  constraints: string[];
  lookFor: string;
  followUps: string[];
}

const empty = (): Form => ({
  company: null,
  newCompany: '',
  newCompanyLinkedin: '',
  title: '',
  tags: emptyTags(),
  askedMonth: new Date().toISOString().slice(0, 7),
  problem: '',
  examples: [],
  constraints: [],
  lookFor: '',
  followUps: [],
});

/** Drafts saved before the tags changed have no `tags`: keep their stage and difficulty. */
function fromDraft(data: Partial<Form>): Form {
  const {
    domains: _domains,
    roles: _roles,
    stage,
    difficulty,
    ...rest
  } = data as Partial<Form> & Record<'domains' | 'roles' | 'stage' | 'difficulty', unknown>;
  return {
    ...empty(),
    ...rest,
    tags: {
      ...emptyTags(),
      ...(typeof stage === 'string' ? { stage } : {}),
      ...(typeof difficulty === 'string' ? { difficulty: difficulty as Difficulty | '' } : {}),
      ...rest.tags,
    },
  };
}

export function ContributePage() {
  const { t } = useI18n();
  const { me } = useMe();
  const can = useCan();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(empty);
  const [done, setDone] = useState(false);
  const [doneCount, setDoneCount] = useState(1);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [ndaOk, setNdaOk] = useState(false);
  const [bulk, setBulk] = useState<Bulk>(emptyBulk);
  const toast = useToast();
  const qc = useQueryClient();
  const drafts = useDrafts<Form>('question');
  const [params, setParams] = useSearchParams();
  const [draftId, setDraftId] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<Form>(f);
  const dirty = !done && JSON.stringify(f) !== JSON.stringify(baseline);

  const load = (data: Form, id: string | null) => {
    setF(data);
    setBaseline(data);
    setDraftId(id);
    setStep(0);
  };
  // Open a draft from a link (`/contribute?draft=<id>`), then drop the param.
  const linked = params.get('draft');
  useEffect(() => {
    if (!linked || !drafts.enabled) return;
    const d = drafts.get(linked);
    if (d) load(fromDraft(d.data), d.id);
    setParams((p) => (p.delete('draft'), p), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linked, drafts.enabled]);

  const saveDraft = () => {
    const id = drafts.save('question', f, f.title, draftId);
    setDraftId(id);
    setBaseline(f);
    return id;
  };
  const guard = useUnsavedGuard({ dirty, saveDraft });
  const steps = [
    t('contribute.step.company'),
    t('contribute.step.details'),
    t('contribute.step.problem'),
    t('contribute.step.extras'),
  ];

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));

  const payload = () => ({
    title: f.title,
    ...f.tags,
    problem: f.problem,
    examples: f.examples
      .filter((e) => e.input.trim() && e.output.trim())
      .map((e) => ({ ...e, explanation: e.explanation || undefined })),
    constraints: f.constraints.filter((c) => c.trim()),
    lookFor: f.lookFor || undefined,
    followUps: f.followUps.filter((c) => c.trim()),
    askedMonth: f.askedMonth || undefined,
  });
  const parsed = questionFormSchema.safeParse(payload());
  const companyValid = Boolean(
    f.company || (f.newCompany.trim().length >= 2 && LINKEDIN_RE.test(f.newCompanyLinkedin.trim())),
  );
  const companyPayload = () =>
    f.company
      ? { companyId: f.company.id }
      : {
          newCompany: { name: f.newCompany.trim(), linkedinUrl: f.newCompanyLinkedin.trim() },
        };
  const stepValid = [
    companyValid,
    f.title.trim().length >= 4 && tagsComplete(f.tags),
    f.problem.trim().length >= 20,
    parsed.success,
  ];

  const submit = useMutation({
    mutationFn: () =>
      api.post('/questions', {
        ...payload(),
        ...companyPayload(),
      }),
    onSuccess: () => {
      if (draftId) drafts.remove(draftId);
      setDraftId(null);
      setDoneCount(1);
      setDone(true);
      void qc.invalidateQueries({ queryKey: ['my', 'submissions'] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.error'), 'error'),
  });

  const submitBulk = useMutation({
    mutationFn: () =>
      api.post<{ count: number }>('/questions/bulk', {
        questions: bulk.questions,
        ...companyPayload(),
      }),
    onSuccess: (r) => {
      setDoneCount(r.count);
      setBulk(emptyBulk);
      setDone(true);
      void qc.invalidateQueries({ queryKey: ['my', 'submissions'] });
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === 'cancelled') return;
      toast(e instanceof ApiError ? e.message : t('common.error'), 'error');
    },
  });

  if (!me || !can('questions.create')) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">{t('contribute.title')}</h1>
        <p className="text-muted mt-3">{t('contribute.signIn')}</p>
        {!me && (
          <ButtonLink to="/login?next=/contribute" variant="primary" className="mt-6">
            {t('nav.signIn')}
          </ButtonLink>
        )}
      </div>
    );
  }

  if (done) {
    return (
      <m.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-lg px-4 py-20 text-center"
      >
        <m.div
          initial={{ rotate: -20, scale: 0.5 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 12 }}
          className="bg-accent-soft text-accent mx-auto grid h-16 w-16 place-items-center rounded-3xl"
        >
          <PartyPopper size={28} />
        </m.div>
        <h1 className="mt-6 text-2xl font-semibold">
          {doneCount > 1 ? t('contribute.bulk.done', { n: doneCount }) : t('contribute.done')}
        </h1>
        <p className="text-muted mt-3 flex items-center justify-center gap-2 text-sm">
          <CalendarClock size={16} className="text-accent" /> {t('contribute.weekly')}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button
            onClick={() => {
              load(empty(), null);
              setDone(false);
            }}
          >
            {t('contribute.anotherOne')}
          </Button>
          <ButtonLink to="/me?tab=submissions" variant="primary">
            {t('contribute.viewSubmissions')}
          </ButtonLink>
        </div>
      </m.div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{t('contribute.title')}</h1>
      <p className="text-muted mt-2">{t('contribute.subtitle')}</p>
      <p className="text-subtle mt-4 flex items-center gap-2 text-sm">
        <ShieldCheck size={16} className="text-accent" /> {t('contribute.privacy')}
      </p>
      <p className="text-subtle mt-2 flex items-center gap-2 text-sm">
        <CalendarClock size={16} className="text-accent" /> {t('contribute.weekly')}
      </p>

      <div
        role="alert"
        className="mt-6 rounded-2xl border border-[color-mix(in_oklab,var(--medium)_40%,transparent)] bg-[color-mix(in_oklab,var(--medium)_10%,transparent)] p-4 text-sm"
      >
        <p className="text-medium flex items-center gap-2 font-semibold">
          <AlertTriangle size={16} /> {t('contribute.nda.title')}
        </p>
        <p className="text-muted mt-2 leading-relaxed">{t('contribute.nda.body')}</p>
        <label className="mt-3 flex cursor-pointer items-start gap-2 font-medium">
          <input
            type="checkbox"
            className="accent-accent mt-0.5 h-4 w-4 shrink-0"
            checked={ndaOk}
            onChange={(e) => setNdaOk(e.target.checked)}
          />
          {t('contribute.nda.confirm')}
        </label>
      </div>

      <div className="bg-surface-2 mt-6 inline-flex rounded-xl p-1" role="tablist">
        {(['single', 'bulk'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
              mode === m ? 'bg-surface text-fg shadow-sm' : 'text-subtle hover:text-fg',
            )}
          >
            {t(m === 'single' ? 'contribute.mode.single' : 'contribute.mode.bulk')}
          </button>
        ))}
      </div>

      {mode === 'bulk' ? (
        <>
          <Card className="mt-6 space-y-6 p-6">
            <CompanyStep f={f} set={set} />
            <BulkUpload bulk={bulk} setBulk={setBulk} />
          </Card>
          <div className="mt-6 flex justify-end">
            <Button
              variant="primary"
              onClick={() => submitBulk.mutate()}
              disabled={!ndaOk || !companyValid || !bulk.questions?.length}
              loading={submitBulk.isPending}
            >
              {t('contribute.bulk.submit', { n: bulk.questions?.length ?? 0 })}
            </Button>
          </div>
        </>
      ) : (
        <>
          {drafts.items.length > 0 && (
            <section className="mt-8">
              <div className="mb-2 flex items-center justify-between">
                <SectionTitle>{t('draft.yours')}</SectionTitle>
                {draftId && (
                  <button
                    onClick={() => guard.requestClose(() => load(empty(), null))}
                    className="text-accent text-xs font-medium hover:underline"
                  >
                    {t('draft.startFresh')}
                  </button>
                )}
              </div>
              <DraftList
                items={drafts.items}
                activeId={draftId}
                onOpen={(d) =>
                  d.id !== draftId &&
                  guard.requestClose(() => load(fromDraft(d.data as Partial<Form>), d.id))
                }
                onDelete={(id) => {
                  drafts.remove(id);
                  if (id === draftId) setDraftId(null);
                }}
              />
            </section>
          )}

          <ol className="mt-8 flex items-center gap-2" aria-label="Steps">
            {steps.map((s, i) => (
              <li key={s} className="flex flex-1 items-center gap-2">
                <button
                  onClick={() => i < step && setStep(i)}
                  className={cn(
                    'grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm font-semibold transition-colors',
                    i < step
                      ? 'border-accent bg-accent text-on-accent'
                      : i === step
                        ? 'border-accent text-accent'
                        : 'border-border text-subtle',
                  )}
                  aria-current={i === step ? 'step' : undefined}
                >
                  {i < step ? <Check size={14} /> : i + 1}
                </button>
                <span
                  className={cn('hidden text-sm sm:block', i === step ? 'text-fg' : 'text-subtle')}
                >
                  {s}
                </span>
                {i < steps.length - 1 && (
                  <span className="bg-border h-px flex-1 overflow-hidden">
                    <m.span
                      className="bg-accent block h-full"
                      initial={false}
                      animate={{ width: i < step ? '100%' : '0%' }}
                    />
                  </span>
                )}
              </li>
            ))}
          </ol>

          <Card className="mt-6 overflow-hidden p-6">
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
                className="space-y-5"
              >
                {step === 0 && <CompanyStep f={f} set={set} />}
                {step === 1 && (
                  <>
                    <Field label={t('contribute.titleField')}>
                      {(id) => (
                        <Input
                          id={id}
                          value={f.title}
                          maxLength={120}
                          onChange={(e) => set('title', e.target.value)}
                          placeholder={t('contribute.titlePh')}
                        />
                      )}
                    </Field>
                    <TagPicker value={f.tags} onChange={(tags) => set('tags', tags)} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={t('contribute.month')}>
                        {(id) => (
                          <Input
                            id={id}
                            type="month"
                            value={f.askedMonth}
                            max={new Date().toISOString().slice(0, 7)}
                            onChange={(e) => set('askedMonth', e.target.value)}
                          />
                        )}
                      </Field>
                    </div>
                  </>
                )}
                {step === 2 && (
                  <Field label={t('contribute.problem')}>
                    {(id) => (
                      <MarkdownEditor
                        id={id}
                        value={f.problem}
                        onChange={(v) => set('problem', v)}
                        placeholder={t('contribute.problemPh')}
                        minRows={10}
                      />
                    )}
                  </Field>
                )}
                {step === 3 && <ExtrasStep f={f} set={set} />}
              </m.div>
            </AnimatePresence>
          </Card>

          <div className="mt-6 flex items-center gap-2">
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
              {t('common.back')}
            </Button>
            <Button
              variant="ghost"
              className="ms-auto"
              disabled={!dirty}
              onClick={() => {
                saveDraft();
                toast(t('draft.saved'));
              }}
            >
              <FileText size={16} /> {t('draft.save')}
            </Button>
            {step < 3 ? (
              <Button
                variant="primary"
                onClick={() => setStep((s) => s + 1)}
                disabled={!stepValid[step]}
              >
                {t('common.next')}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => submit.mutate()}
                disabled={!ndaOk || !stepValid.every(Boolean)}
                loading={submit.isPending}
              >
                {t('contribute.submit')}
              </Button>
            )}
          </div>
        </>
      )}
      {guard.dialog}
    </div>
  );
}

function CompanyStep({
  f,
  set,
}: {
  f: Form;
  set: <K extends keyof Form>(k: K, v: Form[K]) => void;
}) {
  const { t, companyName } = useI18n();
  const [q, setQ] = useState('');
  // Server-side search: the company list is paginated.
  const dq = useDebounced(q.trim(), 200);
  const { data } = useCompanies(dq, 'name');
  const matches = useMemo(() => (data?.items ?? []).slice(0, 8), [data]);
  const exact = matches.some((c) => c.name.toLowerCase() === q.trim().toLowerCase());

  if (f.company || f.newCompany) {
    const tile = (
      <div className="border-accent bg-accent-soft flex items-center gap-3 rounded-2xl border p-4">
        {f.company ? (
          <CompanyLogo name={f.company.name} logoUrl={f.company.logoUrl} />
        ) : (
          <Building2 className="text-accent" />
        )}
        <div className="flex-1">
          <p className="font-medium">{f.company ? companyName(f.company) : f.newCompany}</p>
          {!f.company && <p className="text-muted text-xs">{t('contribute.newCompanyNote')}</p>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            set('company', null);
            set('newCompany', '');
          }}
        >
          {t('common.edit')}
        </Button>
      </div>
    );
    if (f.company) return tile;
    const link = f.newCompanyLinkedin.trim();
    return (
      <div className="space-y-4">
        {tile}
        <Field
          label={t('contribute.linkedin')}
          hint={t('contribute.linkedinHelp')}
          error={link && !LINKEDIN_RE.test(link) ? t('suggest.err.linkedin') : null}
        >
          {(id) => (
            <Input
              id={id}
              value={f.newCompanyLinkedin}
              onChange={(e) => set('newCompanyLinkedin', e.target.value)}
              placeholder="https://linkedin.com/company/…"
              dir="ltr"
              inputMode="url"
              autoFocus
            />
          )}
        </Field>
      </div>
    );
  }
  return (
    <Field label={t('contribute.company')}>
      {(id) => (
        <div>
          <Input
            id={id}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('contribute.companySearch')}
            autoFocus
            role="combobox"
            aria-expanded
            aria-controls="company-options"
          />
          <ul id="company-options" role="listbox" className="mt-2 grid gap-1 sm:grid-cols-2">
            {matches.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => set('company', c)}
                  className="hover:bg-surface-2 flex w-full items-center gap-3 rounded-xl p-2 text-start"
                >
                  <CompanyLogo name={c.name} logoUrl={c.logoUrl} size={32} />
                  <span className="truncate">{companyName(c)}</span>
                </button>
              </li>
            ))}
          </ul>
          {q.trim().length >= 2 && !exact && (
            <Button variant="soft" className="mt-3" onClick={() => set('newCompany', q.trim())}>
              <Plus size={16} /> {t('contribute.newCompany', { q: q.trim() })}
            </Button>
          )}
        </div>
      )}
    </Field>
  );
}

function ExtrasStep({
  f,
  set,
}: {
  f: Form;
  set: <K extends keyof Form>(k: K, v: Form[K]) => void;
}) {
  const { t } = useI18n();
  const listEditor = (key: 'constraints' | 'followUps', addLabel: string, max: number) => (
    <div className="space-y-2">
      {f[key].map((v, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={v}
            onChange={(e) =>
              set(
                key,
                f[key].map((x, j) => (j === i ? e.target.value : x)),
              )
            }
            maxLength={500}
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() =>
              set(
                key,
                f[key].filter((_, j) => j !== i),
              )
            }
            aria-label={t('common.remove')}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ))}
      {f[key].length < max && (
        <Button size="sm" variant="ghost" onClick={() => set(key, [...f[key], ''])}>
          <Plus size={14} /> {addLabel}
        </Button>
      )}
    </div>
  );
  return (
    <>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          {t('contribute.examples')}{' '}
          <span className="text-subtle font-normal">({t('common.optional')})</span>
        </legend>
        {f.examples.map((ex, i) => (
          <div key={i} className="border-border space-y-2 rounded-xl border p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Textarea
                dir="ltr"
                className="min-h-16 font-mono text-[13px]"
                placeholder={t('q.input')}
                value={ex.input}
                onChange={(e) =>
                  set(
                    'examples',
                    f.examples.map((x, j) => (j === i ? { ...x, input: e.target.value } : x)),
                  )
                }
              />
              <Textarea
                dir="ltr"
                className="min-h-16 font-mono text-[13px]"
                placeholder={t('q.output')}
                value={ex.output}
                onChange={(e) =>
                  set(
                    'examples',
                    f.examples.map((x, j) => (j === i ? { ...x, output: e.target.value } : x)),
                  )
                }
              />
            </div>
            <div className="flex gap-2">
              <Input
                placeholder={`${t('q.explanation')} (${t('common.optional')})`}
                value={ex.explanation}
                onChange={(e) =>
                  set(
                    'examples',
                    f.examples.map((x, j) => (j === i ? { ...x, explanation: e.target.value } : x)),
                  )
                }
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() =>
                  set(
                    'examples',
                    f.examples.filter((_, j) => j !== i),
                  )
                }
                aria-label={t('common.remove')}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        ))}
        {f.examples.length < 5 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              set('examples', [...f.examples, { input: '', output: '', explanation: '' }])
            }
          >
            <Plus size={14} /> {t('contribute.addExample')}
          </Button>
        )}
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t('contribute.constraints')}</legend>
        {listEditor('constraints', t('contribute.addConstraint'), 15)}
      </fieldset>
      <Field label={t('contribute.lookFor')} optional={t('common.optional')}>
        {(id) => (
          <Textarea
            id={id}
            value={f.lookFor}
            maxLength={5000}
            onChange={(e) => set('lookFor', e.target.value)}
          />
        )}
      </Field>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t('contribute.followUps')}</legend>
        {listEditor('followUps', t('contribute.addFollowUp'), 10)}
      </fieldset>
    </>
  );
}

interface Bulk {
  fileName: string;
  questions: ReturnType<typeof questionFormSchema.parse>[] | null;
  errors: string[];
}
const emptyBulk: Bulk = { fileName: '', questions: null, errors: [] };

const EXAMPLE = [
  {
    title: 'Two Sum Variant',
    field: 'Software',
    specializations: ['Backend'],
    levels: ['Junior', 'Mid'],
    stage: 'Phone Screen',
    difficulty: 'Easy',
    topics: ['Problem Solving (DSA)'],
    problem:
      'Given an array and a target, return the indices of two numbers that add up to the target.',
    examples: [{ input: '[2,7,11,15], 9', output: '[0,1]', explanation: '2 + 7 = 9' }],
    constraints: ['n <= 10^5'],
    lookFor: 'A hash map solution in O(n).',
    followUps: ['What if the array is sorted?'],
    askedMonth: '2026-09',
  },
  {
    title: 'Tell me about a conflict',
    field: 'General',
    levels: ['Junior'],
    stage: 'HR Interview',
    difficulty: 'Easy',
    topics: ['Behavioral'],
    problem: 'Describe a time you disagreed with a teammate and how you resolved it.',
  },
];
const EXAMPLE_JSON = JSON.stringify(EXAMPLE, null, 2);

/** Several questions in one JSON file: validated here, then sent in one request. */
function BulkUpload({ bulk, setBulk }: { bulk: Bulk; setBulk: (b: Bulk) => void }) {
  const { t } = useI18n();
  const max = BULK_MAX_QUESTIONS;
  const kb = BULK_MAX_KB;

  const read = async (file: File) => {
    const fail = (msg: string) => setBulk({ fileName: file.name, questions: null, errors: [msg] });
    if (file.size > kb * 1024) return fail(t('contribute.bulk.err.size', { kb }));
    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      return fail(t('contribute.bulk.err.json'));
    }
    const list = Array.isArray(data) ? data : (data as { questions?: unknown } | null)?.questions;
    if (!Array.isArray(list)) return fail(t('contribute.bulk.err.shape'));
    if (!list.length) return fail(t('contribute.bulk.err.empty'));
    if (list.length > max) return fail(t('contribute.bulk.err.max', { max }));
    const questions: Bulk['questions'] = [];
    const errors: string[] = [];
    list.forEach((raw, i) => {
      const r = questionFormSchema.safeParse({
        specializations: [],
        examples: [],
        constraints: [],
        followUps: [],
        ...(raw && typeof raw === 'object' ? raw : {}),
      });
      if (r.success) questions.push(r.data);
      else
        errors.push(
          t('contribute.bulk.err.item', {
            n: i + 1,
            path: r.error.issues[0]?.path.join('.') || '—',
          }),
        );
    });
    setBulk({ fileName: file.name, questions: errors.length ? null : questions, errors });
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([EXAMPLE_JSON], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions-example.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <p className="text-muted text-sm">{t('contribute.bulk.help', { max, kb })}</p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="bg-accent text-on-accent inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium">
          <FileJson size={16} /> {t('contribute.bulk.choose')}
          <input
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void read(file);
              e.target.value = '';
            }}
          />
        </label>
        <Button variant="ghost" size="sm" onClick={download}>
          <Download size={14} /> {t('contribute.bulk.download')}
        </Button>
        {bulk.fileName && <span className="text-subtle truncate text-sm">{bulk.fileName}</span>}
      </div>
      {bulk.questions && (
        <p className="text-accent flex items-center gap-2 text-sm font-medium">
          <Check size={16} /> {t('contribute.bulk.ready', { n: bulk.questions.length })}
        </p>
      )}
      {bulk.errors.length > 0 && (
        <ul className="text-danger space-y-1 text-sm" role="alert">
          {bulk.errors.slice(0, 10).map((e) => (
            <li key={e}>{e}</li>
          ))}
          {bulk.errors.length > 10 && <li>…</li>}
        </ul>
      )}
      <details className="border-border rounded-xl border p-4 text-sm">
        <summary className="cursor-pointer font-medium">{t('contribute.bulk.format')}</summary>
        <p className="text-muted mt-3">{t('contribute.bulk.formatHelp')}</p>
        <pre
          dir="ltr"
          className="bg-surface-2 mt-3 max-h-80 overflow-auto rounded-lg p-3 font-mono text-[12px]"
        >
          {EXAMPLE_JSON}
        </pre>
        <p className="mt-4 font-medium">{t('contribute.bulk.allowed')}</p>
        <dl dir="ltr" className="text-muted mt-2 space-y-1 font-mono text-[12px]">
          {Object.entries(SPECIALIZATIONS_BY_FIELD).map(([field, specs]) => (
            <div key={field}>
              <dt className="text-fg inline">field "{field}"</dt>
              <dd className="inline"> → specializations: {specs.join(', ') || '—'}</dd>
            </div>
          ))}
          <div>
            <dt className="text-fg inline">levels</dt>
            <dd className="inline">: {LEVELS.join(', ')}</dd>
          </div>
          <div>
            <dt className="text-fg inline">stage</dt>
            <dd className="inline">: {STAGES.join(', ')}</dd>
          </div>
          <div>
            <dt className="text-fg inline">difficulty</dt>
            <dd className="inline">: {DIFFICULTIES.join(', ')}</dd>
          </div>
          <div>
            <dt className="text-fg inline">topics</dt>
            <dd className="inline">: {TOPICS.join(', ')}</dd>
          </div>
        </dl>
      </details>
    </div>
  );
}
