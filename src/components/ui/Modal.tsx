import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Open dialogs, oldest first. */
const stack: object[] = [];

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const restore = useRef<HTMLElement | null>(null);
  // Callers usually pass an inline `onClose`, which is a new function on every render. Keep the
  // latest one in a ref so the open/close effect below doesn't re-run (and re-focus the first
  // field) each time the parent re-renders, e.g. on every keystroke in a form.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Stacked dialogs (e.g. a confirm over a form): the newest sits on top and owns Escape/Tab.
  const [depth, setDepth] = useState(0);
  useEffect(() => {
    if (!open) return;
    const token = {};
    stack.push(token);
    setDepth(stack.length);
    const isTop = () => stack[stack.length - 1] === token;
    restore.current = document.activeElement as HTMLElement;
    const t = setTimeout(
      () =>
        panel.current
          ?.querySelector<HTMLElement>('input,textarea,select,button:not([data-close])')
          ?.focus(),
      30,
    );
    const onKey = (e: KeyboardEvent) => {
      if (!isTop()) return;
      if (e.key === 'Escape') onCloseRef.current();
      if (e.key === 'Tab' && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>(
          'a,button,input,textarea,select,[tabindex]:not([tabindex="-1"])',
        );
        if (!f.length) return;
        const first = f[0]!;
        const last = f[f.length - 1]!;
        const wrapTo = e.shiftKey
          ? document.activeElement === first
            ? last
            : null
          : document.activeElement === last
            ? first
            : null;
        if (wrapTo) {
          e.preventDefault();
          wrapTo.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(token), 1);
      if (!stack.length) document.body.style.overflow = '';
      restore.current?.focus?.();
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <m.div
          style={{ zIndex: 50 + depth * 10 }}
          className="fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <m.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
            className={cn(
              'border-border bg-surface relative max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl border p-6 shadow-2xl sm:max-w-lg sm:rounded-3xl',
              className,
            )}
            initial={{ y: 24, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 16, scale: 0.98, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                {description && <p className="text-muted mt-1 text-sm">{description}</p>}
              </div>
              <button
                data-close
                onClick={onClose}
                className="text-muted hover:bg-surface-2 hover:text-fg rounded-lg p-1"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
