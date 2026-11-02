import { m } from 'framer-motion';
import { Shuffle } from 'lucide-react';
import { AVATAR_COLORS, AVATAR_ICONS, type AvatarColor, type AvatarIcon } from '@/shared/constants';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { Avatar } from './Avatar';
import { AVATAR_HUES, AVATAR_ICON_MAP, parseAvatar, randomAvatar } from './avatarData';

/** Pick an icon and a color. Everything here is deliberately faceless. */
export function AvatarPicker({
  value,
  onChange,
  name,
}: {
  value: string;
  onChange: (v: string) => void;
  name: string;
}) {
  const { t } = useI18n();
  const cur = parseAvatar(value) ?? { icon: 'ghost' as AvatarIcon, color: 'violet' as AvatarColor };
  const set = (icon: AvatarIcon, color: AvatarColor) => onChange(`${icon}:${color}`);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <m.div key={value} initial={{ scale: 0.85 }} animate={{ scale: 1 }}>
          <Avatar name={name || '?'} avatar={value} size={64} />
        </m.div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t('avatar.title')}</p>
          <p className="text-subtle text-xs">{t('avatar.hint')}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(randomAvatar())}
          className="text-subtle hover:text-fg hover:bg-surface-3 grid h-9 w-9 place-items-center rounded-xl transition-colors"
          aria-label={t('avatar.shuffle')}
        >
          <Shuffle size={16} />
        </button>
      </div>
      <div role="radiogroup" aria-label={t('avatar.icon')} className="grid grid-cols-10 gap-1.5">
        {AVATAR_ICONS.map((icon) => {
          const Icon = AVATAR_ICON_MAP[icon];
          const on = icon === cur.icon;
          return (
            <button
              key={icon}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={icon}
              onClick={() => set(icon, cur.color)}
              className={cn(
                'grid aspect-square place-items-center rounded-xl border transition-colors',
                on
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-border text-subtle hover:text-fg hover:border-border-strong',
              )}
            >
              <Icon size={16} />
            </button>
          );
        })}
      </div>
      <div role="radiogroup" aria-label={t('avatar.color')} className="flex flex-wrap gap-2">
        {AVATAR_COLORS.map((color) => {
          const on = color === cur.color;
          const hue = AVATAR_HUES[color];
          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={color}
              onClick={() => set(cur.icon, color)}
              className={cn(
                'h-7 w-7 rounded-full transition-transform',
                on
                  ? 'ring-accent ring-offset-surface scale-110 ring-2 ring-offset-2'
                  : 'hover:scale-105',
              )}
              style={{ background: `hsl(${hue} ${color === 'slate' ? 12 : 55}% 50%)` }}
            />
          );
        })}
      </div>
    </div>
  );
}
