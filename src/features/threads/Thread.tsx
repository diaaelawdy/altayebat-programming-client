import { AnimatePresence, m } from 'framer-motion';
import {
  ChevronDown,
  CornerDownRight,
  Flag,
  MessageSquare,
  Pencil,
  Reply,
  Trash2,
} from 'lucide-react';
import { storage } from '@/lib/storage';
import { memo, useMemo, useState, useSyncExternalStore } from 'react';
import { UserChip } from '@/components/ui/UserChip';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Markdown } from '@/components/ui/Markdown';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { Segmented } from '@/components/ui/Tabs';
import { useCan } from '@/features/auth/Can';
import { useMe } from '@/features/auth/useMe';
import { LoadMore } from '@/lib/paged';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import type { Post, RootPost } from '@/shared/types';
import { useThread, useThreadMutations, type ThreadConfig } from './api';
import { buildTree, type TreeNode } from './tree';
import { VoteButtons, type VoteValue } from './VoteButtons';
import { ReportDialog } from './ReportDialog';
import { useConfirm } from '@/components/ui/confirmContext';

const MAX_INDENT = 4;

interface Actions {
  onVote: (id: string, v: VoteValue) => void;
  onReply: (parentId: string, body: string) => Promise<unknown>;
  onEdit: (id: string, body: string) => Promise<unknown>;
  onDelete: (id: string) => void;
  onReport: (id: string) => void;
  canWrite: boolean;
  canVote: boolean;
  canDeleteAny: boolean;
  meId: string | null;
}

