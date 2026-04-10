import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User as UserIcon, Rocket } from 'lucide-react';

export function Layout() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="animate-pulse text-[#434654]">Đang tải...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans text-[#191c1d]">
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-[#003fb1] font-extrabold text-xl tracking-tight">
            <Rocket className="w-6 h-6" />
            <span>CareerPulse</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-[#434654] font-medium">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border-2 border-[#003fb1]/10" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#e1e3e4] flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-[#434654]" />
                </div>
              )}
              <span className="hidden sm:inline-block">{user.displayName || user.email}</span>
            </div>
            <button
              onClick={logout}
              className="p-2 text-[#434654] hover:text-[#ba1a1a] hover:bg-[#ffdad6] rounded-md transition-colors"
              title="Đăng xuất"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
