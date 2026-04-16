import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export type CardVariant = 'dark' | 'highlighted' | 'cream' | 'subtle';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variants: Record<CardVariant, string> = {
  /** Default dark card — navy bg with soft border. Use on navy-950 page surface. */
  dark: 'bg-navy-800 border border-navy-600',
  /** Premium emphasis card — gold border + subtle gold glow. */
  highlighted:
    'bg-navy-800 border border-gold-500/60 shadow-[0_0_24px_-8px_rgba(201,169,97,0.25)]',
  /** Cream surface card — for long-form content on cream pages. */
  cream: 'bg-cream-50 border border-cream-200',
  /** Subtle inner card — for nested blocks on dark. */
  subtle: 'bg-navy-700 border border-navy-600/60',
};

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'dark', padding = 'md', className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl transition-colors',
        variants[variant],
        paddings[padding],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});
