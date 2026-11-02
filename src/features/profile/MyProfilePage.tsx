import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Bookmark, ExternalLink, FileText, Flame, ListChecks, Pencil, Trophy } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '@/lib/api';
import { keys } from '@/lib/keys';
import { useI18n, type MessageKey } from '@/i18n';
import { LoadMore, usePaged } from '@/lib/paged';
import type {
  AnswerActivity,
  CompanySubmission,
  QuestionSummary,
  Submission,
} from '@/shared/types';
import { RoleBadge } from '@/components/ui/UserChip';
import { useDrafts } from '@/features/drafts/drafts';
import { DraftList } from '@/features/drafts/UnsavedGuard';
import { CompanyList } from './ContributionLists';
import { Avatar } from '@/components/ui/Avatar';
import { AvatarPicker } from '@/components/ui/AvatarPicker';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Card, SectionTitle } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Tag } from '@/components/ui/Badges';
import { useMe } from '@/features/auth/useMe';
import { QuestionRow } from '@/features/questions/QuestionRow';
import { ListsTab } from '@/features/study/ListsTab';
import { cn } from '@/lib/cn';
import { Heatmap } from './Heatmap';
import { BadgeList } from './BadgeList';

type Tab = 'overview' | 'submissions' | 'companies' | 'drafts' | 'answers' | 'bookmarks' | 'lists';
interface Progress {
  company: { slug: string; name: string; nameAr: string };
  studied: number;
  total: number;
}

export function MyProfilePage() {
  const { t, fmt } = useI18n();
  const { me } = useMe();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'overview';
  const drafts = useDrafts();
  if (!me) return null;

  const stats = [
    { icon: Trophy, label: t('profile.reputation'), value: fmt.number(me.reputation) },
    { icon: Flame, label: t('profile.streak'), value: t('profile.days', { n: me.streak.current }) },
    { icon: ListChecks, label: t('q.studied'), value: fmt.number(me.stats.studied ?? 0) },
    {
      icon: Bookmark,
      label: t('profile.longest'),
      value: t('profile.days', { n: me.streak.longest }),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="flex flex-wrap items-center gap-4">
        <AvatarEditor username={me.username!} avatar={me.avatar} />
        <div className="flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold">
            @{me.username} <RoleBadge role={me.role} className="text-xs" />
          </h1>
          <p className="text-muted text-sm">{t('profile.joined', { m: fmt.month(me.joinedAt) })}</p>
        </div>
        <Link
          to={`/u/${me.username}`}
          className="text-accent flex items-center gap-1 text-sm hover:underline"
        >
          {t('profile.viewPublic')} <ExternalLink size={13} />
        </Link>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <s.icon size={16} className="text-accent" />
            <p className="mt-2 text-xl font-semibold tabular-nums">{s.value}</p>
            <p className="text-subtle text-xs">{s.label}</p>
          </Card>
        ))}
      </div>

      <Tabs<Tab>
        className="mt-8"
        value={tab}
        onChange={(v) => setParams(v === 'overview' ? {} : { tab: v })}
        items={[
          { value: 'overview', label: t('profile.tab.overview') },
          { value: 'submissions', label: t('profile.tab.submissions') },
          { value: 'companies', label: t('profile.companies') },
          { value: 'drafts', label: t('draft.tab'), count: drafts.items.length || undefined },
          { value: 'answers', label: t('profile.tab.answers') },
          { value: 'bookmarks', label: t('profile.tab.bookmarks') },
          { value: 'lists', label: t('profile.tab.lists') },
        ]}
      />
      <div className="mt-6">
        {tab === 'overview' && <Overview badges={me.badges} />}
        {tab === 'submissions' && <Submissions />}
        {tab === 'companies' && <MyCompanies />}
        {tab === 'drafts' &&
          (drafts.items.length ? (
            <DraftList items={drafts.items} onDelete={drafts.remove} />
          ) : (
            <EmptyState icon={<FileText size={20} />} title={t('draft.none')} />
          ))}
        {tab === 'answers' && <Answers />}
        {tab === 'bookmarks' && <Bookmarks />}
        {tab === 'lists' && <ListsTab />}
      </div>
    </div>
  );
}

