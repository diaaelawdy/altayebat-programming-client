import { AnimatePresence, m } from 'framer-motion';
import {
  Bell,
  ChevronDown,
  Flame,
  History,
  Languages,
  LogOut,
  Mail,
  Moon,
  Plus,
  Search,
  Settings,
  Shield,
  Sun,
  User,
  UserCheck,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Logo } from './Logo';
import { useAdminLinks, type AdminLink } from './nav';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useI18n } from '@/i18n';
import { usePreferences } from '@/theme/PreferencesProvider';
import { useLogout, useMe } from '@/features/auth/useMe';
import { cn } from '@/lib/cn';
import { MOD_KEY } from '@/lib/platform';

export function Header({ onSearch }: { onSearch: () => void }) {
  const { t, locale, setLocale } = useI18n();
  const { resolvedMode, update } = usePreferences();
  const { me } = useMe();
  const loc = useLocation();
  const { links: adminLinks, countOf } = useAdminLinks();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  const navCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-lg px-3 py-1.5 text-sm transition-colors',
      isActive ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg',
    );

  return (
    <header
      className={cn(
        'site-header sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter]',
        scrolled
          ? 'border-border bg-bg/80 border-b backdrop-blur-xl'
          : 'border-b border-transparent',
      )}
    >
      <a
        href="#main"
        className="focus:bg-surface sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:rounded-lg focus:px-3 focus:py-2"
      >
        {t('nav.skip')}
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-1.5 px-4 sm:gap-3">
        <Logo />
        <nav className="ms-4 hidden items-center gap-1 md:flex" aria-label="Main">
          <NavLink to="/companies" className={navCls}>
            {t('nav.companies')}
          </NavLink>
          <NavLink to="/contribute" className={navCls}>
            {t('nav.contribute')}
          </NavLink>
        </nav>

        <button
          onClick={onSearch}
          className="border-border bg-surface text-subtle hover:border-border-strong hover:text-muted ms-auto flex h-9 items-center gap-2 rounded-xl border px-3 text-sm transition-colors md:w-64"
          aria-label={t('nav.search')}
        >
          <Search size={16} />
          <span className="hidden flex-1 text-start md:inline">{t('nav.search')}…</span>
          <kbd className="border-border hidden rounded-md border px-1.5 text-[10px] md:inline">
            {MOD_KEY}K
          </kbd>
        </button>

        {/* On phones, signed-in users get language and theme from the account menu. */}
        <span className={cn('contents', me && 'max-sm:hidden')}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
            aria-label={t('nav.language')}
            title={t('nav.language')}
          >
            <Languages size={18} />
          </Button>
        </span>
        <span className="contents max-sm:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => update({ mode: resolvedMode === 'dark' ? 'light' : 'dark' })}
            aria-label={t('nav.theme')}
          >
            <AnimatePresence mode="wait" initial={false}>
              <m.span
                key={resolvedMode}
                initial={{ rotate: -60, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 60, opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                {resolvedMode === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
              </m.span>
            </AnimatePresence>
          </Button>
        </span>

        {me ? (
          <>
            {me.streak.current > 0 && (
              <Link
                to="/me"
                className="text-medium hidden items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium sm:flex"
                title={t('home.streak', { n: me.streak.current })}
              >
                <Flame size={16} /> {me.streak.current}
              </Link>
            )}
            <NotificationBell
              count={me.unreadMessages}
              to="/inbox"
              icon={<Mail size={18} />}
              label={t('nav.inbox')}
            />
            <NotificationBell count={me.unreadNotifications} />
            <UserMenu
              username={me.username!}
              avatar={me.avatar}
              adminLinks={adminLinks}
              countOf={countOf}
              key={loc.pathname}
            />
          </>
        ) : (
          <ButtonLink
            to={`/login?next=${encodeURIComponent(loc.pathname)}`}
            variant="primary"
            size="sm"
          >
            {t('nav.signIn')}
          </ButtonLink>
        )}
      </div>
    </header>
  );
}

function NotificationBell({
  count,
  to = '/notifications',
  icon = <Bell size={18} />,
  label,
}: {
  count: number;
  to?: string;
  icon?: React.ReactNode;
  label?: string;
}) {
  const { t } = useI18n();
  const name = label ?? t('nav.notifications');
  return (
    <Link
      to={to}
      className="text-muted hover:bg-surface-2 hover:text-fg relative grid h-9 w-9 place-items-center rounded-xl"
      aria-label={`${name}${count ? ` (${count})` : ''}`}
      title={name}
    >
      {icon}
      <AnimatePresence>
        {count > 0 && (
          <m.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="bg-accent text-on-accent absolute end-1 top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold"
          >
            {count > 9 ? '9+' : count}
          </m.span>
        )}
      </AnimatePresence>
    </Link>
  );
}

function UserMenu({
  username,
  avatar,
  adminLinks,
  countOf,
}: {
  username: string;
  avatar: string | null;
  adminLinks: AdminLink[];
  countOf: (l: AdminLink) => number;
}) {
  const { t, locale, setLocale } = useI18n();
  const { resolvedMode, update } = usePreferences();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const logout = useLogout();
  const totalPending = adminLinks.reduce((n, l) => n + countOf(l), 0);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const item =
    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-fg';
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="hover:bg-surface-2 flex items-center gap-1.5 rounded-xl p-1 pe-2"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="relative">
          <Avatar name={username} avatar={avatar} size={30} />
          {totalPending > 0 && (
            <span className="border-bg bg-accent absolute -end-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2" />
          )}
        </span>
        <ChevronDown size={14} className="text-subtle" />
      </button>
      <AnimatePresence>
        {open && (
          <m.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="border-border bg-surface absolute end-0 mt-2 w-60 origin-top-right rounded-2xl border p-1.5 shadow-2xl"
          >
            <div className="px-3 py-2 text-sm">
              <div className="font-medium">@{username}</div>
            </div>
            <div className="bg-border my-1 h-px" />
            <Link to="/me" className={item} role="menuitem">
              <User size={16} /> {t('nav.profile')}
            </Link>
            <Link to="/contribute" className={cn(item, 'md:hidden')} role="menuitem">
              <Plus size={16} /> {t('nav.contribute')}
            </Link>
            <Link to="/inbox" className={item} role="menuitem">
              <Mail size={16} /> {t('nav.inbox')}
            </Link>
            <Link to="/history" className={item} role="menuitem">
              <History size={16} /> {t('nav.history')}
            </Link>
            <Link to="/request-role" className={item} role="menuitem">
              <UserCheck size={16} /> {t('nav.requestRole')}
            </Link>
            <Link to="/settings" className={item} role="menuitem">
              <Settings size={16} /> {t('nav.settings')}
            </Link>
            <button
              className={cn(item, 'w-full sm:hidden')}
              role="menuitem"
              onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
            >
              <Languages size={16} /> {locale === 'en' ? 'العربية' : 'English'}
            </button>
            <button
              className={cn(item, 'w-full sm:hidden')}
              role="menuitem"
              onClick={() => update({ mode: resolvedMode === 'dark' ? 'light' : 'dark' })}
            >
              {resolvedMode === 'dark' ? <Sun size={16} /> : <Moon size={16} />} {t('nav.theme')}
            </button>
            {adminLinks.length > 0 && (
              <>
                <div className="bg-border my-1 h-px" />
                <div className="text-subtle flex items-center gap-1.5 px-3 pt-1.5 pb-1 text-[11px] font-semibold tracking-wider uppercase">
                  <Shield size={12} /> {t('nav.admin')}
                </div>
                {adminLinks.map((l) => {
                  const n = countOf(l);
                  return (
                    <Link key={l.to} to={l.to} className={item} role="menuitem">
                      <span className="flex-1">{t(l.key)}</span>
                      {!!n && (
                        <span className="bg-accent-soft text-accent rounded-md px-1.5 text-xs">
                          {n}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </>
            )}
            <div className="bg-border my-1 h-px" />
            <button onClick={() => logout.mutate()} className={cn(item, 'w-full')} role="menuitem">
              <LogOut size={16} className="rtl:-scale-x-100" /> {t('nav.signOut')}
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
