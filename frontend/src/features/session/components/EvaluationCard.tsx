import { Loader2, Sparkles, Lightbulb, MessageSquareText } from 'lucide-react';
import { FormattedText } from '../../../components/FormattedText';
import { InterviewTurn } from '../types';

interface Props {
  turn: InterviewTurn;
  isProcessing: boolean;
  isVi: boolean;
}

const STAR_STEPS = ['situation', 'task', 'action', 'result'] as const;

export function EvaluationCard({ turn, isProcessing, isVi }: Props) {
  const t = {
    feedbackTitle: isVi ? 'Phản hồi & Đánh giá' : 'Feedback & Evaluation',
    starTitle: isVi ? 'Phân tích STAR' : 'STAR Analysis',
    feedbackLabel: isVi ? 'Nhận xét' : 'Feedback',
    betterVersion: isVi ? 'Phiên bản tốt hơn' : 'Better Version',
    analyzing: isVi
      ? 'AI đang phân tích câu trả lời...'
      : 'AI is analyzing your answer...',
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

  const starLabel = (step: typeof STAR_STEPS[number]) => {
    const map: Record<string, [string, string]> = {
      situation: ['Situation', 'Situation'],
      task: ['Task', 'Task'],
      action: ['Action', 'Action'],
      result: ['Result', 'Result'],
    };
    return map[step]?.[isVi ? 0 : 1] || step;
  };

  // ----- Loading skeleton -----
  if (!turn.evaluation && isProcessing && turn.id.startsWith('temp-')) {
    return (
      <div className="ml-14 mr-14 bg-navy-800 border border-gold-500/25 rounded-2xl p-6 animate-pulse">
        <div className="flex items-center gap-2 mb-5">
          <Loader2 className="w-4 h-4 text-gold-400 animate-spin" aria-hidden />
          <span className="text-sm font-semibold text-text-muted tracking-wide">
            {t.analyzing}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-3 mb-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-navy-700 h-16 rounded-lg" />
          ))}
        </div>
        <div className="bg-navy-700 h-24 rounded-lg mb-3" />
        <div className="bg-navy-700 h-16 rounded-lg" />
      </div>
    );
  }

  if (!turn.evaluation) return null;

  return (
    <div className="ml-14 mr-14 bg-navy-800 border border-gold-500/40 rounded-2xl p-6 relative overflow-hidden animate-fadeInUp shadow-[0_0_24px_-12px_rgba(201,169,97,0.25)]">
      <div className="absolute top-0 right-0 p-2 opacity-[0.04]" aria-hidden>
        <Sparkles className="w-20 h-20 text-gold-400" />
      </div>

      <div className="flex items-center gap-2.5 mb-5 relative z-10">
        <span className="inline-flex w-8 h-8 rounded-full bg-gold-500/15 border border-gold-500/40 items-center justify-center">
          <Sparkles className="w-4 h-4 text-gold-400" aria-hidden />
        </span>
        <h4 className="font-serif text-lg text-text-primary leading-tight">
          {t.feedbackTitle}
        </h4>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6 relative z-10">
        {Object.entries(turn.evaluation.scores || {}).map(([key, score]) => (
          <div
            key={key}
            className="bg-navy-700 border border-navy-600 rounded-xl px-3 py-3 text-center transition-colors hover:border-gold-500/50"
          >
            <div className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1.5">
              {scoreLabel(key)}
            </div>
            <div className="font-serif text-2xl text-gold-400 leading-none">
              {score}
              <span className="text-sm text-text-muted">/5</span>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-5 text-sm relative z-10">
        {turn.evaluation.starAnalysis && (
          <div className="bg-navy-700/60 border border-navy-600 rounded-xl p-5">
            <strong className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-400 block mb-3">
              {t.starTitle}
            </strong>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {STAR_STEPS.map((step) => (
                <div
                  key={step}
                  className="bg-navy-800 border border-navy-600 rounded-lg p-3"
                >
                  <span className="inline-block font-semibold text-gold-300 text-[10px] uppercase tracking-widest mb-1.5">
                    {starLabel(step)}
                  </span>
                  <p className="text-text-primary leading-relaxed text-sm">
                    {(turn.evaluation!.starAnalysis as any)[step]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-navy-700/60 border border-navy-600 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquareText className="w-4 h-4 text-gold-400" aria-hidden />
            <strong className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-400">
              {t.feedbackLabel}
            </strong>
          </div>
          <FormattedText
            text={turn.evaluation.feedback}
            className="text-text-primary leading-relaxed"
          />
        </div>

        <div className="bg-gold-500/[0.08] border border-gold-500/40 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-gold-400" aria-hidden />
            <strong className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-400">
              {t.betterVersion}
            </strong>
          </div>
          <FormattedText
            text={turn.evaluation.betterVersion}
            className="text-text-primary italic leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}
