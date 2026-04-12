import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, Square, Loader2, AlertCircle, Send, Keyboard, RotateCcw } from 'lucide-react';
import FormattedText from '../components/FormattedText';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const INTERVIEW_PHASES = [
  { id: 1, vi: 'Khởi động', en: 'Warm-up', icon: '👋' },
  { id: 2, vi: 'Giới thiệu bản thân', en: 'Self Introduction', icon: '🗣️' },
  { id: 3, vi: 'Tìm hiểu CV', en: 'CV Deep-dive', icon: '📄' },
  { id: 4, vi: 'Đánh giá năng lực', en: 'Job-fit Assessment', icon: '🎯' },
  { id: 5, vi: 'Động lực & Văn hóa', en: 'Motivation & Culture', icon: '💡' },
  { id: 6, vi: 'Ứng viên hỏi lại', en: 'Your Questions', icon: '❓' },
  { id: 7, vi: 'Kết thúc', en: 'Closing', icon: '🤝' },
];

export default function InterviewRoom() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Load session data from sessionStorage
  const [session, setSession] = useState(null);
  const [turns, setTurns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [inputMode, setInputMode] = useState('keyboard');
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingState, setRecordingState] = useState('idle');
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(1);
  const [sessionEnded, setSessionEnded] = useState(false);

  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioBlobRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(0);
  const ttsAudioRef = useRef(null);
  const chatHistoryRef = useRef([]); // Keep chat history for API calls

  useEffect(() => {
    async function init() {
      const raw = sessionStorage.getItem(`session_${id}`);
      if (!raw) { setLoading(false); return; }
      const s = JSON.parse(raw);
      setSession(s);

      try {
        const res = await fetch(`${API_URL}/api/v1/interview/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: id,
            cv_text: s.cvText,
            jd_text: s.jobDescription,
            interview_type: s.interviewType,
            language: s.language,
            is_stress_test: s.isStressTest || false,
          }),
        });
        const data = await res.json();
        const firstQ = data.first_question || (s.language === 'vi' ? 'Hãy bắt đầu bằng việc giới thiệu bản thân nhé!' : 'Let\'s start! Please introduce yourself.');
        setCurrentQuestion(firstQ);
        setCurrentPhase(data.current_phase || 1);
        speakText(firstQ, s.language, data.audio_base64);
      } catch (err) {
        const fallback = s.language === 'vi' ? 'Xin chào! Hãy giới thiệu bản thân bạn nhé.' : 'Hello! Please introduce yourself.';
        setCurrentQuestion(fallback);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [turns, currentQuestion, transcript]);

  const speakText = (text, lang, base64Audio) => {
    if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current = null; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (!text) return;

    if (base64Audio) {
      const audio = new Audio('data:audio/mp3;base64,' + base64Audio);
      ttsAudioRef.current = audio;
      audio.play().catch(() => speakWithBrowser(text, lang === 'vi' ? 'vi-VN' : 'en-US'));
      return;
    }
    speakWithBrowser(text, lang === 'vi' ? 'vi-VN' : 'en-US');
  };

  const speakWithBrowser = (text, langCode) => {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    window.speechSynthesis.speak(utterance);
  };

  const startRecording = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        audioBlobRef.current = blob;
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
        if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
      };
      mediaRecorder.start(200);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const monitor = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          setAudioLevel(dataArray.reduce((a, b) => a + b, 0) / dataArray.length);
          animFrameRef.current = requestAnimationFrame(monitor);
        }
      };
      monitor();

      // Speech recognition for live preview
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        const rec = new SR();
        rec.lang = session?.language === 'vi' ? 'vi-VN' : 'en-US';
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (e) => {
          let t = '';
          for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
          setTranscript(t);
        };
        rec.onerror = () => {};
        recognitionRef.current = rec;
        rec.start();
      }

      setIsRecording(true);
      setRecordingState('recording');
    } catch {
      setError('Không thể truy cập micro. Vui lòng kiểm tra quyền.');
    }
  };

  const stopRecording = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    analyserRef.current = null;
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current.stop();
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);
    setAudioLevel(0);
    setRecordingState('reviewing');
  };

  const handleSubmitAnswer = async () => {
    const answerText = transcript.trim();
    if (!answerText) { setError(session?.language === 'vi' ? 'Chưa có câu trả lời.' : 'No answer detected.'); return; }
    if (!session) return;

    setIsProcessing(true);
    if (isRecording) stopRecording();

    const questionAsked = currentQuestion;
    setTurns(prev => [...prev, { id: `temp-${Date.now()}`, question: questionAsked, answer: answerText, turnOrder: prev.length + 1 }]);
    setTranscript('');
    setAudioUrl(null);
    audioBlobRef.current = null;
    setRecordingState('idle');
    setCurrentQuestion('');

    // Update chat history for context
    chatHistoryRef.current = [
      ...chatHistoryRef.current,
      { role: 'ai', content: questionAsked },
      { role: 'user', content: answerText },
    ];

    try {
      const res = await fetch(`${API_URL}/api/v1/interview/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: id,
          message: answerText,
          history: chatHistoryRef.current,
          cv_text: session.cvText,
          jd_text: session.jobDescription,
          interview_type: session.interviewType,
          language: session.language,
          is_stress_test: session.isStressTest || false,
        }),
      });
      const data = await res.json();

      // Update turn with evaluation
      setTurns(prev => prev.map(t =>
        t.id.startsWith('temp-')
          ? { ...t, id: `t-${Date.now()}`, evaluation: data.last_evaluation || null, phase: data.current_phase || currentPhase }
          : t
      ));

      setCurrentPhase(data.current_phase || currentPhase);
      const nextQ = data.reply || (session.language === 'vi' ? 'Bạn có thể chia sẻ thêm không?' : 'Could you share more?');
      setCurrentQuestion(nextQ);
      speakText(nextQ, session.language, data.audio_base64);

      if (data.should_end) await endSession();
    } catch (err) {
      setError(session.language === 'vi' ? `Lỗi kết nối backend: ${err?.message}` : `Backend error: ${err?.message}`);
      setTurns(prev => prev.filter(t => !t.id.startsWith('temp-')));
      setCurrentQuestion(questionAsked);
    } finally {
      setIsProcessing(false);
    }
  };

  const endSession = async () => {
    if (!session || sessionEnded) return;
    setIsProcessing(true);
    setSessionEnded(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/interview/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: id,
          history: chatHistoryRef.current,
          cv_text: session.cvText,
          jd_text: session.jobDescription,
          interview_type: session.interviewType,
          language: session.language,
          is_stress_test: session.isStressTest || false,
          evaluations: turns.map(t => t.evaluation).filter(Boolean),
        }),
      });
      const data = await res.json();

      // Save summary + turns to sessionStorage for summary page
      const summaryData = {
        ...session,
        status: 'completed',
        summary: data.feedback || '',
        turns: turns,
        finishedAt: new Date().toISOString(),
        backendId: data.interview_id || null,
      };
      sessionStorage.setItem(`session_${id}`, JSON.stringify(summaryData));
      navigate(`/session/${id}/summary`);
    } catch (err) {
      console.error('End session error:', err);
      navigate(`/session/${id}/summary`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse text-[#434654]">Đang khởi động phiên phỏng vấn...</div>;
  if (!session) return <div className="p-8 text-center text-red-500">Không tìm thấy phiên phỏng vấn. <a href="/setup" className="underline text-[#003fb1]">Tạo phiên mới</a>.</div>;

  const isVi = session.language === 'vi';
  const scoreLabel = (key) => ({ relevance: ['Liên quan', 'Relevance'], structure: ['Cấu trúc', 'Structure'], specificity: ['Chi tiết', 'Specificity'], clarity: ['Rõ ràng', 'Clarity'], confidence: ['Tự tin', 'Confidence'] })[key]?.[isVi ? 0 : 1] || key;

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-5rem)] flex flex-col bg-white rounded-2xl border border-[#c3c5d7]/20 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-[#191c1d] text-white p-5 flex justify-between items-center relative">
        <div>
          <h2 className="font-bold text-xl flex items-center gap-2">
            {isVi ? 'Phòng Phỏng Vấn' : 'Interview Room'}
            {session.isStressTest && <span className="text-xs bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-md font-bold uppercase">Stress Test</span>}
          </h2>
          <p className="text-sm text-slate-400 mt-1">{session.interviewType} • {(session.jobDescription || '').split('\n')[0].slice(0, 60)}</p>
        </div>

        {/* Phase indicator */}
        <div className="absolute left-1/2 -translate-x-1/2 bg-white/10 px-4 py-1.5 rounded-full border border-white/10 hidden md:flex items-center gap-2">
          <span className="text-xl">{INTERVIEW_PHASES[currentPhase - 1]?.icon}</span>
          <span className="text-sm font-bold text-white">
            {isVi ? 'Giai đoạn' : 'Phase'} {currentPhase}: {INTERVIEW_PHASES[currentPhase - 1]?.[isVi ? 'vi' : 'en']}
          </span>
        </div>

        <button
          id="btn-end-session"
          onClick={endSession}
          disabled={isProcessing || sessionEnded}
          className="text-sm font-bold bg-[#434654] hover:bg-[#737686] px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
        >
          {isVi ? 'Kết thúc' : 'End Interview'}
        </button>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-[#f8f9fa]">
        {turns.map((turn) => (
          <div key={turn.id} className="space-y-4">
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
                <span className="text-white text-xs font-bold">{isVi ? 'Bạn' : 'You'}</span>
              </div>
              <div className="bg-[#dbe1ff] p-5 rounded-2xl rounded-tr-none border border-[#003fb1]/10 max-w-[85%]">
                <p className="text-[#00174d] leading-relaxed">{turn.answer}</p>
              </div>
            </div>

            {/* Evaluation loading */}
            {turn.id.startsWith('temp-') && isProcessing && (
              <div className="mx-14 bg-white p-5 rounded-2xl border border-[#8b4aff]/20 shadow-sm animate-pulse">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-[#8b4aff] animate-spin" />
                  <span className="text-sm text-[#737686] font-medium">{isVi ? 'AI đang phân tích...' : 'AI analyzing...'}</span>
                </div>
              </div>
            )}

            {/* Evaluation */}
            {turn.evaluation && (
              <div className="mx-14 bg-white p-6 rounded-2xl border border-[#8b4aff]/20 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-[#8b4aff]" />
                  <h4 className="font-bold text-[#191c1d] text-lg">{isVi ? 'Phản hồi & Đánh giá' : 'Feedback & Evaluation'}</h4>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                  {Object.entries(turn.evaluation.scores || {}).map(([key, score]) => (
                    <div key={key} className="bg-[#f8f9fa] p-3 rounded-xl text-center border border-[#c3c5d7]/30 hover:scale-105 transition-transform">
                      <div className="text-[10px] font-bold text-[#737686] uppercase tracking-wider mb-1">{scoreLabel(key)}</div>
                      <div className="font-extrabold text-[#191c1d] text-xl">{score}/5</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-3 text-sm">
                  {turn.evaluation.starAnalysis && (
                    <div className="bg-[#f3f4f5] p-4 rounded-xl">
                      <strong className="block mb-2 font-bold text-[#191c1d]">STAR Analysis:</strong>
                      <div className="grid grid-cols-2 gap-2">
                        {['situation', 'task', 'action', 'result'].map(k => (
                          <div key={k} className="bg-white p-3 rounded-lg text-xs">
                            <span className="font-bold text-[#003fb1] uppercase block mb-1">{k}</span>
                            <p className="text-[#434654]">{turn.evaluation.starAnalysis[k]}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {turn.evaluation.feedback && (
                    <div className="bg-[#fffbeb] p-4 rounded-xl border border-[#f59e0b]/10">
                      <strong className="block mb-2 font-bold text-[#191c1d]">{isVi ? 'Nhận xét:' : 'Feedback:'}</strong>
                      <FormattedText text={turn.evaluation.feedback} className="text-[#434654]" />
                    </div>
                  )}
                  {turn.evaluation.betterVersion && (
                    <div className="bg-[#dbe1ff] p-4 rounded-xl border border-[#003fb1]/10">
                      <strong className="block mb-2 font-bold text-[#003fb1]">{isVi ? 'Phiên bản tốt hơn:' : 'Better Version:'}</strong>
                      <FormattedText text={turn.evaluation.betterVersion} className="text-[#00174d] italic" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Current AI question */}
        {!sessionEnded && currentQuestion && (
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-[#191c1d] flex items-center justify-center flex-shrink-0 shadow-md">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
            <div className="bg-white p-5 rounded-2xl rounded-tl-none border border-[#c3c5d7]/20 shadow-sm max-w-[85%]">
              <p className="text-[#191c1d] leading-relaxed">{currentQuestion}</p>
            </div>
          </div>
        )}

        {/* Live transcript preview */}
        {isRecording && transcript && (
          <div className="flex gap-4 flex-row-reverse">
            <div className="w-10 h-10 rounded-full bg-[#003fb1] animate-pulse flex items-center justify-center flex-shrink-0 shadow-md">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <div className="bg-[#dbe1ff] p-4 rounded-2xl rounded-tr-none border border-[#003fb1]/10 max-w-[85%] opacity-70">
              <p className="text-[#00174d] text-sm italic">{transcript}</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {!sessionEnded && (
        <div className="px-4 py-3 bg-white border-t border-[#c3c5d7]/20">
          {error && <div className="mb-2 text-sm font-bold text-[#ba1a1a] bg-[#ffdad6] p-2.5 rounded-xl text-center">{error}</div>}

          {/* Voice: recording */}
          {inputMode === 'voice' && recordingState === 'recording' && (
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="flex items-end gap-[3px] h-6">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="w-1.5 rounded-full transition-all duration-100"
                    style={{ height: `${Math.max(4, Math.min(24, (audioLevel / 80) * 24 * (0.4 + i * 0.12)))}px`, backgroundColor: audioLevel > 3 ? '#ba1a1a' : '#c3c5d7' }} />
                ))}
              </div>
              <div className="flex items-center gap-2 text-[#ba1a1a] text-sm font-bold animate-pulse">
                <div className="w-2 h-2 rounded-full bg-[#ba1a1a]" />
                {isVi ? 'Đang ghi âm...' : 'Recording...'}
              </div>
              <button onClick={stopRecording} className="bg-[#ba1a1a] hover:bg-[#93000a] text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-1.5 transition-all">
                <Square className="w-3.5 h-3.5 fill-current" /> Dừng
              </button>
            </div>
          )}

          {/* Voice: reviewing */}
          {inputMode === 'voice' && recordingState === 'reviewing' && (
            <div className="flex items-center gap-3 mb-3 p-3 bg-[#f8f9fa] rounded-xl">
              <audio src={audioUrl || ''} controls className="h-8 flex-1" />
              <button onClick={() => { setAudioUrl(null); audioBlobRef.current = null; setTranscript(''); setRecordingState('idle'); startRecording(); }}
                className="flex items-center gap-1 bg-[#434654] text-white px-3 py-1.5 rounded-full text-xs font-bold">
                <RotateCcw className="w-3 h-3" /> {isVi ? 'Ghi lại' : 'Re-record'}
              </button>
            </div>
          )}

          {/* Main input row */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setInputMode(inputMode === 'keyboard' ? 'voice' : 'keyboard'); setRecordingState('idle'); }}
              className="p-2.5 rounded-xl bg-[#f3f4f5] text-[#434654] hover:bg-[#e7e8e9] transition-colors"
              title={inputMode === 'keyboard' ? 'Chuyển giọng nói' : 'Chuyển bàn phím'}
            >
              {inputMode === 'keyboard' ? <Mic className="w-5 h-5" /> : <Keyboard className="w-5 h-5" />}
            </button>

            {inputMode === 'keyboard' ? (
              <>
                <input
                  id="input-answer"
                  type="text"
                  value={transcript}
                  onChange={e => setTranscript(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && transcript.trim() && !isProcessing) handleSubmitAnswer(); }}
                  className="flex-1 bg-[#f3f4f5] rounded-xl px-4 py-3 text-sm font-medium placeholder:text-[#737686] focus:ring-2 focus:ring-[#003fb1] outline-none"
                  placeholder={isVi ? 'Gõ câu trả lời của bạn...' : 'Type your answer...'}
                  disabled={isProcessing}
                />
                <button
                  id="btn-send-answer"
                  onClick={handleSubmitAnswer}
                  disabled={!transcript.trim() || isProcessing}
                  className="p-3 bg-[#003fb1] text-white rounded-xl shadow-lg hover:scale-105 active:scale-95 disabled:opacity-30 transition-all"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </>
            ) : (
              <>
                {recordingState === 'idle' && (
                  <button onClick={startRecording} className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#003fb1] text-white rounded-xl font-bold text-sm">
                    <Mic className="w-5 h-5" /> {isVi ? 'Bắt đầu ghi âm' : 'Start Recording'}
                  </button>
                )}
                {(recordingState === 'recording' || recordingState === 'reviewing') && (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!transcript.trim() || isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#003fb1] text-white rounded-xl font-bold text-sm disabled:opacity-30"
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> {isVi ? 'Gửi câu trả lời' : 'Submit'}</>}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
