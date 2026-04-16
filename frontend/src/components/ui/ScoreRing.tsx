import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface ScoreRingProps {
  /** Current score value. */
  value: number;
  /** Maximum value. Defaults to 100 (percentage-style). */
  max?: number;
  /** Outer diameter in px. Defaults to 160. */
  size?: number;
  /** Ring stroke thickness in px. Defaults to ~8% of size. */
  thickness?: number;
  /** Label rendered under the numeric value. */
  label?: string;
  /** Custom content rendered inside the ring — overrides default display. */
  children?: ReactNode;
  /** Suffix shown next to the value (e.g. "%", "/5"). Defaults to "%". */
  suffix?: string;
  /** Use light-theme colors when rendered on a cream surface. */
  surface?: 'dark' | 'cream';
  className?: string;
}

/**
 * Circular SVG progress gauge — gold fill on a soft track.
 *
 * Used on SessionDetail (readiness score) and Dashboard stat highlights.
 * Replaces the ad-hoc `border-[12px]` ring previously in SessionDetail.tsx.
 */
export function ScoreRing({
  value,
  max = 100,
  size = 160,
  thickness,
  label,
  children,
  suffix = '%',
  surface = 'dark',
  className,
}: ScoreRingProps) {
  const stroke = thickness ?? Math.max(6, Math.round(size * 0.08));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(value, max));
  const progress = max === 0 ? 0 : clamped / max;
  const dashOffset = circumference * (1 - progress);

  const trackColor =
    surface === 'dark' ? 'stroke-navy-700' : 'stroke-cream-200';
  const numberColor =
    surface === 'dark' ? 'text-text-primary' : 'text-text-dark';
  const labelColor =
    surface === 'dark' ? 'text-text-muted' : 'text-text-dark/60';

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ? `${label}: ${value}${suffix}` : `${value}${suffix}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={trackColor}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="stroke-gold-500 transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children ?? (
          <>
            <span
              className={cn(
                'font-serif font-semibold leading-none',
                numberColor,
              )}
              style={{ fontSize: Math.round(size * 0.3) }}
            >
              {Math.round(clamped)}
              <span className="text-gold-400">{suffix}</span>
            </span>
            {label && (
              <span
                className={cn(
                  'mt-2 text-[10px] uppercase tracking-widest font-semibold',
                  labelColor,
                )}
              >
                {label}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
