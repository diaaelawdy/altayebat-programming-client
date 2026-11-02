import type { Preferences } from '@/shared/types';

export const DEFAULT_COLORS = {
  dark: { bg: '#0d0d0f', surface: '#161618', fg: '#ececef', accent: '#7c6cf6' },
  light: { bg: '#f6f6f8', surface: '#ffffff', fg: '#18181b', accent: '#6d5df5' },
} as const;

export const ACCENT_PRESETS = [
  { name: 'Violet', value: '#7c6cf6' },
  { name: 'Teal', value: '#2dd4bf' },
  { name: 'Sky', value: '#38bdf8' },
  { name: 'Indigo', value: '#818cf8' },
  { name: 'Rose', value: '#fb7185' },
  { name: 'Amber', value: '#fbbf24' },
  { name: 'Lime', value: '#a3e635' },
] as const;

export const DEFAULT_PREFS: Preferences = {
  locale: 'en',
  mode: 'dark',
  accent: null,
  dark: {},
  light: {},
};

/** WCAG contrast ratio between two hex colors. */
export function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}
