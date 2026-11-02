import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Preferences } from '@/shared/types';
import { storage } from '@/lib/storage';
import { api } from '@/lib/api';
import { useMediaQuery } from '@/lib/hooks';
import { DEFAULT_PREFS } from './defaults';

interface Ctx {
  prefs: Preferences;
  resolvedMode: 'dark' | 'light';
  update: (patch: Partial<Preferences>) => void;
  reset: () => void;
  /** Adopt preferences saved on the account (called once after sign-in). */
  hydrate: (server: Partial<Preferences> | undefined, signedIn: boolean) => void;
}

const PrefsContext = createContext<Ctx | null>(null);
const KEY = 'mk.prefs';

function normalize(p: Partial<Preferences> | null | undefined): Preferences {
  return {
    ...DEFAULT_PREFS,
    ...(p ?? {}),
    dark: { ...(p?.dark ?? {}) },
    light: { ...(p?.light ?? {}) },
  };
}

/** Writes tokens straight onto <html>; CSS derives every other color from these four. */
function apply(p: Preferences, mode: 'dark' | 'light') {
  const root = document.documentElement;
  root.dataset.mode = mode;
  root.lang = p.locale;
  root.dir = p.locale === 'ar' ? 'rtl' : 'ltr';
  const set = (k: string, v?: string | null) =>
    v ? root.style.setProperty(`--${k}`, v) : root.style.removeProperty(`--${k}`);
  set('accent', p.accent);
  const pal = p[mode];
  set('bg', pal.bg);
  set('surface', pal.surface);
  set('fg', pal.fg);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', pal.bg ?? (mode === 'dark' ? '#0d0d0f' : '#f6f6f8'));
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(() =>
    normalize(storage.get<Preferences | null>(KEY, null)),
  );
  const systemLight = useMediaQuery('(prefers-color-scheme: light)');
  const resolvedMode = prefs.mode === 'system' ? (systemLight ? 'light' : 'dark') : prefs.mode;
  const signedIn = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    apply(prefs, resolvedMode);
  }, [prefs, resolvedMode]);

  const persist = useCallback((next: Preferences) => {
    storage.set(KEY, next);
    if (!signedIn.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(
      () => void api.put('/me/preferences', next).catch(() => undefined),
      500,
    );
  }, []);

  const update = useCallback(
    (patch: Partial<Preferences>) =>
      setPrefs((cur) => {
        const next = normalize({ ...cur, ...patch });
        persist(next);
        return next;
      }),
    [persist],
  );

  const reset = useCallback(
    () =>
      setPrefs((cur) => {
        // Reset colors to defaults but keep the chosen language.
        const next = normalize({ locale: cur.locale });
        persist(next);
        return next;
      }),
    [persist],
  );

  const hydrate = useCallback((server: Partial<Preferences> | undefined, isSignedIn: boolean) => {
    const wasSignedIn = signedIn.current;
    signedIn.current = isSignedIn;
    if (!isSignedIn || wasSignedIn || !server) return;
    const next = normalize(server);
    storage.set(KEY, next);
    setPrefs(next);
  }, []);

  const value = useMemo(
    () => ({ prefs, resolvedMode, update, reset, hydrate }),
    [prefs, resolvedMode, update, reset, hydrate],
  );
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePreferences outside provider');
  return ctx;
}
