import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/cn';

export const inputCls =
  'w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 text-[15px] text-fg placeholder:text-subtle transition-[border-color,box-shadow] outline-none focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-soft)] aria-invalid:border-danger';

export function Field({
  label,
  hint,
  error,
  children,
  optional,
  className,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: (id: string) => ReactNode;
  optional?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium">
          {label} {optional && <span className="text-subtle font-normal">({optional})</span>}
        </label>
      )}
      {children(id)}
      {error ? (
        <p className="text-danger text-xs" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-subtle text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(inputCls, className)} {...rest} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(inputCls, 'min-h-28 resize-y leading-relaxed', className)}
      {...rest}
    />
  );
});

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        inputCls,
        'cursor-pointer appearance-none bg-[length:16px] bg-[position:right_0.75rem_center] bg-no-repeat pe-9 rtl:bg-[position:left_0.75rem_center]',
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      }}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Chip({
  active,
  onClick,
  children,
  className,
  radio,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  /** One choice in a `role="radiogroup"`, instead of an on/off toggle. */
  radio?: boolean;
}) {
  return (
    <button
      type="button"
      {...(radio ? { role: 'radio', 'aria-checked': Boolean(active) } : { 'aria-pressed': active })}
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-sm transition-colors',
        active
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-border text-muted hover:border-border-strong hover:text-fg',
        className,
      )}
    >
      {children}
    </button>
  );
}
