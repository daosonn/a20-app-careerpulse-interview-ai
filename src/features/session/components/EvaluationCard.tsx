import React from 'react';
import { Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { FormattedText } from '../../../components/FormattedText';
import { InterviewTurn } from '../types';

interface Props {
  turn: InterviewTurn;
  isProcessing: boolean;
  isVi: boolean;
}

export function EvaluationCard({ turn, isProcessing, isVi }: Props) {
  const t = {
    feedbackTitle: isVi ? 'Phản hồi & Đánh giá' : 'Feedback & Evaluation',
    starTitle: isVi ? 'Phân tích STAR:' : 'STAR Analysis:',
    feedbackLabel: isVi ? 'Nhận xét:' : 'Feedback:',
    betterVersion: isVi ? 'Phiên bản tốt hơn:' : 'Better Version:',
    analyzing: isVi ? 'AI đang phân tích câu trả lời...' : 'AI is analyzing your answer...',
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

  if (!turn.evaluation && isProcessing && turn.id.startsWith('temp-')) {
    return (
      <div className="ml-14 mr-14 bg-white p-6 rounded-2xl border border-[#8b4aff]/20 shadow-sm animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <Loader2 className="w-5 h-5 text-[#8b4aff] animate-spin" />
          <span className="font-bold text-[#737686] text-sm">{t.analyzing}</span>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="bg-[#f3f4f5] h-16 rounded-xl"></div>
            ))}
          </div>
          <div className="bg-[#f3f4f5] h-24 rounded-xl"></div>
          <div className="bg-[#f3f4f5] h-16 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!turn.evaluation) return null;

  return (
    <div className="ml-14 mr-14 bg-white p-6 rounded-2xl border border-[#8b4aff]/20 shadow-sm relative overflow-hidden transition-all duration-500 ease-out animate-fadeInUp">
      <div className="absolute top-0 right-0 p-2 opacity-5">
        <Sparkles className="w-16 h-16 text-[#8b4aff]" />
      </div>
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <AlertCircle className="w-5 h-5 text-[#8b4aff]" />
        <h4 className="font-bold text-[#191c1d] text-lg">{t.feedbackTitle}</h4>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5 relative z-10">
        {Object.entries(turn.evaluation.scores || {}).map(([key, score]) => (
          <div key={key} className="bg-white p-3 rounded-xl text-center border border-[#c3c5d7]/50 shadow-sm transition-transform hover:scale-105">
            <div className="text-[10px] font-bold text-[#737686] uppercase tracking-wider mb-1">{scoreLabel(key)}</div>
            <div className="font-extrabold text-[#191c1d] text-xl">{score}/5</div>
          </div>
        ))}
      </div>

      <div className="space-y-5 text-sm relative z-10">
        {turn.evaluation.starAnalysis && (
          <div className="bg-[#f3f4f5] p-5 rounded-xl">
            <strong className="text-[#191c1d] block mb-3 font-bold text-base">{t.starTitle}</strong>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {['situation', 'task', 'action', 'result'].map((step) => (
                <div key={step} className="bg-white p-3 rounded-lg border border-[#c3c5d7]/10">
                  <span className="inline-block font-bold text-[#003fb1] text-xs uppercase tracking-wider mb-1">{step}</span>
                  <p className="text-[#434654] leading-relaxed text-sm">{(turn.evaluation!.starAnalysis as any)[step]}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-[#fffbeb] p-5 rounded-xl border border-[#f59e0b]/10">
          <strong className="text-[#191c1d] block mb-2 font-bold text-base">{t.feedbackLabel}</strong>
          <FormattedText text={turn.evaluation.feedback} className="text-[#434654]" />
        </div>

        <div className="bg-[#dbe1ff] p-5 rounded-xl border border-[#003fb1]/10">
          <strong className="text-[#003fb1] block mb-2 font-bold text-base">{t.betterVersion}</strong>
          <FormattedText text={turn.evaluation.betterVersion} className="text-[#00174d] italic" />
        </div>
      </div>
    </div>
  );
}
