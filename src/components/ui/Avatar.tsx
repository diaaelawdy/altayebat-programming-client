import { cn } from '@/lib/cn';
import { AVATAR_HUES, AVATAR_ICON_MAP, parseAvatar } from './avatarData';

function hash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

/**
 * The avatar a user picked: an anonymous icon on a color. No photos are ever
 * stored or shown. Without a choice it falls back to initials.
 */
export function Avatar({
  name,
  avatar,
  size = 28,
  className,
}: {
  name: string;
  avatar?: string | null;
  size?: number;
  className?: string;
}) {
  const parsed = parseAvatar(avatar);
  const hue = parsed ? AVATAR_HUES[parsed.color] : hash(name) % 360;
  const sat = parsed?.color === 'slate' ? 12 : 55;
  const Icon = parsed ? AVATAR_ICON_MAP[parsed.icon] : null;
  const initials =
    name
      .replace(/[^a-z0-9]/gi, '')
      .slice(0, 2)
      .toUpperCase() || '?';
  return (
    <span
      aria-hidden
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-full font-semibold tracking-wide',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        color: `hsl(${hue} ${sat + 15}% 78%)`,
        background: `color-mix(in oklab, hsl(${hue} ${sat}% 45%) 30%, var(--surface-3))`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, hsl(${hue} ${sat}% 60%) 30%, transparent)`,
      }}
    >
      {Icon ? <Icon size={Math.round(size * 0.55)} strokeWidth={1.8} /> : initials}
    </span>
  );
}
