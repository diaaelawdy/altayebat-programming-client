import { FileText, Pencil, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useBlocker } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { draftLink, type Draft } from './drafts';
import { useConfirm } from '@/components/ui/confirmContext';

/**
 * Protects unsaved form work.
 * - In-app navigation and `requestClose` open a dialog: save as draft, keep editing, or discard.
 * - Refresh / closing the tab can only show the browser's own prompt, so the work is
 *   saved as a draft first and nothing is lost whatever the user picks there.
 */
export function useUnsavedGuard({ dirty, saveDraft }: { dirty: boolean; saveDraft: () => void }) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search),
  );
  const [pendingClose, setPendingClose] = useState<(() => void) | null>(null);
  const saveRef = useRef(saveDraft);
  saveRef.current = saveDraft;

  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      saveRef.current();
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);

  const requestClose = useCallback(
    (close: () => void) => (dirty ? setPendingClose(() => close) : close()),
    [dirty],
  );

  const open = blocker.state === 'blocked' || pendingClose !== null;
  const leave = () => {
    if (blocker.state === 'blocked') blocker.proceed();
    pendingClose?.();
    setPendingClose(null);
  };
  const stay = () => {
    if (blocker.state === 'blocked') blocker.reset();
    setPendingClose(null);
  };

  const dialog = (
    <UnsavedDialog
      open={open}
      onSave={() => {
        saveDraft();
        leave();
      }}
      onStay={stay}
      onDiscard={leave}
    />
  );
  return { requestClose, dialog };
}

function UnsavedDialog({
  open,
  onSave,
  onStay,
  onDiscard,
}: {
  open: boolean;
  onSave: () => void;
  onStay: () => void;
  onDiscard: () => void;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      onClose={onStay}
      title={t('draft.leaveTitle')}
      description={t('draft.leaveBody')}
    >
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button variant="primary" onClick={onSave} className="sm:flex-1" autoFocus>
          <FileText size={16} /> {t('draft.save')}
        </Button>
        <Button onClick={onStay} className="sm:flex-1">
          <Pencil size={16} /> {t('draft.keepEditing')}
        </Button>
        <Button variant="ghost" onClick={onDiscard} className="text-danger sm:flex-1">
          <Trash2 size={16} /> {t('draft.discard')}
        </Button>
      </div>
    </Modal>
  );
}

/** Compact list of drafts with open + delete. */
export function DraftList({
  items,
  onOpen,
  onDelete,
  activeId,
}: {
  items: Draft[];
  onOpen?: (d: Draft) => void;
  onDelete: (id: string) => void;
  activeId?: string | null;
}) {
  const confirm = useConfirm();
  const { t, fmt } = useI18n();
  return (
    <ul className="space-y-2">
      {items.map((d) => (
        <li
          key={d.id}
          className="border-border bg-surface flex items-center gap-3 rounded-2xl border px-4 py-3"
        >
          <FileText size={16} className="text-accent shrink-0" />
          {onOpen ? (
            <button
              onClick={() => onOpen(d)}
              className="min-w-0 flex-1 truncate text-start text-sm font-medium hover:underline"
            >
              {d.name}
            </button>
          ) : (
            <Link
              to={draftLink(d)}
              className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
            >
              {d.name}
            </Link>
          )}
          {d.id === activeId && (
            <span className="bg-accent-soft text-accent rounded-md px-1.5 text-[11px]">
              {t('draft.editing')}
            </span>
          )}
          <span className="text-subtle hidden text-xs sm:inline">
            {t(d.kind === 'question' ? 'draft.kind.question' : 'draft.kind.company')} ·{' '}
            {fmt.relative(d.updatedAt)}
          </span>
          <button
            onClick={() =>
              void confirm({ title: t('draft.deleteConfirm'), body: d.name }).then(
                (ok) => ok && onDelete(d.id),
              )
            }
            className="text-subtle hover:text-danger rounded-lg p-1.5"
            aria-label={`${t('common.delete')} ${d.name}`}
          >
            <Trash2 size={15} />
          </button>
        </li>
      ))}
    </ul>
  );
}
