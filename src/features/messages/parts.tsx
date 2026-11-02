import { m } from 'framer-motion';
import { CheckCheck, Flag, Inbox, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useI18n } from '@/i18n';
import {
  isSystem,
  type ChatMessage,
  type ConversationSummary,
  type SystemRef,
  type UserRef,
} from '@/shared/types';
import { BrandMark } from '@/components/layout/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Textarea } from '@/components/ui/Field';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/components/ui/Toast';
import { RoleBadge } from '@/components/ui/UserChip';
import { ReportButton } from '@/features/reports/ReportButton';
import { useConversation, useReply } from './api';

/** A sender: the site itself for team replies, otherwise avatar + name + role. */
export function Sender({ who, size = 32 }: { who: UserRef | SystemRef; size?: number }) {
  const { t } = useI18n();
  if (isSystem(who))
    return (
      <span className="inline-flex items-center gap-2">
        <BrandMark size={size} />
        <span className="font-medium">{t('app.name')}</span>
      </span>
    );
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar name={who.username} avatar={who.avatar} size={size} />
      <span className="truncate font-medium">@{who.username}</span>
      <RoleBadge role={who.role} />
    </span>
  );
}

export function ConversationList({
  items,
  loading,
  activeId,
  onOpen,
  showAnsweredBy = false,
}: {
  items: ConversationSummary[];
  loading?: boolean;
  activeId?: string | null;
  onOpen: (id: string) => void;
  showAnsweredBy?: boolean;
}) {
  const { t, fmt } = useI18n();
  if (loading) return <ListSkeleton rows={4} />;
  if (!items.length) return <EmptyState icon={<Inbox size={20} />} title={t('inbox.empty')} />;
  return (
    <ul className="space-y-1">
      {items.map((c) => (
        <li key={c.id}>
          <button
            onClick={() => onOpen(c.id)}
            className={cn(
              'flex w-full flex-col gap-1 rounded-2xl px-3.5 py-3 text-start transition-colors',
              c.id === activeId ? 'bg-surface-3' : 'hover:bg-surface-2',
            )}
          >
            <span className="flex items-center gap-2">
              {c.unread && <span className="bg-accent h-2 w-2 shrink-0 rounded-full" />}
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-sm',
                  c.unread ? 'font-semibold' : 'font-medium',
                )}
              >
                {c.subject}
              </span>
              <span className="text-subtle shrink-0 text-[11px]">
                {fmt.relative(c.lastMessageAt)}
              </span>
            </span>
            <span className="text-subtle flex items-center gap-2 text-xs">
              <Sender who={c.with} size={18} />
              {showAnsweredBy && (
                <span className="ms-auto shrink-0">
                  {c.answeredBy ? (
                    <span className="text-easy inline-flex items-center gap-1">
                      <CheckCheck size={13} /> @{c.answeredBy.username}
                    </span>
                  ) : (
                    <span className="text-medium">{t('inbox.waiting')}</span>
                  )}
                </span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function ConversationView({ id }: { id: string }) {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const { data, isLoading } = useConversation(id);
  const reply = useReply(id);
  const [body, setBody] = useState('');
  const [asTeam, setAsTeam] = useState(true);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [data?.messages.length]);

  if (isLoading || !data) return <ListSkeleton rows={3} />;
  const teamSide =
    data.canReplyAsTeam && (data.kind === 'team' ? !isMineConv(data.messages) : true);

  return (
    <div className="flex h-full flex-col">
      <header className="border-border border-b pb-4">
        <h2 className="text-lg font-semibold">{data.subject}</h2>
        <p className="text-subtle mt-1 flex flex-wrap items-center gap-2 text-xs">
          {t('inbox.with')} <Sender who={data.with} size={18} />
          {data.answeredBy && (
            <span className="text-easy inline-flex items-center gap-1">
              · <CheckCheck size={13} /> {t('inbox.answeredBy', { u: data.answeredBy.username })}
            </span>
          )}
        </p>
      </header>
      <ol className="flex-1 space-y-4 overflow-y-auto py-5">
        {data.messages.map((msg, i) => (
          <MessageBubble key={msg.id} msg={msg} index={i} />
        ))}
        <div ref={end} />
      </ol>
      <form
        className="border-border space-y-2 border-t pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim()) return;
          reply.mutate(
            { body: body.trim(), ...(teamSide ? { asTeam } : {}) },
            {
              onSuccess: () => setBody(''),
              onError: (err) =>
                toast(err instanceof ApiError ? err.message : t('common.error'), 'error'),
            },
          );
        }}
      >
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('inbox.replyPh')}
          maxLength={10_000}
          className="min-h-24"
          aria-label={t('inbox.replyPh')}
        />
        <div className="flex flex-wrap items-center gap-3">
          {teamSide && (
            <label className="text-muted flex items-center gap-2 text-sm">
              <Switch on={asTeam} onChange={() => setAsTeam((v) => !v)} label={t('inbox.asTeam')} />
              {asTeam ? t('inbox.asTeam') : t('inbox.asMe')}
            </label>
          )}
          <Button
            type="submit"
            variant="primary"
            className="ms-auto"
            loading={reply.isPending}
            disabled={!body.trim()}
          >
            <Send size={16} /> {t('inbox.send')}
          </Button>
        </div>
        <p className="text-subtle text-[11px]">{fmt.relative(data.lastMessageAt)}</p>
      </form>
    </div>
  );
}

const isMineConv = (msgs: ChatMessage[]) => Boolean(msgs[0]?.mine);

function MessageBubble({ msg, index }: { msg: ChatMessage; index: number }) {
  const { t, fmt } = useI18n();
  return (
    <m.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 6) * 0.03 }}
      className={cn('flex flex-col gap-1.5', msg.mine ? 'items-end' : 'items-start')}
    >
      <div className="text-subtle flex items-center gap-2 text-xs">
        <Sender who={msg.author} size={22} />
        {msg.mine && msg.asTeam && <span>· {t('inbox.sentAsTeam')}</span>}
        <span>· {fmt.relative(msg.createdAt)}</span>
        {!msg.mine && !isSystem(msg.author) && (
          <ReportButton targetType="message" targetId={msg.id} compact icon={<Flag size={12} />} />
        )}
      </div>
      <p
        dir="auto"
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-line',
          msg.mine ? 'bg-accent text-on-accent' : 'bg-surface-2',
        )}
      >
        {msg.body}
      </p>
    </m.li>
  );
}
