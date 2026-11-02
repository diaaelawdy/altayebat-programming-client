import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, m } from 'framer-motion';
import { Check, Eye, EyeOff, Loader2, Lock, ShieldCheck, User, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '@/lib/api';
import { keys } from '@/lib/keys';
import { useDebounced } from '@/lib/hooks';
import { cn } from '@/lib/cn';
import { useI18n } from '@/i18n';
import { USERNAME_RE } from '@/shared/constants';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { BrandMark } from '@/components/layout/Logo';
import { AvatarPicker } from '@/components/ui/AvatarPicker';
import { randomAvatar } from '@/components/ui/avatarData';
import { useMe } from './useMe';

type Mode = 'login' | 'register';

/** Live checks shown under the fields while typing (mirrors the server rules). */
function usernameRules(u: string) {
  return {
    length: u.length >= 3 && u.length <= 20,
    start: u.length > 0 && !/^[0-9]/.test(u),
    chars: u.length > 0 && /^[a-z0-9_-]+$/.test(u),
  };
}

export function AuthPage() {
  const { t } = useI18n();
  const { me, loading } = useMe();
  const loc = useLocation();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const mode: Mode = loc.pathname === '/register' ? 'register' : 'login';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [avatar, setAvatar] = useState(randomAvatar);
  const [touched, setTouched] = useState(false);
  const userRef = useRef<HTMLInputElement>(null);

  const u = username.trim().toLowerCase();
  const du = useDebounced(u, 350);
  const rules = usernameRules(u);
  const formatOk = USERNAME_RE.test(u);
  const passwordOk = password.length >= 6;

  const availability = useQuery({
    queryKey: ['username-check', du],
    queryFn: ({ signal }) =>
      api.get<{ available: boolean; reason?: 'taken' | 'reserved' | 'format' }>(
        `/auth/username/check?u=${encodeURIComponent(du)}`,
        signal,
      ),
    enabled: mode === 'register' && USERNAME_RE.test(du),
    staleTime: 30_000,
  });
  const checking = mode === 'register' && formatOk && (du !== u || availability.isFetching);
  const available = availability.data?.available && du === u;

  const setMode = (m2: Mode) => {
    nav(
      { pathname: m2 === 'register' ? '/register' : '/login', search: loc.search },
      { replace: true },
    );
    setTouched(false);
  };

  useEffect(() => {
    userRef.current?.focus();
  }, [mode]);

  const submit = useMutation({
    mutationFn: () =>
      api.post(
        mode === 'register' ? '/auth/register' : '/auth/login',
        mode === 'register' ? { username: u, password, avatar } : { username: u, password },
      ),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.me });
      if (mode === 'register') toast(t('auth.welcome', { u }));
      nav(next, { replace: true });
    },
  });

  if (!loading && me) return <Navigate to={next} replace />;

  const canSubmit =
    mode === 'login'
      ? u.length > 0 && password.length > 0
      : formatOk && passwordOk && Boolean(available);
  const error =
    submit.error instanceof ApiError
      ? submit.error.message
      : submit.error
        ? t('common.error')
        : null;

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center px-4 py-10">
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-[430px]"
      >
        <div className="flex flex-col items-center text-center">
          <BrandMark size={64} />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">{t('app.name')}</h1>
          <p className="text-muted mt-2">{t('auth.tagline')}</p>
        </div>

        <div className="border-border bg-surface/80 shadow-card mt-9 rounded-[28px] border p-6 backdrop-blur sm:p-7">
          <SegTabs
            mode={mode}
            onChange={setMode}
            labels={{ login: t('auth.signIn'), register: t('auth.register') }}
          />

          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setTouched(true);
              if (canSubmit) submit.mutate();
            }}
            noValidate
          >
            <AnimatePresence initial={false}>
              {mode === 'register' && (
                <m.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-surface-2 border-border rounded-2xl border p-4">
                    <AvatarPicker value={avatar} onChange={setAvatar} name={u} />
                  </div>
                </m.div>
              )}
            </AnimatePresence>
            <div>
              <IconInput
                inputRef={userRef}
                icon={<User size={18} />}
                value={username}
                onChange={(v) => {
                  setUsername(v.replace(/\s/g, ''));
                  submit.reset();
                }}
                placeholder={t('auth.usernamePh')}
                autoComplete="username"
                maxLength={20}
                invalid={mode === 'register' && touched && !formatOk}
                trailing={
                  mode === 'register' && formatOk ? (
                    checking ? (
                      <Loader2 size={16} className="text-subtle animate-spin" />
                    ) : available ? (
                      <Check size={16} className="text-easy" />
                    ) : availability.data ? (
                      <X size={16} className="text-danger" />
                    ) : null
                  ) : null
                }
              />
              <AnimatePresence initial={false}>
                {mode === 'register' && (username.length > 0 || touched) && (
                  <m.ul
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2.5 space-y-1 overflow-hidden ps-1"
                    aria-live="polite"
                  >
                    <Rule ok={rules.length}>{t('auth.rule.length')}</Rule>
                    <Rule ok={rules.start}>{t('auth.rule.start')}</Rule>
                    <Rule ok={rules.chars}>{t('auth.rule.chars')}</Rule>
                    {formatOk && (
                      <Rule ok={checking ? null : Boolean(available)}>
                        {checking
                          ? t('auth.rule.checking')
                          : available
                            ? t('auth.rule.available')
                            : availability.data?.reason === 'reserved'
                              ? t('auth.rule.reserved')
                              : t('auth.rule.taken')}
                      </Rule>
                    )}
                  </m.ul>
                )}
              </AnimatePresence>
            </div>

            <div>
              <IconInput
                icon={<Lock size={18} />}
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  submit.reset();
                }}
                placeholder={t('auth.passwordPh')}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                maxLength={128}
                invalid={mode === 'register' && touched && !passwordOk}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="text-subtle hover:text-fg grid h-8 w-8 place-items-center rounded-lg transition-colors"
                    aria-label={show ? t('auth.hide') : t('auth.show')}
                    aria-pressed={show}
                  >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
              <AnimatePresence initial={false}>
                {mode === 'register' && (password.length > 0 || touched) && (
                  <m.ul
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2.5 overflow-hidden ps-1"
                    aria-live="polite"
                  >
                    <Rule ok={passwordOk}>{t('auth.rule.password')}</Rule>
                  </m.ul>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {error && (
                <m.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-danger rounded-xl bg-[color-mix(in_oklab,var(--danger)_12%,transparent)] px-3.5 py-2.5 text-sm"
                  role="alert"
                >
                  {error}
                </m.p>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="h-14 w-full rounded-2xl text-base"
              disabled={!canSubmit}
              loading={submit.isPending}
            >
              {mode === 'register' ? t('auth.register') : t('auth.signIn')}
            </Button>
          </form>
        </div>

        <p className="text-subtle mt-6 flex items-center justify-center gap-2 text-center text-sm">
          <ShieldCheck size={15} className="text-accent shrink-0" />
          {mode === 'register' ? t('auth.noReset') : t('auth.noEmail')}
        </p>
      </m.div>
    </div>
  );
}

function SegTabs({
  mode,
  onChange,
  labels,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
  labels: Record<Mode, string>;
}) {
  const id = useId();
  return (
    <div role="tablist" className="bg-surface-2 grid grid-cols-2 rounded-2xl p-1.5">
      {(['login', 'register'] as const).map((k) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={mode === k}
          onClick={() => onChange(k)}
          className={cn(
            'relative h-11 rounded-xl text-[15px] font-medium transition-colors',
            mode === k ? 'text-fg' : 'text-subtle hover:text-muted',
          )}
        >
          {mode === k && (
            <m.span
              layoutId={`auth-tab-${id}`}
              className="bg-surface-3 absolute inset-0 rounded-xl shadow-sm"
              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
            />
          )}
          <span className="relative">{labels[k]}</span>
        </button>
      ))}
    </div>
  );
}

function IconInput({
  icon,
  trailing,
  invalid,
  onChange,
  inputRef,
  ...rest
}: {
  icon: ReactNode;
  trailing?: ReactNode;
  invalid?: boolean;
  onChange: (v: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  return (
    <label
      className={cn(
        'group bg-surface-2 flex h-14 items-center gap-3 rounded-2xl border px-4 transition-[border-color,box-shadow] duration-150',
        'focus-within:border-accent focus-within:shadow-[0_0_0_4px_var(--accent-soft)]',
        invalid ? 'border-danger' : 'border-border',
      )}
    >
      <span className="text-subtle group-focus-within:text-accent shrink-0 transition-colors">
        {icon}
      </span>
      <input
        ref={inputRef}
        {...rest}
        dir="ltr"
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        className="text-fg placeholder:text-subtle h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none rtl:text-right"
        spellCheck={false}
        autoCapitalize="none"
      />
      {trailing}
    </label>
  );
}

function Rule({ ok, children }: { ok: boolean | null; children: ReactNode }) {
  return (
    <li
      className={cn(
        'flex items-center gap-2 text-sm transition-colors duration-200',
        ok === null ? 'text-subtle' : ok ? 'text-easy' : 'text-subtle',
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <m.span
          key={String(ok)}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="grid w-4 place-items-center"
        >
          {ok === null ? (
            <Loader2 size={14} className="animate-spin" />
          ) : ok ? (
            <Check size={15} />
          ) : (
            <X size={15} />
          )}
        </m.span>
      </AnimatePresence>
      {children}
    </li>
  );
}
