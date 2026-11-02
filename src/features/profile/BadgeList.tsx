import { m } from 'framer-motion';
import {
  Award,
  BadgeCheck,
  Building,
  Calendar,
  Flame,
  Footprints,
  HandHeart,
  MessageCircle,
  Star,
  ThumbsUp,
  Trophy,
} from 'lucide-react';
import { useI18n, type MessageKey } from '@/i18n';
import { BADGES, type BadgeKey } from '@/shared/badges';

const ICONS: Record<BadgeKey, typeof Award> = {
  first_answer: MessageCircle,
  helpful: ThumbsUp,
  first_question: HandHeart,
  contributor: Trophy,
  first_review: Star,
  voter: BadgeCheck,
  studied_10: Footprints,
  studied_50: Award,
  company_complete: Building,
  streak_7: Flame,
  streak_30: Calendar,
};

/** Shows earned badges in color and the rest dimmed, as goals. */
export function BadgeList({
  earned,
  showLocked = true,
}: {
  earned: { key: string }[];
  showLocked?: boolean;
}) {
  const { t } = useI18n();
  const have = new Set(earned.map((b) => b.key));
  const keys = (Object.keys(BADGES) as BadgeKey[]).filter((k) => showLocked || have.has(k));
  if (!keys.length) return <p className="text-muted text-sm">{t('profile.noBadges')}</p>;
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {keys.map((k, i) => {
        const Icon = ICONS[k];
        const on = have.has(k);
        return (
          <m.li
            key={k}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            title={BADGES[k]}
            className={`flex items-center gap-2.5 rounded-xl border p-2.5 ${on ? 'bg-accent-soft border-[color-mix(in_oklab,var(--accent)_35%,var(--border))]' : 'border-border opacity-45 grayscale'}`}
          >
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${on ? 'bg-accent text-on-accent' : 'bg-surface-3 text-subtle'}`}
            >
              <Icon size={16} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">
                {t(`badge.${k}` as MessageKey)}
              </span>
              <span className="text-subtle block truncate text-[11px]">{BADGES[k]}</span>
            </span>
          </m.li>
        );
      })}
    </ul>
  );
}
