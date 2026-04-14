import React from 'react';
import { Mic } from 'lucide-react';
import { InterviewTurn } from '../types';
import { EvaluationCard } from './EvaluationCard';

interface Props {
  turns: InterviewTurn[];
  currentQuestion: string;
  isRecording: boolean;
  transcript: string;
  isProcessing: boolean;
  isVi: boolean;
  scrollRef: React.RefObject<HTMLDivElement>;
}

export function ChatHistory({ 
  turns, 
  currentQuestion, 
  isRecording, 
  transcript, 
  isProcessing, 
  isVi, 
  scrollRef 
}: Props) {
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-[#f8f9fa]">
      {turns.map((turn) => (
        <div key={turn.id} className="space-y-6">
          {/* AI Question */}
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-[#191c1d] flex items-center justify-center flex-shrink-0 shadow-md">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
            <div className="bg-white p-5 rounded-2xl rounded-tl-none border border-[#c3c5d7]/20 shadow-sm max-w-[85%]">
              <p className="text-[#191c1d] leading-relaxed">{turn.question}</p>
            </div>
          </div>

          {/* User Answer */}
          <div className="flex gap-4 flex-row-reverse">
            <div className="w-10 h-10 rounded-full bg-[#003fb1] flex items-center justify-center flex-shrink-0 shadow-md">
              <span className="text-white text-xs font-bold">You</span>
            </div>
            <div className="bg-[#dbe1ff] p-5 rounded-2xl rounded-tr-none border border-[#003fb1]/10 max-w-[85%]">
              {turn.audioUrl && (
                <div className="mb-3">
                  <span className="text-xs font-bold text-[#003fb1]/60 block mb-1">
                    {isVi ? 'Bản ghi âm:' : 'Recording:'}
                  </span>
                  <audio src={turn.audioUrl} controls className="w-full h-8" />
                </div>
              )}
              <p className="text-[#00174d] leading-relaxed">{turn.answer}</p>
            </div>
          </div>

          <EvaluationCard turn={turn} isProcessing={isProcessing} isVi={isVi} />
        </div>
      ))}

      {/* Current Question */}
      {currentQuestion && (
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-[#191c1d] flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="text-white text-xs font-bold">AI</span>
          </div>
          <div className="bg-white p-5 rounded-2xl rounded-tl-none border border-[#c3c5d7]/20 shadow-sm max-w-[85%]">
            <p className="text-[#191c1d] leading-relaxed">{currentQuestion}</p>
          </div>
        </div>
      )}

      {/* Live Transcript */}
      {isRecording && transcript && (
        <div className="flex gap-4 flex-row-reverse">
          <div className="w-10 h-10 rounded-full bg-[#003fb1] flex items-center justify-center flex-shrink-0 animate-pulse shadow-md">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div className="bg-[#dbe1ff] p-5 rounded-2xl rounded-tr-none border border-[#003fb1]/10 max-w-[85%] opacity-80">
            <p className="text-[#00174d] leading-relaxed">{transcript}</p>
          </div>
        </div>
      )}
    </div>
  );
}
