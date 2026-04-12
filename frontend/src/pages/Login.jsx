import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Rocket, Sparkles, User, Mail } from 'lucide-react';

export default function Login() {
  const { user, signIn } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Vui lòng nhập tên của bạn.'); return; }
    signIn({ name: name.trim(), email: email.trim() || `${name.trim().toLowerCase().replace(/\s+/g, '.')}@guest.local` });
  };

  return (
    <div className="bg-[#f8f9fa] text-[#191c1d] min-h-screen flex flex-col font-sans">
      <main className="flex-grow flex items-center justify-center p-6 md:p-12 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#003fb1]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-[#7127e5]/5 rounded-full blur-[100px]" />

        <div className="w-full max-w-5xl flex flex-col md:flex-row bg-white rounded-[2rem] shadow-2xl overflow-hidden min-h-[560px]">
          {/* Left branding */}
          <div className="hidden md:flex md:w-1/2 p-12 bg-[#f3f4f5] flex-col justify-between relative overflow-hidden">
            <div className="z-10">
              <div className="flex items-center gap-2 mb-8">
                <Rocket className="text-[#003fb1] w-8 h-8" />
                <span className="text-2xl font-extrabold tracking-tight text-[#003fb1]">CareerPulse</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-extrabold text-[#191c1d] tracking-tight leading-tight mb-6">
                Unlock your <span className="text-[#003fb1]">interview</span> potential.
              </h1>
              <p className="text-[#434654] text-lg leading-relaxed max-w-sm">
                Luyện phỏng vấn với AI Coach thông minh. Nhận phản hồi chi tiết và cải thiện từng ngày.
              </p>
            </div>
            <div className="mt-8 bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-sm z-10 border border-[#c3c5d7]/10">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#8b4aff] flex items-center justify-center">
                  <Sparkles className="text-white w-6 h-6" />
                </div>
                <span className="font-bold text-[#191c1d]">AI Coach Insight</span>
              </div>
              <p className="text-[#434654] text-sm italic">
                "Phân tích STAR chính xác — AI chỉ ra đúng điểm yếu và gợi ý câu trả lời tốt hơn."
              </p>
            </div>
            <div className="absolute bottom-[-100px] right-[-100px] w-64 h-64 bg-[#003fb1]/10 rounded-full" />
          </div>

          {/* Right form */}
          <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center bg-white">
            <div className="mb-8 text-center md:text-left">
              <h2 className="text-3xl font-extrabold text-[#191c1d] mb-2">Bắt đầu nào!</h2>
              <p className="text-[#434654] font-medium">Nhập tên để sử dụng CareerPulse.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-[#ffdad6] text-[#ba1a1a] rounded-lg text-sm font-medium">{error}</div>
              )}

              <div>
                <label className="block text-sm font-bold text-[#191c1d] mb-2">
                  Tên của bạn <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737686]" />
                  <input
                    id="input-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full pl-10 pr-4 py-3 border border-[#c3c5d7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003fb1] focus:border-transparent text-[#191c1d] font-medium bg-[#f8f9fa]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#191c1d] mb-2">
                  Email <span className="text-[#737686] font-normal">(tuỳ chọn)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737686]" />
                  <input
                    id="input-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full pl-10 pr-4 py-3 border border-[#c3c5d7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003fb1] focus:border-transparent text-[#191c1d] font-medium bg-[#f8f9fa]"
                  />
                </div>
              </div>

              <button
                id="btn-login"
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-[#003fb1] to-[#1a56db] text-white font-bold rounded-xl shadow-lg hover:shadow-blue-900/25 active:scale-95 transition-all mt-2"
              >
                Vào luyện phỏng vấn →
              </button>
            </form>

            <p className="mt-8 text-center text-xs text-[#737686]">
              Thông tin chỉ lưu trên thiết bị của bạn. Không cần tài khoản.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
