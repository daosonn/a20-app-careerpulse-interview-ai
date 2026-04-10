import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { FormattedText } from '../components/FormattedText';

interface SessionData {
  id: string;
  jobDescription: string;
  interviewType: string;
  language: string;
  predictedQuestions: string[];
  summary?: string;
  keyTakeaways?: string[];
}

interface InterviewTurn {
  id: string;
  turnOrder: number;
  question: string;
  answer: string;
  evaluation?: {
    scores: {
      relevance: number;
      structure: number;
      specificity: number;
      clarity: number;
      confidence: number;
    };
    starAnalysis: {
      situation: string;
      task: string;
      action: string;
      result: string;
    };
    feedback: string;
    betterVersion: string;
  };
}

export function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [session, setSession] = useState<SessionData | null>(null);
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!id || !user) return;
      try {
        const docRef = doc(db, 'interview_sessions', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setSession(docSnap.data() as SessionData);
        }

        const q = query(
          collection(db, 'interview_turns'),
          where('sessionId', '==', id),
          where('userId', '==', user.uid)
        );
        const turnsSnap = await getDocs(q);
        const loadedTurns = turnsSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as InterviewTurn))
          .sort((a, b) => a.turnOrder - b.turnOrder);
        console.log(`[SessionDetail] Loaded ${loadedTurns.length} turns for session ${id}`);
        setTurns(loadedTurns);

      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `interview_sessions/${id}`);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, user]);

  if (loading) {
    return <div className="animate-pulse text-slate-500">Đang tải dữ liệu phiên...</div>;
  }

  if (!session) {
    return <div>Không tìm thấy phiên phỏng vấn.</div>;
  }

  // Calculate average score
  let avgScore = 0;
  if (turns.length > 0) {
    const totalScores = turns.reduce((acc, turn) => {
      if (!turn.evaluation) return acc;
      const s = turn.evaluation.scores;
      return acc + (s.relevance + s.structure + s.specificity + s.clarity + s.confidence) / 5;
    }, 0);
    avgScore = totalScores / turns.filter(t => t.evaluation).length;
  }
  // Language-aware labels
  const isVi = session.language === 'vi';
  const t = {
    backToDashboard: isVi ? 'Quay lại Dashboard' : 'Back to Dashboard',
    badge: isVi ? 'Phân tích sau phỏng vấn' : 'Post-Interview Analysis',
    title: isVi ? 'Kết quả Phỏng vấn' : 'Interview Result',
    subtitle: isVi ? 'Tuyệt vời! Bạn đã hoàn thành phiên phỏng vấn. Dưới đây là phân tích chi tiết về hiệu suất của bạn để giúp bạn cải thiện.' : 'Great job! You have completed the interview session. Below is a detailed analysis of your performance to help you improve.',
    outOf5: isVi ? 'Trên 5' : 'Out of 5',
    overviewTitle: isVi ? 'Tổng quan buổi phỏng vấn' : 'Interview Overview',
    keyTakeaways: isVi ? 'Điểm cần chú ý' : 'Key Takeaways',
    questionsDetail: isVi ? 'Chi tiết các câu hỏi' : 'Question Details',
    noQuestions: isVi ? 'Phiên này chưa có câu hỏi nào được trả lời.' : 'No questions were answered in this session.',
    evalTitle: isVi ? 'Đánh giá chi tiết' : 'Detailed Evaluation',
    starTitle: isVi ? 'Phân tích STAR:' : 'STAR Analysis:',
    feedbackLabel: isVi ? 'Nhận xét:' : 'Feedback:',
    betterVersion: isVi ? 'Phiên bản tốt hơn:' : 'Better Version:',
    goToDashboard: isVi ? 'Về Dashboard' : 'Go to Dashboard',
  };
  const scoreLabel = (key: string) => {
    const map: Record<string, [string, string]> = {
      relevance: ['Liên quan', 'Relevance'],
      structure: ['Cấu trúc', 'Structure'],
      specificity: ['Chi tiết', 'Specificity'],
      clarity: ['Rõ ràng', 'Clarity'],
      confidence: ['Tự tin', 'Confidence'],
    };
    return map[key]?.[isVi ? 0 : 1] || key;
  };
  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-[#434654] hover:text-[#003fb1] transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" />
        {t.backToDashboard}
      </Link>


      {/* Header Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end mb-16">
        <div className="md:col-span-8">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#eaddff] text-[#5a00c6] text-xs font-bold tracking-widest uppercase mb-4">{t.badge}</span>
          <h1 className="font-extrabold text-5xl md:text-6xl text-[#191c1d] tracking-tight">{t.title}</h1>
          <p className="mt-4 text-[#434654] text-lg max-w-xl leading-relaxed">
            {t.subtitle}
          </p>
        </div>
        
        {/* Large Score Display */}
        {turns.length > 0 && !isNaN(avgScore) && (
          <div className="md:col-span-4 flex justify-center md:justify-end">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-[12px] border-[#e7e8e9] opacity-20"></div>
              <div className="absolute inset-0 rounded-full border-[12px] border-transparent border-t-[#7127e5] border-r-[#7127e5] border-b-[#7127e5] opacity-90 transform rotate-12"></div>
              <div className="bg-white shadow-2xl rounded-full w-40 h-40 flex flex-col items-center justify-center z-10 border border-[#c3c5d7]/10">
                <span className="text-5xl font-extrabold text-[#191c1d]">{avgScore.toFixed(1)}</span>
                <span className="text-sm font-bold text-[#737686] tracking-wider uppercase">{t.outOf5}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Section */}
      {(session.summary || session.keyTakeaways) && (
        <div className="mb-16 bg-white rounded-2xl border border-[#c3c5d7]/20 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-[#f3f4f5] bg-[#f8f9fa]">
            <h2 className="font-bold text-[#191c1d] text-2xl mb-4">{t.overviewTitle}</h2>
            {session.summary && (
              <p className="text-[#434654] leading-relaxed text-lg">{session.summary}</p>
            )}
          </div>
          {session.keyTakeaways && session.keyTakeaways.length > 0 && (
            <div className="p-8">
              <h3 className="font-bold text-[#191c1d] text-xl mb-4">{t.keyTakeaways}</h3>
              <ul className="space-y-3">
                {session.keyTakeaways.map((takeaway, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-[#003fb1] flex-shrink-0 mt-0.5" />
                    <span className="text-[#434654] leading-relaxed">{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="space-y-12">
        <h2 className="font-bold text-[#191c1d] text-2xl">{t.questionsDetail} ({turns.length})</h2>
        
        {turns.length === 0 ? (
          <p className="text-[#434654] italic">{t.noQuestions}</p>
        ) : (
          turns.map((turn, index) => (
            <div key={turn.id} className="bg-white rounded-2xl border border-[#c3c5d7]/20 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-[#f3f4f5] bg-[#f8f9fa]">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#191c1d] flex items-center justify-center flex-shrink-0 text-white text-sm font-bold shadow-md">
                    Q{index + 1}
                  </div>
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
                    <h4 className="font-bold text-[#191c1d] text-xl">{t.evalTitle}</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    {Object.entries(turn.evaluation.scores || {}).map(([key, score]) => (
                      <div key={key} className="bg-[#f8f9fa] p-4 rounded-xl text-center border border-[#c3c5d7]/20 transition-transform hover:scale-105">
                        <div className="text-xs font-bold text-[#737686] uppercase tracking-wider mb-2">{scoreLabel(key)}</div>
                        <div className="font-extrabold text-[#191c1d] text-2xl">{score}/5</div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-6">
                    {/* STAR Analysis */}
                    {turn.evaluation.starAnalysis && (
                      <div className="bg-[#f3f4f5] p-6 rounded-xl">
                        <strong className="text-[#191c1d] block mb-4 font-bold text-lg">{t.starTitle}</strong>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="bg-white p-4 rounded-lg border border-[#c3c5d7]/10">
                            <span className="inline-block font-bold text-[#003fb1] text-xs uppercase tracking-wider mb-1">Situation</span>
                            <p className="text-[#434654] leading-relaxed text-sm">{turn.evaluation.starAnalysis.situation}</p>
                          </div>
                          <div className="bg-white p-4 rounded-lg border border-[#c3c5d7]/10">
                            <span className="inline-block font-bold text-[#003fb1] text-xs uppercase tracking-wider mb-1">Task</span>
                            <p className="text-[#434654] leading-relaxed text-sm">{turn.evaluation.starAnalysis.task}</p>
                          </div>
                          <div className="bg-white p-4 rounded-lg border border-[#c3c5d7]/10">
                            <span className="inline-block font-bold text-[#003fb1] text-xs uppercase tracking-wider mb-1">Action</span>
                            <p className="text-[#434654] leading-relaxed text-sm">{turn.evaluation.starAnalysis.action}</p>
                          </div>
                          <div className="bg-white p-4 rounded-lg border border-[#c3c5d7]/10">
                            <span className="inline-block font-bold text-[#003fb1] text-xs uppercase tracking-wider mb-1">Result</span>
                            <p className="text-[#434654] leading-relaxed text-sm">{turn.evaluation.starAnalysis.result}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Feedback */}
                    <div className="bg-[#fffbeb] p-6 rounded-xl border border-[#f59e0b]/10">
                      <strong className="text-[#191c1d] block mb-3 font-bold text-lg">{t.feedbackLabel}</strong>
                      <FormattedText text={turn.evaluation.feedback} className="text-sm text-[#434654]" />
                    </div>

                    {/* Better Version */}
                    <div className="bg-[#dbe1ff] p-6 rounded-xl border border-[#003fb1]/10 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-10">
                        <Sparkles className="w-16 h-16 text-[#003fb1]" />
                      </div>
                      <strong className="text-[#003fb1] block mb-3 font-bold text-lg relative z-10">{t.betterVersion}</strong>
                      <FormattedText text={turn.evaluation.betterVersion} className="text-sm text-[#00174d] italic relative z-10" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-16 flex justify-center">
        <Link to="/dashboard" className="bg-[#191c1d] text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-[#434654] transition-colors shadow-lg active:scale-95">
          {t.goToDashboard}
        </Link>
      </div>
    </div>
  );
}

