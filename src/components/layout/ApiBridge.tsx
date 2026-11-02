import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { setApiHooks } from '@/lib/api';
import { keys } from '@/lib/keys';
import { useI18n, type MessageKey } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

const LOCALIZED = [
  'profanity_blocked',
  'banned',
  'disabled',
  'vpn',
  'messages_off',
  'recipient_messages_off',
  'self_review',
  'rate_limited',
  'csrf',
  'history_stale',
];
const REFRESH_ME = ['banned', 'disabled', 'vpn', 'messages_off'];

/**
 * Connects the API client to the UI: translated error messages, the profanity
 * confirmation dialog, and refreshing /me when a ban or VPN block shows up.
 */
export function ApiBridge() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [words, setWords] = useState<string[] | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  useEffect(() => {
    setApiHooks({
      translate: (code) => {
        if (REFRESH_ME.includes(code)) void qc.invalidateQueries({ queryKey: keys.me });
        return LOCALIZED.includes(code) ? t(`apiError.${code}` as MessageKey) : undefined;
      },
      confirmProfanity: (w) =>
        new Promise<boolean>((resolve) => {
          resolver.current = resolve;
          setWords(w);
        }),
    });
  }, [t, qc]);

  const answer = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setWords(null);
  };

  return (
    <Modal open={words !== null} onClose={() => answer(false)} title={t('profanity.title')}>
      <div className="space-y-4">
        <p className="text-medium flex gap-3 rounded-xl bg-[color-mix(in_oklab,var(--medium)_12%,transparent)] p-3 text-sm">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          {t('profanity.body')}
        </p>
        {words && words.length > 0 && (
          <p className="text-subtle text-xs">
            {t('profanity.found')}{' '}
            <span className="text-fg font-medium" dir="auto">
              {words.join('، ')}
            </span>
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button variant="primary" onClick={() => answer(false)} className="sm:flex-1" autoFocus>
            {t('profanity.edit')}
          </Button>
          <Button onClick={() => answer(true)} className="sm:flex-1">
            {t('profanity.sendAnyway')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
