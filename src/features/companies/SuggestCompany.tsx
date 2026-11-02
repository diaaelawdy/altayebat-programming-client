import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '@/lib/api';
import { keys } from '@/lib/keys';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useCan } from '@/features/auth/Can';
import { useDrafts } from '@/features/drafts/drafts';
import { DraftList, useUnsavedGuard } from '@/features/drafts/UnsavedGuard';

const LINKEDIN_RE = /^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\//i;
const isUrl = (s: string) => /^https?:\/\/\S+\.\S+/i.test(s);

const blank = { name: '', nameAr: '', website: '', linkedinUrl: '', industry: '', description: '' };

/** "Suggest a company" for anyone with `companies.submit`; someone else reviews it before it's published. */
export function SuggestCompanyButton() {
  const { t } = useI18n();
  const can = useCan();
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [touched, setTouched] = useState(false);
  const drafts = useDrafts<typeof blank>('company');
  const [draftId, setDraftId] = useState<string | null>(null);
  const [baseline, setBaseline] = useState(blank);
  const dirty = open && JSON.stringify(form) !== JSON.stringify(baseline);

  const load = (data: typeof blank, id: string | null) => {
    setForm(data);
    setBaseline(data);
    setDraftId(id);
    setTouched(false);
  };
  const saveDraft = () => {
    setDraftId(drafts.save('company', form, form.name, draftId));
    setBaseline(form);
  };
  const guard = useUnsavedGuard({ dirty, saveDraft });
  const close = () => guard.requestClose(() => setOpen(false));

  // Open a draft from a link (`/companies?draft=<id>`), then drop the param.
  const [params, setParams] = useSearchParams();
  const linked = params.get('draft');
  useEffect(() => {
    if (!linked || !drafts.enabled) return;
    const d = drafts.get(linked);
    if (d) {
      load({ ...blank, ...d.data }, d.id);
      setOpen(true);
    }
    setParams((p) => (p.delete('draft'), p), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linked, drafts.enabled]);

  const errors = {
    name: form.name.trim().length < 2 ? t('suggest.err.name') : null,
    website: form.website && !isUrl(form.website) ? t('suggest.err.url') : null,
    linkedinUrl: !form.linkedinUrl.trim()
      ? t('suggest.err.linkedinRequired')
      : !LINKEDIN_RE.test(form.linkedinUrl.trim())
        ? t('suggest.err.linkedin')
        : null,
  };
  const valid = !Object.values(errors).some(Boolean);

  const submit = useMutation({
    mutationFn: () =>
      api.post(
        '/companies',
        Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])),
      ),
    onSuccess: () => {
      if (draftId) drafts.remove(draftId);
      load(blank, null);
      setOpen(false);
      void qc.invalidateQueries({ queryKey: keys.my('companies') });
      void qc.invalidateQueries({ queryKey: keys.admin.counts });
      toast(t('suggest.sent'));
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.error'), 'error'),
  });

  if (!can('companies.submit')) return null;

  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const err = (k: keyof typeof errors) => (touched || form[k] ? errors[k] : null);

  return (
    <>
      <Button variant="soft" onClick={() => setOpen(true)}>
        <Plus size={16} /> {t('suggest.title')}
      </Button>
      <Modal
        open={open}
        onClose={close}
        title={t('suggest.title')}
        description={t('suggest.subtitle')}
      >
        <form
          className="space-y-3"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (valid) submit.mutate();
          }}
        >
          {drafts.items.length > 0 && (
            <DraftList
              items={drafts.items}
              activeId={draftId}
              onOpen={(d) =>
                d.id !== draftId &&
                guard.requestClose(() => load({ ...blank, ...(d.data as typeof blank) }, d.id))
              }
              onDelete={(id) => {
                drafts.remove(id);
                if (id === draftId) setDraftId(null);
              }}
            />
          )}
          <Field label={t('admin.companies.name')} error={touched ? errors.name : null}>
            {(id) => (
              <Input id={id} value={form.name} onChange={set('name')} maxLength={80} autoFocus />
            )}
          </Field>
          <Field label={t('admin.companies.nameAr')} optional={t('common.optional')}>
            {(id) => (
              <Input
                id={id}
                value={form.nameAr}
                onChange={set('nameAr')}
                dir="rtl"
                maxLength={80}
              />
            )}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={t('company.website')}
              optional={t('common.optional')}
              error={err('website')}
            >
              {(id) => (
                <Input
                  id={id}
                  value={form.website}
                  onChange={set('website')}
                  placeholder="https://…"
                  dir="ltr"
                  inputMode="url"
                  aria-invalid={Boolean(err('website')) || undefined}
                />
              )}
            </Field>
            <Field label={t('company.linkedin')} error={err('linkedinUrl')}>
              {(id) => (
                <Input
                  id={id}
                  value={form.linkedinUrl}
                  onChange={set('linkedinUrl')}
                  placeholder="https://linkedin.com/company/…"
                  dir="ltr"
                  inputMode="url"
                  aria-invalid={Boolean(err('linkedinUrl')) || undefined}
                />
              )}
            </Field>
          </div>
          <Field label={t('admin.companies.industry')} optional={t('common.optional')}>
            {(id) => (
              <Input id={id} value={form.industry} onChange={set('industry')} maxLength={60} />
            )}
          </Field>
          <Field label={t('admin.companies.description')} optional={t('common.optional')}>
            {(id) => (
              <Textarea
                id={id}
                value={form.description}
                onChange={set('description')}
                maxLength={1000}
                className="min-h-20"
              />
            )}
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              className="me-auto"
              disabled={!dirty}
              onClick={() => {
                saveDraft();
                toast(t('draft.saved'));
              }}
            >
              <FileText size={16} /> {t('draft.save')}
            </Button>
            <Button onClick={close}>{t('common.cancel')}</Button>
            <Button
              type="submit"
              variant="primary"
              loading={submit.isPending}
              disabled={touched && !valid}
            >
              {t('suggest.send')}
            </Button>
          </div>
        </form>
      </Modal>
      {guard.dialog}
    </>
  );
}
