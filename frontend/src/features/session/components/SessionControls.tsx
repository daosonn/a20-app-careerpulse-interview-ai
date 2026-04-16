import React, { useState } from 'react';
import { Mic, Square, RotateCcw, Send, Keyboard, Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface Props {
  isProcessing: boolean;
  isRecording: boolean;
  recordingState: 'idle' | 'recording' | 'reviewing';
  audioUrl: string | null;
  transcript: string;
  audioLevel: number;
  error: string;
  isVi: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onReRecord: () => void;
  onSubmit: (text: string) => void;
  onTranscriptChange: (text: string) => void;
}

export function SessionControls({
  isProcessing,
  isRecording: _isRecording, // retained for prop compat; state derived from recordingState
  recordingState,
  audioUrl,
  transcript,
  audioLevel,
  error,
  isVi,
  onStartRecording,
  onStopRecording,
  onReRecord,
  onSubmit,
  onTranscriptChange,
}: Props) {
  const [inputMode, setInputMode] = useState<'keyboard' | 'voice'>('keyboard');

  const t = {
    stopRecording: isVi ? 'Dừng thu âm' : 'Stop',
    reRecord: isVi ? 'Ghi âm lại' : 'Re-record',
    send: isVi ? 'Gửi' : 'Send',
    typePlaceholder: isVi
      ? 'Hoặc gõ câu trả lời của bạn vào đây...'
      : 'Or type your answer here...',
    listening: isVi ? 'Đang nghe...' : 'Listening...',
    recording: isVi ? 'Đang ghi âm' : 'Recording',
    noAudio: isVi ? '(Chưa nhận được âm thanh)' : '(No audio detected)',
    yourRecording: isVi ? 'Bản ghi âm của bạn' : 'Your recording',
    switchToKeyboard: isVi ? 'Chuyển sang bàn phím' : 'Switch to keyboard',
    switchToVoice: isVi ? 'Chuyển sang giọng nói' : 'Switch to voice',
  };

  const handleSend = () => {
    if ((transcript.trim() || audioUrl) && !isProcessing) {
      onSubmit(transcript);
    }
  };

  const handleToggleMode = () => {
    if (inputMode === 'keyboard') {
      setInputMode('voice');
      onStartRecording();
    } else {
      if (recordingState === 'recording') onStopRecording();
      setInputMode('keyboard');
      onReRecord();
    }
  };

  return (
    <div className="bg-navy-900 border-t border-gold-500/25 px-4 sm:px-8 py-4">
      <div className="max-w-5xl mx-auto">
        {error && (
          <div
            role="alert"
            className="mb-3 text-sm font-medium text-status-error text-center bg-status-error/10 border border-status-error/40 px-3 py-2 rounded-lg"
          >
            {error}
          </div>
        )}

        {/* Voice recording HUD */}
        {inputMode === 'voice' && recordingState === 'recording' && (
          <div className="mb-3 flex items-center justify-center gap-4 flex-wrap">
            <div className="flex items-end gap-[3px] h-6" aria-hidden>
              {[1, 2, 3, 4, 5].map((i) => {
                const active = audioLevel > i * 3;
                return (
                  <div
                    key={i}
                    className="w-1.5 rounded-full transition-all duration-100"
                    style={{
                      height: `${Math.max(
                        4,
                        Math.min(24, (audioLevel / 80) * 24 * (0.4 + i * 0.12)),
                      )}px`,
                      backgroundColor: active
                        ? 'var(--color-gold-500)'
                        : 'var(--color-navy-600)',
                      opacity: active ? 1 : 0.7,
                    }}
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-2 text-gold-400 text-sm font-semibold">
              <span
                className="w-2.5 h-2.5 rounded-full bg-gold-500 animate-gold-pulse"
                aria-hidden
              />
              {t.recording}
            </div>
            {audioLevel <= 1 && (
              <span className="text-xs text-text-muted">{t.noAudio}</span>
            )}
            <button
              onClick={onStopRecording}
              className="inline-flex items-center gap-1.5 bg-gold-500 hover:bg-gold-400 text-navy-950 px-4 py-2 rounded-full text-sm font-semibold transition-colors active:scale-[0.98]"
            >
              <Square className="w-3.5 h-3.5 fill-current" aria-hidden />
              {t.stopRecording}
            </button>
          </div>
        )}

        {/* Voice reviewing */}
        {inputMode === 'voice' && recordingState === 'reviewing' && (
          <div className="mb-3 p-4 bg-navy-800 rounded-xl border border-navy-600 flex flex-col gap-3">
            {audioUrl && (
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gold-400 block mb-1.5">
                  {t.yourRecording}
                </span>
                <audio
                  src={audioUrl}
                  controls
                  className="w-full h-10"
                  style={{ accentColor: 'var(--color-gold-500)' }}
                />
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={onReRecord}
                className="inline-flex items-center gap-1.5 border border-gold-500/60 text-gold-300 hover:bg-gold-500/10 hover:text-gold-400 px-4 py-2 rounded-full text-sm font-semibold transition-colors"
              >
                <RotateCcw className="w-4 h-4" aria-hidden />
                {t.reRecord}
              </button>
              <button
                onClick={handleSend}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 bg-gold-500 hover:bg-gold-400 text-navy-950 px-5 py-2 rounded-full text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="w-4 h-4" aria-hidden />
                )}
                {t.send}
              </button>
            </div>
          </div>
        )}

        {/* Main input bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={transcript}
              onChange={(e) => onTranscriptChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              className={cn(
                'w-full h-12 rounded-lg border pl-4 pr-12 text-sm font-medium outline-none transition-colors',
                'bg-navy-700 border-navy-600 text-text-primary placeholder:text-text-muted',
                'focus:border-gold-400 focus:ring-2 focus:ring-gold-400/40',
                'disabled:opacity-60 disabled:cursor-not-allowed',
              )}
              placeholder={
                inputMode === 'voice' && recordingState === 'recording'
                  ? t.listening
                  : t.typePlaceholder
              }
              disabled={isProcessing || recordingState === 'recording'}
              readOnly={inputMode === 'voice' && recordingState === 'recording'}
            />
            <button
              onClick={handleToggleMode}
              disabled={isProcessing}
              className={cn(
                'absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors disabled:opacity-50',
                inputMode === 'voice'
                  ? 'text-gold-400 hover:bg-gold-500/10'
                  : 'text-text-muted hover:bg-navy-600 hover:text-gold-400',
              )}
              title={
                inputMode === 'voice' ? t.switchToKeyboard : t.switchToVoice
              }
              aria-label={
                inputMode === 'voice' ? t.switchToKeyboard : t.switchToVoice
              }
            >
              {inputMode === 'voice' ? (
                <Keyboard className="w-5 h-5" aria-hidden />
              ) : (
                <Mic className="w-5 h-5" aria-hidden />
              )}
            </button>
          </div>

          <button
            onClick={handleSend}
            disabled={
              (!transcript.trim() && !audioUrl) ||
              isProcessing ||
              recordingState === 'recording'
            }
            className={cn(
              'inline-flex items-center justify-center h-12 w-12 rounded-lg transition-colors active:scale-[0.98]',
              'bg-gold-500 text-navy-950 hover:bg-gold-400',
              'disabled:bg-navy-700 disabled:text-text-muted disabled:cursor-not-allowed disabled:hover:bg-navy-700',
            )}
            aria-label={t.send}
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
            ) : (
              <Send className="w-5 h-5" aria-hidden />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
