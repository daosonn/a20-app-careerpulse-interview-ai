import { useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useInterviewSession } from '../hooks/useInterviewSession';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useSpeech } from '../hooks/useSpeech';
import { InterviewHeader } from './InterviewHeader';
import { ChatHistory } from './ChatHistory';
import { SessionControls } from './SessionControls';

/**
 * The Arena — full-viewport live interview screen.
 *
 * Routed outside of <Layout> so it claims the entire viewport (no sidebar).
 * The sub-components own their visual treatment; this file only composes.
 */
export function InterviewRoom() {
  const { id } = useParams<{ id: string }>();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { speakText, stopSpeaking } = useSpeech();

  const {
    session,
    turns,
    loading,
    currentQuestion,
    isProcessing,
    error,
    currentPhase,
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
    startRecording,
    stopRecording,
    resetRecording,
    setTranscript,
  } = useAudioRecorder(session?.language || 'vi');

  // Auto-scroll on new turns or transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, currentQuestion, transcript]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => stopSpeaking();
  }, [stopSpeaking]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-950 font-sans">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-9 h-9 text-gold-400 animate-spin" aria-hidden />
          <p className="text-text-muted text-sm font-medium tracking-wide">
            Đang chuẩn bị phòng phỏng vấn...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-950 font-sans text-center px-6">
        <div className="max-w-md">
          <h2 className="font-serif text-2xl text-gold-400 mb-3">
            Không tìm thấy phiên phỏng vấn
          </h2>
          <p className="text-text-muted text-sm leading-relaxed">
            Phiên này có thể đã bị xóa hoặc không còn hợp lệ. Vui lòng quay lại
            bảng điều khiển và bắt đầu phiên mới.
          </p>
        </div>
      </div>
    );
  }

  const isVi = session.language === 'vi';

  const handleSubmit = (text: string) => {
    submitAnswer(text, audioBlob, audioUrl);
    resetRecording();
  };

  return (
    <div className="min-h-screen h-screen w-full bg-navy-950 text-text-primary font-sans antialiased flex flex-col">
      <InterviewHeader
        session={session}
        currentPhase={currentPhase}
        onEndSession={endSession}
        isVi={isVi}
      />

      <ChatHistory
        turns={turns}
        currentQuestion={currentQuestion}
        isRecording={isRecording}
        transcript={transcript}
        isProcessing={isProcessing}
        isVi={isVi}
        scrollRef={scrollRef}
      />

      <SessionControls
        isProcessing={isProcessing}
        isRecording={isRecording}
        recordingState={recordingState}
        audioUrl={audioUrl}
        transcript={transcript}
        audioLevel={audioLevel}
        error={error || recorderError}
        isVi={isVi}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        onReRecord={resetRecording}
        onSubmit={handleSubmit}
        onTranscriptChange={setTranscript}
      />
    </div>
  );
}
