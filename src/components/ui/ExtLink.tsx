import type { ReactNode } from 'react';

/** External link that opens in a new tab and passes no referrer or ranking. */
export function ExtLink({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="text-accent inline-flex max-w-full items-center gap-1 truncate hover:underline"
      dir="ltr"
    >
      {icon} <span className="truncate">{label}</span>
    </a>
  );
}
