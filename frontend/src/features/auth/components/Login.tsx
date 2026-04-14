import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles } from 'lucide-react';

export function Login() {
  const { user, signInWithGoogle } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="bg-[#f8f9fa] text-[#191c1d] min-h-screen flex flex-col font-sans">
      <main className="flex-grow flex items-center justify-center p-6 md:p-12 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#003fb1]/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-[#7127e5]/5 rounded-full blur-[100px]"></div>
        
        <div className="w-full max-w-5xl flex flex-col md:flex-row bg-white rounded-[2rem] shadow-2xl overflow-hidden min-h-[600px]">
          {/* Branding/Visual Side */}
          <div className="hidden md:flex md:w-1/2 p-12 bg-[#f3f4f5] flex-col justify-between relative overflow-hidden">
            <div className="z-10">
              <div className="flex items-center gap-3 mb-8">
                <img src="/logo.png" alt="CareerPulse Logo" className="w-10 h-10 object-contain" />
                <span className="text-2xl font-extrabold tracking-tight text-[#003fb1]">CareerPulse</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-extrabold text-[#191c1d] tracking-tight leading-tight mb-6">
                Unlock your <span className="text-[#003fb1]">interview</span> potential.
              </h1>
              <p className="text-[#434654] text-lg leading-relaxed max-w-sm">
                Đăng nhập để lưu lịch sử luyện tập và theo dõi tiến bộ của bạn trên hành trình sự nghiệp.
              </p>
            </div>
            
            {/* Featured Card */}
            <div className="mt-8 bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-sm z-10 border border-[#c3c5d7]/10">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#8b4aff] flex items-center justify-center">
                  <Sparkles className="text-white w-6 h-6" />
                </div>
                <span className="font-bold text-[#191c1d]">AI Coach Insight</span>
              </div>
              <p className="text-[#434654] text-sm italic">
                "Your confidence score improved by 15% in the last session. Ready to tackle behavioral questions today?"
              </p>
            </div>
            
            {/* Abstract Visual */}
            <div className="absolute bottom-[-100px] right-[-100px] w-64 h-64 bg-[#003fb1]/10 rounded-full"></div>
          </div>
          
          {/* Form Side */}
          <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center bg-white">
            <div className="mb-10 text-center md:text-left">
              <h2 className="text-3xl font-extrabold text-[#191c1d] mb-2">Welcome Back</h2>
              <p className="text-[#434654] font-medium">Join professionals today.</p>
            </div>
            
            <div className="space-y-4 mb-8">
              <button
                onClick={signInWithGoogle}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border border-[#c3c5d7]/30 rounded-xl text-[#191c1d] font-semibold hover:bg-[#f3f4f5] active:scale-95 transition-all duration-200 shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
            
            <div className="mt-auto pt-8 text-center text-[10px] text-[#737686] uppercase tracking-tighter leading-relaxed">
              By continuing, you agree to CareerPulse's <br/>
              <span className="font-bold underline cursor-pointer">Terms of Service</span> and <span className="font-bold underline cursor-pointer">Privacy Policy</span>.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
