import { AlertTriangle } from 'lucide-react';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '@/i18n';
import { Button } from './Button';
import { ConfirmCtx, type ConfirmOptions } from './confirmContext';
import { Modal } from './Modal';

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback(
    (o: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolver.current?.(false);
        resolver.current = resolve;
        setOpts(o);
      }),
    [],
  );
  const answer = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpts(null);
  };
  const danger = opts?.danger !== false;

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal open={opts !== null} onClose={() => answer(false)} title={opts?.title ?? ''}>
        <div className="space-y-5">
          {opts?.body && (
            <p className="text-muted flex gap-3 text-sm leading-relaxed">
              {danger && <AlertTriangle size={18} className="text-danger mt-0.5 shrink-0" />}
              {opts.body}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={() => answer(false)} autoFocus>
              {t('common.cancel')}
            </Button>
            <Button variant={danger ? 'danger' : 'primary'} onClick={() => answer(true)}>
              {opts?.confirmLabel ?? (danger ? t('common.delete') : t('common.confirm'))}
            </Button>
          </div>
        </div>
      </Modal>
    </ConfirmCtx.Provider>
  );
}
