import { Fragment, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, LogOut, Mic, Sparkles, UsersRound } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../auth';
import { useInterviewSession } from '../hooks/useInterviewSession';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useSpeech } from '../hooks/useSpeech';
import { SessionControls } from './SessionControls';
import { Button } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import { CurrentQuestionBar } from './CurrentQuestionBar';
import { StressGauge } from './StressGauge';
import { CandidatePreview } from './CandidatePreview';
import { BackgroundSelector, BackgroundTheme, BACKGROUND_OPTIONS } from './BackgroundSelector';

// ─── Interviewer personas (mapped to the 3 people in background.png) ─────────

interface InterviewerMeta {
  id: string;
  name: string;
  role: string;
  accentColor: string;
  /** horizontal anchor — maps to left / center / right person in the photo */
  column: 'left' | 'center' | 'right';
}

const INTERVIEWERS: InterviewerMeta[] = [
  { id: 'hr',   name: 'Ms. Linh',   role: 'HR Interviewer',      accentColor: '#22d3ee', column: 'left'   },
  { id: 'lead', name: 'Mr. Hung',   role: 'Hiring Manager',      accentColor: '#E8C77A', column: 'center' },
  { id: 'tech', name: 'Ms. Nguyen', role: 'Technical Evaluator', accentColor: '#a78bfa', column: 'right'  },
];

// Dynamic positioning per background theme
const BG_POSITIONS: Record<BackgroundTheme, Record<InterviewerMeta['column'], string>> = {
  classic: {
    left:   'left-[calc(14%+150px)]  -translate-x-1/2  bottom-[calc(41%-20px)]',
    center: 'left-1/2                -translate-x-1/2  bottom-[41%]',
    right:  'right-[calc(14%+150px)] translate-x-1/2   bottom-[calc(41%-20px)]',
  },
  executive: {
    left:   'left-[25%] -translate-x-1/2 bottom-[45%]',
    center: 'left-1/2   -translate-x-1/2 bottom-[45%]',
    right:  'right-[25%] translate-x-1/2 bottom-[45%]',
  },
  creative: {
    left:   'left-[25%] -translate-x-1/2 bottom-[45%]',
    center: 'left-1/2   -translate-x-1/2 bottom-[45%]',
    right:  'right-[25%] translate-x-1/2 bottom-[45%]',
  }
};

