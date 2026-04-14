import React, { useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useInterviewSession } from '../hooks/useInterviewSession';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useSpeech } from '../hooks/useSpeech';
import { InterviewHeader } from './InterviewHeader';
import { ChatHistory } from './ChatHistory';
import { SessionControls } from './SessionControls';

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
    setError
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
    setError: setRecorderError
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

  if (loading) return <div className="p-8 text-center animate-pulse">Loading...</div>;
  if (!session) return <div className="p-8 text-center text-red-500">Session not found.</div>;

  const isVi = session.language === 'vi';

  const handleSubmit = (text: string) => {
    submitAnswer(text, audioBlob, audioUrl);
    resetRecording();
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-5rem)] flex flex-col bg-white rounded-2xl border border-[#c3c5d7]/20 shadow-lg overflow-hidden">
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
