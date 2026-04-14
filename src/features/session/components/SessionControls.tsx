import React, { useState } from 'react';
import { Mic, Square, RotateCcw, Send, Keyboard, Loader2 } from 'lucide-react';

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
  isRecording,
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
  onTranscriptChange
}: Props) {
  const [inputMode, setInputMode] = useState<'keyboard' | 'voice'>('keyboard');

  const t = {
    stopRecording: isVi ? 'Dừng thu âm' : 'Stop Recording',
    reRecord: isVi ? 'Ghi âm lại' : 'Re-record',
    send: isVi ? 'Gửi' : 'Send',
    typePlaceholder: isVi ? 'Hoặc gõ câu trả lời của bạn vào đây...' : 'Or type your answer here...',
    listening: isVi ? 'Đang nghe...' : 'Listening...',
    recording: isVi ? 'Đang ghi âm...' : 'Recording...',
    noAudio: isVi ? '(Chưa nhận được âm thanh)' : '(No audio detected)',
    yourRecording: isVi ? 'Bản ghi âm của bạn:' : 'Your recording:',
    switchToKeyboard: isVi ? 'Chuyển sang bàn phím' : 'Switch to keyboard',
    switchToVoice: isVi ? 'Chuyển sang giọng nói' : 'Switch to voice'
  };

  const handleSend = () => {
    if ((transcript.trim() || audioUrl) && !isProcessing) {
      onSubmit(transcript);
    }
  };

  return (
    <div className="px-4 py-3 bg-white border-t border-[#c3c5d7]/20">
      {error && <div className="mb-3 text-sm font-bold text-[#ba1a1a] text-center bg-[#ffdad6] p-2.5 rounded-xl">{error}</div>}

      {/* Voice recording mode HUD */}
      {inputMode === 'voice' && recordingState === 'recording' && (
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="flex items-end gap-[3px] h-6">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className="w-1.5 rounded-full transition-all duration-100"
                style={{
                  height: `${Math.max(4, Math.min(24, (audioLevel / 80) * 24 * (0.4 + i * 0.12)))}px`,
                  backgroundColor: audioLevel > 3 ? '#ba1a1a' : '#c3c5d7',
                  opacity: audioLevel > i * 3 ? 1 : 0.3,
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 text-[#ba1a1a] text-sm font-bold animate-pulse">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]"></div>
            {t.recording}
          </div>
          {audioLevel <= 1 && <span className="text-xs text-[#737686]">{t.noAudio}</span>}
          <button
            onClick={onStopRecording}
            className="flex items-center gap-1.5 bg-[#ba1a1a] hover:bg-[#93000a] text-white px-4 py-2 rounded-full text-sm font-bold transition-all"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            {t.stopRecording}
          </button>
        </div>
      )}

      {/* Voice reviewing mode */}
      {inputMode === 'voice' && recordingState === 'reviewing' && (
        <div className="flex flex-col mb-3 p-3 bg-[#f8f9fa] rounded-xl border border-[#c3c5d7]/20">
          {audioUrl && (
            <div className="mb-3 w-full">
              <span className="text-xs font-bold text-[#737686] ml-2 mb-1 block">{t.yourRecording}</span>
              <audio src={audioUrl} controls className="w-full h-10" />
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onReRecord}
              className="flex items-center gap-1.5 bg-white hover:bg-[#e7e8e9] text-[#191c1d] px-4 py-2 rounded-full text-sm font-bold border border-[#c3c5d7]/30 shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              {t.reRecord}
            </button>
            <button
              onClick={handleSend}
              disabled={isProcessing}
              className="flex items-center gap-1.5 bg-[#003fb1] hover:bg-[#003dab] text-white px-5 py-2 rounded-full text-sm font-bold transition-all disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
            onChange={e => onTranscriptChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
            className="w-full border border-[#c3c5d7] rounded-xl pl-4 pr-12 py-3 focus:ring-2 focus:ring-[#003fb1] focus:border-transparent bg-[#f8f9fa] text-[#191c1d] text-sm"
            placeholder={inputMode === 'voice' && recordingState === 'recording' ? t.listening : t.typePlaceholder}
            disabled={isProcessing || recordingState === 'recording'}
            readOnly={inputMode === 'voice' && recordingState === 'recording'}
          />

          <button
            onClick={() => {
              if (inputMode === 'keyboard') {
                setInputMode('voice');
                onStartRecording();
              } else {
                if (recordingState === 'recording') onStopRecording();
                setInputMode('keyboard');
                onReRecord(); // Using reRecord as a reset mechanism here
              }
            }}
            disabled={isProcessing}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all disabled:opacity-50 ${
              inputMode === 'voice' ? 'text-[#003fb1] hover:bg-[#dbe1ff]' : 'text-[#737686] hover:bg-[#f3f4f5]'
            }`}
            title={inputMode === 'voice' ? t.switchToKeyboard : t.switchToVoice}
          >
            {inputMode === 'voice' ? <Keyboard className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        </div>

        <button
          onClick={handleSend}
          disabled={(!transcript.trim() && !audioUrl) || isProcessing || recordingState === 'recording'}
          className="bg-[#003fb1] text-white p-3 rounded-xl hover:bg-[#003dab] disabled:opacity-30 transition-colors shadow-sm"
        >
          {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
