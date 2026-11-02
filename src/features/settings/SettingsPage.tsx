import { m } from 'framer-motion';
import { AlertTriangle, Check, RotateCcw } from 'lucide-react';
import { useI18n } from '@/i18n';
import { usePreferences } from '@/theme/PreferencesProvider';
import { ACCENT_PRESETS, DEFAULT_COLORS, contrast } from '@/theme/defaults';
import type { Palette } from '@/shared/types';
import { Button } from '@/components/ui/Button';
import { Card, SectionTitle } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Tabs';
import { DifficultyBadge, Tag } from '@/components/ui/Badges';
import { VoteButtons } from '@/features/threads/VoteButtons';
import { PrivacyNotice } from '@/features/auth/PrivacyNotice';
import { useMe } from '@/features/auth/useMe';
import { cn } from '@/lib/cn';

export function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { prefs, update, reset, resolvedMode } = usePreferences();
  const { me } = useMe();
  const defaults = DEFAULT_COLORS[resolvedMode];
  const palette = prefs[resolvedMode];
  const accent = prefs.accent ?? defaults.accent;
  const colors = {
    bg: palette.bg ?? defaults.bg,
    surface: palette.surface ?? defaults.surface,
    fg: palette.fg ?? defaults.fg,
  };
  const lowContrast =
    contrast(colors.fg, colors.bg) < 4.5 || contrast(colors.fg, colors.surface) < 4.5;
  const setPalette = (patch: Palette) => update({ [resolvedMode]: { ...palette, ...patch } });
  const isDefault =
    !prefs.accent &&
    !Object.keys(prefs.dark).length &&
    !Object.keys(prefs.light).length &&
    prefs.mode === 'dark';

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>
      <p className="text-subtle mt-1 text-sm">
        {me ? t('settings.syncNote') : t('settings.localNote')}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="space-y-6 p-6">
            <SectionTitle>{t('settings.appearance')}</SectionTitle>
            <Row label={t('settings.mode')}>
              <Segmented
                value={prefs.mode}
                onChange={(mode) => update({ mode })}
                items={[
                  { value: 'dark', label: t('settings.mode.dark') },
                  { value: 'light', label: t('settings.mode.light') },
                  { value: 'system', label: t('settings.mode.system') },
                ]}
              />
            </Row>
            <Row label={t('settings.accent')}>
              <div className="flex flex-wrap items-center gap-2">
                {ACCENT_PRESETS.map((p) => {
                  const on = accent.toLowerCase() === p.value;
                  return (
                    <button
                      key={p.value}
                      onClick={() => update({ accent: p.value })}
                      className="relative grid h-8 w-8 place-items-center rounded-full ring-offset-2 ring-offset-[var(--surface)] transition-transform hover:scale-110"
                      style={{
                        background: p.value,
                        boxShadow: on
                          ? `0 0 0 2px var(--surface), 0 0 0 4px ${p.value}`
                          : undefined,
                      }}
                      aria-label={p.name}
                      aria-pressed={on}
                      title={p.name}
                    >
                      {on && (
                        <m.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <Check size={14} className="text-black/70" />
                        </m.span>
                      )}
                    </button>
                  );
                })}
                <ColorInput
                  value={accent}
                  onChange={(v) => update({ accent: v })}
                  label={t('settings.accent')}
                />
              </div>
            </Row>
            <div>
              <p className="mb-3 text-sm font-medium">
                {t('settings.custom', { mode: t(`settings.mode.${resolvedMode}`) })}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {(['bg', 'surface', 'fg'] as const).map((k) => (
                  <label
                    key={k}
                    className="border-border flex items-center gap-3 rounded-xl border p-3"
                  >
                    <ColorInput
                      value={colors[k]}
                      onChange={(v) => setPalette({ [k]: v })}
                      label={t(`settings.${k}`)}
                    />
                    <span className="text-sm">{t(`settings.${k}`)}</span>
                  </label>
                ))}
              </div>
              {lowContrast && (
                <p className="text-medium mt-3 flex items-center gap-2 text-sm" role="alert">
                  <AlertTriangle size={16} /> {t('settings.contrastWarn')}
                </p>
              )}
            </div>
            <Button onClick={reset} disabled={isDefault}>
              <RotateCcw size={16} /> {t('settings.reset')}
            </Button>
          </Card>

          <Card className="space-y-4 p-6">
            <SectionTitle>{t('settings.language')}</SectionTitle>
            <Segmented
              value={locale}
              onChange={setLocale}
              items={[
                { value: 'en', label: 'English' },
                { value: 'ar', label: 'العربية' },
              ]}
            />
          </Card>

          <Card className="space-y-4 p-6">
            <SectionTitle>{t('settings.privacy')}</SectionTitle>
            <PrivacyNotice />
          </Card>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <SectionTitle className="mb-3">{t('settings.preview')}</SectionTitle>
          <Card className="p-5">
            <p className="font-semibold">Cart Merge</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <DifficultyBadge value="Easy" />
              <DifficultyBadge value="Medium" />
              <DifficultyBadge value="Hard" />
              <Tag>Coding</Tag>
            </div>
            <p className="text-muted mt-3 text-sm">{t('settings.previewText')}</p>
            <div className="bg-surface-2 mt-4 flex items-center gap-3 rounded-xl p-3">
              <VoteButtons score={12} myVote={1} onVote={() => undefined} />
              <pre
                className="bg-bg flex-1 overflow-hidden rounded-lg p-2 font-mono text-xs"
                dir="ltr"
              >
                <span className="text-[#c792ea]">def</span>{' '}
                <span className="text-[#82aaff]">merge</span>(a, b):
                {'\n'} <span className="text-[#c792ea]">return</span> a | b
              </pre>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="primary" size="sm">
                {t('q.markStudied')}
              </Button>
              <Button size="sm">{t('q.bookmark')}</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}

function ColorInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <span
      className={cn(
        'border-border-strong relative inline-block h-8 w-8 shrink-0 overflow-hidden rounded-full border',
      )}
      style={{ background: value }}
    >
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </span>
  );
}
