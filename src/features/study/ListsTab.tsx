import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ListTodo, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { keys } from '@/lib/keys';
import { useI18n } from '@/i18n';
import type { QuestionSummary } from '@/shared/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton, PageSkeleton } from '@/components/ui/Skeleton';
import { QuestionRow } from '@/features/questions/QuestionRow';
import { useLists } from './AddToList';
import { useConfirm } from '@/components/ui/confirmContext';

export function ListsTab() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const { data, isLoading } = useLists();
  const create = useMutation({
    mutationFn: () => api.post('/me/lists', { name }),
    onSuccess: () => {
      setName('');
      void qc.invalidateQueries({ queryKey: keys.my('lists') });
    },
  });
  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) create.mutate();
        }}
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('lists.name')}
          maxLength={60}
        />
        <Button type="submit" variant="primary" loading={create.isPending}>
          <Plus size={16} /> {t('lists.new')}
        </Button>
      </form>
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : !data?.items.length ? (
        <EmptyState icon={<ListTodo size={20} />} title={t('lists.empty')} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.items.map((l) => (
            <li key={l.id}>
              <Link
                to={`/lists/${l.id}`}
                className="border-border bg-surface hover:border-border-strong flex items-center gap-3 rounded-2xl border p-4"
              >
                <ListTodo size={18} className="text-accent" />
                <span className="flex-1 font-medium">{l.name}</span>
                <span className="text-subtle text-sm">{t('lists.count', { n: l.count })}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ListPage() {
  const confirm = useConfirm();
  const { id = '' } = useParams();
  const { t, companyName } = useI18n();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: keys.list(id),
    queryFn: () =>
      api.get<{ id: string; name: string; questions: QuestionSummary[] }>(`/me/lists/${id}`),
  });
  const del = useMutation({
    mutationFn: () => api.delete(`/me/lists/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.my('lists') });
      nav('/me?tab=lists');
    },
  });
  if (isLoading) return <PageSkeleton />;
  if (!data) return null;
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center gap-3">
        <h1 className="flex-1 text-2xl font-semibold">{data.name}</h1>
        <Button
          variant="ghost"
          onClick={() =>
            void confirm({ title: `${t('lists.delete')}?` }).then((ok) => ok && del.mutate())
          }
        >
          <Trash2 size={16} /> {t('lists.delete')}
        </Button>
      </div>
      <div className="mt-6 space-y-2.5">
        {data.questions.length ? (
          data.questions.map((q) => (
            <QuestionRow
              key={q.id}
              q={q}
              companySlug={q.company?.slug ?? ''}
              showCompany={q.company ? companyName(q.company) : undefined}
            />
          ))
        ) : (
          <EmptyState title={t('lists.emptyList')} />
        )}
      </div>
    </div>
  );
}