function InterviewerBadge({
  iv,
  isActive,
  isSpeaking,
  bgTheme,
}: {
  iv: InterviewerMeta;
  isActive: boolean;
  isSpeaking: boolean;
  bgTheme: BackgroundTheme;
}) {
  const speaking = isActive && isSpeaking;

  return (
    <div
      className={cn(
        'absolute z-10 flex flex-col items-center gap-1 transition-all duration-500',
        BG_POSITIONS[bgTheme] ? BG_POSITIONS[bgTheme][iv.column] : BG_POSITIONS.classic[iv.column],
      )}
    >
      {/* Soft face-glow for the active speaker */}
      {speaking && (
        <motion.div
          animate={{ opacity: [0.18, 0.38, 0.18] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute -top-32 h-40 w-40 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${iv.accentColor}70, transparent 70%)` }}
        />
      )}

      {/* Name / role pill — always fully lit */}
      <div
        className="flex items-center gap-1.5 rounded-full border bg-navy-950/75 px-3 py-1.5 backdrop-blur-md transition-all duration-300"
        style={{
          borderColor: `${iv.accentColor}80`,
          boxShadow: speaking
            ? `0 0 22px ${iv.accentColor}45`
            : `0 0 8px ${iv.accentColor}18`,
        }}
      >
        {/* Mic icon: waveform when speaking, static mic otherwise */}
        {speaking ? (
          <div className="flex items-center gap-[2px]">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="w-[2px] rounded-full"
                style={{ backgroundColor: iv.accentColor }}
                animate={{ height: [3, 9, 3] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}
              />
            ))}
          </div>
        ) : (
          <Mic size={9} style={{ color: `${iv.accentColor}99` }} />
        )}

        <div className="text-center leading-tight">
          <p className="font-headline text-[10px] font-bold text-text-primary">
            {iv.name}
          </p>
          <p
            className="font-headline text-[8px] uppercase tracking-wider"
            style={{ color: `${iv.accentColor}CC` }}
          >
            {iv.role}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreFromLastEvaluation(turns: ReturnType<typeof useInterviewSession>['turns']) {
  const last = [...turns].reverse().find((t) => t.evaluation?.scores);
  if (!last?.evaluation?.scores) return null;
  const s = last.evaluation.scores;
  return (s.relevance + s.structure + s.specificity + s.clarity + s.confidence) / 5;
}

function getActiveInterviewerId(phase: number | string): string {
  const p = String(phase);
  if (p.includes('Introduction') || p.includes('Motivation') || p.includes('HR')) return 'hr';
  if (p.includes('Technical')) return 'tech';
  return 'lead';
}

function computeStressLevel(
  isStressTest: boolean,
  isProcessing: boolean,
  isRecording: boolean,
  audioLevel: number,
): number {
  const base = isStressTest ? 68 : isProcessing ? 55 : isRecording ? 50 : 28;
  return Math.min(100, base + Math.min(10, audioLevel / 10));
}

// ─── Interview Feed sidebar (xl screens) ──────────────────────────────────────

function TranscriptPanel({
  turns,
  isVi,
}: {
  turns: ReturnType<typeof useInterviewSession>['turns'];
  isVi: boolean;
}) {
  return (
    <aside className="hidden xl:flex w-68 shrink-0 flex-col rounded-[1.6rem] border border-cyan-300/15 bg-navy-950/62 p-4 backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-gold-300" aria-hidden />
        <h2 className="font-headline text-[10px] font-bold uppercase tracking-widest text-gold-300">
          {isVi ? 'Dòng phỏng vấn' : 'Interview Feed'}
        </h2>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {turns.length === 0 ? (
          <p className="text-sm text-text-muted">
            {isVi
              ? 'Câu trả lời của bạn sẽ xuất hiện ở đây.'
              : 'Your answers will appear here.'}
          </p>
        ) : (
          turns.slice(-5).map((turn, i) => (
            <article key={turn.id} className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
              <p className="mb-1.5 font-headline text-[10px] font-bold uppercase tracking-widest text-cyan-300/70">
                Q{Math.max(1, turns.length - 4 + i)}
              </p>
              <p className="line-clamp-2 text-xs text-text-muted">{turn.question}</p>
              <p className="mt-1.5 line-clamp-3 text-sm text-text-primary">{turn.answer}</p>
              {/* Score display (Commented out as requested)
              {turn.evaluation?.scores && (
                <p className="mt-2 font-headline text-xs font-semibold text-gold-300">
                  Score:{' '}
                  {(
                    (turn.evaluation.scores.relevance +
                      turn.evaluation.scores.structure +
                      turn.evaluation.scores.specificity +
                      turn.evaluation.scores.clarity +
                      turn.evaluation.scores.confidence) /
                    5
                  ).toFixed(1)}
                  /5
                </p>
              )}
              */}
            </article>
          ))
        )}
      </div>
    </aside>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function InterviewRoom() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { speakText, stopSpeaking } = useSpeech();

  const {
    session,
    turns,
    loading,
    currentQuestion,
    currentTip,
    isProcessing,
    error,
    currentPhase,
    currentQuestionType,
    activeAttempt,
    planStatus,
    gateReason,
    questionProgress,
    submitAnswer,
    endSession,
  } = useInterviewSession(id, speakText);

  const {
    isRecording,
    recordingState,
    audioUrl,
    transcript,
    audioLevel,
    error: recorderError,
    audioBlob,
    recordingDurationMs,
    maxDurationMs,
    silenceMs,
    silenceStopMs,
    permissionState,
    startRecording,
    stopRecording,
    resetRecording,
    setTranscript,
  } = useAudioRecorder(session?.language || 'vi');

  useEffect(() => () => stopSpeaking(), [stopSpeaking]);

  const [isEnding, setIsEnding] = useState(false);

  const [bgTheme, setBgTheme] = useState<BackgroundTheme>(() => {
    return (localStorage.getItem('interview_bg') as BackgroundTheme) || 'classic';
  });

  const handleBgChange = (theme: BackgroundTheme) => {
    setBgTheme(theme);
    localStorage.setItem('interview_bg', theme);
  };

  const handleEndSession = async () => {
    setIsEnding(true);
    try {
      await endSession();
    } finally {
      setIsEnding(false);
    }
  };

  // ── States ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-9 w-9 animate-spin text-gold-400" aria-hidden />
          <p className="font-headline text-sm tracking-wide text-text-muted">
            Đang chuẩn bị phòng phỏng vấn...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-950 px-6 text-center">
        <div className="max-w-md">
          <h2 className="mb-3 font-serif text-2xl text-gold-400">
            {error ? 'Không tải được phiên phỏng vấn' : 'Không tìm thấy phiên phỏng vấn'}
          </h2>
          <p className="text-sm leading-relaxed text-text-muted">
            {error ||
              'Phiên này có thể đã bị xóa hoặc không còn hợp lệ. Vui lòng quay lại và bắt đầu phiên mới.'}
          </p>
          <Link to="/setup" className="mt-6 inline-block font-headline text-sm text-cyan-300 hover:text-cyan-200">
            Tạo lại phiên phỏng vấn
          </Link>
          <Link to="/dashboard" className="ml-5 mt-6 inline-block font-headline text-sm text-cyan-300 hover:text-cyan-200">
            ← Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const isVi = session.language === 'vi';
  const lastScore = scoreFromLastEvaluation(turns);
  const candidateName = user?.displayName || (isVi ? 'Ứng viên' : 'Candidate');
  const activeInterviewerId = getActiveInterviewerId(currentPhase);
  const stressLevel = computeStressLevel(!!session.isStressTest, isProcessing, isRecording, audioLevel);
  const questionIndex = Math.max(1, questionProgress.index || turns.filter((turn) => !turn.isWarmup).length + 1);
  const totalQuestions = Math.max(session.questionCount || questionProgress.total || session.predictedQuestions?.length || 5, 1);

  const handleSubmit = (text: string) => {
    submitAnswer(text, audioBlob, audioUrl);
    resetRecording();
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,.09),transparent_38%),linear-gradient(180deg,#061624_0%,#0b1628_50%,#050a12_100%)] font-sans text-text-primary antialiased">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 font-headline text-[10px] font-bold uppercase tracking-widest text-cyan-300/55 transition-colors hover:text-cyan-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          {isVi ? 'Bảng điều khiển' : 'Dashboard'}
        </Link>

        <div className="text-center">
          <p className="font-headline text-[9px] font-bold uppercase tracking-[0.44em] text-gold-400/65">
            The Arena
          </p>
          <h1 className="font-headline text-lg font-bold uppercase tracking-[0.18em] text-text-primary drop-shadow-[0_0_20px_rgba(34,211,238,.32)] sm:text-2xl">
            Panel Interview Simulation
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <BackgroundSelector currentTheme={bgTheme} onChange={handleBgChange} isVi={isVi} />
          <Button variant="secondary" size="sm" onClick={handleEndSession} disabled={isEnding}>
            {isEnding ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <LogOut className="h-4 w-4" aria-hidden />
            )}
            {isEnding
              ? (isVi ? 'Đang xử lý...' : 'Processing...')
              : (isVi ? 'Kết thúc' : 'End')}
          </Button>
        </div>
      </header>

      {/* ── Main layout ──────────────────────────────────────────────────────── */}
      <main className="flex h-[calc(100vh-68px)] flex-col gap-2.5 px-4 pb-3 sm:px-6">

        {/* Stage row + sidebar */}
        <div className="flex min-h-0 flex-1 gap-2.5">

          {/* ── Simulation Stage ──────────────────────────────────────────── */}
          <section
            className={cn(
              'relative min-h-0 flex-1 overflow-hidden rounded-[2rem] border bg-slate-900',
              'border-cyan-400/32 shadow-[0_0_56px_rgba(34,211,238,.12),0_0_110px_rgba(34,211,238,.05),inset_0_0_0_1px_rgba(34,211,238,.06)]',
            )}
          >
            {/* ── Boardroom photo background ────────────────────────────── */}
            <img
              src={
                bgTheme === 'classic'
                  ? (isVi ? '/background_vi.png' : '/background.png')
                  : BACKGROUND_OPTIONS.find((o) => o.id === bgTheme)?.url || '/background.png'
              }
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            {/* Top vignette — keeps question bar & badges readable */}
            <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-navy-950/88 via-navy-950/45 to-transparent" />
            {/* Bottom vignette — keeps gauge / camera / metrics readable */}
            <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-navy-950/90 via-navy-950/55 to-transparent" />
            {/* Subtle side darkening */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(5,10,18,0.35)_100%)]" />
            {/* Cyan HUD tint on border glow */}
            <div className="absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-cyan-400/20" />

            {/* ── Current Question Bar ────────────────────────────────── */}
            <CurrentQuestionBar
              question={currentQuestion}
              isProcessing={isProcessing}
              isVi={isVi}
              questionIndex={questionIndex}
              totalQuestions={totalQuestions}
              questionType={String(currentPhase) || session.interviewType}
              tip={currentTip}
              isWarmup={currentQuestionType === 'warmup'}
              planStatus={planStatus}
              attempt={activeAttempt}
              gateReason={gateReason}
            />

            {/* ── Interview type badge — top left ─────────────────────── */}
            <div className="absolute left-5 top-4 z-20">
              <div className="flex items-center gap-2 rounded-full border border-gold-400/28 bg-navy-950/62 px-3 py-1.5 backdrop-blur-md">
                <UsersRound className="h-3.5 w-3.5 text-gold-300" aria-hidden />
                <span className="font-headline text-[10px] font-bold uppercase tracking-wider text-gold-300/90">
                  {session.interviewType}
                </span>
              </div>
            </div>

            {/* ── Score / phase badge — top right ─────────────────────── */}
            <div className="absolute right-5 top-4 z-20">
              <div className="rounded-full border border-cyan-300/22 bg-navy-950/62 px-3 py-1.5 backdrop-blur-md">
                <span className="font-headline text-[10px] font-bold text-cyan-300/75">
                  {lastScore
                    ? `Score: ${lastScore.toFixed(1)}/5`
                    : `Phase: ${String(currentPhase || 'Introduction')}`}
                </span>
              </div>
            </div>

            {/* ── Interviewer name badges (hover over each person) ──── */}
            {INTERVIEWERS.map((iv) => (
              <Fragment key={iv.id}>
                <InterviewerBadge
                  iv={iv}
                  isActive={iv.id === activeInterviewerId}
                  isSpeaking={isProcessing}
                  bgTheme={bgTheme}
                />
              </Fragment>
            ))}

            {/* ── Live transcript (while recording) ───────────────────── */}
            {isRecording && transcript && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-[10.5rem] left-1/2 z-20 w-[min(44rem,68%)] -translate-x-1/2 rounded-2xl border border-gold-400/28 bg-navy-950/72 px-4 py-3 backdrop-blur-xl"
              >
                <p className="mb-1 font-headline text-[9px] font-bold uppercase tracking-widest text-gold-300">
                  Live Transcript
                </p>
                <p className="line-clamp-3 text-sm text-text-primary">{transcript}</p>
              </motion.div>
            )}


            {/* ── Stress gauge — bottom left ──────────────────────────── */}
            <StressGauge level={stressLevel} isVi={isVi} />

            {/* ── Candidate camera — bottom right ─────────────────────── */}
            <CandidatePreview
              name={candidateName}
              photoURL={user?.photoURL}
              isRecording={isRecording}
              isVi={isVi}
            />
          </section>

          {/* ── Interview feed sidebar (xl+) ─────────────────────────────── */}
          <TranscriptPanel turns={turns} isVi={isVi} />
        </div>

        {/* ── Recording controls ───────────────────────────────────────────── */}
        <SessionControls
          isProcessing={isProcessing}
          isRecording={isRecording}
          recordingState={recordingState}
          audioUrl={audioUrl}
          transcript={transcript}
          audioLevel={audioLevel}
          error={error || recorderError}
          isVi={isVi}
          recordingDurationMs={recordingDurationMs}
          maxDurationMs={maxDurationMs}
          silenceMs={silenceMs}
          silenceStopMs={silenceStopMs}
          permissionState={permissionState}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onReRecord={resetRecording}
          onSubmit={handleSubmit}
          onTranscriptChange={setTranscript}
        />
      </main>
    </div>
  );
}
