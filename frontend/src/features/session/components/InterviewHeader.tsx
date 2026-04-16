import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { INTERVIEW_PHASES } from '../constants';
import { SessionData } from '../types';
import { Badge, Button } from '../../../components/ui';

interface Props {
  session: SessionData;
  currentPhase: number;
  onEndSession: () => void;
  isVi: boolean;
}

export function InterviewHeader({
  session,
  currentPhase,
  onEndSession,
  isVi,
}: Props) {
  const roomTitle = isVi ? 'Phòng Phỏng Vấn' : 'Interview Room';
  const kicker = isVi ? 'The Arena — Phòng luyện tập' : 'The Arena — Coaching Room';
  const endSessionLabel = isVi ? 'Kết thúc' : 'End';
  const phaseLabel = isVi ? 'Giai đoạn' : 'Phase';
  const backLabel = isVi ? 'Bảng điều khiển' : 'Dashboard';

  const phaseMeta = INTERVIEW_PHASES[String(currentPhase)];
  const jdTitle = (session.jobDescription || '').split('\n')[0];

  return (
    <header className="relative bg-navy-950 border-b border-gold-500/25 px-4 sm:px-8 py-4 flex items-center gap-4">
      {/* Left — back link + title */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <Link
          to="/dashboard"
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-gold-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
          {backLabel}
        </Link>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold-400 mb-0.5 leading-none">
            {kicker}
          </p>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="font-serif text-xl sm:text-2xl text-text-primary leading-tight">
              {roomTitle}
            </h2>
            {session.isStressTest && (
              <Badge variant="error" size="sm">
                Stress Test
              </Badge>
            )}
          </div>
          <p className="text-xs text-text-muted mt-1 truncate">
            {session.interviewType}
            {jdTitle ? ` · ${jdTitle}` : ''}
          </p>
        </div>
      </div>

      {/* Center — phase pill (hidden on mobile) */}
      {phaseMeta && (
        <div className="hidden md:flex items-center gap-2 shrink-0 px-3.5 py-1.5 rounded-full border border-gold-500/40 bg-gold-500/5">
          <span className="text-base leading-none" aria-hidden>
            {phaseMeta.icon}
          </span>
          <span className="text-xs font-semibold text-gold-300 tracking-wide">
            {phaseLabel} {currentPhase}: {phaseMeta[isVi ? 'vi' : 'en']}
          </span>
        </div>
      )}

      {/* Right — end button */}
      <div className="shrink-0">
        <Button variant="secondary" size="sm" onClick={onEndSession}>
          {endSessionLabel}
        </Button>
      </div>
    </header>
  );
}
