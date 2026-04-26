import { cn } from '../../../lib/utils';

type Color = 'cyan' | 'gold' | 'green' | 'purple';

interface Props {
  label: string;
  value: string | number;
  unit?: string;
  color?: Color;
}

const styles: Record<Color, string> = {
  cyan:   'border-cyan-300/25   text-cyan-300',
  gold:   'border-gold-400/30   text-gold-300',
  green:  'border-green-400/25  text-green-400',
  purple: 'border-purple-400/25 text-purple-400',
};

export function MetricCard({ label, value, unit, color = 'cyan' }: Props) {
  return (
    <div
      className={cn(
        'flex min-w-[3.6rem] flex-col items-center rounded-xl border bg-navy-950/65 px-3 py-2 backdrop-blur-md',
        styles[color],
      )}
    >
      <span className="font-headline text-[9px] uppercase tracking-wider text-text-muted">{label}</span>
      <div className="flex items-baseline gap-0.5">
        <span className="font-headline text-base font-bold leading-tight">{value}</span>
        {unit && <span className="font-headline text-[9px] text-text-muted">{unit}</span>}
      </div>
    </div>
  );
}
