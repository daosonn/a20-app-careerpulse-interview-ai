import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface NavItemProps {
  to: string;
  icon: LucideIcon;
  label: ReactNode;
  /** Treat as active only on exact path match. Defaults to false (prefix match). */
  end?: boolean;
  onClick?: () => void;
}

/**
 * Sidebar navigation entry. Active state uses a left gold bar + gold text.
 * Uses `NavLink` from react-router so activeness is path-driven.
 */
export function NavItem({ to, icon: Icon, label, end, onClick }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-lg pl-4 pr-3 py-2.5',
          'text-sm font-medium leading-relaxed transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60',
          isActive
            ? 'bg-navy-800 text-gold-400'
            : 'text-text-muted hover:bg-navy-800/60 hover:text-text-primary',
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Active indicator — left gold bar */}
          <span
            className={cn(
              'absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-gold-500 transition-opacity',
              isActive ? 'opacity-100' : 'opacity-0',
            )}
            aria-hidden
          />
          <Icon
            className={cn(
              'w-4.5 h-4.5 shrink-0 transition-colors',
              isActive ? 'text-gold-400' : 'text-text-muted group-hover:text-text-primary',
            )}
            style={{ width: 18, height: 18 }}
            aria-hidden
          />
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  );
}
