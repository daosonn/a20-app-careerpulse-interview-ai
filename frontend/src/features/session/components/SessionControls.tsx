import React, { useState } from 'react';
import { Mic, Square, RotateCcw, Send, Keyboard, Loader2, ShieldAlert } from 'lucide-react';
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
  recordingDurationMs?: number;
  maxDurationMs?: number;
  silenceMs?: number;
  silenceStopMs?: number;
  permissionState?: 'unknown' | 'prompt' | 'granted' | 'denied';
  onStartRecording: () => void;
  onStopRecording: () => void;
  onReRecord: () => void;
  onSubmit: (text: string) => void;
  onTranscriptChange: (text: string) => void;
}

function formatTime(ms = 0) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60).toString().padStart(2, '0');
  const seconds = (total % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function SessionControls({
  isProcessing,
  isRecording: _isRecording,
  recordingState,
  audioUrl,
  transcript,
  audioLevel,
  error,
  isVi,
  recordingDurationMs = 0,
  maxDurationMs = 120_000,
  silenceMs = 0,
  silenceStopMs = 12_000,
  permissionState = 'unknown',
  onStartRecording,
  onStopRecording,
  onReRecord,
  onSubmit,
  onTranscriptChange,
}: Props) {
  const [inputMode, setInputMode] = useState<'keyboard' | 'voice'>('keyboard');

  const t = {
    stopRecording: isVi ? 'Dừng ghi âm' : 'Stop',
    reRecord: isVi ? 'Ghi lại' : 'Re-record',
    send: isVi ? 'Gửi câu trả lời' : 'Send answer',
    typePlaceholder: isVi
      ? 'Nhập câu trả lời hoặc bật micro để trả lời bằng giọng nói...'
      : 'Type your answer or use the microphone...',
    recording: isVi ? 'Đang ghi âm' : 'Recording',
    review: isVi ? 'Kiểm tra bản ghi' : 'Review recording',
    switchToKeyboard: isVi ? 'Chuyển sang bàn phím' : 'Switch to keyboard',
    switchToVoice: isVi ? 'Trả lời bằng giọng nói' : 'Answer by voice',
    permissionDenied: isVi ? 'Micro đang bị chặn' : 'Microphone blocked',
  };

  const durationPct = Math.min(100, (recordingDurationMs / maxDurationMs) * 100);
  const silencePct = Math.min(100, (silenceMs / silenceStopMs) * 100);

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
    <div className="px-4 sm:px-8 pb-5">
      <div className="max-w-6xl mx-auto rounded-[1.6rem] border border-cyan-200/25 bg-navy-950/80 shadow-[0_0_40px_rgba(56,189,248,0.14)] backdrop-blur-xl overflow-hidden">
        {(error || permissionState === 'denied') && (
          <div
            role="alert"
            className="flex items-center justify-center gap-2 border-b border-status-error/30 bg-status-error/10 px-4 py-2 text-sm font-medium text-status-error"
          >
            <ShieldAlert className="w-4 h-4" aria-hidden />
            {error || t.permissionDenied}
          </div>
        )}

        {inputMode === 'voice' && recordingState === 'recording' && (
          <div className="px-4 sm:px-6 pt-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto] items-center">
              <div className="rounded-2xl border border-cyan-200/15 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-status-error/15 text-status-error">
                      <span className="absolute inset-0 rounded-full animate-ping bg-status-error/20" />
                      <Mic className="relative w-5 h-5" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{t.recording}</p>
                      <p className="text-xs text-text-muted">
                        {formatTime(recordingDurationMs)} / {formatTime(maxDurationMs)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-end gap-1 h-9" aria-hidden>
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 rounded-full bg-cyan-300 transition-all"
                        style={{
                          height: `${Math.max(5, Math.min(34, (audioLevel / 70) * 34 * (0.45 + i * 0.08)))}px`,
                          opacity: audioLevel > i * 2 ? 1 : 0.25,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-navy-700">
                    <span className="block h-full rounded-full bg-gold-400" style={{ width: `${durationPct}%` }} />
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-navy-700">
                    <span className="block h-full rounded-full bg-cyan-300" style={{ width: `${silencePct}%` }} />
                  </div>
                </div>
              </div>

              <button
                onClick={onStopRecording}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold-500 px-5 py-4 text-sm font-bold text-navy-950 transition hover:bg-gold-400 active:scale-[0.98]"
              >
                <Square className="w-4 h-4 fill-current" aria-hidden />
                {t.stopRecording}
              </button>
            </div>
          </div>
        )}

        {inputMode === 'voice' && recordingState === 'reviewing' && (
          <div className="px-4 sm:px-6 pt-4">
            <div className="rounded-2xl border border-gold-500/25 bg-gold-500/[0.06] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-300">
                  {t.review}
                </p>
                <button
                  onClick={onReRecord}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/50 px-3 py-1.5 text-xs font-semibold text-gold-300 transition hover:bg-gold-500/10"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden />
                  {t.reRecord}
                </button>
              </div>
              {audioUrl && (
                <audio
                  src={audioUrl}
                  controls
                  className="w-full h-9"
                  style={{ accentColor: 'var(--color-gold-500)' }}
                />
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 p-4 sm:p-5">
          <div className="relative flex-1">
            <input
              type="text"
              value={transcript}
              onChange={(e) => onTranscriptChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              className={cn(
                'h-13 w-full rounded-2xl border bg-white/[0.06] pl-4 pr-14 text-sm font-medium text-text-primary outline-none transition',
                'border-cyan-200/20 placeholder:text-text-muted focus:border-cyan-200/60 focus:ring-2 focus:ring-cyan-200/20',
                'disabled:cursor-not-allowed disabled:opacity-60',
              )}
              placeholder={t.typePlaceholder}
              disabled={isProcessing || recordingState === 'recording'}
              readOnly={inputMode === 'voice' && recordingState === 'recording'}
            />
            <button
              onClick={handleToggleMode}
              disabled={isProcessing}
              className={cn(
                'absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xl p-2.5 transition disabled:opacity-50',
                inputMode === 'voice'
                  ? 'bg-gold-500/15 text-gold-300'
                  : 'text-text-muted hover:bg-white/10 hover:text-cyan-200',
              )}
              title={inputMode === 'voice' ? t.switchToKeyboard : t.switchToVoice}
              aria-label={inputMode === 'voice' ? t.switchToKeyboard : t.switchToVoice}
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
            disabled={(!transcript.trim() && !audioUrl) || isProcessing || recordingState === 'recording'}
            className={cn(
              'inline-flex h-13 min-w-13 items-center justify-center gap-2 rounded-2xl px-4 font-bold transition active:scale-[0.98]',
              'bg-gold-500 text-navy-950 hover:bg-gold-400',
              'disabled:cursor-not-allowed disabled:bg-navy-700 disabled:text-text-muted disabled:hover:bg-navy-700',
            )}
            aria-label={t.send}
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
            ) : (
              <Send className="w-5 h-5" aria-hidden />
            )}
            <span className="hidden sm:inline">{t.send}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
