import { useQuery } from '@tanstack/react-query';
import { LoadMore, usePaged } from '@/lib/paged';
import { EyeOff, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, qs } from '@/lib/api';
import { keys } from '@/lib/keys';
import { useDebounced } from '@/lib/hooks';
import { useI18n, type MessageKey } from '@/i18n';
import type { AnswerActivity, PrivateUser } from '@/shared/types';
import { Avatar } from '@/components/ui/Avatar';
import { Card, SectionTitle } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Field';
import { Tag } from '@/components/ui/Badges';
import { ListSkeleton, PageSkeleton } from '@/components/ui/Skeleton';
import { AnswerList } from '@/features/profile/MyProfilePage';
import { useRoles } from './useMeta';
import { StatusActions, StatusLabel } from './BanDialog';
import { useCan } from '@/features/auth/Can';

function PrivateBanner() {
  const { t } = useI18n();
  return (
    <p className="text-medium flex items-center gap-2 rounded-xl border border-[color-mix(in_oklab,var(--medium)_35%,transparent)] bg-[color-mix(in_oklab,var(--medium)_10%,transparent)] px-4 py-2.5 text-sm">
      <EyeOff size={16} /> {t('admin.users.private')}
    </p>
  );
}

const STAT_KEYS = [
  ['questionsSubmitted', 'admin.users.submitted'],
  ['questionsApproved', 'admin.users.approved'],
  ['questionsRejected', 'admin.users.rejected'],
  ['answers', 'admin.users.answers'],
  ['comments', 'admin.users.comments'],
  ['reviews', 'admin.users.reviews'],
  ['votesCast', 'admin.users.votes'],
] as const;

