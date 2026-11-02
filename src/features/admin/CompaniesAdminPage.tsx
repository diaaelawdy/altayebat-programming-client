import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoadMore, usePaged } from '@/lib/paged';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { keys } from '@/lib/keys';
import { useI18n } from '@/i18n';
import type { Company } from '@/shared/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Tag } from '@/components/ui/Badges';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { Can } from '@/features/auth/Can';
import { SuggestCompanyButton } from '@/features/companies/SuggestCompany';
import { useConfirm } from '@/components/ui/confirmContext';

type Form = Pick<
  Company,
  'name' | 'nameAr' | 'industry' | 'website' | 'linkedinUrl' | 'logoUrl' | 'description'
>;
export function CompaniesAdminPage() {
  const confirm = useConfirm();
  const { t, fmt } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<{ id: string | null; form: Form } | null>(null);
  const list = usePaged<Company>(keys.admin.companies, '/admin/companies');
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: keys.admin.companies });
    void qc.invalidateQueries({ queryKey: ['companies'] });
  };
  const onError = (e: unknown) =>
    toast(e instanceof ApiError ? e.message : t('common.error'), 'error');
  const save = useMutation({
    mutationFn: () => api.patch(`/companies/${editing!.id}`, editing!.form),
    onSuccess: () => {
      setEditing(null);
      refresh();
      toast(t('common.saved'));
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/companies/${id}`),
    onSuccess: refresh,
    onError,
  });

  const field = (k: keyof Form, label: string, multiline = false) => (
    <Field label={label}>
      {(id) =>
        multiline ? (
          <Textarea
            id={id}
            value={editing!.form[k]}
            onChange={(e) =>
              setEditing((s) => s && { ...s, form: { ...s.form, [k]: e.target.value } })
            }
          />
        ) : (
          <Input
            id={id}
            value={editing!.form[k]}
            onChange={(e) =>
              setEditing((s) => s && { ...s, form: { ...s.form, [k]: e.target.value } })
            }
            dir={k === 'nameAr' ? 'rtl' : undefined}
          />
        )
      }
    </Field>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('admin.companies.title')}</h1>
        <SuggestCompanyButton />
      </div>
      {list.isLoading ? (
        <ListSkeleton className="mt-6" />
      ) : (
        <Card className="divide-border mt-6 divide-y">
          {list.items.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3">
              <CompanyLogo name={c.name} logoUrl={c.logoUrl} size={36} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {c.name} {c.nameAr && <span className="text-subtle">· {c.nameAr}</span>}
                </p>
                <p className="text-subtle text-xs">
                  {c.industry} · {t('companies.questions', { n: fmt.number(c.questionCount) })}
                </p>
              </div>
              {c.status === 'pending' && (
                <Tag className="text-medium">{t('admin.companies.pending')}</Tag>
              )}
              {c.status === 'rejected' && (
                <Tag className="text-danger">{t('profile.status.rejected')}</Tag>
              )}
              <Can permission="companies.edit">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    setEditing({
                      id: c.id,
                      form: {
                        name: c.name,
                        nameAr: c.nameAr,
                        industry: c.industry,
                        website: c.website,
                        linkedinUrl: c.linkedinUrl,
                        logoUrl: c.logoUrl,
                        description: c.description,
                      },
                    })
                  }
                  aria-label={t('common.edit')}
                >
                  <Pencil size={15} />
                </Button>
              </Can>
              <Can permission="companies.delete">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    void confirm({ title: `${t('common.delete')} ${c.name}?` }).then(
                      (ok) => ok && remove.mutate(c.id),
                    )
                  }
                  aria-label={t('common.delete')}
                >
                  <Trash2 size={15} />
                </Button>
              </Can>
            </div>
          ))}
          <LoadMore {...list} />
        </Card>
      )}
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? t('common.edit') : t('admin.companies.new')}
      >
        {editing && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            {field('name', t('admin.companies.name'))}
            {field('nameAr', t('admin.companies.nameAr'))}
            {field('industry', t('admin.companies.industry'))}
            {field('website', t('admin.companies.website'))}
            {field('linkedinUrl', t('company.linkedin'))}
            {field('logoUrl', t('admin.companies.logo'))}
            {field('description', t('admin.companies.description'), true)}
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
              <Button type="submit" variant="primary" loading={save.isPending}>
                {t('common.save')}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
