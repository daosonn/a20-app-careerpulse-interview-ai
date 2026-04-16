import { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/utils';

export type PageShellProps = ComponentPropsWithoutRef<'div'> & {
  /** Page surface color. `dark` = navy-950, `cream` = cream-100. */
  variant?: 'dark' | 'cream';
  /** Constrain content to a max width. Defaults to `xl` (7xl tailwind). */
  maxWidth?: 'none' | 'md' | 'lg' | 'xl' | '2xl';
  /** Vertical padding preset. */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Apply min-h-screen. Defaults to true. */
  fullHeight?: boolean;
};

const surfaces = {
  dark: 'bg-navy-950 text-text-primary',
  cream: 'bg-cream-100 text-text-dark',
};

const widths = {
  none: '',
  md: 'max-w-3xl',
  lg: 'max-w-5xl',
  xl: 'max-w-7xl',
  '2xl': 'max-w-[88rem]',
};

const paddings = {
  none: 'p-0',
  sm: 'px-4 py-4 sm:px-6 sm:py-6',
  md: 'px-4 py-6 sm:px-8 sm:py-10',
  lg: 'px-4 py-8 sm:px-10 sm:py-14 lg:px-14',
};

/**
 * Full-page wrapper establishing background + typography + content width.
 *
 * Intended usage:
 *   <PageShell variant="dark"> ...page content... </PageShell>
 *
 * The outer div is the viewport surface (no max-width), the inner div is the
 * constrained content column. Pass `maxWidth="none"` to opt out (e.g. for
 * landing pages with full-bleed sections).
 */
export function PageShell({
  variant = 'dark',
  maxWidth = 'xl',
  padding = 'md',
  fullHeight = true,
  className,
  children,
  ...rest
}: PageShellProps) {
  return (
    <div
      className={cn(
        'font-sans antialiased',
        surfaces[variant],
        fullHeight && 'min-h-screen',
        className,
      )}
      {...rest}
    >
      <div
        className={cn(
          'w-full mx-auto',
          widths[maxWidth],
          paddings[padding],
        )}
      >
        {children}
      </div>
    </div>
  );
}
