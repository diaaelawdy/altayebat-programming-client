import { Code } from 'lucide-react';
import { useI18n } from '@/i18n';
import { ExtLink } from '@/components/ui/ExtLink';
import { REPO_CLIENT, REPO_SERVER } from '@/lib/links';

/** Links to the source, with a reminder to contribute from an account that doesn't identify you. */
export function OpenSource() {
  const { t } = useI18n();
  return (
    <div className="space-y-2 text-sm">
      <p className="text-muted">{t('oss.text')}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <ExtLink href={REPO_CLIENT} icon={<Code size={13} />} label={t('oss.client')} />
        <ExtLink href={REPO_SERVER} icon={<Code size={13} />} label={t('oss.server')} />
      </div>
      <p className="text-subtle text-xs">{t('oss.anon')}</p>
    </div>
  );
}
