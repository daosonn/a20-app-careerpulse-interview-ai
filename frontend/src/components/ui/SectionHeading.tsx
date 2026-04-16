import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface SectionHeadingProps {
  /** Small kicker label rendered above the title in uppercase tracking. */
  label?: string;
  /** Main title — rendered in the serif font. */
  title: ReactNode;
  /** Optional subtitle / description line under the title. */
  subtitle?: ReactNode;
  /** Choose color palette for dark vs cream surfaces. */
  variant?: 'dark' | 'cream';
  /** Horizontal alignment. */
  align?: 'left' | 'center';
  /** Size preset — controls the title font-size only. */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const titleSizes = {
  sm: 'text-2xl md:text-3xl',
  md: 'text-3xl md:text-4xl',
  lg: 'text-4xl md:text-5xl',
  xl: 'text-5xl md:text-6xl',
};

export function SectionHeading({
  label,
  title,
  subtitle,
  variant = 'dark',
  align = 'left',
  size = 'md',
  className,
}: SectionHeadingProps) {
  const labelColor = 'text-gold-400';
  const titleColor =
    variant === 'dark' ? 'text-text-primary' : 'text-text-dark';
  const subtitleColor =
    variant === 'dark' ? 'text-text-muted' : 'text-text-dark/70';

  return (
    <header
      className={cn(
        'flex flex-col',
        align === 'center' ? 'items-center text-center' : 'items-start',
        className,
      )}
    >
      {label && (
        <span
          className={cn(
            'text-xs font-semibold uppercase tracking-[0.25em] mb-3',
            labelColor,
          )}
        >
          {label}
        </span>
      )}
      <h2
        className={cn(
          'font-serif font-semibold leading-[1.1] tracking-tight',
          titleSizes[size],
          titleColor,
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={cn(
            'mt-4 max-w-2xl text-base md:text-lg leading-relaxed font-sans',
            subtitleColor,
          )}
        >
          {subtitle}
        </p>
      )}
    </header>
  );
}