export function UsersPage() {
  const { t, fmt } = useI18n();
  const can = useCan();
  const [q, setQ] = useState('');
  const [roleId, setRoleId] = useState('');
  const dq = useDebounced(q.trim(), 300);
  const roles = useRoles();
  const params = { q: dq, roleId };
  const list = usePaged<PrivateUser>(keys.admin.users(params), `/admin/users${qs(params)}`);
  const total = (list.data?.pages[0] as { total?: number } | undefined)?.total;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold">
        {t('admin.users.title')}{' '}
        {total !== undefined && <span className="text-subtle">· {fmt.number(total)}</span>}
      </h1>
      <div className="mt-4">
        <PrivateBanner />
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="text-subtle pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('admin.users.search')}
            className="ps-10"
          />
        </div>
        <Select
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          className="sm:w-48"
          aria-label={t('admin.users.roles')}
        >
          <option value="">
            {t('admin.users.roles')}: {t('common.all')}
          </option>
          {roles.data?.items.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </div>
      {list.isLoading ? (
        <ListSkeleton className="mt-6" />
      ) : (
        <Card className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="border-border text-subtle border-b text-start text-xs">
              <tr>
                {[
                  'admin.users.username',
                  'admin.users.roles',
                  'admin.users.joined',
                  'admin.users.status',
                  'admin.users.contrib',
                  ...(can('users.ban') ? ['admin.users.actions'] : []),
                ].map((h) => (
                  <th key={h} className="p-3 text-start font-medium">
                    {t(h as MessageKey)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.items.map((u) => (
                <tr key={u.id} className="border-border hover:bg-surface-2 border-b last:border-0">
                  <td className="p-3">
                    <Link
                      to={`/admin/users/${u.id}`}
                      className="flex items-center gap-2 font-medium hover:underline"
                    >
                      <Avatar name={u.username ?? '?'} avatar={u.avatar} size={24} />@{u.username}
                    </Link>
                  </td>
                  <td className="p-3">{u.role && <Tag>{u.role.name}</Tag>}</td>
                  <td className="text-muted p-3">{fmt.date(u.createdAt)}</td>
                  <td className="p-3">
                    <StatusLabel status={u.status} ban={u.ban} />
                  </td>
                  <td className="text-muted p-3 text-xs">
                    {u.stats.questionsSubmitted}/{u.stats.questionsApproved}/
                    {u.stats.questionsRejected} · {u.stats.answers} · {u.stats.comments} ·{' '}
                    {u.stats.votesCast}
                  </td>
                  {can('users.ban') && (
                    <td className="p-3">
                      <StatusActions user={u} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <LoadMore {...list} />
      <p className="text-subtle mt-2 text-xs">
        {t('admin.users.contrib')}: {t('admin.users.submitted')}/{t('admin.users.approved')}/
        {t('admin.users.rejected')} · {t('admin.users.answers')} · {t('admin.users.comments')} ·{' '}
        {t('admin.users.votes')}
      </p>
    </div>
  );
}

interface Detail extends PrivateUser {
  contributions: {
    submissions: {
      id: string;
      title: string;
      status: string;
      slug: string;
      company: { slug: string; name: string } | null;
    }[];
    answers: AnswerActivity[];
    comments: { id: string; excerpt: string; createdAt: string }[];
    reviews: { id: string; overall: number; company: { slug: string; name: string } }[];
  };
}

export function UserDetailPage() {
  const { id = '' } = useParams();
  const { t, fmt } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: keys.admin.user(id),
    queryFn: () => api.get<Detail>(`/admin/users/${id}`),
  });
  if (isLoading) return <PageSkeleton />;
  if (!data) return null;
  const c = data.contributions;
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <PrivateBanner />
      <header className="mt-6 flex flex-wrap items-center gap-4">
        <Avatar name={data.username ?? '?'} avatar={data.avatar} size={56} />
        <div>
          <h1 className="text-2xl font-semibold">@{data.username ?? '—'}</h1>
          <p className="text-subtle text-xs">
            {data.role?.name} · {fmt.date(data.createdAt)} ·{' '}
            <StatusLabel status={data.status} ban={data.ban} />
          </p>
          {data.ban?.reason && (
            <p className="text-muted mt-1 text-xs" dir="auto">
              {t('banned.reason')}: {data.ban.reason}
            </p>
          )}
        </div>
        <div className="ms-auto">
          <StatusActions user={data} />
        </div>
      </header>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAT_KEYS.map(([k, label]) => (
          <Card key={k} className="p-3">
            <p className="text-lg font-semibold tabular-nums">{data.stats[k] ?? 0}</p>
            <p className="text-subtle text-xs">{t(label)}</p>
          </Card>
        ))}
      </div>
      <section className="mt-8 space-y-2">
        <SectionTitle>{t('profile.tab.submissions')}</SectionTitle>
        {c.submissions.map((s) => (
          <div
            key={s.id}
            className="border-border bg-surface flex items-center gap-2 rounded-xl border p-3 text-sm"
          >
            {s.status === 'approved' && s.company ? (
              <Link className="hover:underline" to={`/c/${s.company.slug}/${s.slug}`}>
                {s.title}
              </Link>
            ) : (
              <span>{s.title}</span>
            )}
            <Tag className="ms-auto">{s.status}</Tag>
          </div>
        ))}
      </section>
      <section className="mt-8 space-y-2">
        <SectionTitle>{t('profile.tab.answers')}</SectionTitle>
        <AnswerList items={c.answers} />
      </section>
      <section className="mt-8 space-y-2">
        <SectionTitle>{t('admin.users.comments')}</SectionTitle>
        {c.comments.map((cm) => (
          <p
            key={cm.id}
            className="border-border bg-surface text-muted rounded-xl border p-3 text-sm"
          >
            {cm.excerpt}
          </p>
        ))}
      </section>
      <section className="mt-8 space-y-2">
        <SectionTitle>{t('admin.users.reviews')}</SectionTitle>
        {c.reviews.map((r) => (
          <Link
            key={r.id}
            to={`/c/${r.company.slug}?tab=ratings`}
            className="border-border bg-surface hover:border-border-strong block rounded-xl border p-3 text-sm"
          >
            {r.company.name} · ★ {r.overall}
          </Link>
        ))}
      </section>
    </div>
  );
}
