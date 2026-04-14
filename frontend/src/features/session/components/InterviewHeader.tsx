import React from 'react';
import { INTERVIEW_PHASES } from '../../../lib/gemini';
import { SessionData } from '../types';

interface Props {
  session: SessionData;
  currentPhase: number;
  onEndSession: () => void;
  isVi: boolean;
}

export function InterviewHeader({ session, currentPhase, onEndSession, isVi }: Props) {
  const roomTitle = isVi ? 'Phòng Phỏng Vấn' : 'Interview Room';
  const endSessionLabel = isVi ? 'Kết thúc phỏng vấn' : 'End Interview';
  const phaseLabel = isVi ? 'Giai đoạn' : 'Phase';

  return (
    <div className="bg-[#191c1d] text-white p-5 flex justify-between items-center relative">
      <div>
        <h2 className="font-bold text-xl flex items-center gap-2">
          {roomTitle}
          {session.isStressTest && (
            <span className="text-xs bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
              Stress Test
            </span>
          )}
        </h2>
        <p className="text-sm text-slate-400 mt-1">{session.interviewType} • {session.jobDescription.split('\n')[0]}</p>
      </div>
      
      <div className="absolute left-1/2 -translate-x-1/2 bg-white/10 px-4 py-1.5 rounded-full border border-white/10 hidden md:flex items-center gap-2">
        <span className="text-xl">{INTERVIEW_PHASES[currentPhase - 1]?.icon}</span>
        <span className="text-sm font-bold text-white tracking-wide">
          {phaseLabel} {currentPhase}: {INTERVIEW_PHASES[currentPhase - 1]?.[isVi ? 'vi' : 'en']}
        </span>
      </div>

      <button onClick={onEndSession} className="text-sm font-bold bg-[#434654] hover:bg-[#737686] px-5 py-2.5 rounded-xl transition-colors">
        {endSessionLabel}
      </button>
    </div>
  );
}
