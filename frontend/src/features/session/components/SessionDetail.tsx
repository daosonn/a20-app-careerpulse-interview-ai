import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../auth';
import { apiUrl } from '../../../lib/api';
import {
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Lightbulb,
  MessageSquareText,
  TrendingUp,
  TrendingDown,
  Loader2,
} from 'lucide-react';
import { FormattedText } from '../../../components/FormattedText';
import {
  Card,
  Badge,
  Button,
  ScoreRing,
  SectionHeading,
} from '../../../components/ui';
import { SessionData, InterviewTurn } from '../types';

type CompetencyKey =
  | 'relevance'
  | 'structure'
  | 'specificity'
  | 'clarity'
  | 'confidence';

const COMPETENCY_LABELS: Record<CompetencyKey, [string, string]> = {
  relevance: ['Liên quan', 'Relevance'],
  structure: ['Cấu trúc', 'Structure'],
  specificity: ['Chi tiết', 'Specificity'],
  clarity: ['Rõ ràng', 'Clarity'],
  confidence: ['Tự tin', 'Confidence'],
};

const STAR_STEPS: Array<'situation' | 'task' | 'action' | 'result'> = [
  'situation',
  'task',
  'action',
  'result',
];

/* ------------------------------------------------------------------ */

export function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, authenticatedFetch } = useAuth();
  const [session, setSession] = useState<SessionData | null>(null);
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!id || !user) return;
      try {
        const response = await authenticatedFetch(apiUrl(`/api/v1/history/${id}`));
        if (!response.ok) throw new Error(`Session detail failed: ${response.status}`);

        const data = await response.json();
        setSession(data as SessionData);
        const loadedTurns = ((data.turns || []) as InterviewTurn[])
          .sort((a, b) => a.turnOrder - b.turnOrder);
        setTurns(loadedTurns);
      } catch (error) {
        console.error('Error loading session detail:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, user, authenticatedFetch]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-9 h-9 text-gold-400 animate-spin" aria-hidden />
          <p className="text-text-muted text-sm font-medium tracking-wide">
            Đang tải dữ liệu phiên...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="px-8 py-12 text-center">
        <h2 className="font-serif text-2xl text-gold-400 mb-2">
          Không tìm thấy phiên phỏng vấn
        </h2>
        <Link to="/dashboard">
          <Button variant="secondary" size="md" className="mt-4">
            Về Bảng điều khiển
          </Button>
        </Link>
      </div>
    );
  }

  const isVi = session.language === 'vi';
  const t = {
    back: isVi ? 'Bảng điều khiển' : 'Dashboard',
    kicker: isVi ? 'Phân tích sau phỏng vấn' : 'Post-interview debrief',
    title: isVi ? 'Kết quả phỏng vấn' : 'Interview Debrief',
    subtitle: isVi
      ? 'Tuyệt vời! Bạn đã hoàn thành phiên phỏng vấn. Dưới đây là phân tích chi tiết về hiệu suất để giúp bạn cải thiện.'
      : 'Great job! You have completed the interview. Below is a detailed analysis of your performance.',
    overviewTitle: isVi ? 'Tổng quan buổi phỏng vấn' : 'Session Overview',
    keyTakeaways: isVi ? 'Điểm cần chú ý' : 'Key Takeaways',
    strengths: isVi ? 'Điểm mạnh' : 'Strengths',
    growth: isVi ? 'Cần cải thiện' : 'Areas for Growth',
    questionsDetail: isVi ? 'Chi tiết câu hỏi' : 'Question Breakdown',
    noQuestions: isVi
      ? 'Phiên này chưa có câu hỏi nào được trả lời.'
      : 'No questions were answered in this session.',
    yourResponse: isVi ? 'Câu trả lời của bạn' : 'Your Response',
    starTitle: isVi ? 'Phân tích STAR' : 'STAR Analysis',
    feedbackLabel: isVi ? 'Nhận xét' : 'Feedback',
    betterVersion: isVi ? 'Phiên bản tốt hơn' : 'Elevate Standard',
    goToDashboard: isVi ? 'Về Bảng điều khiển' : 'Go to Dashboard',
    readinessLabel: isVi ? 'Chỉ số sẵn sàng' : 'Readiness',
    warmup: isVi ? 'Khởi động' : 'Warm-up',
    needsClarification: isVi ? 'Cần làm rõ' : 'Needs clarification',
    evaluating: isVi ? 'Đang phân tích STAR cho câu trả lời này...' : 'Analyzing STAR feedback for this answer...',
  };

  const scoreLabel = (key: string) =>
    COMPETENCY_LABELS[key as CompetencyKey]?.[isVi ? 0 : 1] || key;
  const starLabel = (step: string) => step.charAt(0).toUpperCase() + step.slice(1);

  // Compute session-level averages.
  const scoredTurns = turns.filter((t) => t.evaluation);
  let avgScore = 0;
  const competencySums: Record<CompetencyKey, number> = {
    relevance: 0,
    structure: 0,
    specificity: 0,
    clarity: 0,
    confidence: 0,
  };
  if (scoredTurns.length > 0) {
    let totalWeight = 0;
    const totals = scoredTurns.reduce((acc, turn) => {
      const s = turn.evaluation!.scores;
      const weight = turn.isWarmup ? 0.25 : 1;
      totalWeight += weight;
      competencySums.relevance += s.relevance * weight;
      competencySums.structure += s.structure * weight;
      competencySums.specificity += s.specificity * weight;
      competencySums.clarity += s.clarity * weight;
      competencySums.confidence += s.confidence * weight;
      return acc + ((s.relevance + s.structure + s.specificity + s.clarity + s.confidence) / 5) * weight;
    }, 0);
    avgScore = totalWeight ? totals / totalWeight : 0;
  }
  const readinessPct = Math.round((avgScore / 5) * 100);

  const perCompetencyAvg: Array<{ key: CompetencyKey; score: number }> = (
    Object.keys(competencySums) as CompetencyKey[]
  ).map((key) => ({
    key,
    score: scoredTurns.length
      ? competencySums[key] / scoredTurns.reduce((sum, turn) => sum + (turn.isWarmup ? 0.25 : 1), 0)
      : 0,
  }));
  const sortedByScore = [...perCompetencyAvg].sort((a, b) => b.score - a.score);
  const strengths = sortedByScore.slice(0, 2);
  const growth = sortedByScore.slice(-2).reverse();

  return (
    <div className="font-sans">
      {/* ---------- Hero (navy) ---------- */}
      <section className="bg-navy-950 px-4 sm:px-8 lg:px-12 pt-8 pb-14">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-gold-400 transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
          {t.back}
        </Link>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center max-w-6xl">
          <SectionHeading
            label={t.kicker}
            title={
              scoredTurns.length > 0 ? (
                <>
                  {isVi ? 'Bạn đã sẵn sàng' : 'You are'}{' '}
                  <span className="text-gold-400">
                    {readinessPct}%{isVi ? '' : ' ready'}
                  </span>
                  {isVi ? ' cho vòng phỏng vấn tiếp theo.' : '.'}
                </>
              ) : (
                t.title
              )
            }
            subtitle={t.subtitle}
            size="lg"
          />
          {scoredTurns.length > 0 && (
            <div className="flex justify-center lg:justify-end">
              <ScoreRing
                value={avgScore}
                max={5}
                size={200}
                suffix="/5"
                label={t.readinessLabel}
              />
            </div>
          )}
        </div>

        {/* Strengths / Growth */}
        {scoredTurns.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4 mt-10 max-w-6xl">
            <Card variant="highlighted" padding="md">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="inline-flex w-8 h-8 rounded-full bg-gold-500/15 border border-gold-500/40 items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-gold-400" aria-hidden />
                </span>
                <h3 className="font-serif text-lg text-text-primary">
                  {t.strengths}
                </h3>
              </div>
              <ul className="space-y-2">
                {strengths.map((s) => (
                  <li
                    key={s.key}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-text-primary">{scoreLabel(s.key)}</span>
                    <span className="font-serif text-lg text-gold-400">
                      {s.score.toFixed(1)}
                      <span className="text-xs text-text-muted">/5</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card variant="dark" padding="md">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="inline-flex w-8 h-8 rounded-full bg-status-warning/15 border border-status-warning/40 items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-status-warning" aria-hidden />
                </span>
                <h3 className="font-serif text-lg text-text-primary">
                  {t.growth}
                </h3>
              </div>
              <ul className="space-y-2">
                {growth.map((g) => (
                  <li
                    key={g.key}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-text-primary">{scoreLabel(g.key)}</span>
                    <span className="font-serif text-lg text-status-warning">
                      {g.score.toFixed(1)}
                      <span className="text-xs text-text-muted">/5</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}

        {/* Overview + Takeaways */}
        {(session.summary ||
          (session.keyTakeaways && session.keyTakeaways.length > 0)) && (
          <div className="mt-10 max-w-6xl">
            <Card variant="dark" padding="lg">
              <h2 className="font-serif text-2xl text-text-primary mb-3">
                {t.overviewTitle}
              </h2>
              {session.summary && (
                <FormattedText
                  text={session.summary}
                  className="text-text-muted text-sm"
                />
              )}
              {session.keyTakeaways && session.keyTakeaways.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-400 mb-3">
                    {t.keyTakeaways}
                  </h3>
                  <ul className="space-y-2.5">
                    {session.keyTakeaways.map((takeaway, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle2
                          className="w-4 h-4 text-gold-400 shrink-0 mt-1"
                          aria-hidden
                        />
                        <span className="text-text-primary leading-relaxed text-sm">
                          {takeaway}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </div>
        )}
      </section>

      {/* ---------- Q&A body (cream) ---------- */}
      <section className="bg-cream-100 text-text-dark px-4 sm:px-8 lg:px-12 py-14">
        <div className="max-w-6xl">
          <div className="mb-8 flex items-end justify-between flex-wrap gap-3">
            <h2 className="font-serif text-3xl text-text-dark leading-tight">
              {t.questionsDetail}
            </h2>
            <Badge variant="gold-outline" className="border-gold-600/60 text-gold-600">
              {turns.length} {isVi ? 'câu hỏi' : 'questions'}
            </Badge>
          </div>

          {turns.length === 0 ? (
            <p className="text-text-dark/60 italic">{t.noQuestions}</p>
          ) : (
            <div className="space-y-6">
              {turns.map((turn, index) => (
                <article
                  key={turn.id}
                  className="rounded-2xl overflow-hidden border border-cream-200 bg-cream-50"
                >
                  {/* Q header — navy strip */}
                  <header className="bg-navy-800 text-text-primary px-6 py-5 flex items-start gap-4">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-gold-500/15 border border-gold-500/40 flex items-center justify-center font-serif text-gold-400 text-sm">
                      Q{index + 1}
                    </div>
                    <p className="font-serif text-lg leading-snug text-text-primary flex-1">
                      {turn.question}
                    </p>
                    <div className="flex flex-col items-end gap-2">
                      {turn.isWarmup && (
                        <Badge variant="gold-outline" size="sm">
                          {t.warmup}
                        </Badge>
                      )}
                      {turn.gateResult && !turn.gateResult.pass && (
                        <Badge variant="warning" size="sm">
                          {t.needsClarification}
                        </Badge>
                      )}
                    </div>
                  </header>

                  {/* Answer */}
                  <div className="px-6 py-5 border-b border-cream-200">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-600 mb-2">
                      {t.yourResponse}
                    </p>
                    <p className="text-text-dark leading-relaxed whitespace-pre-wrap">
                      {turn.answer}
                    </p>
                  </div>

                  {/* Evaluation */}
                  {!turn.evaluation && turn.evaluationStatus === 'pending' && (
                    <div className="px-6 py-6 bg-cream-50">
                      <div className="flex items-center gap-3 rounded-xl border border-cream-200 bg-white px-4 py-4 text-text-dark/70">
                        <Loader2 className="w-4 h-4 animate-spin text-gold-600" aria-hidden />
                        <span className="text-sm font-medium">{t.evaluating}</span>
                      </div>
                    </div>
                  )}

                  {turn.evaluation && (
                    <div className="px-6 py-6 space-y-5 bg-cream-50">
                      {/* Scores */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {Object.entries(turn.evaluation.scores || {}).map(
                          ([key, score]) => (
                            <div
                              key={key}
                              className="bg-white border border-cream-200 rounded-xl px-3 py-3 text-center"
                            >
                              <div className="text-[10px] font-semibold uppercase tracking-widest text-text-dark/60 mb-1.5">
                                {scoreLabel(key)}
                              </div>
                              <div className="font-serif text-2xl text-gold-600 leading-none">
                                {score}
                                <span className="text-sm text-text-dark/60">/5</span>
                              </div>
                            </div>
                          ),
                        )}
                      </div>

                      {/* STAR */}
                      {turn.evaluation.starAnalysis && (
                        <div className="bg-white border border-cream-200 rounded-xl p-5">
                          <strong className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-600 block mb-3">
                            {t.starTitle}
                          </strong>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {STAR_STEPS.map((step) => (
                              <div
                                key={step}
                                className="bg-cream-50 border border-cream-200 rounded-lg p-3"
                              >
                                <span className="inline-block font-semibold text-gold-600 text-[10px] uppercase tracking-widest mb-1.5">
                                  {starLabel(step)}
                                </span>
                                <p className="text-text-dark leading-relaxed text-sm">
                                  {(turn.evaluation!.starAnalysis as any)[step]}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Feedback */}
                      <div className="bg-white border border-cream-200 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquareText
                            className="w-4 h-4 text-gold-600"
                            aria-hidden
                          />
                          <strong className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-600">
                            {t.feedbackLabel}
                          </strong>
                        </div>
                        <FormattedText
                          text={turn.evaluation.feedback}
                          className="text-text-dark leading-relaxed text-sm"
                        />
                      </div>

                      {/* Better version — gold band */}
                      <div className="bg-gold-500/10 border border-gold-600/40 rounded-xl p-5 relative overflow-hidden">
                        <div
                          className="absolute top-2 right-2 opacity-[0.08]"
                          aria-hidden
                        >
                          <Sparkles className="w-16 h-16 text-gold-600" />
                        </div>
                        <div className="flex items-center gap-2 mb-2 relative z-10">
                          <Lightbulb
                            className="w-4 h-4 text-gold-600"
                            aria-hidden
                          />
                          <strong className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-600">
                            {t.betterVersion}
                          </strong>
                        </div>
                        <FormattedText
                          text={turn.evaluation.betterVersion}
                          className="text-text-dark italic leading-relaxed text-sm relative z-10"
                        />
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------- Footer CTA ---------- */}
      <section className="bg-navy-950 px-4 sm:px-8 lg:px-12 py-12 text-center">
        <Link to="/dashboard" className="inline-block">
          <Button variant="primary" size="lg">
            {t.goToDashboard}
          </Button>
        </Link>
      </section>
    </div>
  );
}
