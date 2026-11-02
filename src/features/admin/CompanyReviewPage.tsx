import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoadMore, usePaged } from '@/lib/paged';
import { BriefcaseBusiness, Building2, Check, ExternalLink, X } from 'lucide-react';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { keys } from '@/lib/keys';
import { useI18n } from '@/i18n';
import type { CompanySubmission } from '@/shared/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input, Textarea } from '@/components/ui/Field';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { UserChip } from '@/components/ui/UserChip';
import { ExtLink } from '@/components/ui/ExtLink';

/** Queue of suggested companies (`companies.review`). */
export function CompanyReviewPage() {
  const { t } = useI18n();
  const list = usePaged<CompanySubmission>(keys.admin.companyReview, '/admin/company-review');
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">{t('nav.companyReview')}</h1>
      <p className="text-subtle mt-1 text-sm">{t('companyReview.subtitle')}</p>
      {list.isLoading ? (
        <ListSkeleton className="mt-6" />
      ) : list.items.length ? (
        <div className="mt-6 space-y-4">
          {list.items.map((c) => (
            <ReviewCard key={c.id} c={c} />
          ))}
          <LoadMore {...list} />
        </div>
      ) : (
        <EmptyState
          className="mt-6"
          icon={<Building2 size={20} />}
          title={t('companyReview.empty')}
        />
      )}
    </div>
  );
}

function ReviewCard({ c }: { c: CompanySubmission }) {
  const { t, fmt } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  // Members can't upload a logo; the reviewer adds one here before approving.
  const [logoUrl, setLogoUrl] = useState(c.logoUrl ?? '');
  const logoOk = !logoUrl.trim() || /^https?:\/\/\S+\.\S+/i.test(logoUrl.trim());
  const done = () => {
    void qc.invalidateQueries({ queryKey: keys.admin.companyReview });
    void qc.invalidateQueries({ queryKey: keys.admin.counts });
    void qc.invalidateQueries({ queryKey: ['companies'] });
  };
  const onError = (e: unknown) =>
    toast(e instanceof ApiError ? e.message : t('common.error'), 'error');
  const approve = useMutation({
    mutationFn: () =>
      api.post(`/admin/company-review/${c.id}/approve`, {
        edits: logoUrl.trim() ? { logoUrl: logoUrl.trim() } : {},
      }),
    onSuccess: done,
    onError,
  });
  const reject = useMutation({
    mutationFn: () => api.post(`/admin/company-review/${c.id}/reject`, { reason }),
    onSuccess: done,
    onError,
  });

  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <CompanyLogo
          key={logoOk ? logoUrl : ''}
          name={c.name}
          logoUrl={logoOk ? logoUrl.trim() : ''}
          size={48}
          className="rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">
            {c.name} {c.nameAr && <span className="text-subtle font-normal">· {c.nameAr}</span>}
          </h2>
          {c.industry && <p className="text-muted text-sm">{c.industry}</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {c.website && (
              <ExtLink href={c.website} icon={<ExternalLink size={13} />} label={c.website} />
            )}
            {c.linkedinUrl && (
              <ExtLink
                href={c.linkedinUrl}
                icon={<BriefcaseBusiness size={13} />}
                label="LinkedIn"
              />
            )}
          </div>
        </div>
      </div>
      {c.description && (
        <p className="text-muted mt-3 text-sm whitespace-pre-line">{c.description}</p>
      )}
      {c.canReview !== false && (
        <label className="mt-4 block text-sm">
          <span className="text-muted">{t('companyReview.logoHint')}</span>
          <Input
            className="mt-1"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder={`${t('admin.companies.logo')} — https://…`}
            dir="ltr"
            inputMode="url"
            aria-invalid={!logoOk || undefined}
          />
        </label>
      )}
      <div className="text-subtle mt-4 flex flex-wrap items-center gap-2 text-sm">
        {t('companyReview.by')} <UserChip user={c.createdBy} size={20} />
        {c.createdAt && <span className="text-xs">· {fmt.relative(c.createdAt)}</span>}
      </div>
      {rejecting ? (
        <form
          className="mt-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            reject.mutate();
          }}
        >
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('admin.review.reason')}
            minLength={3}
            required
            autoFocus
            className="min-h-20"
          />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setRejecting(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="danger" loading={reject.isPending}>
              {t('admin.review.reject')}
            </Button>
          </div>
        </form>
      ) : c.canReview === false ? (
        <p className="text-subtle bg-surface-2 mt-4 rounded-xl px-4 py-3 text-sm">
          {t('review.ownWaiting')}
        </p>
      ) : (
        <div className="mt-4 flex justify-end gap-2">
          {c.own && (
            <span className="text-medium me-auto self-center text-xs">{t('review.ownOnly')}</span>
          )}
          <Button onClick={() => setRejecting(true)}>
            <X size={16} /> {t('admin.review.reject')}
          </Button>
          <Button
            variant="primary"
            onClick={() => approve.mutate()}
            loading={approve.isPending}
            disabled={!logoOk}
          >
            <Check size={16} /> {t('admin.review.approve')}
          </Button>
        </div>
      )}
    </Card>
  );
}
