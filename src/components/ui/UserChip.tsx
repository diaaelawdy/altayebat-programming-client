import { Crown, Shield, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useI18n } from '@/i18n';
import type { DisplayRole, ReviewInfo, UserRef } from '@/shared/types';
import { Avatar } from './Avatar';

/** The author's display role: Founder (gold), staff roles (accent), Member (neutral). */
export function RoleBadge({ role, className }: { role: DisplayRole | null; className?: string }) {
  if (!role) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-px text-[11px] leading-4 font-medium',
        role.kind === 'founder' &&
          'text-medium bg-[color-mix(in_oklab,var(--medium)_14%,transparent)]',
        role.kind === 'staff' && 'bg-accent-soft text-accent',
        role.kind === 'member' && 'bg-surface-3 text-subtle',
        className,
      )}
    >
      {role.kind === 'founder' && <Crown size={11} />}
      {role.kind === 'staff' && <Shield size={11} />}
      {role.name}
    </span>
  );
}

/** Avatar + @username link + role badge: how every author is shown. */
export function UserChip({
  user,
  size = 24,
  className,
}: {
  user: UserRef | null;
  size?: number;
  className?: string;
}) {
  if (!user) return null;
  const linkable = Boolean(user.id);
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <Avatar name={user.username} avatar={user.avatar} size={size} />
      {linkable ? (
        <Link to={`/u/${user.username}`} className="truncate font-medium hover:underline">
          @{user.username}
        </Link>
      ) : (
        <span className="text-subtle truncate">@{user.username}</span>
      )}
      <RoleBadge role={user.role} />
    </span>
  );
}

/** "Reviewed by @x · date"; the API only sends it with `moderation.view_reviewer`. */
export function ReviewedBy({ review }: { review?: ReviewInfo }) {
  const { t, fmt } = useI18n();
  if (!review?.by) return null;
  return (
    <p className="text-subtle flex flex-wrap items-center gap-2 text-sm">
      <ShieldCheck size={15} className="text-easy" />
      {t('review.by')} <UserChip user={review.by} size={20} />
      {review.at && <span className="text-xs">· {fmt.date(review.at)}</span>}
    </p>
  );
}
