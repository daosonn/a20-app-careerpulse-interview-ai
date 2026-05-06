import { motion } from 'motion/react';
import { Lightbulb, RotateCcw } from 'lucide-react';

interface Props {
  question: string;
  isProcessing: boolean;
  isVi: boolean;
  questionIndex: number;
  totalQuestions: number;
  questionType: string;
  tip?: string;
  isWarmup?: boolean;
  planStatus?: 'pending' | 'ready' | 'failed';
  attempt?: number;
  gateReason?: string;
  onRepeat?: () => void;
}

export function CurrentQuestionBar({
  question,
  isProcessing,
  isVi,
  questionIndex,
  totalQuestions,
  questionType,
  tip,
  isWarmup = false,
  planStatus = 'pending',
  attempt = 0,
  gateReason = '',
  onRepeat,
}: Props) {
  const questionTypeLabel =
    questionType === 'candidate_qa'
      ? isVi ? 'Hỏi đáp cuối buổi' : 'Candidate Q&A'
      : questionType;
  const displayText =
    question ||
    (isProcessing
      ? isVi ? 'Đang chuẩn bị câu hỏi tiếp theo...' : 'Preparing next question...'
      : isVi ? 'Sẵn sàng bắt đầu.' : 'Get ready to begin.');

  return (
    <div className="absolute left-1/2 top-4 z-20 w-[min(72rem,76%)] -translate-x-1/2">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="rounded-2xl border border-cyan-300/28 bg-navy-950/72 px-5 py-3.5 shadow-[0_0_28px_rgba(34,211,238,.15)] backdrop-blur-xl"
      >
        {/* Top row */}
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
            <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-cyan-300/80">
              {isVi ? 'Câu hỏi hiện tại' : 'Current Question'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {planStatus === 'pending' && (
              <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-0.5 font-headline text-[10px] font-bold uppercase tracking-wider text-cyan-200">
                {isVi ? 'Đang lập kế hoạch' : 'Planning'}
              </span>
            )}
            {attempt > 0 && (
              <span className="rounded-full border border-status-warning/35 bg-status-warning/10 px-2.5 py-0.5 font-headline text-[10px] font-bold uppercase tracking-wider text-status-warning">
                {isVi ? `Làm rõ ${attempt}` : `Clarify ${attempt}`}
              </span>
            )}
            <span className="rounded-full border border-gold-400/35 bg-gold-400/10 px-2.5 py-0.5 font-headline text-[10px] font-bold uppercase tracking-wider text-gold-300">
              {isWarmup ? (isVi ? 'Khởi động' : 'Warm-up') : questionTypeLabel}
            </span>
            {/* Progress */}
            {!isWarmup && (
              <span className="rounded-full border border-cyan-300/22 bg-cyan-300/8 px-2.5 py-0.5 font-headline text-[10px] text-cyan-300/65">
                {questionIndex} / {totalQuestions}
              </span>
            )}
            {/* Repeat button */}
            {onRepeat && (
              <button
                onClick={onRepeat}
                className="flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-0.5 font-headline text-[10px] uppercase tracking-wider text-text-muted transition-colors hover:border-cyan-300/40 hover:text-cyan-300"
              >
                <RotateCcw size={9} />
                {isVi ? 'Lặp lại' : 'Repeat'}
              </button>
            )}
          </div>
        </div>

        {/* Question text */}
        <p className="font-serif text-sm leading-relaxed text-text-primary sm:text-[15px]">
          {displayText}
        </p>

        {/* Tip (Commented out as requested)
        {tip && (
          <div className="mt-2 flex items-start gap-1.5">
            <Lightbulb size={11} className="mt-0.5 shrink-0 text-gold-400/60" />
            <p className="font-headline text-[11px] text-cyan-200/55">{tip}</p>
          </div>
        )}
        */}

        {/* GateReason (Commented out as requested)
        {gateReason && attempt > 0 && (
          <div className="mt-2 rounded-xl border border-status-warning/25 bg-status-warning/10 px-3 py-2">
            <p className="font-headline text-[11px] text-status-warning">
              {isVi ? 'Cần làm rõ: ' : 'Needs clarification: '}
              {gateReason}
            </p>
          </div>
        )}
        */}
      </motion.div>
    </div>
  );
}
