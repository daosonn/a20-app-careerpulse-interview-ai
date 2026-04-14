import { Link } from 'react-router-dom';
import { Rocket, MessageSquare, Frown, XCircle, Zap, Mic, BarChart3, ArrowRight } from 'lucide-react';

export function Landing() {
  return (
    <div className="bg-[#f8f9fa] text-[#191c1d] font-sans antialiased min-h-screen flex flex-col">
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="flex justify-between items-center px-6 h-16 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <Rocket className="text-[#003fb1] w-6 h-6" />
            <span className="font-extrabold tracking-tight text-[#003fb1] text-xl">CareerPulse</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-slate-600 font-medium hover:text-[#003fb1] transition-colors">
              Đăng nhập
            </Link>
            <Link to="/setup" className="px-5 py-2 bg-[#003fb1] text-white font-bold rounded-lg hover:bg-[#003dab] transition-colors shadow-md shadow-blue-900/20">
              Phỏng vấn ngay
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-16 pb-24 flex-grow">
        <section className="relative overflow-hidden px-6 pt-20 pb-24 md:pt-32 md:pb-40">
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div className="relative z-10">
              <h1 className="text-5xl md:text-7xl font-extrabold text-[#191c1d] leading-[1.1] mb-6">
                Luyện phỏng vấn với <span className="bg-gradient-to-r from-[#003fb1] to-[#7127e5] bg-clip-text text-transparent">AI như thật</span>
              </h1>
              <p className="text-lg md:text-xl text-[#434654] leading-relaxed mb-10 max-w-lg">
                AI không chỉ động viên, CareerPulse chỉ ra chính xác lỗi sai của bạn và cách sửa đổi từng câu chữ để chinh phục nhà tuyển dụng.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/setup" className="px-8 py-4 bg-gradient-to-r from-[#003fb1] to-[#1a56db] text-white font-bold rounded-xl shadow-lg hover:shadow-blue-900/25 active:scale-95 transition-all text-center">
                  Bắt đầu luyện ngay
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-[#7127e5]/10 blur-[120px] rounded-full -z-10"></div>
              <div className="bg-white p-4 rounded-[2rem] shadow-2xl shadow-blue-900/5">
                <img alt="AI Interview Interface" className="w-full h-auto rounded-2xl" src="https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=1000" />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-xl flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border-4 border-[#7127e5] flex items-center justify-center font-bold text-[#7127e5] text-xl">85%</div>
                <div>
                  <p className="text-sm font-bold text-[#191c1d]">Chỉ số sẵn sàng</p>
                  <p className="text-xs text-[#434654]">Sẵn sàng cho Big Tech!</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f3f4f5] py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16 max-w-2xl">
              <span className="text-[#7127e5] font-bold tracking-widest text-sm uppercase">Nỗi đau ứng viên</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-2 text-[#191c1d]">Tại sao bạn chưa nhận được Offer?</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-xl flex flex-col gap-4 shadow-sm">
                <div className="w-12 h-12 bg-[#ffdad6] text-[#ba1a1a] rounded-full flex items-center justify-center">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#191c1d]">Trả lời lan man</h3>
                <p className="text-[#434654]">Mất 5 phút để giới thiệu bản thân nhưng không đọng lại được giá trị cốt lõi nào cho nhà tuyển dụng.</p>
              </div>
              <div className="bg-white p-8 rounded-xl flex flex-col gap-4 shadow-sm">
                <div className="w-12 h-12 bg-[#ffdad6] text-[#ba1a1a] rounded-full flex items-center justify-center">
                  <Frown className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#191c1d]">Bị khớp khi phỏng vấn</h3>
                <p className="text-[#434654]">Run sợ trước những câu hỏi khó, dẫn đến quên sạch kiến thức và kinh nghiệm đã chuẩn bị.</p>
              </div>
              <div className="bg-white p-8 rounded-xl flex flex-col gap-4 shadow-sm">
                <div className="w-12 h-12 bg-[#ffdad6] text-[#ba1a1a] rounded-full flex items-center justify-center">
                  <XCircle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#191c1d]">Feedback chung chung</h3>
                <p className="text-[#434654]">"Em rất tiềm năng nhưng chưa phù hợp" - Bạn không bao giờ biết mình thực sự sai ở đâu.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 px-6 bg-[#f8f9fa]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-[#191c1d]">Quyền năng Mentor trong tay bạn</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-8 bg-white p-10 rounded-xl flex flex-col md:flex-row gap-8 items-center shadow-sm border border-gray-100">
                <div className="flex-1">
                  <span className="bg-[#003fb1]/10 text-[#003fb1] px-3 py-1 rounded-full text-sm font-bold">MỚI NHẤT</span>
                  <h3 className="text-2xl font-bold mt-4 mb-4 text-[#191c1d]">Phân tích CV & Rubric cá nhân hóa</h3>
                  <p className="text-[#434654] leading-relaxed">AI đọc hiểu từng dòng kinh nghiệm của bạn để tạo ra bộ tiêu chí đánh giá (Rubric) khắt khe như một Hiring Manager thực thụ.</p>
                </div>
                <div className="w-full md:w-1/2">
                  <img alt="CV Analysis" className="rounded-xl shadow-lg" src="https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=500" />
                </div>
              </div>
              <div className="md:col-span-4 bg-[#003fb1] text-white p-10 rounded-xl flex flex-col justify-between shadow-lg">
                <div>
                  <Zap className="w-10 h-10 mb-6 text-yellow-300" />
                  <h3 className="text-2xl font-bold mb-4">Stress-test Mode</h3>
                  <p className="text-white/80">Giả lập các tình huống dồn ép, hỏi xoáy đáp xoay để rèn luyện tâm lý vững vàng trước mọi áp lực.</p>
                </div>
                <Link to="/setup" className="mt-8 flex items-center gap-2 font-bold hover:gap-4 transition-all">
                  Thử ngay <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
              <div className="md:col-span-4 bg-[#8b4aff] text-white p-10 rounded-xl shadow-lg">
                <Mic className="w-10 h-10 mb-6 text-white/90" />
                <h3 className="text-2xl font-bold mb-4">Ghi âm & Chuyển chữ</h3>
                <p className="text-white/80">Tự động ghi âm câu trả lời của bạn, chuyển thành văn bản để phân tích ngữ pháp và sắc thái giọng nói.</p>
              </div>
              <div className="md:col-span-8 bg-[#f3f4f5] p-10 rounded-xl flex flex-col justify-center border border-gray-200 shadow-sm">
                <BarChart3 className="w-10 h-10 mb-4 text-[#434654]" />
                <h3 className="text-2xl font-bold mb-4 text-[#191c1d]">Báo cáo chi tiết sau mỗi phiên</h3>
                <p className="text-[#434654] max-w-md">Nhận điểm số dựa trên 5 tiêu chí: Tư duy phản biện, Kiến thức chuyên môn, Giao tiếp, Thái độ và Độ tin cậy.</p>
                <div className="mt-8 flex gap-4 overflow-hidden">
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#003fb1] w-3/4"></div>
                  </div>
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#7127e5] w-1/2"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto bg-gradient-to-br from-[#003fb1] to-[#1a56db] rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-8">Sẵn sàng để "chốt deal" sự nghiệp?</h2>
              <p className="text-[#d4dcff] text-lg mb-12 max-w-2xl mx-auto opacity-90">
                Hàng ngàn ứng viên đã tự tin hơn sau khi luyện tập cùng CareerPulse. Hãy bắt đầu hành trình của bạn ngay hôm nay.
              </p>
              <Link to="/setup" className="inline-block bg-white text-[#003fb1] px-10 py-5 rounded-2xl font-black text-lg hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10">
                Bắt đầu miễn phí ngay
              </Link>
              <p className="mt-6 text-white/60 text-sm">Hoàn toàn bảo mật thông tin</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#f3f4f5] py-12 px-6 border-t border-gray-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Rocket className="text-[#003fb1] w-5 h-5" />
            <span className="font-extrabold tracking-tight text-[#003fb1] text-lg">CareerPulse</span>
          </div>
          <div className="flex gap-8 text-sm text-[#434654] font-medium">
            <a className="hover:text-[#003fb1] transition-colors" href="#">Về chúng tôi</a>
            <a className="hover:text-[#003fb1] transition-colors" href="#">Điều khoản</a>
            <a className="hover:text-[#003fb1] transition-colors" href="#">Bảo mật</a>
          </div>
          <p className="text-xs text-[#434654] opacity-60">© 2024 CareerPulse AI Coach. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
