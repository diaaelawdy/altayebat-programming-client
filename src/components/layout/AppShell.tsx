import { m } from 'framer-motion';
import { Building2, Home, Plus, User } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { CommandPalette } from './CommandPalette';
import { ApiBridge } from './ApiBridge';
import { BannedScreen, DisabledBanner, VpnBanner } from '@/features/auth/BannedScreen';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { useI18n } from '@/i18n';
import { useMe, useMeQuery } from '@/features/auth/useMe';
import { usePreferences } from '@/theme/PreferencesProvider';
import { cn } from '@/lib/cn';

export function AppShell() {
  const loc = useLocation();
  const [palette, setPalette] = useState(false);
  const { data } = useMeQuery();
  const { hydrate } = usePreferences();

  // Adopt the account's saved theme/language once per sign-in.
  useEffect(() => {
    if (data) hydrate(data.user?.preferences, Boolean(data.user));
  }, [data, hydrate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [loc.pathname]);

  const restriction = data?.user?.restriction ?? null;
  if (restriction?.type === 'banned')
    return (
      <>
        <BannedScreen restriction={restriction} />
        <ApiBridge />
      </>
    );

  return (
    <div className="flex min-h-dvh flex-col">
      {restriction?.type === 'vpn' && <VpnBanner />}
      {restriction?.type === 'disabled' && <DisabledBanner restriction={restriction} />}
      <Header onSearch={() => setPalette(true)} />
      <main id="main" className="flex-1 pb-20 md:pb-0">
        {/* Enter-only transition: the next page never waits for the previous one to animate out. */}
        <m.div
          key={pageKey(loc.pathname)}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </m.div>
      </main>
      <Footer />
      <MobileNav />
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
      <ApiBridge />
    </div>
  );
}

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="border-border mt-16 hidden border-t md:block">
      <div className="text-subtle mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-sm">
        <span>
          {t('app.name')} · {t('app.tagline')}
        </span>
        <span>{t('home.stat.free')}</span>
      </div>
    </footer>
  );
}

function MobileNav() {
  const { t } = useI18n();
  const { me } = useMe();
  const items = [
    { to: '/', icon: Home, label: t('nav.home'), end: true },
    { to: '/companies', icon: Building2, label: t('nav.companies') },
    { to: '/contribute', icon: Plus, label: t('nav.contribute') },
    { to: me ? '/me' : '/login', icon: User, label: me ? t('nav.profile') : t('nav.signIn') },
  ];
  return (
    <nav
      className="site-mobile-nav border-border bg-bg/90 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      aria-label="Mobile"
    >
      <div className="grid grid-cols-4">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 py-2.5 text-[11px]',
                isActive ? 'text-accent' : 'text-subtle',
              )
            }
          >
            <it.icon size={20} />
            {it.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

/** Transition key: sign in and create account count as one page, so switching tabs doesn't re-animate. */
function pageKey(pathname: string) {
  return pathname === '/register' ? '/login' : pathname.split('/').slice(0, 3).join('/');
}
