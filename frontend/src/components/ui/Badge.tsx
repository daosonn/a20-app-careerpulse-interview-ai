import { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/utils';

export type BadgeVariant =
  | 'gold'
  | 'gold-outline'
  | 'navy'
  | 'success'
  | 'error'
  | 'warning';

export type BadgeProps = ComponentPropsWithoutRef<'span'> & {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
};

const variants: Record<BadgeVariant, string> = {
  gold: 'bg-gold-500 text-navy-950 border border-gold-500',
  'gold-outline': 'bg-transparent text-gold-400 border border-gold-500/60',
  navy: 'bg-navy-700 text-text-muted border border-navy-600',
  success:
    'bg-status-success/15 text-status-success border border-status-success/40',
  error: 'bg-status-error/15 text-status-error border border-status-error/40',
  warning:
    'bg-status-warning/15 text-status-warning border border-status-warning/40',
};

const sizes = {
  sm: 'px-2 py-0.5 text-[10px] tracking-widest',
  md: 'px-2.5 py-1 text-xs tracking-wider',
};

export function Badge({
  variant = 'navy',
  size = 'sm',
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold uppercase rounded-full leading-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
