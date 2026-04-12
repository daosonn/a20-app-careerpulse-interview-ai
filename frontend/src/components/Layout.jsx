import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Rocket, LayoutDashboard, Plus, LogOut, User } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/setup', icon: Plus, label: 'Phỏng vấn mới' },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#c3c5d7]/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <Rocket className="text-[#003fb1] w-6 h-6" />
            <span className="font-extrabold tracking-tight text-[#003fb1] text-xl">CareerPulse</span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  location.pathname === to
                    ? 'bg-[#003fb1]/10 text-[#003fb1]'
                    : 'text-[#434654] hover:bg-[#f3f4f5] hover:text-[#191c1d]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </nav>

          {/* User */}
          <div className="flex items-center gap-3">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full border-2 border-[#003fb1]/20" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#003fb1]/10 flex items-center justify-center">
                <User className="w-4 h-4 text-[#003fb1]" />
              </div>
            )}
            <span className="text-sm font-semibold text-[#191c1d] hidden sm:block">{user?.displayName || user?.email}</span>
            <button
              id="btn-logout"
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-[#737686] hover:text-[#ba1a1a] transition-colors"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
