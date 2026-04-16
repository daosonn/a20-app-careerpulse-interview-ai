import React from 'react';
import { Mic, Sparkles, User } from 'lucide-react';
import { InterviewTurn } from '../types';
import { EvaluationCard } from './EvaluationCard';

interface Props {
  turns: InterviewTurn[];
  currentQuestion: string;
  isRecording: boolean;
  transcript: string;
  isProcessing: boolean;
  isVi: boolean;
  currentTip?: string;
  scrollRef: React.RefObject<HTMLDivElement>;
}

/* ------------------------------------------------------------------ */
/*  Bubble sub-components                                              */
/* ------------------------------------------------------------------ */

function AiAvatar() {
  return (
    <div className="w-10 h-10 rounded-full bg-gold-500/15 border border-gold-500/50 flex items-center justify-center shrink-0">
      <Sparkles className="w-4 h-4 text-gold-400" aria-hidden />
    </div>
  );
}

function UserAvatar({ recording }: { recording?: boolean }) {
  return (
    <div
      className={
        'w-10 h-10 rounded-full bg-navy-700 border border-navy-600 flex items-center justify-center shrink-0 ' +
        (recording ? 'animate-gold-pulse' : '')
      }
    >
      {recording ? (
        <Mic className="w-4 h-4 text-gold-400" aria-hidden />
      ) : (
        <User className="w-4 h-4 text-text-muted" aria-hidden />
      )}
    </div>
  );
}

function AiBubble({ children, tip }: { children: React.ReactNode, tip?: string }) {
  return (
    <div className="flex gap-4">
      <AiAvatar />
      <div className="bg-navy-800 border border-gold-500/20 rounded-2xl rounded-tl-none px-5 py-4 max-w-[85%] shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
        <div className="text-text-primary leading-relaxed whitespace-pre-wrap">
          {children}
        </div>
        {tip && (
          <div className="mt-3 flex items-start gap-1.5">
            <span className="bg-navy-600/60 text-gold-300 text-[10px] font-bold px-2 py-0.5 rounded border border-navy-500 uppercase tracking-wider shrink-0">
              Tip
            </span>
            <span className="text-xs text-text-muted italic">
              {tip}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function UserBubble({
  children,
  audioUrl,
  isVi,
  ghost,
  recording,
}: {
  children: React.ReactNode;
  audioUrl?: string;
  isVi?: boolean;
  ghost?: boolean;
  recording?: boolean;
}) {
  return (
    <div className="flex gap-4 flex-row-reverse">
      <UserAvatar recording={recording} />
      <div
        className={
          'bg-navy-700 border border-navy-600 rounded-2xl rounded-tr-none px-5 py-4 max-w-[85%] ' +
          (ghost ? 'opacity-75' : '')
        }
      >
        {audioUrl && (
          <div className="mb-3">
            <span className="text-[10px] font-semibold text-gold-400 uppercase tracking-widest block mb-1.5">
              {isVi ? 'Bản ghi âm' : 'Recording'}
            </span>
            <audio
              src={audioUrl}
              controls
              className="w-full h-8 accent-gold-500 [accent-color:theme(colors.gold.500)]"
              style={{ accentColor: 'var(--color-gold-500)' }}
            />
          </div>
        )}
        <div className="text-text-primary leading-relaxed whitespace-pre-wrap">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main                                                                */
/* ------------------------------------------------------------------ */

export function ChatHistory({
  turns,
  currentQuestion,
  isRecording,
  transcript,
  isProcessing,
  isVi,
  currentTip,
  scrollRef,
}: Props) {
  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto bg-navy-950 px-4 sm:px-8 py-8"
    >
      <div className="max-w-5xl mx-auto space-y-8">
        {turns.map((turn) => (
          <div key={turn.id} className="space-y-6">
            <AiBubble tip={turn.tip}>{turn.question}</AiBubble>
            <UserBubble audioUrl={turn.audioUrl} isVi={isVi}>
              {turn.answer}
            </UserBubble>
            <EvaluationCard turn={turn} isProcessing={isProcessing} isVi={isVi} />
          </div>
        ))}

        {currentQuestion && <AiBubble tip={currentTip}>{currentQuestion}</AiBubble>}

        {isRecording && transcript && (
          <UserBubble ghost recording>
            {transcript}
          </UserBubble>
        )}
      </div>
    </div>
  );
}
