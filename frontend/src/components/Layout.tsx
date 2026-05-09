import { Outlet, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../features/auth';
import { Sidebar } from './ui';

export function Layout() {
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

  // Redirect to onboarding if profile is absent or not yet completed
  if (!profile?.isOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="min-h-screen bg-navy-950 font-sans text-text-primary flex">
      <Sidebar />
      {/* Main content — left-offset on desktop to clear the fixed sidebar. */}
      <main className="flex-1 min-w-0 md:pl-60">
        <div className="min-h-screen">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
