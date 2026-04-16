import { forwardRef, InputHTMLAttributes, useId } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  /** Render the input on a light (cream) surface instead of navy. */
  surface?: 'dark' | 'cream';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, surface = 'dark', className, id, ...rest },
  ref,
) {
  const reactId = useId();
  const inputId = id ?? reactId;

  const fieldStyles =
    surface === 'dark'
      ? 'bg-navy-700 border-navy-600 text-text-primary placeholder:text-text-muted focus:border-gold-400 focus:ring-gold-400/40'
      : 'bg-cream-50 border-cream-200 text-text-dark placeholder:text-text-dark/50 focus:border-gold-500 focus:ring-gold-500/30';

  const labelStyles =
    surface === 'dark' ? 'text-text-muted' : 'text-text-dark/70';

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            'text-xs font-semibold uppercase tracking-wider',
            labelStyles,
          )}
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined}
        className={cn(
          'h-11 rounded-lg border px-3.5 text-sm font-medium outline-none transition-colors',
          'focus:ring-2',
          fieldStyles,
          error && 'border-status-error focus:border-status-error focus:ring-status-error/40',
          className,
        )}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-err`} className="text-xs text-status-error font-medium">
          {error}
        </p>
      ) : hint ? (
        <p
          id={`${inputId}-hint`}
          className={cn(
            'text-xs',
            surface === 'dark' ? 'text-text-muted' : 'text-text-dark/60',
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
});
