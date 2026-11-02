import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function EmptyState({
  icon,
  title,
  children,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'border-border rounded-2xl border border-dashed px-6 py-12 text-center',
        className,
      )}
    >
      {icon && (
        <div className="bg-accent-soft text-accent mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl">
          {icon}
        </div>
      )}
      <p className="font-medium">{title}</p>
      {children && <div className="text-muted mt-2 text-sm">{children}</div>}
    </div>
  );
}
