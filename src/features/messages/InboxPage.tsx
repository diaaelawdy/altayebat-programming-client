import { ArrowLeft, PenSquare } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { useCan } from '@/features/auth/Can';
import { useConversations } from './api';
import { LoadMore } from '@/lib/paged';
import { Compose } from './Compose';
import { ConversationList, ConversationView } from './parts';

type Box = 'mine' | 'team';

/** Inbox: your conversations, plus the team inbox with `messages.team_inbox`. */
export function InboxPage() {
  const { t } = useI18n();
  const can = useCan();
  const nav = useNavigate();
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const team = can('messages.team_inbox');
  const box: Box = team && params.get('box') === 'team' ? 'team' : 'mine';
  const mine = useConversations('mine');
  const teamList = useConversations('team', team);
  const list = box === 'team' ? teamList : mine;
  const composing = id === 'new';
  const open = (cid: string) => nav({ pathname: `/inbox/${cid}`, search: params.toString() });
  const unread = (items?: { unread: boolean }[]) =>
    items?.filter((c) => c.unread).length || undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('nav.inbox')}</h1>
        <Button variant="primary" onClick={() => nav('/inbox/new')}>
          <PenSquare size={16} /> {t('compose.new')}
        </Button>
      </div>
      {team && (
        <Tabs<Box>
          className="mt-4"
          value={box}
          onChange={(v) => setParams(v === 'team' ? { box: 'team' } : {}, { replace: true })}
          items={[
            { value: 'mine', label: t('inbox.mine'), count: unread(mine.items) },
            { value: 'team', label: t('inbox.team'), count: unread(teamList.items) },
          ]}
        />
      )}
      <div className="mt-5 grid gap-4 lg:grid-cols-[340px_1fr]">
        <Card className={cn('p-2', id && 'hidden lg:block')}>
          <ConversationList
            items={list.items}
            loading={list.isLoading}
            activeId={id}
            onOpen={open}
            showAnsweredBy={box === 'team'}
          />
          <LoadMore {...list} />
        </Card>
        <Card className={cn('min-h-[60vh] p-5', !id && 'hidden lg:block')}>
          {id && (
            <button
              onClick={() => nav({ pathname: '/inbox', search: params.toString() })}
              className="text-subtle hover:text-fg mb-3 flex items-center gap-1 text-sm lg:hidden"
            >
              <ArrowLeft size={15} className="rtl:-scale-x-100" /> {t('common.back')}
            </button>
          )}
          {composing ? (
            <>
              <h2 className="mb-4 text-lg font-semibold">{t('compose.new')}</h2>
              <Compose to={params.get('to') ?? ''} onSent={open} />
            </>
          ) : id ? (
            <ConversationView key={id} id={id} />
          ) : (
            <p className="text-subtle grid h-full place-items-center text-sm">{t('inbox.pick')}</p>
          )}
        </Card>
      </div>
    </div>
  );
}
