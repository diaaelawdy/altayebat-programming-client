import { useQuery } from '@tanstack/react-query';
import { m } from 'framer-motion';
import { CheckCircle2, Send, Users } from 'lucide-react';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useDebounced } from '@/lib/hooks';
import { useI18n } from '@/i18n';
import type { UserRef } from '@/shared/types';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/components/ui/Toast';
import { useCan } from '@/features/auth/Can';
import { useSendMessage } from './api';
import { Sender } from './parts';

/**
 * Email-style compose. Goes to the team unless the sender has `messages.send_any`
 * and picks a user.
 */
export function Compose({
  onSent,
  to: initialTo = '',
}: {
  onSent?: (id: string) => void;
  to?: string;
}) {
  const { t } = useI18n();
  const can = useCan();
  const toast = useToast();
  const send = useSendMessage();
  const anyone = can('messages.send_any');
  const team = can('messages.team_inbox');
  const [to, setTo] = useState(initialTo);
  const [picked, setPicked] = useState<UserRef | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [asTeam, setAsTeam] = useState(false);
  const [sentToTeam, setSentToTeam] = useState(false);
  const dq = useDebounced(to.trim().toLowerCase(), 250);
  const suggestions = useQuery({
    queryKey: ['recipients', dq],
    queryFn: () =>
      api.get<{ items: UserRef[] }>(`/messages/recipients?q=${encodeURIComponent(dq)}`),
    enabled: anyone && dq.length >= 2 && picked?.username !== dq,
  });

  if (sentToTeam)
    return (
      <m.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="py-10 text-center"
      >
        <CheckCircle2 size={40} className="text-easy mx-auto" />
        <h2 className="mt-4 text-lg font-semibold">{t('compose.sentTitle')}</h2>
        <p className="text-muted mt-1 text-sm">{t('compose.sentBody')}</p>
        <Button className="mt-6" onClick={() => setSentToTeam(false)}>
          {t('compose.another')}
        </Button>
      </m.div>
    );

  const recipient = to.trim().toLowerCase();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        send.mutate(
          {
            subject: subject.trim(),
            body: body.trim(),
            ...(recipient ? { to: recipient, asTeam } : {}),
          },
          {
            onSuccess: (r) => {
              setSubject('');
              setBody('');
              if (recipient) onSent?.(r.id);
              else setSentToTeam(true);
            },
            onError: (err) =>
              toast(err instanceof ApiError ? err.message : t('common.error'), 'error'),
          },
        );
      }}
    >
      <Field label={t('compose.to')}>
        {(id) =>
          anyone ? (
            <div className="relative">
              <Input
                id={id}
                value={to}
                onChange={(e) => {
                  setTo(e.target.value.replace(/\s/g, ''));
                  setPicked(null);
                }}
                placeholder={t('compose.toPh')}
                dir="ltr"
                autoComplete="off"
              />
              {suggestions.data && suggestions.data.items.length > 0 && !picked && (
                <ul className="border-border bg-surface shadow-card absolute inset-x-0 top-full z-30 mt-1 rounded-2xl border p-1">
                  {suggestions.data.items.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setTo(u.username);
                          setPicked(u);
                        }}
                        className="hover:bg-surface-2 w-full rounded-xl px-3 py-2 text-start text-sm"
                      >
                        <Sender who={u} size={22} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!to && (
                <p className="text-subtle mt-1.5 flex items-center gap-1.5 text-xs">
                  <Users size={13} /> {t('compose.toTeam')}
                </p>
              )}
            </div>
          ) : (
            <p
              id={id}
              className="border-border bg-surface-2 text-muted flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm"
            >
              <Users size={16} className="text-accent" /> {t('compose.toTeam')}
            </p>
          )
        }
      </Field>
      <Field label={t('compose.subject')}>
        {(id) => (
          <Input
            id={id}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            minLength={2}
            maxLength={150}
            dir="auto"
          />
        )}
      </Field>
      <Field label={t('compose.body')}>
        {(id) => (
          <Textarea
            id={id}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            maxLength={10_000}
            className="min-h-40"
            dir="auto"
          />
        )}
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        {team && recipient && (
          <label className="text-muted flex items-center gap-2 text-sm">
            <Switch on={asTeam} onChange={() => setAsTeam((v) => !v)} label={t('inbox.asTeam')} />
            {asTeam ? t('inbox.asTeam') : t('inbox.asMe')}
          </label>
        )}
        <Button
          type="submit"
          variant="primary"
          className="ms-auto"
          loading={send.isPending}
          disabled={subject.trim().length < 2 || !body.trim()}
        >
          <Send size={16} /> {t('inbox.send')}
        </Button>
      </div>
    </form>
  );
}
