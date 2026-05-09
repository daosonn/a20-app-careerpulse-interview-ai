import { Navigate, Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { user, profile, loading, signInWithGoogle } = useAuth();

  if (loading) return null;

  if (user) {
    if (!profile?.isOnboarded) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/setup" replace />;
  }

  return (
    <div className="min-h-screen bg-navy-950 text-text-primary font-sans antialiased flex flex-col">
      {/* Ambient gold glow */}
      <div
        className="absolute top-[-15%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-gold-500/[0.07] blur-[160px] pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute bottom-[-10%] right-[-10%] w-[32rem] h-[32rem] rounded-full bg-gold-500/[0.05] blur-[140px] pointer-events-none"
        aria-hidden
      />

      {/* Top back link */}
      <div className="relative z-10 px-5 sm:px-8 py-5">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-gold-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
          Về trang chủ
        </Link>
      </div>

      <main className="relative z-10 flex-1 flex items-center justify-center px-5 sm:px-8 pb-12">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 rounded-2xl overflow-hidden border border-gold-500/25 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.8)] bg-navy-900">
          {/* ---------- Left — cinematic panel ---------- */}
          <aside className="hidden lg:flex relative flex-col justify-between p-10 bg-navy-800 overflow-hidden min-h-[560px]">
            <img
              src="https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=900"
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover opacity-45"
            />
            <div
              className="absolute inset-0 bg-gradient-to-br from-navy-950/85 via-navy-900/75 to-navy-950/90"
              aria-hidden
            />
            <div className="relative z-10 flex items-center gap-2.5">
              <img src="/logo.png" alt="" className="w-9 h-9 object-contain" />
              <span className="font-headline font-extrabold tracking-tight text-gold-400 text-xl">
                CareerPulse
              </span>
            </div>

            <div className="relative z-10">
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-400 mb-5">
                <span className="w-8 h-px bg-gold-500" aria-hidden />
                Coaching cao cấp
              </span>
              <h2 className="font-serif text-3xl lg:text-4xl leading-[1.15] text-text-primary mb-5">
                Cơ hội thuộc về{' '}
                <span className="text-gold-400">người chuẩn bị</span> kỹ lưỡng.
              </h2>
              <p className="text-text-muted leading-relaxed max-w-md">
                Đăng nhập để lưu lịch sử luyện tập và theo dõi tiến bộ trên hành
                trình sự nghiệp của bạn.
              </p>
            </div>

            <div className="relative z-10 bg-navy-800/70 backdrop-blur-md border border-gold-500/30 p-5 rounded-xl">
              <div className="flex items-center gap-3 mb-2.5">
                <span className="inline-flex w-9 h-9 rounded-full bg-gold-500/15 border border-gold-500/40 items-center justify-center">
                  <Sparkles className="w-4 h-4 text-gold-400" aria-hidden />
                </span>
                <span className="font-semibold text-text-primary text-sm">
                  AI Coach Insight
                </span>
              </div>
              <p className="text-text-muted text-sm italic leading-relaxed">
                "Chỉ số tự tin của bạn tăng 15% sau phiên gần nhất. Sẵn sàng
                bước tiếp chưa?"
              </p>
            </div>
          </aside>

          {/* ---------- Right — sign-in panel ---------- */}
          <section className="p-8 sm:p-12 lg:p-14 bg-navy-900 flex flex-col justify-center">
            {/* Mobile brand */}
            <div className="lg:hidden flex items-center gap-2.5 mb-10 justify-center">
              <img src="/logo.png" alt="" className="w-8 h-8 object-contain" />
              <span className="font-headline font-extrabold tracking-tight text-gold-400 text-lg">
                CareerPulse
              </span>
            </div>

            <div className="mb-8 text-center lg:text-left">
              <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-400 mb-3">
                Đăng nhập
              </span>
              <h2 className="font-serif text-3xl lg:text-4xl leading-tight text-text-primary mb-3">
                Chào mừng trở lại.
              </h2>
              <p className="text-text-muted leading-relaxed">
                Một cú nhấp để tiếp tục luyện tập. Không mật khẩu, không rắc rối.
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <button
                onClick={signInWithGoogle}
                className="w-full h-13 inline-flex items-center justify-center gap-3 rounded-lg border border-gold-500/60 bg-transparent text-text-primary font-semibold hover:bg-gold-500/10 hover:border-gold-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900 active:scale-[0.98]"
              >
                <svg
                  className="w-5 h-5 shrink-0"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Tiếp tục với Google
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-8" aria-hidden>
              <span className="flex-1 h-px bg-navy-700" />
              <span className="text-[10px] uppercase tracking-[0.3em] text-text-muted">
                Bảo mật
              </span>
              <span className="flex-1 h-px bg-navy-700" />
            </div>

            <div className="flex items-start gap-3 text-[11px] text-text-muted leading-relaxed">
              <ShieldCheck
                className="w-4 h-4 text-gold-400 shrink-0 mt-0.5"
                aria-hidden
              />
              <p>
                Bằng việc tiếp tục, bạn đồng ý với{' '}
                <a
                  href="#"
                  className="font-semibold text-text-primary underline decoration-gold-500/40 hover:text-gold-400 hover:decoration-gold-400 transition-colors"
                >
                  Điều khoản sử dụng
                </a>{' '}
                và{' '}
                <a
                  href="#"
                  className="font-semibold text-text-primary underline decoration-gold-500/40 hover:text-gold-400 hover:decoration-gold-400 transition-colors"
                >
                  Chính sách bảo mật
                </a>{' '}
                của CareerPulse. Thông tin của bạn được bảo mật theo tiêu chuẩn
                doanh nghiệp.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
