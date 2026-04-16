import { forwardRef, TextareaHTMLAttributes, useId } from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  surface?: 'dark' | 'cream';
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, surface = 'dark', className, id, rows = 5, ...rest },
  ref,
) {
  const reactId = useId();
  const fieldId = id ?? reactId;

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
          htmlFor={fieldId}
          className={cn(
            'text-xs font-semibold uppercase tracking-wider',
            labelStyles,
          )}
        >
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-err` : hint ? `${fieldId}-hint` : undefined}
        className={cn(
          'rounded-lg border px-3.5 py-3 text-sm font-medium leading-relaxed outline-none transition-colors resize-y',
          'focus:ring-2',
          fieldStyles,
          error && 'border-status-error focus:border-status-error focus:ring-status-error/40',
          className,
        )}
        {...rest}
      />
      {error ? (
        <p id={`${fieldId}-err`} className="text-xs text-status-error font-medium">
          {error}
        </p>
      ) : hint ? (
        <p
          id={`${fieldId}-hint`}
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
