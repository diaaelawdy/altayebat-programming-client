import { Compass } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { useI18n } from '@/i18n';

export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto grid max-w-md place-items-center px-4 py-24 text-center">
      <div className="bg-accent-soft text-accent mb-4 grid h-14 w-14 place-items-center rounded-2xl">
        <Compass />
      </div>
      <h1 className="text-xl font-semibold">404</h1>
      <p className="text-muted mt-2">{t('common.notFound')}</p>
      <ButtonLink to="/" variant="primary" className="mt-6">
        {t('common.goHome')}
      </ButtonLink>
    </div>
  );
}
