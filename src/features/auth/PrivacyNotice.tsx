import { ShieldCheck } from 'lucide-react';
import { useI18n } from '@/i18n';

export function PrivacyNotice() {
  const { t } = useI18n();
  return (
    <div className="bg-accent-soft flex gap-3 rounded-2xl border border-[color-mix(in_oklab,var(--accent)_30%,transparent)] p-4">
      <ShieldCheck className="text-accent mt-0.5 shrink-0" size={20} />
      <div>
        <p className="text-fg text-sm font-semibold">{t('privacy.title')}</p>
        <p className="text-muted mt-1 text-sm leading-relaxed">{t('privacy.body')}</p>
      </div>
    </div>
  );
}
