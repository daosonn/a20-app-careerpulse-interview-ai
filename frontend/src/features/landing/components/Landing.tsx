import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Upload,
  SlidersHorizontal,
  Mic,
  FileSearch,
  Brain,
  LineChart,
  Target,
  Sparkles,
  MessageSquareText,
  Lightbulb,
  Gauge,
  Users,
  ShieldCheck,
  Quote,
  Star,
} from 'lucide-react';
import { Button, Badge, ScoreRing } from '../../../components/ui';

/**
 * Landing page — cinematic, executive coaching aesthetic.
 *
 * Top visual anchors on Stitch references (see stitch_UI_UX/).
 * Sections:
 *   1. Cinematic hero (full-bleed, navy + gold, single CTA)
 *   2. Trust stat strip
 *   3. Pain → Evolution (2-col narrative)
 *   4. How It Works (4-step timeline)
 *   5. The Arena (interview simulation feature)
 *   6. The Debrief (AI feedback + scoring feature)
 *   7. Progress Tracking (dashboard preview)
 *   8. Proven Methodology (3-pillar on cream surface)
 *   9. Testimonials
 *  10. Pricing (3-tier)
 *  11. Final CTA
 *  12. Footer
 */
export function Landing() {
  return (
    <div className="bg-navy-950 text-text-primary font-sans antialiased min-h-screen">
      <LandingNav />
      <main>
        <Hero />
        <TrustStrip />
        <PainAndEvolution />
        <HowItWorks />
        <ArenaFeature />
        <DebriefFeature />
        <ProgressTracking />
        <Methodology />
        <Testimonials />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Navigation                                                         */
/* ------------------------------------------------------------------ */

function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={
        'fixed top-0 left-0 right-0 z-50 transition-all duration-200 ' +
        (scrolled
          ? 'bg-navy-950/85 backdrop-blur-md border-b border-navy-800/70'
          : 'bg-transparent')
      }
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src="/logo.png" alt="" className="w-8 h-8 object-contain" />
          <span className="font-serif font-semibold tracking-tight text-gold-400 text-xl">
            CareerPulse
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-text-muted">
          <a href="#methodology" className="hover:text-gold-400 transition-colors">
            Phương pháp
          </a>
          <a href="#arena" className="hover:text-gold-400 transition-colors">
            Tính năng
          </a>
          <a href="#pricing" className="hover:text-gold-400 transition-colors">
            Gói dịch vụ
          </a>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden sm:block">
            <Button variant="ghost" size="sm">
              Đăng nhập
            </Button>
          </Link>
          <Link to="/setup">
            <Button variant="primary" size="sm">
              Bắt đầu
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero — cinematic, city + executive                                 */
/*  Anchored on elevate_ai_high_end_hero_section.                      */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative min-h-[92vh] overflow-hidden flex items-center">
      {/* Backdrop image — bleeds off the right, fades left into navy */}
      <div
        className="absolute inset-0 bg-cover bg-right bg-no-repeat"
        style={{
          backgroundImage: "url('/hero-executive.jpg')",
        }}
        aria-hidden
      />
      {/* Navy gradient: solid on left, transparent mid-right */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/85 to-navy-950/30"
        aria-hidden
      />
      {/* Subtle warm gold glow on the right — city-lights effect */}
      <div
        className="absolute -right-40 top-1/4 w-[46rem] h-[46rem] rounded-full bg-gold-500/[0.12] blur-[160px] pointer-events-none"
        aria-hidden
      />
      {/* Soft vignette at the top to keep the nav legible */}
      <div
        className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-navy-950 to-transparent pointer-events-none"
        aria-hidden
      />

      <div className="relative z-10 w-full px-5 sm:px-8 lg:px-16 pt-24 pb-20">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-gold-400 mb-8">
            <span className="w-10 h-px bg-gold-500" aria-hidden />
            AI Coaching · Dành cho ứng viên tham vọng
          </span>

          <h1 className="font-serif font-semibold text-text-primary leading-[1.05] tracking-tight text-4xl sm:text-5xl lg:text-6xl xl:text-7xl mb-8">
            Đừng để công việc mơ ước mãi là{' '}
            <span className="italic">giấc mơ</span> chỉ vì một{' '}
            <span className="text-gold-400 italic">cuộc đối thoại 30 phút</span>.
          </h1>

          <p className="text-base sm:text-lg text-text-muted leading-relaxed max-w-xl mb-10">
            Vượt qua nỗi lo phỏng vấn và khai phá tiềm năng thật sự của bạn
            bằng luyện tập AI cá nhân hóa. Bước ngoặt sự nghiệp đang chờ ở phía
            trước.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <Link to="/setup">
              <Button variant="primary" size="lg" className="px-8">
                Bắt đầu phiên đầu tiên
                <ArrowRight className="w-4 h-4" aria-hidden />
              </Button>
            </Link>
            <Link
              to="/login"
              className="text-sm text-text-muted hover:text-gold-400 transition-colors font-medium"
            >
              Đã có tài khoản? Đăng nhập
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-gold-400" aria-hidden />
              Không cần thẻ tín dụng
            </span>
            <span className="h-3 w-px bg-navy-600" aria-hidden />
            <span className="inline-flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-gold-400 fill-gold-400" aria-hidden />
              Tiếng Việt & English
            </span>
            <span className="h-3 w-px bg-navy-600" aria-hidden />
            <span>Bảo mật tuyệt đối</span>
          </div>
        </div>
      </div>

      {/* Bottom fade to blend into the next section */}
      <div
        className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-navy-950 to-transparent pointer-events-none"
        aria-hidden
      />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Trust strip                                                         */
/* ------------------------------------------------------------------ */

function TrustStrip() {
  const stats = [
    { value: '10K+', label: 'Phiên mô phỏng đã diễn ra' },
    { value: '85%', label: 'Tăng tự tin sau 3 phiên' },
    { value: '5', label: 'Tiêu chí chấm điểm chi tiết' },
    { value: '100+', label: 'Mẫu câu hỏi theo ngành' },
  ];
  return (
    <section className="bg-navy-900 border-y border-navy-800">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x md:divide-navy-700">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={
                'flex flex-col items-center text-center md:px-6 ' +
                (i > 0 ? '' : '')
              }
            >
              <span className="font-serif text-3xl sm:text-4xl text-gold-400 leading-none">
                {s.value}
              </span>
              <span className="mt-2 text-xs sm:text-sm text-text-muted leading-relaxed max-w-[14rem]">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Pain → Evolution (2-col narrative split)                           */
/* ------------------------------------------------------------------ */

function PainAndEvolution() {
  return (
    <section className="py-24 px-5 sm:px-8 relative">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.28em] text-gold-400 mb-4">
            Hành trình
          </span>
          <h2 className="font-serif text-3xl md:text-5xl leading-[1.1] text-text-primary">
            Từ nỗi sợ phỏng vấn đến{' '}
            <span className="text-gold-400">sự tự tin có cơ sở.</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-stretch">
          {/* Pain */}
          <article className="relative rounded-2xl overflow-hidden border border-navy-700 bg-navy-900 p-8 sm:p-10 min-h-[24rem]">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-25"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=1000')",
              }}
              aria-hidden
            />
            <div
              className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-950/80 to-navy-900/60"
              aria-hidden
            />
            <div className="relative z-10 h-full flex flex-col">
              <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.28em] text-status-error/80 mb-4">
                The Pain Point
              </span>
              <h3 className="font-serif text-2xl md:text-3xl leading-snug text-text-primary mb-5">
                Gánh nặng của sự từ chối
              </h3>
              <p className="text-text-muted leading-relaxed mb-6">
                Luyện tập chung chung không dạy bạn cách xử lý áp lực thật. Đến
                buổi phỏng vấn, áp lực khiến bạn quên kinh nghiệm, trả lời lan
                man, và nhận những câu feedback mơ hồ như "em chưa phù hợp".
              </p>
              <ul className="space-y-2.5 text-sm text-text-primary/90 mt-auto">
                {[
                  'Không có không gian mô phỏng đủ chân thực',
                  'Thiếu phản hồi cụ thể theo từng câu trả lời',
                  'Tiến bộ không thể đo lường được',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <span
                      className="inline-block w-1 h-1 rounded-full bg-status-error/70 shrink-0 mt-2.5"
                      aria-hidden
                    />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </article>

          {/* Evolution */}
          <article className="relative rounded-2xl overflow-hidden border border-gold-500/40 bg-navy-800 p-8 sm:p-10 min-h-[24rem] shadow-[0_0_40px_-16px_rgba(201,169,97,0.35)]">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=1000')",
              }}
              aria-hidden
            />
            <div
              className="absolute inset-0 bg-gradient-to-br from-navy-900/90 via-navy-800/80 to-navy-900/70"
              aria-hidden
            />
            <div className="relative z-10 h-full flex flex-col">
              <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-400 mb-4">
                The Evolution
              </span>
              <h3 className="font-serif text-2xl md:text-3xl leading-snug text-text-primary mb-5">
                Sức mạnh của luyện tập có chủ đích
              </h3>
              <p className="text-text-muted leading-relaxed mb-6">
                CareerPulse mô phỏng buổi phỏng vấn như thật, phân tích từng câu
                trả lời theo khung STAR, và đề xuất phiên bản tốt hơn cho mỗi
                câu — giúp bạn tiến bộ qua từng phiên.
              </p>
              <ul className="space-y-2.5 text-sm text-text-primary/90 mt-auto">
                {[
                  'Không gian mô phỏng nhập vai chân thực',
                  'Phản hồi cụ thể trên 5 tiêu chí rõ ràng',
                  'Chỉ số sẵn sàng đo được và tăng theo tuần',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <Check
                      className="w-3.5 h-3.5 text-gold-400 shrink-0 mt-1"
                      aria-hidden
                    />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  How It Works (4-step timeline)                                     */
/* ------------------------------------------------------------------ */

function HowItWorks() {
  const steps = [
    {
      n: '01',
      icon: Upload,
      title: 'Tải lên CV',
      body: 'AI đọc hiểu kinh nghiệm và định vị của bạn, chuẩn bị câu hỏi phù hợp với từng dấu mốc trong hồ sơ.',
    },
    {
      n: '02',
      icon: SlidersHorizontal,
      title: 'Cấu hình phiên',
      body: 'Chọn loại phỏng vấn (Behavioral / Technical / HR), ngôn ngữ, và cường độ. Stress-test mode nếu bạn cần thử thách thật.',
    },
    {
      n: '03',
      icon: Mic,
      title: 'Luyện tập với AI',
      body: 'Trả lời bằng giọng nói hoặc văn bản. Hệ thống chuyển giọng nói thành text, giữ lại cả sắc thái và nhịp điệu.',
    },
    {
      n: '04',
      icon: FileSearch,
      title: 'Nhận phân tích',
      body: 'Điểm số theo 5 tiêu chí, phân tích STAR chi tiết, feedback cụ thể và phiên bản tốt hơn cho mỗi câu trả lời.',
    },
  ];

  return (
    <section
      id="methodology"
      className="py-24 px-5 sm:px-8 border-t border-navy-800/60"
    >
      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl mb-14">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.28em] text-gold-400 mb-4">
            Cách hoạt động
          </span>
          <h2 className="font-serif text-3xl md:text-5xl leading-[1.1] text-text-primary mb-5">
            Bốn bước đến phiên phỏng vấn{' '}
            <span className="text-gold-400">hoàn hảo.</span>
          </h2>
          <p className="text-text-muted text-lg leading-relaxed">
            Một vòng lặp đơn giản, thiết kế để mỗi phiên luyện tập mang lại tiến
            bộ cụ thể và đo được.
          </p>
        </div>

        {/* Steps — horizontal timeline on lg, stacked on mobile */}
        <div className="relative grid gap-8 lg:grid-cols-4">
          {/* Connector line (desktop only) */}
          <div
            className="hidden lg:block absolute top-6 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent"
            aria-hidden
          />

          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.n} className="relative">
                <div className="flex lg:flex-col items-start gap-5 lg:gap-0">
                  {/* Number bubble */}
                  <div className="relative shrink-0 lg:mb-6">
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-navy-900 border border-gold-500/50 font-serif text-gold-400 text-sm relative z-10">
                      {step.n}
                    </span>
                    {/* gold halo */}
                    <span
                      className="absolute inset-0 rounded-full bg-gold-500/15 blur-md"
                      aria-hidden
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon
                        className="w-4 h-4 text-gold-400 hidden lg:block"
                        aria-hidden
                      />
                      <h3 className="font-serif text-xl text-text-primary leading-tight">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-sm text-text-muted leading-relaxed">
                      {step.body}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  The Arena — interview simulation feature                           */
/* ------------------------------------------------------------------ */

function ArenaFeature() {
  const bullets = [
    'Câu hỏi động dựa trên CV và JD thực tế của bạn',
    'Chuyển giọng nói thành văn bản với độ chính xác cao',
    'Chế độ Stress-test mô phỏng áp lực phỏng vấn thật',
    'Bảy giai đoạn phỏng vấn chuẩn: giới thiệu → kỹ năng → hành vi → kết thúc',
  ];

  return (
    <section
      id="arena"
      className="py-24 px-5 sm:px-8 border-t border-navy-800/60 relative overflow-hidden"
    >
      <div
        className="absolute -top-40 right-0 w-[32rem] h-[32rem] rounded-full bg-gold-500/[0.06] blur-[140px] pointer-events-none"
        aria-hidden
      />
      <div className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-[1fr_1.1fr] gap-12 items-center">
        <div>
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.28em] text-gold-400 mb-5">
            Phòng mô phỏng
          </span>
          <h2 className="font-serif text-3xl md:text-5xl leading-[1.1] text-text-primary mb-5">
            The Arena — nơi{' '}
            <span className="text-gold-400">mỗi câu hỏi đều quan trọng.</span>
          </h2>
          <p className="text-text-muted text-lg leading-relaxed mb-8 max-w-xl">
            Không phải quiz. Không phải câu hỏi mẫu. Đây là mô phỏng phỏng vấn
            thực sự, nơi AI phỏng vấn bạn dựa trên chính hồ sơ và vị trí bạn
            đang nhắm đến.
          </p>
          <ul className="space-y-3.5">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-3 text-sm">
                <span className="inline-flex w-5 h-5 rounded-full bg-gold-500/15 border border-gold-500/40 items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-gold-400" aria-hidden />
                </span>
                <span className="text-text-primary leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Arena mock */}
        <ArenaMock />
      </div>
    </section>
  );
}

function ArenaMock() {
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([
    { role: 'ai', text: 'Chào bạn, hãy giới thiệu ngắn gọn về bản thân và kinh nghiệm nổi bật nhất của bạn.' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [stage, setStage] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);

  const script = [
    'Tuyệt vời. Vậy đâu là thử thách lớn nhất bạn từng đối mặt trong công việc, và bạn đã vượt qua nó như thế nào?',
    'Cảm ơn bạn. Câu trả lời của bạn cho thấy bạn có kỹ năng giải quyết vấn đề tốt. Để trải nghiệm phỏng vấn sâu hơn với phân tích STAR chi tiết, hãy tạo tài khoản và bắt đầu!'
  ];

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping || stage >= script.length) return;

    const userMsg = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', text: script[stage] }]);
      setStage(s => s + 1);
      setIsTyping(false);
    }, 1500 + Math.random() * 1000); // 1.5s - 2.5s delay
  };

  return (
    <div className="relative">
      <div
        className="absolute inset-0 bg-gold-500/5 blur-3xl rounded-full -z-10"
        aria-hidden
      />
      <div className="rounded-2xl overflow-hidden border border-gold-500/30 bg-navy-900 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.8)]">
        {/* Mock header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-navy-700 bg-navy-950">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold-400 leading-none">
              The Arena
            </p>
            <p className="text-sm font-serif text-text-primary mt-1 leading-tight">
              Pre-Interview · Khởi động
            </p>
          </div>
          <Badge variant="gold-outline">Đang diễn ra</Badge>
        </div>

        {/* Chat mock */}
        <div ref={chatRef} className="p-5 space-y-4 bg-navy-950 h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-navy-700 scrollbar-track-transparent">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'ai' 
                  ? 'bg-gold-500/15 border border-gold-500/50' 
                  : 'bg-navy-700 border border-navy-600'
              }`}>
                {msg.role === 'ai' ? (
                  <Sparkles className="w-3.5 h-3.5 text-gold-400" aria-hidden />
                ) : (
                  <Mic className="w-3.5 h-3.5 text-gold-400" aria-hidden />
                )}
              </div>
              <div className={`border rounded-2xl px-4 py-3 max-w-[85%] ${
                msg.role === 'ai'
                  ? 'bg-navy-800 border-gold-500/20 rounded-tl-none'
                  : 'bg-navy-700 border-navy-600 rounded-tr-none'
              }`}>
                <p className="text-sm text-text-primary leading-relaxed">
                  {msg.text}
                </p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-gold-500/15 border border-gold-500/50 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-gold-400" aria-hidden />
              </div>
              <div className="bg-navy-800 border border-gold-500/20 rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%] flex items-center gap-1.5 h-[46px]">
                <span className="w-1.5 h-1.5 bg-gold-400/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gold-400/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gold-400/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        {/* Mock footer — input bar */}
        <form onSubmit={handleSubmit} className="px-5 py-3 border-t border-gold-500/20 bg-navy-900 flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isTyping || stage >= script.length}
            placeholder={stage >= script.length ? 'Đã hoàn thành khởi động...' : 'Gõ câu trả lời...'}
            className="flex-1 h-9 rounded-lg bg-navy-700 border border-navy-600 px-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-gold-500/40 disabled:opacity-50"
          />
          <button 
            type="submit"
            disabled={!inputValue.trim() || isTyping || stage >= script.length}
            className="w-9 h-9 rounded-lg bg-gold-500 flex items-center justify-center text-navy-950 disabled:opacity-50 transition-opacity"
          >
            <ArrowRight className="w-4 h-4" aria-hidden />
          </button>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  The Debrief — AI feedback + scoring                                */
/* ------------------------------------------------------------------ */

function DebriefFeature() {
  return (
    <section className="py-24 px-5 sm:px-8 border-t border-navy-800/60">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.28em] text-gold-400 mb-4">
            The Debrief
          </span>
          <h2 className="font-serif text-3xl md:text-5xl leading-[1.1] text-text-primary mb-5">
            Không chỉ điểm số —{' '}
            <span className="text-gold-400">phân tích có thể hành động.</span>
          </h2>
          <p className="text-text-muted text-lg leading-relaxed">
            Mỗi câu trả lời được phân tích trên 5 tiêu chí, đối chiếu với khung
            STAR, và AI viết lại phiên bản lý tưởng để bạn học.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10 items-center">
          {/* Left — score ring + competencies */}
          <div className="flex flex-col items-center lg:items-start">
            <div className="relative">
              <div
                className="absolute inset-0 bg-gold-500/15 blur-3xl rounded-full"
                aria-hidden
              />
              <div className="relative">
                <ScoreRing value={85} max={100} size={220} suffix="%" />
              </div>
            </div>
            <p className="font-serif text-xl text-text-primary mt-4 leading-tight">
              Sẵn sàng cho vai trò cấp cao
            </p>
            <p className="text-sm text-text-muted mt-2 max-w-sm text-center lg:text-left">
              Chỉ số tổng hợp từ 5 tiêu chí, cập nhật sau mỗi phiên.
            </p>

            <div className="grid grid-cols-3 gap-3 mt-8 w-full max-w-md">
              {[
                { label: 'Giao tiếp', score: 4.3 },
                { label: 'Chuyên môn', score: 4.1 },
                { label: 'Tư duy', score: 3.9 },
              ].map((c) => (
                <div
                  key={c.label}
                  className="bg-navy-800 border border-navy-600 rounded-xl px-3 py-3 text-center"
                >
                  <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">
                    {c.label}
                  </p>
                  <p className="font-serif text-2xl text-gold-400 leading-none">
                    {c.score}
                    <span className="text-xs text-text-muted">/5</span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — STAR + feedback + better-version mock */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-navy-600 bg-navy-800 p-6">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-gold-400" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-400">
                  Phân tích STAR
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Situation', 'Bối cảnh được nêu rõ, đúng trọng tâm.'],
                  ['Task', 'Nhiệm vụ cụ thể, có thể đo lường.'],
                  ['Action', 'Hành động cần chi tiết hơn về cách quyết định.'],
                  ['Result', 'Kết quả định lượng rõ — điểm mạnh.'],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="bg-navy-700 border border-navy-600 rounded-lg p-3"
                  >
                    <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-gold-300 mb-1">
                      {k}
                    </span>
                    <p className="text-xs text-text-primary leading-relaxed">
                      {v}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-navy-600 bg-navy-800 p-6">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquareText className="w-4 h-4 text-gold-400" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-400">
                  Nhận xét
                </span>
              </div>
              <p className="text-sm text-text-primary leading-relaxed">
                Cấu trúc câu trả lời tốt, mở đầu và kết có trọng lượng. Cần bổ
                sung chi tiết về cách bạn ưu tiên khi yêu cầu thay đổi và cách
                tái phân bổ nguồn lực.
              </p>
            </div>

            <div className="rounded-2xl border border-gold-500/50 bg-gold-500/[0.08] p-6 relative overflow-hidden">
              <div
                className="absolute -top-4 -right-4 opacity-20"
                aria-hidden
              >
                <Sparkles className="w-20 h-20 text-gold-400" />
              </div>
              <div className="flex items-center gap-2 mb-3 relative z-10">
                <Lightbulb className="w-4 h-4 text-gold-400" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-400">
                  Phiên bản tốt hơn
                </span>
              </div>
              <p className="text-sm text-text-primary italic leading-relaxed relative z-10">
                "Khi yêu cầu thay đổi giữa sprint, tôi tổ chức 30-phút realign
                với product và design, định lượng lại phạm vi, và ưu tiên hai
                module ảnh hưởng đến doanh thu — giữ nguyên deadline và giảm
                rủi ro 40%."
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Progress Tracking (dashboard preview)                              */
/* ------------------------------------------------------------------ */

function ProgressTracking() {
  return (
    <section className="py-24 px-5 sm:px-8 border-t border-navy-800/60">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_1.2fr] gap-12 items-center">
        <div>
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.28em] text-gold-400 mb-5">
            Growth Hub
          </span>
          <h2 className="font-serif text-3xl md:text-5xl leading-[1.1] text-text-primary mb-5">
            Mỗi phiên, một cột mốc.{' '}
            <span className="text-gold-400">Mỗi tuần, một bước tiến.</span>
          </h2>
          <p className="text-text-muted text-lg leading-relaxed mb-8 max-w-xl">
            Theo dõi diễn tiến điểm số, bản đồ năng lực, và gợi ý thử thách tiếp
            theo — tất cả trong một bảng điều khiển được cá nhân hóa.
          </p>
          <ul className="space-y-3 text-sm text-text-primary">
            {[
              ['Biểu đồ tiến bộ qua từng phiên', LineChart],
              ['Bản đồ năng lực 5 trục cốt lõi', Target],
              ['Lộ trình thử thách cá nhân hóa', Gauge],
            ].map(([label, Icon]: any) => (
              <li key={label} className="flex items-center gap-3">
                <span className="inline-flex w-8 h-8 rounded-full bg-gold-500/15 border border-gold-500/40 items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-gold-400" aria-hidden />
                </span>
                <span className="leading-relaxed">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <DashboardMock />
      </div>
    </section>
  );
}

function DashboardMock() {
  return (
    <div className="relative">
      <div
        className="absolute inset-0 bg-gold-500/5 blur-3xl rounded-full -z-10"
        aria-hidden
      />
      <div className="rounded-2xl border border-navy-600 bg-navy-800 p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
        {/* Stat banner */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold-400" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-400">
              Tuần này
            </span>
          </div>
          <Badge variant="gold-outline">+15%</Badge>
        </div>
        <p className="font-serif text-2xl text-text-primary leading-tight mb-6">
          Chỉ số tự tin của bạn{' '}
          <span className="text-gold-400">tăng 15%</span>
        </p>

        {/* Bar chart mock */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          {[3.2, 3.8, 4.0, 3.7, 4.3].map((v, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div
                className="w-full rounded-sm bg-gradient-to-t from-gold-500/30 to-gold-500"
                style={{ height: `${(v / 5) * 80}px` }}
                aria-hidden
              />
              <span className="text-[10px] text-text-muted">
                {['T2', 'T3', 'T4', 'T5', 'T6'][i]}
              </span>
            </div>
          ))}
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-navy-700 border border-navy-600 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">
              Điểm TB
            </p>
            <p className="font-serif text-2xl text-gold-400 leading-none">
              4.2
              <span className="text-base text-text-muted">/5</span>
            </p>
          </div>
          <div className="bg-navy-700 border border-navy-600 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">
              Phiên hoàn thành
            </p>
            <p className="font-serif text-2xl text-gold-400 leading-none">12</p>
          </div>
        </div>

        {/* Recent sessions list */}
        <div className="space-y-2">
          {[
            { role: 'Senior Product Manager · Tech', score: 4.3 },
            { role: 'Data Scientist · FinTech', score: 4.1 },
          ].map((s) => (
            <div
              key={s.role}
              className="flex items-center justify-between bg-navy-700/60 border border-navy-600 rounded-lg px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="inline-flex w-7 h-7 rounded-full bg-gold-500/10 border border-gold-500/40 items-center justify-center font-serif text-gold-400 text-xs shrink-0">
                  {s.score}
                </span>
                <span className="text-xs text-text-primary truncate">
                  {s.role}
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-text-muted" aria-hidden />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Proven Methodology — cream surface, 3-pillar                       */
/* ------------------------------------------------------------------ */

function Methodology() {
  const pillars = [
    {
      icon: Brain,
      title: 'AI Simulation',
      body: 'Mô phỏng phỏng vấn theo CV và vị trí của bạn, với bảy giai đoạn phỏng vấn chuẩn từ giới thiệu đến đóng phiên.',
    },
    {
      icon: MessageSquareText,
      title: 'Personalized Feedback',
      body: 'Phản hồi cụ thể theo 5 tiêu chí, phân tích STAR rõ ràng, và phiên bản tốt hơn do AI viết lại cho từng câu trả lời.',
    },
    {
      icon: LineChart,
      title: 'Visible Growth',
      body: 'Chỉ số sẵn sàng, biểu đồ tiến bộ và bản đồ năng lực giúp bạn thấy rõ tiến trình — không chỉ cảm tính.',
    },
  ];

  return (
    <section className="bg-cream-100 text-text-dark py-24 px-5 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl mb-14">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.28em] text-gold-600 mb-4">
            Phương pháp
          </span>
          <h2 className="font-serif text-3xl md:text-5xl leading-[1.1] text-text-dark mb-5">
            Ba trụ cột của{' '}
            <span className="text-gold-600">sự tiến bộ có thể đo lường.</span>
          </h2>
          <p className="text-text-dark/70 text-lg leading-relaxed">
            Không có đường tắt — chỉ có vòng lặp luyện tập đúng cách, được hệ
            thống hóa thành một sản phẩm.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {pillars.map(({ icon: Icon, title, body }, i) => (
            <div
              key={title}
              className="bg-cream-50 border border-cream-200 rounded-2xl p-8 hover:border-gold-600/40 transition-colors relative"
            >
              <span className="absolute top-6 right-6 font-serif text-5xl text-gold-600/15 leading-none">
                0{i + 1}
              </span>
              <span className="inline-flex w-12 h-12 rounded-full bg-gold-600/10 border border-gold-600/30 items-center justify-center mb-5">
                <Icon className="w-5 h-5 text-gold-600" aria-hidden />
              </span>
              <h3 className="font-serif text-2xl text-text-dark mb-3 leading-tight">
                {title}
              </h3>
              <p className="text-text-dark/70 text-[15px] leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Testimonials                                                        */
/* ------------------------------------------------------------------ */

interface Testimonial {
  name: string;
  role: string;
  quote: string;
  initials: string;
}

const testimonials: Testimonial[] = [
  {
    name: 'Phạm Thu Hà',
    role: 'Senior Product Manager',
    quote:
      'Sau bốn phiên mô phỏng cùng CareerPulse, tôi nhận được offer cho vị trí tôi đã trượt hai lần trước đó. Phần STAR analysis thay đổi hoàn toàn cách tôi kể câu chuyện sự nghiệp của mình.',
    initials: 'PH',
  },
  {
    name: 'Nguyễn Minh Khôi',
    role: 'Data Scientist · FinTech',
    quote:
      'Stress-test mode là thứ khiến tôi bị bất ngờ nhất. Lần đầu tiên tôi luyện tập mà thấy tim đập nhanh — và đó chính xác là cảm giác trong phòng phỏng vấn thật.',
    initials: 'NK',
  },
  {
    name: 'Trần Ngọc Anh',
    role: 'Product Designer',
    quote:
      'Tôi từng nghĩ mình nói chuyện tốt, nhưng điểm "Cấu trúc" của tôi luôn thấp. Sau hai tuần, chỉ số đó tăng từ 3.1 lên 4.4. Bằng chứng rõ ràng hơn mọi lời động viên.',
    initials: 'TN',
  },
];

function Testimonials() {
  return (
    <section className="py-24 px-5 sm:px-8 border-t border-navy-800/60">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.28em] text-gold-400 mb-4">
            Câu chuyện thành công
          </span>
          <h2 className="font-serif text-3xl md:text-5xl leading-[1.1] text-text-primary">
            Những ứng viên đã{' '}
            <span className="text-gold-400">thay đổi cuộc chơi.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <article
              key={t.name}
              className="relative rounded-2xl border border-navy-600 bg-navy-800 p-7 hover:border-gold-500/50 transition-colors"
            >
              <Quote
                className="absolute top-5 right-5 w-7 h-7 text-gold-500/25"
                aria-hidden
              />
              <div className="flex items-center gap-1 mb-4" aria-label="5 sao">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star
                    key={i}
                    className="w-3.5 h-3.5 text-gold-400 fill-gold-400"
                    aria-hidden
                  />
                ))}
              </div>
              <p className="text-sm text-text-primary leading-relaxed mb-6 italic">
                "{t.quote}"
              </p>
              <div className="flex items-center gap-3 pt-5 border-t border-navy-700">
                <span className="inline-flex w-10 h-10 rounded-full bg-gold-500/15 border border-gold-500/50 items-center justify-center font-serif text-gold-400 text-sm shrink-0">
                  {t.initials}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary leading-tight">
                    {t.name}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">{t.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Pricing                                                             */
/* ------------------------------------------------------------------ */

interface PricingTier {
  name: string;
  price: string;
  cadence: string;
  summary: string;
  features: string[];
  featured?: boolean;
  ctaLabel: string;
}

const tiers: PricingTier[] = [
  {
    name: 'Starter',
    price: 'Miễn phí',
    cadence: '',
    summary: 'Khởi đầu hành trình luyện phỏng vấn.',
    features: [
      '3 phiên phỏng vấn / tháng',
      'Đánh giá STAR cơ bản',
      'Biểu đồ tiến bộ',
    ],
    ctaLabel: 'Dùng thử',
  },
  {
    name: 'Professional',
    price: '499.000₫',
    cadence: '/ tháng',
    summary: 'Dành cho ứng viên nghiêm túc với mục tiêu rõ ràng.',
    features: [
      'Phiên phỏng vấn không giới hạn',
      'Stress-test mode',
      'Phân tích giọng nói & ngữ điệu',
      'Lộ trình cá nhân hóa',
    ],
    featured: true,
    ctaLabel: 'Bắt đầu ngay',
  },
  {
    name: 'Elite',
    price: '1.499.000₫',
    cadence: '/ tháng',
    summary: 'Huấn luyện toàn diện cho vai trò cấp cao.',
    features: [
      'Tất cả tính năng Professional',
      'Mô phỏng hội đồng phỏng vấn',
      'Rubric cho vai trò cụ thể',
      'Hỗ trợ ưu tiên 24/7',
    ],
    ctaLabel: 'Nâng cấp Elite',
  },
];

function Pricing() {
  return (
    <section id="pricing" className="py-24 px-5 sm:px-8 border-t border-navy-800/60">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.28em] text-gold-400 mb-4">
            Gói dịch vụ
          </span>
          <h2 className="font-serif text-3xl md:text-5xl leading-[1.1] text-text-primary mb-5">
            Chuẩn bị đẳng cấp.{' '}
            <span className="text-gold-400">Tiếp cận cho tất cả.</span>
          </h2>
          <p className="text-text-muted text-lg leading-relaxed">
            Chọn gói phù hợp với mục tiêu của bạn. Hủy bất kỳ lúc nào.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 items-stretch">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={
                'relative rounded-2xl p-8 flex flex-col transition-all ' +
                (tier.featured
                  ? 'bg-navy-800 border-2 border-gold-500 shadow-[0_0_40px_-12px_rgba(201,169,97,0.35)] lg:-translate-y-3'
                  : 'bg-navy-800 border border-navy-600 hover:border-gold-500/40')
              }
            >
              {tier.featured && (
                <Badge
                  variant="gold"
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1"
                >
                  Phổ biến nhất
                </Badge>
              )}
              <h3 className="font-serif text-2xl text-text-primary mb-2">
                {tier.name}
              </h3>
              <p className="text-sm text-text-muted mb-6 leading-relaxed">
                {tier.summary}
              </p>
              <div className="mb-6">
                <span className="font-serif text-4xl text-gold-400">
                  {tier.price}
                </span>
                {tier.cadence && (
                  <span className="text-sm text-text-muted ml-1">
                    {tier.cadence}
                  </span>
                )}
              </div>
              <ul className="space-y-3 text-sm mb-8 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <span className="inline-flex w-5 h-5 rounded-full bg-gold-500/15 border border-gold-500/40 items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-gold-400" aria-hidden />
                    </span>
                    <span className="text-text-primary leading-relaxed">
                      {f}
                    </span>
                  </li>
                ))}
              </ul>
              <Link to="/setup">
                <Button
                  variant={tier.featured ? 'primary' : 'secondary'}
                  size="md"
                  fullWidth
                >
                  {tier.ctaLabel}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Final CTA                                                           */
/* ------------------------------------------------------------------ */

function FinalCTA() {
  return (
    <section className="py-28 px-5 sm:px-8 border-t border-navy-800/60 relative overflow-hidden">
      <div
        className="absolute inset-0 bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950 pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full bg-gold-500/[0.07] blur-[140px] pointer-events-none"
        aria-hidden
      />
      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <span className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-gold-400 mb-6">
          <span className="w-10 h-px bg-gold-500" aria-hidden />
          Sẵn sàng bắt đầu?
        </span>
        <h2 className="font-serif text-3xl md:text-5xl lg:text-6xl leading-[1.05] text-text-primary mb-6">
          Cơ hội tiếp theo của bạn đang đến.{' '}
          <span className="text-gold-400">Đừng để nó bất ngờ.</span>
        </h2>
        <p className="text-text-muted text-lg leading-relaxed mb-10 max-w-xl mx-auto">
          Bắt đầu miễn phí. Không cần thẻ tín dụng. Chỉ cần 30 phút đầu tiên để
          cảm nhận sự khác biệt mà một buổi luyện tập đúng cách mang lại.
        </p>
        <Link to="/setup">
          <Button variant="primary" size="lg" className="px-10">
            Bắt đầu phiên đầu tiên
            <ArrowRight className="w-4 h-4" aria-hidden />
          </Button>
        </Link>
        <p className="mt-5 text-xs text-text-muted">
          Được tin dùng bởi ứng viên tại các công ty công nghệ, tài chính, và
          tư vấn hàng đầu Việt Nam.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                              */
/* ------------------------------------------------------------------ */

function Footer() {
  return (
    <footer className="bg-navy-950 border-t border-navy-800 pt-14 pb-8 px-5 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-10 border-b border-navy-800">
          {/* Brand column */}
          <div className="lg:col-span-2 max-w-sm">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-4">
              <img src="/logo.png" alt="" className="w-8 h-8 object-contain" />
              <span className="font-serif font-semibold tracking-tight text-gold-400 text-xl">
                CareerPulse
              </span>
            </Link>
            <p className="text-sm text-text-muted leading-relaxed">
              Nền tảng luyện phỏng vấn với AI dành cho ứng viên tham vọng —
              nơi mỗi phiên luyện tập đưa bạn đến gần hơn với vị trí mơ ước.
            </p>
            <div className="mt-6 flex items-center gap-3 text-xs text-text-muted">
              <ShieldCheck className="w-4 h-4 text-gold-400" aria-hidden />
              <span>Bảo mật doanh nghiệp · ISO-ready</span>
            </div>
          </div>

          {/* Sản phẩm */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-400 mb-4">
              Sản phẩm
            </h4>
            <ul className="space-y-2.5 text-sm">
              {[
                ['Tính năng', '#arena'],
                ['Phương pháp', '#methodology'],
                ['Gói dịch vụ', '#pricing'],
                ['Câu chuyện thành công', '#'],
              ].map(([label, href]) => (
                <li key={label}>
                  <a
                    href={href}
                    className="text-text-muted hover:text-gold-400 transition-colors"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Công ty */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-400 mb-4">
              Công ty
            </h4>
            <ul className="space-y-2.5 text-sm">
              {[
                'Về chúng tôi',
                'Blog',
                'Điều khoản sử dụng',
                'Chính sách bảo mật',
                'Liên hệ',
              ].map((label) => (
                <li key={label}>
                  <a
                    href="#"
                    className="text-text-muted hover:text-gold-400 transition-colors"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted/80">
          <p>© 2024 CareerPulse AI Coach. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-gold-400" aria-hidden />
            Made in Vietnam, for ambitious candidates everywhere.
          </p>
        </div>
      </div>
    </footer>
  );
}