function Overview({ badges }: { badges: { key: string }[] }) {
  const { t, companyName } = useI18n();
  const activity = useQuery({
    queryKey: keys.my('activity'),
    queryFn: () => api.get<{ items: { day: string; count: number }[] }>('/me/activity'),
  });
  const progress = useQuery({
    queryKey: keys.my('progress'),
    queryFn: () => api.get<{ items: Progress[] }>('/me/progress'),
  });
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <SectionTitle className="mb-4">{t('profile.activity')}</SectionTitle>
        {activity.data ? (
          <Heatmap days={activity.data.items} />
        ) : (
          <div className="skeleton h-28 rounded-lg" />
        )}
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle className="mb-4">{t('profile.progress')}</SectionTitle>
          {progress.data?.items.length ? (
            <ul className="space-y-2">
              {progress.data.items.map((p) => (
                <li key={p.company.slug}>
                  <Link
                    to={`/c/${p.company.slug}`}
                    className="hover:bg-surface-2 flex items-center gap-3 rounded-xl p-1.5"
                  >
                    <ProgressRing value={p.studied} total={p.total} size={40} />
                    <span className="flex-1">{companyName(p.company)}</span>
                    <span className="text-subtle text-sm tabular-nums">
                      {t('company.studied', { a: p.studied, b: p.total })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted text-sm">{t('profile.noProgress')}</p>
          )}
        </Card>
        <Card className="p-5">
          <SectionTitle className="mb-4">{t('profile.badges')}</SectionTitle>
          <BadgeList earned={badges} />
        </Card>
      </div>
    </div>
  );
}

function Submissions() {
  const { t, fmt } = useI18n();
  const list = usePaged<Submission>(keys.my('submissions'), '/me/submissions');
  const data = { items: list.items };
  if (list.isLoading) return <ListSkeleton />;
  if (!data.items.length) return <EmptyState title={t('profile.noSubmissions')} />;
  const tone = { pending: 'text-medium', approved: 'text-easy', rejected: 'text-hard' } as const;
  return (
    <ul className="space-y-2.5">
      {data.items.map((s) => (
        <li key={s.id} className="border-border bg-surface rounded-2xl border p-4">
          <div className="flex flex-wrap items-center gap-2">
            {s.status === 'approved' && s.company ? (
              <Link to={`/c/${s.company.slug}/${s.slug}`} className="font-medium hover:underline">
                {s.title}
              </Link>
            ) : (
              <span className="font-medium">{s.title}</span>
            )}
            <span className={cn('ms-auto text-xs font-medium', tone[s.status])}>
              {t(`profile.status.${s.status}` as MessageKey)}
            </span>
          </div>
          <div className="text-subtle mt-1 flex flex-wrap gap-2 text-xs">
            {s.company && <Tag>{s.company.name}</Tag>}
            <span>{fmt.relative(s.createdAt)}</span>
          </div>
          {s.status === 'rejected' && s.rejectionReason && (
            <p className="text-hard mt-2 rounded-lg bg-[color-mix(in_oklab,var(--hard)_10%,transparent)] px-3 py-2 text-sm">
              {t('profile.rejectedReason', { r: s.rejectionReason })}
            </p>
          )}
        </li>
      ))}
      <LoadMore {...list} />
    </ul>
  );
}

export function AnswerList({ items }: { items: AnswerActivity[] }) {
  const { t, fmt, companyName } = useI18n();
  if (!items.length) return <EmptyState title={t('profile.noAnswers')} />;
  return (
    <ul className="space-y-2.5">
      {items.map((a) =>
        a.question?.company ? (
          <li key={a.id}>
            <Link
              to={`/c/${a.question.company.slug}/${a.question.slug}`}
              className="border-border bg-surface hover:border-border-strong block rounded-2xl border p-4"
            >
              <p className="text-sm font-medium">{a.question.title}</p>
              <p className="text-muted mt-1 line-clamp-2 text-sm">{a.excerpt}</p>
              <p className="text-subtle mt-2 text-xs">
                {companyName(a.question.company)} · ▲ {a.score} · {fmt.relative(a.createdAt)}
              </p>
            </Link>
          </li>
        ) : null,
      )}
    </ul>
  );
}

function MyCompanies() {
  const list = usePaged<CompanySubmission>(keys.my('companies'), '/me/companies');
  if (list.isLoading) return <ListSkeleton />;
  return (
    <>
      <CompanyList items={list.items} showStatus />
      <LoadMore {...list} />
    </>
  );
}

function Answers() {
  const list = usePaged<AnswerActivity>(keys.my('answers'), '/me/answers');
  if (list.isLoading) return <ListSkeleton />;
  return (
    <>
      <AnswerList items={list.items} />
      <LoadMore {...list} />
    </>
  );
}

function Bookmarks() {
  const { t, companyName } = useI18n();
  const list = usePaged<QuestionSummary>(keys.my('bookmarks'), '/me/bookmarks');
  if (list.isLoading) return <ListSkeleton />;
  if (!list.items.length)
    return <EmptyState icon={<Bookmark size={20} />} title={t('profile.noBookmarks')} />;
  return (
    <div className="space-y-2.5">
      {list.items.map((q) => (
        <QuestionRow
          key={q.id}
          q={{ ...q, bookmarked: true }}
          companySlug={q.company?.slug ?? ''}
          showCompany={q.company ? companyName(q.company) : undefined}
        />
      ))}
      <LoadMore {...list} />
    </div>
  );
}

function AvatarEditor({ username, avatar }: { username: string; avatar: string | null }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(avatar ?? 'ghost:violet');
  const save = useMutation({
    mutationFn: () => api.put('/me/avatar', { avatar: value }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.me });
      setOpen(false);
      toast(t('common.saved'));
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.error'), 'error'),
  });
  return (
    <>
      <button
        onClick={() => {
          setValue(avatar ?? 'ghost:violet');
          setOpen(true);
        }}
        className="group relative rounded-full"
        aria-label={t('avatar.change')}
        title={t('avatar.change')}
      >
        <Avatar name={username} avatar={avatar} size={64} />
        <span className="bg-surface border-border text-muted group-hover:text-fg absolute -end-1 -bottom-1 grid h-7 w-7 place-items-center rounded-full border">
          <Pencil size={13} />
        </span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={t('avatar.change')}>
        <div className="space-y-5">
          <AvatarPicker value={value} onChange={setValue} name={username} />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={() => save.mutate()} loading={save.isPending}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
