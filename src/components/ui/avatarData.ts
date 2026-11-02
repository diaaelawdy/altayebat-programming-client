import {
  Bird,
  Bot,
  Cat,
  Dog,
  Drama,
  EyeOff,
  Fish,
  Ghost,
  Glasses,
  HatGlasses,
  Moon,
  Orbit,
  Origami,
  Panda,
  Rabbit,
  Rocket,
  Snail,
  Squirrel,
  Turtle,
  VenetianMask,
  type LucideIcon,
} from 'lucide-react';
import { AVATAR_COLORS, AVATAR_ICONS, type AvatarColor, type AvatarIcon } from '@/shared/constants';

export const AVATAR_ICON_MAP: Record<AvatarIcon, LucideIcon> = {
  ghost: Ghost,
  'venetian-mask': VenetianMask,
  drama: Drama,
  'hat-glasses': HatGlasses,
  glasses: Glasses,
  'eye-off': EyeOff,
  cat: Cat,
  dog: Dog,
  bird: Bird,
  fish: Fish,
  rabbit: Rabbit,
  squirrel: Squirrel,
  turtle: Turtle,
  snail: Snail,
  panda: Panda,
  bot: Bot,
  rocket: Rocket,
  moon: Moon,
  orbit: Orbit,
  origami: Origami,
};
export const AVATAR_HUES: Record<AvatarColor, number> = {
  violet: 262,
  blue: 220,
  cyan: 190,
  green: 150,
  amber: 45,
  orange: 25,
  rose: 345,
  slate: 230,
};

/** Parses `icon:color`; null for unknown values. */
export function parseAvatar(key: string | null | undefined) {
  const [icon, color] = (key ?? '').split(':') as [AvatarIcon, AvatarColor];
  return icon in AVATAR_ICON_MAP && color in AVATAR_HUES ? { icon, color } : null;
}

export const randomAvatar = () =>
  `${AVATAR_ICONS[Math.floor(Math.random() * AVATAR_ICONS.length)]}:${
    AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
  }`;
