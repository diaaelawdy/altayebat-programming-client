import { m } from 'framer-motion';
import { Ban, Languages, LogOut, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useI18n } from '@/i18n';
import type { Restriction } from '@/shared/types';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Compose } from '@/features/messages/Compose';
import { useConversations } from '@/features/messages/api';
import { ConversationList, ConversationView } from '@/features/messages/parts';
import { useLogout } from './useMe';
import { LoadMore } from '@/lib/paged';

type AccountRestriction = Exclude<Restriction, { type: 'vpn' }>;

/** All a banned account sees: why, and (unless turned off) a way to write to the team. */
export function BannedScreen({ restriction }: { restriction: AccountRestriction }) {
  const { t, fmt, locale, setLocale } = useI18n();
  const logout = useLogout();
  const mine = useConversations('mine');
  const [view, setView] = useState<'notice' | 'compose' | string>('notice');

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-3xl items-center gap-2 px-4">
        <Logo />
        <Button
          variant="ghost"
          size="icon"
          className="ms-auto"
          onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
          aria-label={t('nav.language')}
        >
          <Languages size={18} />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => logout.mutate()}>
          <LogOut size={16} /> {t('nav.signOut')}
        </Button>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 py-8">
        <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 text-center">
            <div className="text-danger mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[color-mix(in_oklab,var(--danger)_14%,transparent)]">
              <Ban size={26} />
            </div>
            <h1 className="mt-4 text-2xl font-semibold">{t('banned.title')}</h1>
            {restriction.byIp ? (
              <p className="text-muted mt-2">{t('banned.byIp')}</p>
            ) : (
              <>
                {restriction.reason && (
                  <p className="text-muted mt-3" dir="auto">
                    <span className="text-subtle">{t('banned.reason')}:</span> {restriction.reason}
                  </p>
                )}
                {restriction.link && (
                  <p className="text-subtle mt-1 text-sm" dir="ltr">
                    {restriction.link}
                  </p>
                )}
                {restriction.at && (
                  <p className="text-subtle mt-1 text-xs">{fmt.date(restriction.at)}</p>
                )}
              </>
            )}
            <p className="text-muted mx-auto mt-5 max-w-md text-sm">
              {t(restriction.canMessage ? 'banned.appeal' : 'banned.noMessages')}
            </p>
            {view === 'notice' && restriction.canMessage && (
              <Button variant="primary" className="mt-4" onClick={() => setView('compose')}>
                <MessageSquare size={16} /> {t('banned.write')}
              </Button>
            )}
          </Card>
        </m.div>

        {view === 'compose' && (
          <Card className="p-5">
            <Compose />
          </Card>
        )}
        {view !== 'notice' && view !== 'compose' && (
          <Card className="p-5">
            <ConversationView id={view} />
          </Card>
        )}
        {mine.items.length > 0 && (
          <Card className="p-2">
            <ConversationList items={mine.items} activeId={view} onOpen={setView} />
            <LoadMore {...mine} />
          </Card>
        )}
      </main>
    </div>
  );
}

/** Shown on every page while the account is disabled: browsing works, posting doesn't. */
export function DisabledBanner({ restriction }: { restriction: AccountRestriction }) {
  const { t } = useI18n();
  return (
    <div className="text-danger border-b border-[color-mix(in_oklab,var(--danger)_30%,transparent)] bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] px-4 py-2.5 text-center text-sm">
      {t('disabled.banner')}
      {restriction.reason && (
        <span dir="auto">
          {' '}
          {t('banned.reason')}: {restriction.reason}
        </span>
      )}
      {restriction.canMessage && (
        <>
          {' '}
          <Link to="/inbox" className="font-medium underline underline-offset-2">
            {t('banned.write')}
          </Link>
        </>
      )}
    </div>
  );
}

/** Shown on every page while signed in through a VPN or proxy: browsing works, posting doesn't. */
export function VpnBanner() {
  const { t } = useI18n();
  return (
    <div className="text-medium border-b border-[color-mix(in_oklab,var(--medium)_30%,transparent)] bg-[color-mix(in_oklab,var(--medium)_12%,transparent)] px-4 py-2.5 text-center text-sm">
      {t('vpn.banner')}
    </div>
  );
}
