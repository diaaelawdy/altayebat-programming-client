import { useCallback, useMemo } from 'react';
import { usePreferences } from '@/theme/PreferencesProvider';
import { en, type MessageKey } from './en';
import { ar } from './ar';

export type { MessageKey };
type Vars = Record<string, string | number | undefined | null>;

const fill = (s: string, vars?: Vars) =>
  vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? '')) : s;

/** Latin digits in Arabic too, so code, examples and counts read consistently. */
const LOCALE_TAG = { en: 'en-GB', ar: 'ar-EG-u-nu-latn' } as const;

export function useI18n() {
  const { prefs, update } = usePreferences();
  const locale = prefs.locale;
  const dict = locale === 'ar' ? ar : en;
  const tag = LOCALE_TAG[locale];

  const t = useCallback(
    (key: MessageKey, vars?: Vars) => fill(dict[key] ?? en[key] ?? key, vars),
    [dict],
  );

  const fmt = useMemo(() => {
    const rtf = new Intl.RelativeTimeFormat(tag, { numeric: 'auto' });
    const nf = new Intl.NumberFormat(tag);
    const monthFmt = new Intl.DateTimeFormat(tag, { month: 'long', year: 'numeric' });
    const dateFmt = new Intl.DateTimeFormat(tag, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const steps: [Intl.RelativeTimeFormatUnit, number][] = [
      ['year', 31_536_000],
      ['month', 2_592_000],
      ['week', 604_800],
      ['day', 86_400],
      ['hour', 3600],
      ['minute', 60],
    ];
    return {
      number: (n: number) => nf.format(n),
      compact: (n: number) => new Intl.NumberFormat(tag, { notation: 'compact' }).format(n),
      relative(date: string | Date | null | undefined) {
        if (!date) return t('time.never');
        const secs = (new Date(date).getTime() - Date.now()) / 1000;
        for (const [unit, s] of steps)
          if (Math.abs(secs) >= s) return rtf.format(Math.round(secs / s), unit);
        return t('time.justNow');
      },
      /** Accepts a Date, ISO string or "YYYY-MM". */
      month: (d: string | Date | null | undefined) =>
        d
          ? monthFmt.format(
              typeof d === 'string' && /^\d{4}-\d{2}$/.test(d) ? new Date(`${d}-15`) : new Date(d),
            )
          : '',
      date: (d: string | Date) => dateFmt.format(new Date(d)),
    };
  }, [tag, t]);

  const setLocale = useCallback((l: 'en' | 'ar') => update({ locale: l }), [update]);
  const companyName = useCallback(
    (c: { name: string; nameAr?: string | null }) =>
      locale === 'ar' && c.nameAr ? c.nameAr : c.name,
    [locale],
  );

  return { t, fmt, locale, setLocale, dir: locale === 'ar' ? 'rtl' : 'ltr', companyName };
}
