import { useState, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Sparkles,
  UserRound,
  LogOut,
  Menu,
  X,
  User as UserIcon,
} from 'lucide-react';
import { NavItem } from './NavItem';
import { useAuth } from '../../features/auth';
import { cn } from '../../lib/utils';

/**
 * Persistent left sidebar for authenticated pages.
 *
 * Desktop (>= md): always visible, w-60, fixed position.
 * Mobile (< md): hidden by default, opens as a drawer from a top hamburger button.
 */
export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const close = useCallback(() => setMobileOpen(false), []);

  // Auto-close drawer on route change.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const navItems = (
    <nav className="flex-1 flex flex-col gap-1 px-3 mt-2" aria-label="Primary">
      <NavItem to="/dashboard" icon={LayoutDashboard} label="Bảng điều khiển" />
      <NavItem to="/setup" icon={Sparkles} label="Phỏng vấn mới" />
      <NavItem to="/profile" icon={UserRound} label="Hồ sơ" />
    </nav>
  );

  const avatarBlock = (
    <div className="px-3 pb-4 border-t border-navy-800 pt-4 mt-2">
      <Link
        to="/profile"
        onClick={close}
        className="flex items-center gap-3 rounded-lg p-2 hover:bg-navy-800/60 transition-colors group"
      >
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-full ring-2 ring-gold-500/40 object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-navy-700 ring-2 ring-gold-500/40 flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-gold-400" aria-hidden />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate leading-tight">
            {user?.displayName || 'Thành viên'}
          </p>
          <p className="text-[11px] text-text-muted truncate leading-tight">
            {user?.email}
          </p>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => {
          close();
          logout();
        }}
        className="mt-2 w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text-muted hover:text-status-error hover:bg-status-error/10 transition-colors"
      >
        <LogOut className="w-4 h-4" aria-hidden />
        Đăng xuất
      </button>
    </div>
  );

  const brand = (
    <Link
      to="/dashboard"
      onClick={close}
      className="flex items-center gap-2.5 px-5 pt-5 pb-6"
    >
      <img src="/logo.png" alt="" className="w-8 h-8 object-contain" />
      <span className="font-headline font-extrabold text-lg tracking-tight text-gold-400">
        CareerPulse
      </span>
    </Link>
  );

  return (
    <>
      {/* Mobile top bar — visible < md */}
      <div className="md:hidden sticky top-0 z-30 h-14 flex items-center justify-between px-4 bg-navy-900 border-b border-navy-800">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="w-7 h-7 object-contain" />
          <span className="font-headline font-extrabold text-base tracking-tight text-gold-400">
            CareerPulse
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={mobileOpen}
          className="p-2 rounded-lg text-text-muted hover:text-gold-400 hover:bg-navy-800 transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-navy-950/70 backdrop-blur-sm"
          onClick={close}
          aria-hidden
        />
      )}

      {/* Sidebar — fixed on desktop, drawer on mobile */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen w-60 flex flex-col',
          'bg-navy-900 border-r border-navy-800',
          'transition-transform duration-200 ease-out',
          // Mobile: slide in/out. Desktop: always visible.
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0',
        )}
        aria-label="Sidebar"
      >
        {brand}
        {navItems}
        {avatarBlock}
      </aside>
    </>
  );
}
