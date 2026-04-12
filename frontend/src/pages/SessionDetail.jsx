import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import FormattedText from '../components/FormattedText';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function SessionDetail() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [turns, setTurns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Lấy từ sessionStorage trước (vừa hoàn thành), rồi fallback sang backend
    const raw = sessionStorage.getItem(`session_${id}`);
    if (raw) {
      const s = JSON.parse(raw);
      setSession(s);
      setTurns(s.turns || []);
      setLoading(false);
      return;
    }

    // Fallback: lấy từ backend nếu có backendId
    async function fetchFromBackend() {
      try {
        const res = await fetch(`${API_URL}/api/v1/history/${id}`);
        if (res.ok) {
          const data = await res.json();
          setSession(data);
          // Backend trả về transcript dạng [{role, content}] → chuyển thành turns
          const msgs = data.transcript || [];
          const evals = data.evaluations || [];
          const convertedTurns = [];
          for (let i = 0; i + 1 < msgs.length; i += 2) {
            convertedTurns.push({
              id: `t-${i}`,
              question: msgs[i]?.content || '',
              answer: msgs[i + 1]?.content || '',
              evaluation: evals[Math.floor(i / 2)] || null,
              turnOrder: Math.floor(i / 2) + 1,
            });
          }
          setTurns(convertedTurns);
        }
      } catch (err) {
        console.error('Cannot load session detail:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchFromBackend();
  }, [id]);

  if (loading) return <div className="animate-pulse text-[#434654] p-8">Đang tải dữ liệu phiên...</div>;
  if (!session) return <div className="p-8 text-red-500">Không tìm thấy phiên phỏng vấn.</div>;

  const isVi = session.language === 'vi';

  // Calculate avg score
  const scoredTurns = turns.filter(t => t.evaluation?.scores);
  let avgScore = 0;
  if (scoredTurns.length > 0) {
    const total = scoredTurns.reduce((acc, t) => {
      const s = t.evaluation.scores;
      return acc + (s.relevance + s.structure + s.specificity + s.clarity + s.confidence) / 5;
    }, 0);
    avgScore = total / scoredTurns.length;
  }

  const scoreLabel = (key) => ({
    relevance: ['Liên quan', 'Relevance'],
    structure: ['Cấu trúc', 'Structure'],
    specificity: ['Chi tiết', 'Specificity'],
    clarity: ['Rõ ràng', 'Clarity'],
    confidence: ['Tự tin', 'Confidence'],
  })[key]?.[isVi ? 0 : 1] || key;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-[#434654] hover:text-[#003fb1] transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" />
        {isVi ? 'Quay lại Dashboard' : 'Back to Dashboard'}
      </Link>

      {/* Header */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end mb-16">
        <div className="md:col-span-8">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#eaddff] text-[#5a00c6] text-xs font-bold tracking-widest uppercase mb-4">
            {isVi ? 'Phân tích sau phỏng vấn' : 'Post-Interview Analysis'}
          </span>
          <h1 className="font-extrabold text-5xl md:text-6xl text-[#191c1d] tracking-tight">
            {isVi ? 'Kết quả Phỏng vấn' : 'Interview Result'}
          </h1>
          <p className="mt-4 text-[#434654] text-lg max-w-xl leading-relaxed">
            {isVi ? 'Tuyệt vời! Bạn đã hoàn thành phiên phỏng vấn. Dưới đây là phân tích chi tiết hiệu suất của bạn.' : 'Great job! Here is a detailed analysis of your performance.'}
          </p>
        </div>

        {scoredTurns.length > 0 && !isNaN(avgScore) && (
          <div className="md:col-span-4 flex justify-center md:justify-end">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-[12px] border-[#e7e8e9] opacity-20" />
              <div className="absolute inset-0 rounded-full border-[12px] border-transparent border-t-[#7127e5] border-r-[#7127e5] border-b-[#7127e5] opacity-90 transform rotate-12" />
              <div className="bg-white shadow-2xl rounded-full w-40 h-40 flex flex-col items-center justify-center z-10 border border-[#c3c5d7]/10">
                <span className="text-5xl font-extrabold text-[#191c1d]">{avgScore.toFixed(1)}</span>
                <span className="text-sm font-bold text-[#737686] tracking-wider uppercase">{isVi ? 'Trên 5' : 'Out of 5'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary / Feedback */}
      {(session.summary || session.final_report) && (
        <div className="mb-16 bg-white rounded-2xl border border-[#c3c5d7]/20 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-[#f3f4f5] bg-[#f8f9fa]">
            <h2 className="font-bold text-[#191c1d] text-2xl mb-4">{isVi ? 'Tổng quan buổi phỏng vấn' : 'Interview Overview'}</h2>
            <p className="text-[#434654] leading-relaxed text-lg">{session.summary || session.final_report}</p>
          </div>
          {session.keyTakeaways?.length > 0 && (
            <div className="p-8">
              <h3 className="font-bold text-[#191c1d] text-xl mb-4">{isVi ? 'Điểm cần chú ý' : 'Key Takeaways'}</h3>
              <ul className="space-y-3">
                {session.keyTakeaways.map((k, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-[#003fb1] flex-shrink-0 mt-0.5" />
                    <span className="text-[#434654] leading-relaxed">{k}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Turns */}
      <div className="space-y-12">
        <h2 className="font-bold text-[#191c1d] text-2xl">{isVi ? 'Chi tiết các câu hỏi' : 'Question Details'} ({turns.length})</h2>

        {turns.length === 0 ? (
          <p className="text-[#434654] italic">{isVi ? 'Chưa có câu hỏi nào được trả lời.' : 'No questions answered.'}</p>
        ) : turns.map((turn, index) => (
          <div key={turn.id} className="bg-white rounded-2xl border border-[#c3c5d7]/20 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[#f3f4f5] bg-[#f8f9fa]">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-[#191c1d] flex items-center justify-center flex-shrink-0 text-white text-sm font-bold shadow-md">Q{index + 1}</div>
                <p className="text-[#191c1d] font-bold text-lg mt-1">{turn.question}</p>
              </div>
            </div>
            <div className="p-6 border-b border-[#f3f4f5]">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-[#003fb1] flex items-center justify-center flex-shrink-0 text-white text-sm font-bold shadow-md">
                  {isVi ? 'Bạn' : 'You'}
                </div>
                <p className="text-[#434654] mt-1 leading-relaxed">{turn.answer}</p>
              </div>
            </div>

            {turn.evaluation && (
              <div className="p-6 bg-white">
                <div className="flex items-center gap-2 mb-6">
                  <AlertCircle className="w-6 h-6 text-[#8b4aff]" />
                  <h4 className="font-bold text-[#191c1d] text-xl">{isVi ? 'Đánh giá chi tiết' : 'Detailed Evaluation'}</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                  {Object.entries(turn.evaluation.scores || {}).map(([key, score]) => (
                    <div key={key} className="bg-[#f8f9fa] p-4 rounded-xl text-center border border-[#c3c5d7]/20 hover:scale-105 transition-transform">
                      <div className="text-xs font-bold text-[#737686] uppercase tracking-wider mb-2">{scoreLabel(key)}</div>
                      <div className="font-extrabold text-[#191c1d] text-2xl">{score}/5</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-6">
                  {turn.evaluation.starAnalysis && (
                    <div className="bg-[#f3f4f5] p-6 rounded-xl">
                      <strong className="text-[#191c1d] block mb-4 font-bold text-lg">{isVi ? 'Phân tích STAR:' : 'STAR Analysis:'}</strong>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {['situation', 'task', 'action', 'result'].map(k => (
                          <div key={k} className="bg-white p-4 rounded-lg border border-[#c3c5d7]/10">
                            <span className="font-bold text-[#003fb1] text-xs uppercase tracking-wider block mb-1">{k}</span>
                            <p className="text-[#434654] text-sm leading-relaxed">{turn.evaluation.starAnalysis[k]}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {turn.evaluation.feedback && (
                    <div className="bg-[#fffbeb] p-6 rounded-xl border border-[#f59e0b]/10">
                      <strong className="text-[#191c1d] block mb-3 font-bold text-lg">{isVi ? 'Nhận xét:' : 'Feedback:'}</strong>
                      <FormattedText text={turn.evaluation.feedback} className="text-sm text-[#434654]" />
                    </div>
                  )}
                  {turn.evaluation.betterVersion && (
                    <div className="bg-[#dbe1ff] p-6 rounded-xl border border-[#003fb1]/10 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-10"><Sparkles className="w-16 h-16 text-[#003fb1]" /></div>
                      <strong className="text-[#003fb1] block mb-3 font-bold text-lg relative z-10">{isVi ? 'Phiên bản tốt hơn:' : 'Better Version:'}</strong>
                      <FormattedText text={turn.evaluation.betterVersion} className="text-sm text-[#00174d] italic relative z-10" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-16 flex justify-center">
        <Link to="/dashboard" id="btn-back-to-dashboard" className="bg-[#191c1d] text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-[#434654] transition-colors shadow-lg active:scale-95">
          {isVi ? 'Về Dashboard' : 'Go to Dashboard'}
        </Link>
      </div>
    </div>
  );
}
