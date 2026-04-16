import { Outlet, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../features/auth';

/**
 * Protects a group of routes behind the same auth + onboarding check as
 * `Layout`, but without rendering the sidebar shell. Use this for
 * full-viewport authenticated pages (e.g. the interview room) that need the
 * entire screen real estate.
 */
export function AuthGate() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-950 font-sans">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-9 h-9 text-gold-400 animate-spin" aria-hidden />
          <p className="text-text-muted text-sm font-medium tracking-wide">
            Đang tải...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile && !profile.isOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