export function Thread({
  cfg,
  title,
  subtitle,
  emptyText,
  placeholder,
}: {
  cfg: ThreadConfig;
  title: string;
  subtitle?: string;
  emptyText: string;
  placeholder: string;
}) {
  const confirm = useConfirm();
  const { t } = useI18n();
  const { me } = useMe();
  const can = useCan();
  const [sort, setSort] = useState<'top' | 'newest'>('top');
  const [draft, setDraft] = useState('');
  const [report, setReport] = useState<string | null>(null);
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useThread(cfg, sort);
  const mut = useThreadMutations(cfg, sort);
  const roots = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const writePerm = cfg.kind === 'answer' ? 'answers.create' : 'comments.create';

  const actions: Actions = {
    onVote: (id, value) => mut.vote.mutate({ id, value }),
    onReply: (parentId, body) =>
      mut.create.mutateAsync({ body, parentId }).then((r) => {
        expand(parentId);
        return r;
      }),
    onEdit: (id, body) => mut.edit.mutateAsync({ id, body }),
    onDelete: (id) =>
      void confirm({ title: t('thread.confirmDelete') }).then((ok) => ok && mut.remove.mutate(id)),
    onReport: setReport,
    canWrite: can(writePerm),
    canVote: can('answers.vote'),
    canDeleteAny: can(cfg.kind === 'answer' ? 'answers.delete_any' : 'comments.delete_any'),
    meId: me?.id ?? null,
  };

  const submit = () => {
    if (!draft.trim()) return;
    void mut.create.mutateAsync({ body: draft }).then(() => setDraft(''));
  };

  return (
    <section aria-labelledby={`thread-${cfg.kind}`} className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={`thread-${cfg.kind}`} className="flex items-center gap-2 text-lg font-semibold">
            <MessageSquare size={18} className="text-accent" /> {title}
          </h2>
          {subtitle && <p className="text-muted mt-1 text-sm">{subtitle}</p>}
        </div>
        <Segmented
          value={sort}
          onChange={setSort}
          items={[
            { value: 'top', label: t('sort.top') },
            { value: 'newest', label: t('sort.newest') },
          ]}
        />
      </div>

      {actions.canWrite ? (
        <div className="border-border bg-surface rounded-2xl border p-4">
          <MarkdownEditor
            value={draft}
            onChange={setDraft}
            placeholder={placeholder}
            onSubmit={submit}
          />
          <div className="mt-3 flex justify-end">
            <Button
              variant="primary"
              onClick={submit}
              loading={mut.create.isPending && !mut.create.variables?.parentId}
              disabled={!draft.trim()}
            >
              {t('thread.post')}
            </Button>
          </div>
        </div>
      ) : !me ? (
        <ButtonLink to="/login" variant="soft" className="w-full">
          {t('thread.signIn')}
        </ButtonLink>
      ) : null}

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : roots.length === 0 ? (
        <EmptyState icon={<MessageSquare size={20} />} title={emptyText} />
      ) : (
        <ul className="space-y-4">
          <AnimatePresence initial={false}>
            {roots.map((r) => (
              <m.li
                key={r.id}
                layout="position"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <RootItem root={r} actions={actions} />
              </m.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      <LoadMore
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
      <ReportDialog
        target={report ? { type: cfg.kind, id: report } : null}
        onClose={() => setReport(null)}
      />
    </section>
  );
}

const RootItem = memo(function RootItem({ root, actions }: { root: RootPost; actions: Actions }) {
  const [collapsed, toggle] = useCollapsed(root.id);
  const tree = useMemo(
    () => buildTree(root.id, root.author?.username ?? null, root.replies),
    [root.id, root.author, root.replies],
  );
  return (
    <article className="border-border bg-surface rounded-2xl border p-4 sm:p-5">
      <PostBody post={root} actions={actions} />
      {root.replies.length > 0 && (
        <Replies
          nodes={tree}
          count={root.replies.length}
          collapsed={collapsed}
          onToggle={toggle}
          actions={actions}
        />
      )}
    </article>
  );
});

/**
 * Nested replies with a connector from each reply to its parent, and a per-post
 * hide/show toggle remembered on this device.
 */
function Replies({
  nodes,
  count,
  collapsed,
  onToggle,
  actions,
}: {
  nodes: TreeNode[];
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  actions: Actions;
}) {
  const { t } = useI18n();
  return (
    <div className="mt-2">
      <button
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="text-accent hover:bg-accent-soft inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
      >
        <ChevronDown
          size={14}
          className={cn('transition-transform', collapsed && '-rotate-90 rtl:rotate-90')}
        />
        {count === 1
          ? t(collapsed ? 'thread.showReply' : 'thread.hideReply')
          : t(collapsed ? 'thread.showReplies' : 'thread.hideReplies', { n: count })}
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <m.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            {nodes.map((n, i) => (
              <ReplyNode key={n.id} node={n} actions={actions} last={i === nodes.length - 1} />
            ))}
          </m.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReplyNode({ node, actions, last }: { node: TreeNode; actions: Actions; last: boolean }) {
  const [collapsed, toggle] = useCollapsed(node.id);
  const deep = node.depth >= MAX_INDENT;
  return (
    <li className={cn('group/reply relative pt-3', !deep && 'ps-6 sm:ps-8')}>
      {/* Connector: a rail down from the parent and an elbow into this reply. */}
      {!deep && (
        <>
          <span
            aria-hidden
            className={cn(
              'bg-border-strong group-hover/reply:bg-accent absolute start-2.5 top-0 w-0.5 transition-colors sm:start-3.5',
              last ? 'h-6' : 'bottom-0',
            )}
          />
          <span
            aria-hidden
            className="border-border-strong group-hover/reply:border-accent absolute start-2.5 top-6 h-3 w-3 -translate-y-full rounded-es-xl border-s-2 border-b-2 transition-colors sm:start-3.5 sm:w-4"
          />
        </>
      )}
      <div className="bg-surface-2/60 rounded-xl p-3">
        <PostBody
          post={node}
          actions={actions}
          parent={node.parentAuthor ? { id: node.parentId!, username: node.parentAuthor } : null}
          compact
        />
      </div>
      {node.children.length > 0 && (
        <Replies
          nodes={node.children}
          count={countDescendants(node)}
          collapsed={collapsed}
          onToggle={toggle}
          actions={actions}
        />
      )}
    </li>
  );
}

const countDescendants = (n: TreeNode): number =>
  n.children.reduce((sum, c) => sum + 1 + countDescendants(c), 0);

/**
 * Replies start hidden, at every level. Posts whose replies the viewer opened are
 * remembered on this device, and shared so a new reply can open its parent.
 */
const EXPANDED_KEY = 'mk:expanded-replies';
const listeners = new Set<() => void>();
let expanded = new Set(storage.get<string[]>(EXPANDED_KEY, []));
function setExpanded(id: string, open: boolean) {
  if (expanded.has(id) === open) return;
  expanded = new Set(expanded);
  if (open) expanded.add(id);
  else expanded.delete(id);
  storage.set(EXPANDED_KEY, [...expanded].slice(-500));
  listeners.forEach((l) => l());
}
const expand = (id: string) => setExpanded(id, true);
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
function useCollapsed(id: string): [boolean, () => void] {
  const open = useSyncExternalStore(subscribe, () => expanded.has(id));
  return [!open, () => setExpanded(id, !open)];
}

/** Scrolls to a post and flashes it, for "replying to @x". */
function jumpTo(id: string) {
  const el = document.getElementById(`post-${id}`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('post-flash');
  setTimeout(() => el.classList.remove('post-flash'), 1400);
}

function PostBody({
  post,
  actions,
  parent,
  compact,
}: {
  post: Post;
  actions: Actions;
  /** The post this one answers (replies only). */
  parent?: { id: string; username: string } | null;
  compact?: boolean;
}) {
  const { t, fmt } = useI18n();
  const [mode, setMode] = useState<'view' | 'reply' | 'edit'>('view');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const mine = Boolean(post.author && post.author.id === actions.meId);

  const voteBlock = mine ? t('vote.own') : !actions.canVote ? t('vote.signIn') : null;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      setMode('view');
      setText('');
    } finally {
      setBusy(false);
    }
  };

  if (post.deleted)
    return (
      <p id={`post-${post.id}`} className="text-subtle py-1 text-sm italic">
        {t('common.deleted')}
      </p>
    );

  return (
    <div id={`post-${post.id}`} className="flex gap-3 rounded-xl transition-shadow">
      <div className="-ms-1 shrink-0">
        <VoteButtons
          score={post.score}
          myVote={post.myVote}
          disabledReason={voteBlock}
          onVote={(v) => actions.onVote(post.id, v)}
        />
      </div>
      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <UserChip user={post.author} size={compact ? 20 : 24} />
          {mine && (
            <span className="bg-accent-soft text-accent rounded px-1.5 text-[11px]">
              {t('common.you')}
            </span>
          )}
          <span className="text-subtle text-xs">· {fmt.relative(post.createdAt)}</span>
          {post.edited && <span className="text-subtle text-xs">· {t('common.edited')}</span>}
        </header>
        {parent && (
          <button
            onClick={() => jumpTo(parent.id)}
            className="text-subtle hover:text-accent mt-1 inline-flex items-center gap-1 text-xs transition-colors"
          >
            <CornerDownRight size={13} className="rtl:-scale-x-100" />
            {t('thread.replyingTo', { u: parent.username })}
          </button>
        )}
        {mode === 'edit' ? (
          <div className="mt-2 space-y-2">
            <MarkdownEditor
              value={text}
              onChange={setText}
              autoFocus
              onSubmit={() => void run(() => actions.onEdit(post.id, text))}
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" onClick={() => setMode('view')}>
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                variant="primary"
                loading={busy}
                onClick={() => void run(() => actions.onEdit(post.id, text))}
              >
                {t('common.save')}
              </Button>
            </div>
          </div>
        ) : (
          <Markdown html={post.bodyHtml} className={cn('mt-1.5', compact && 'text-[14px]')} />
        )}
        {mode === 'view' && (
          <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
            {actions.canWrite && (
              <ActionBtn
                onClick={() => setMode('reply')}
                icon={<Reply size={13} className="rtl:-scale-x-100" />}
              >
                {t('common.reply')}
              </ActionBtn>
            )}
            {mine && (
              <ActionBtn
                onClick={() => (setText(post.body), setMode('edit'))}
                icon={<Pencil size={13} />}
              >
                {t('common.edit')}
              </ActionBtn>
            )}
            {(mine || actions.canDeleteAny) && (
              <ActionBtn onClick={() => actions.onDelete(post.id)} icon={<Trash2 size={13} />}>
                {t('common.delete')}
              </ActionBtn>
            )}
            {actions.meId && !mine && (
              <ActionBtn onClick={() => actions.onReport(post.id)} icon={<Flag size={13} />}>
                {t('common.report')}
              </ActionBtn>
            )}
          </div>
        )}
        <AnimatePresence>
          {mode === 'reply' && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-2">
                <MarkdownEditor
                  value={text}
                  onChange={setText}
                  autoFocus
                  minRows={3}
                  placeholder={t('thread.writeReply')}
                  onSubmit={() => text.trim() && void run(() => actions.onReply(post.id, text))}
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" onClick={() => setMode('view')}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    loading={busy}
                    disabled={!text.trim()}
                    onClick={() => void run(() => actions.onReply(post.id, text))}
                  >
                    {t('common.reply')}
                  </Button>
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ActionBtn({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="text-subtle hover:bg-surface-2 hover:text-fg flex items-center gap-1 rounded-md px-2 py-1 transition-colors"
    >
      {icon}
      {children}
    </button>
  );
}
