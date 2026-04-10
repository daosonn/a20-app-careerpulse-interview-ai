import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { processInterviewTurn, generateSessionSummary, InterviewTurnResult, generateOpeningMessage, INTERVIEW_PHASES, transcribeAudio } from '../lib/gemini';
import { Mic, Square, Loader2, AlertCircle, Sparkles, PlayCircle, RotateCcw, Send, Keyboard } from 'lucide-react';
import { FormattedText } from '../components/FormattedText';

interface SessionData {
  id: string;
  jobDescription: string;
  cvText: string;
  interviewType: string;
  language: string;
  status: string;
  isStressTest?: boolean;
  predictedQuestions: string[];
}

interface InterviewTurn {
  id: string;
  turnOrder: number;
  question: string;
  answer: string;
  audioUrl?: string;
  phase?: number;
  phaseName?: string;
  evaluation?: InterviewTurnResult['evaluation'];
}

export function InterviewRoom() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<SessionData | null>(null);
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'reviewing'>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [inputMode, setInputMode] = useState<'keyboard' | 'voice'>('keyboard');
  const [currentPhase, setCurrentPhase] = useState<number>(1);
  const [audioLevel, setAudioLevel] = useState(0);

  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);




  useEffect(() => {
    async function loadData() {
      if (!id || !user) return;
      try {
        // Load Session
        const docRef = doc(db, 'interview_sessions', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const sessionData = docSnap.data() as SessionData;
          setSession(sessionData);
          
          // Load existing turns
          const q = query(
            collection(db, 'interview_turns'),
            where('sessionId', '==', id),
            where('userId', '==', user.uid)
          );
          const turnsSnap = await getDocs(q);
          const loadedTurns = turnsSnap.docs
            .map(d => ({ id: d.id, ...d.data() } as InterviewTurn))
            .sort((a, b) => a.turnOrder - b.turnOrder);
          console.log(`[InterviewRoom] Loaded ${loadedTurns.length} existing turns`);
          setTurns(loadedTurns);

          if (sessionData.status === 'setup' || (sessionData.status === 'in_progress' && loadedTurns.length === 0)) {
            // Start Phase 1: Warm-up
            const openingMsg = await generateOpeningMessage(
              sessionData.cvText, 
              sessionData.jobDescription, 
              sessionData.language, 
              sessionData.isStressTest || false
            );
            setCurrentQuestion(openingMsg);
            setCurrentPhase(1);
            if (sessionData.status === 'setup') {
              await updateDoc(docRef, { status: 'in_progress' });
            }
            speakText(openingMsg, sessionData.language);
          } else if (sessionData.status === 'in_progress' && loadedTurns.length > 0) {
            // Resume from last turn
            const lastTurn = loadedTurns[loadedTurns.length - 1];
            setCurrentPhase(lastTurn.phase || 3);
            // In a real scenario, we might want to check if the last turn was fully processed.
            // For now, if the session is in progress, but we just reloaded, the user needs to 
            // answer the last question or we wait for them to answer. 
            // Actually, if we just reloaded, the question to display is the LAST nextQuestion.
            // Since we don't save nextQuestion to session, we'll prompt a safe continuation.
            const nextQ = sessionData.language === 'vi' 
                ? "Chào mừng bạn quay lại. Bạn có thể chia sẻ thêm về kinh nghiệm của mình không?"
                : "Welcome back. Could you share more about your experience?";
            setCurrentQuestion(nextQ);
          } else if (sessionData.status === 'completed') {
             setCurrentQuestion(sessionData.language === 'vi' ? "Buổi phỏng vấn đã kết thúc." : "The interview has ended.");
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `interview_sessions/${id}`);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, currentQuestion, transcript]);

  // Reference to currently playing audio for cleanup
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  /**
   * Speak text using OpenAI TTS (for Vietnamese) or browser SpeechSynthesis (for English).
   * OpenAI TTS produces much more natural-sounding Vietnamese compared to browser voices.
   */
  const speakText = async (text: string, lang: string) => {
    // Stop any currently playing TTS
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (lang === 'vi') {
      // === Vietnamese: Use OpenAI TTS for natural voice ===
      try {
        console.log('[TTS] Using OpenAI TTS for Vietnamese...');
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: text,
            voice: 'nova', // Clear, warm female voice - great for Vietnamese
            speed: 0.95,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI TTS error: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        ttsAudioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          ttsAudioRef.current = null;
        };

        await audio.play();
        console.log('[TTS] ✅ Vietnamese audio playing via OpenAI TTS');
      } catch (err) {
        console.warn('[TTS] ⚠️ OpenAI TTS failed, falling back to browser:', err);
        // Fallback to browser speech synthesis
        speakWithBrowser(text, 'vi-VN');
      }
    } else {
      // === English: Browser SpeechSynthesis is already good ===
      speakWithBrowser(text, 'en-US');
    }
  };

  /** Fallback: browser-based speech synthesis */
  const speakWithBrowser = (text: string, langCode: string) => {
    if (!('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;

    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find(v => v.lang === langCode && v.name.toLowerCase().includes('google')) ||
      voices.find(v => v.lang === langCode) ||
      voices.find(v => v.lang.startsWith(langCode.split('-')[0]));

    if (voice) {
      utterance.voice = voice;
      console.log(`[TTS] Browser voice: "${voice.name}" (${voice.lang})`);
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const startRecording = async () => {
    try {
      setError('');

      // Request mic with explicit constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      streamRef.current = stream;

      // Route through AudioContext for reliable recording + level monitoring
      const audioCtx = new AudioContext();
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);

      // Analyser for volume visualization
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Route to MediaRecorder via AudioContext destination
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);

      // Pick best supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const mediaRecorder = mimeType
        ? new MediaRecorder(dest.stream, { mimeType })
        : new MediaRecorder(dest.stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        audioBlobRef.current = audioBlob;
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        // Clean up stream and audio context
        stream.getTracks().forEach(t => t.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
        }
      };

      mediaRecorder.start(200);

      // Start volume monitoring
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const monitorVolume = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(avg);
          animFrameRef.current = requestAnimationFrame(monitorVolume);
        }
      };
      monitorVolume();

      // Start SpeechRecognition for live transcript preview
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = session?.language === 'vi' ? 'vi-VN' : 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let completeTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            completeTranscript += event.results[i][0].transcript;
          }
          setTranscript(completeTranscript);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          // Don't stop recording on speech recognition errors — audio recording continues
        };

        recognitionRef.current = recognition;
        recognition.start();
      }

      setIsRecording(true);
      setRecordingState('recording');
    } catch (err) {
      console.error(err);
      setError('Không thể truy cập micro. Vui lòng kiểm tra quyền.');
    }
  };

  const stopRecording = () => {
    // Stop volume monitoring first
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    analyserRef.current = null;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      // onstop handler will clean up stream + audioContext
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setAudioLevel(0);
    setRecordingState('reviewing');
  };

  const playAudio = () => {
    if (audioRef.current && audioUrl) {
      audioRef.current.play();
    }
  };

  const reRecord = () => {
    setAudioUrl(null);
    audioBlobRef.current = null;
    setTranscript('');
    setRecordingState('idle');
    startRecording();
  };

  const handleSubmitAnswer = async () => {
    const currentAudioBlob = audioBlobRef.current;
    const currentAudioUrl = audioUrl;
    let answerText = transcript.trim();

    // Must have either text or audio
    if (!answerText && !currentAudioBlob) {
      setError(session?.language === 'vi'
        ? 'Chưa ghi nhận được câu trả lời. Vui lòng gõ hoặc ghi âm.'
        : 'No answer detected. Please type or record.');
      return;
    }
    if (!session || !user) return;

    setIsProcessing(true);
    if (isRecording) stopRecording();

    // Use Whisper ONLY when browser SpeechRecognition didn't capture anything
    if (currentAudioBlob && !answerText) {
      // No browser transcript — check for silence, then try Whisper
      try {
        const arrBuf = await currentAudioBlob.arrayBuffer();
        const checkCtx = new AudioContext();
        const decoded = await checkCtx.decodeAudioData(arrBuf.slice(0));
        const samples = decoded.getChannelData(0);
        let maxAmp = 0;
        for (let i = 0; i < samples.length; i++) {
          const abs = Math.abs(samples[i]);
          if (abs > maxAmp) maxAmp = abs;
        }
        checkCtx.close().catch(() => {});

        if (maxAmp < 0.01) {
          setError(session.language === 'vi'
            ? 'Bản ghi âm không có âm thanh. Vui lòng kiểm tra micro và thử lại.'
            : 'Recording is silent. Please check your microphone and try again.');
          setIsProcessing(false);
          return;
        }
      } catch {
        // Can't decode — still try Whisper below
      }

      try {
        const whisperText = await transcribeAudio(currentAudioBlob, session.language);
        if (whisperText.trim()) answerText = whisperText;
      } catch (err) {
        console.warn('[Whisper] Transcription failed:', err);
        setError(session.language === 'vi'
          ? 'Lỗi chuyển giọng nói thành văn bản. Vui lòng thử lại hoặc gõ câu trả lời.'
          : 'Speech-to-text failed. Please try again or type your answer.');
        setIsProcessing(false);
        return;
      }
    }

    if (!answerText) {
      setError(session.language === 'vi'
        ? 'Không nhận được nội dung. Vui lòng thử lại.'
        : 'No content detected. Please try again.');
      setIsProcessing(false);
      return;
    }

    const answerToSubmit = answerText;
    setTranscript('');
    setAudioUrl(null);
    audioBlobRef.current = null;
    setRecordingState('idle');
    setInputMode('keyboard');

    // 1. Show the user's answer IMMEDIATELY in the chat
    const turnOrder = turns.length + 1;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const pendingTurn: InterviewTurn = {
      id: tempId,
      turnOrder,
      question: currentQuestion,
      answer: answerToSubmit,
      audioUrl: currentAudioUrl || undefined,
      phase: currentPhase,
      phaseName: INTERVIEW_PHASES[currentPhase - 1]?.[session.language === 'vi' ? 'vi' : 'en'] || '',
      evaluation: undefined,
    };
    setTurns(prev => [...prev, pendingTurn]);
    setCurrentQuestion(''); // Hide the question bubble since it's now in the turn

    try {
      // 2. Call AI for evaluation (user already sees their answer)
      const chatHistory = turns.map(t => [
        { role: 'model' as const, text: t.question },
        { role: 'user' as const, text: t.answer }
      ]).flat();

      const result = await processInterviewTurn(
        session.cvText,
        session.jobDescription,
        session.interviewType,
        session.language,
        session.isStressTest || false,
        chatHistory,
        currentQuestion,
        answerToSubmit,
        currentPhase
      );

      // 3. Save to Firestore with evaluation
      const newTurn = {
        id: tempId,
        sessionId: session.id,
        userId: user.uid,
        turnOrder,
        question: currentQuestion,
        answer: answerToSubmit,
        phase: result.phase || currentPhase,
        phaseName: result.phaseName || '',
        evaluation: result.evaluation || null,
        createdAt: new Date().toISOString()
      };

      const newTurnClean = JSON.parse(JSON.stringify(newTurn));
      if (!newTurnClean.evaluation || typeof newTurnClean.evaluation !== 'object' || Array.isArray(newTurnClean.evaluation)) {
        delete newTurnClean.evaluation;
      }
      
      const docRef = await addDoc(collection(db, 'interview_turns'), newTurnClean);
      console.log(`[InterviewRoom] Saved turn ${turnOrder} with Firestore ID: ${docRef.id}`);

      // 4. Update the pending turn with evaluation (in-place update)
      setTurns(prev => prev.map(t => 
        t.id === tempId 
          ? { ...t, id: docRef.id, evaluation: result.evaluation || null, phase: result.phase || currentPhase, phaseName: result.phaseName || '' }
          : t
      ));
      
      // 5. Update state & Set next question & speak
      const fallbackQuestion = session.language === 'vi' ? 'Bạn có thể chia sẻ thêm được không?' : 'Could you share more about that?';
      setCurrentPhase(result.phase || currentPhase);
      setCurrentQuestion(result.nextQuestion || fallbackQuestion);
      speakText(result.nextQuestion || fallbackQuestion, session.language);

      // 6. Check if AI decided to end
      if (result.shouldEndInterview) {
        await endSession();
      }

    } catch (err: any) {
      console.error(err);
      setError(session.language === 'vi' 
        ? `Lỗi: ${err?.message || 'Không xác định'}` 
        : `Error: ${err?.message || 'Unknown error'}`);
      // Remove the pending turn on error
      setTurns(prev => prev.filter(t => t.id !== tempId));
      // Restore the question
      setCurrentQuestion(pendingTurn.question);
    } finally {
      setIsProcessing(false);
    }
  };

  const endSession = async () => {
    if (!session || !id) return;
    setIsProcessing(true);
    try {
      // Generate summary
      const chatHistory = turns.map(t => [
        { role: 'model' as const, text: t.question },
        { role: 'user' as const, text: t.answer }
      ]).flat();
      
      let summaryData = null;
      if (chatHistory.length > 0) {
         summaryData = await generateSessionSummary(session.cvText, session.jobDescription, chatHistory, session.language);
      }

      await updateDoc(doc(db, 'interview_sessions', id), { 
        status: 'completed',
        summary: summaryData?.summary || '',
        keyTakeaways: summaryData?.keyTakeaways || []
      });
      navigate(`/session/${id}/summary`);
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, `interview_sessions/${id}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse">Loading...</div>;
  if (!session) return <div className="p-8 text-center text-red-500">Session not found.</div>;

  // Language-aware UI labels
  const isVi = session.language === 'vi';
  const t = {
    roomTitle: isVi ? 'Phòng Phỏng Vấn' : 'Interview Room',
    endSession: isVi ? 'Kết thúc phỏng vấn' : 'End Interview',
    feedbackTitle: isVi ? 'Phản hồi & Đánh giá' : 'Feedback & Evaluation',
    starTitle: isVi ? 'Phân tích STAR:' : 'STAR Analysis:',
    feedbackLabel: isVi ? 'Nhận xét:' : 'Feedback:',
    betterVersion: isVi ? 'Phiên bản tốt hơn:' : 'Better Version:',
    stopRecording: isVi ? 'Dừng thu âm' : 'Stop Recording',
    playback: isVi ? 'Nghe lại' : 'Playback',
    reRecord: isVi ? 'Ghi âm lại' : 'Re-record',
    send: isVi ? 'Gửi' : 'Send',
    voiceAnswer: isVi ? 'Trả lời bằng giọng nói' : 'Answer by Voice',
    typePlaceholder: isVi ? 'Hoặc gõ câu trả lời của bạn vào đây...' : 'Or type your answer here...',
    processing: isVi ? 'AI đang xử lý...' : 'AI is processing...',
    langLabel: isVi ? 'Tiếng Việt' : 'English',
  };
  const scoreLabel = (key: string) => {
    const map: Record<string, [string, string]> = {
      relevance: ['Liên quan', 'Relevance'],
      structure: ['Cấu trúc', 'Structure'],
      specificity: ['Chi tiết', 'Specificity'],
      clarity: ['Rõ ràng', 'Clarity'],
      confidence: ['Tự tin', 'Confidence'],
    };
    return map[key]?.[isVi ? 0 : 1] || key;
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-5rem)] flex flex-col bg-white rounded-2xl border border-[#c3c5d7]/20 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-[#191c1d] text-white p-5 flex justify-between items-center relative">
        <div>
          <h2 className="font-bold text-xl flex items-center gap-2">
            {t.roomTitle}
            {session.isStressTest && (
              <span className="text-xs bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                Stress Test
              </span>
            )}
          </h2>
          <p className="text-sm text-slate-400 mt-1">{session.interviewType} • {session.jobDescription.split('\n')[0]}</p>
        </div>
        
        {/* Phase Indicator */}
        <div className="absolute left-1/2 -translate-x-1/2 bg-white/10 px-4 py-1.5 rounded-full border border-white/10 hidden md:flex items-center gap-2">
          <span className="text-xl">{INTERVIEW_PHASES[currentPhase - 1]?.icon}</span>
          <span className="text-sm font-bold text-white tracking-wide">
            {isVi ? 'Giai đoạn' : 'Phase'} {currentPhase}: {INTERVIEW_PHASES[currentPhase - 1]?.[isVi ? 'vi' : 'en']}
          </span>
        </div>

        <button onClick={endSession} className="text-sm font-bold bg-[#434654] hover:bg-[#737686] px-5 py-2.5 rounded-xl transition-colors">
          {t.endSession}
        </button>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-[#f8f9fa]">
        {turns.map((turn, idx) => (
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

            {/* Evaluation Panel - Loading Skeleton */}
            {!turn.evaluation && isProcessing && turn.id.startsWith('temp-') && (
              <div className="ml-14 mr-14 bg-white p-6 rounded-2xl border border-[#8b4aff]/20 shadow-sm animate-pulse">
                <div className="flex items-center gap-2 mb-4">
                  <Loader2 className="w-5 h-5 text-[#8b4aff] animate-spin" />
                  <span className="font-bold text-[#737686] text-sm">
                    {isVi ? 'AI đang phân tích câu trả lời...' : 'AI is analyzing your answer...'}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-5 gap-3">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="bg-[#f3f4f5] h-16 rounded-xl"></div>
                    ))}
                  </div>
                  <div className="bg-[#f3f4f5] h-24 rounded-xl"></div>
                  <div className="bg-[#f3f4f5] h-16 rounded-xl"></div>
                </div>
              </div>
            )}

            {/* Evaluation Panel - Actual */}
            {turn.evaluation && (
              <div className="ml-14 mr-14 bg-white p-6 rounded-2xl border border-[#8b4aff]/20 shadow-sm relative overflow-hidden transition-all duration-500 ease-out" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
                <div className="absolute top-0 right-0 p-2 opacity-5">
                  <Sparkles className="w-16 h-16 text-[#8b4aff]" />
                </div>
                <div className="flex items-center gap-2 mb-4 relative z-10">
                  <AlertCircle className="w-5 h-5 text-[#8b4aff]" />
                  <h4 className="font-bold text-[#191c1d] text-lg">{t.feedbackTitle}</h4>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5 relative z-10">
                  {Object.entries(turn.evaluation.scores || {}).map(([key, score]) => (
                    <div key={key} className="bg-white p-3 rounded-xl text-center border border-[#c3c5d7]/50 shadow-sm transition-transform hover:scale-105">
                      <div className="text-[10px] font-bold text-[#737686] uppercase tracking-wider mb-1">{scoreLabel(key)}</div>
                      <div className="font-extrabold text-[#191c1d] text-xl">{score}/5</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-5 text-sm relative z-10">
                  {/* STAR Analysis */}
                  {turn.evaluation.starAnalysis && (
                    <div className="bg-[#f3f4f5] p-5 rounded-xl">
                      <strong className="text-[#191c1d] block mb-3 font-bold text-base">{t.starTitle}</strong>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-white p-3 rounded-lg border border-[#c3c5d7]/10">
                          <span className="inline-block font-bold text-[#003fb1] text-xs uppercase tracking-wider mb-1">Situation</span>
                          <p className="text-[#434654] leading-relaxed text-sm">{turn.evaluation.starAnalysis.situation}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-[#c3c5d7]/10">
                          <span className="inline-block font-bold text-[#003fb1] text-xs uppercase tracking-wider mb-1">Task</span>
                          <p className="text-[#434654] leading-relaxed text-sm">{turn.evaluation.starAnalysis.task}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-[#c3c5d7]/10">
                          <span className="inline-block font-bold text-[#003fb1] text-xs uppercase tracking-wider mb-1">Action</span>
                          <p className="text-[#434654] leading-relaxed text-sm">{turn.evaluation.starAnalysis.action}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-[#c3c5d7]/10">
                          <span className="inline-block font-bold text-[#003fb1] text-xs uppercase tracking-wider mb-1">Result</span>
                          <p className="text-[#434654] leading-relaxed text-sm">{turn.evaluation.starAnalysis.result}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Feedback */}
                  <div className="bg-[#fffbeb] p-5 rounded-xl border border-[#f59e0b]/10">
                    <strong className="text-[#191c1d] block mb-2 font-bold text-base">{t.feedbackLabel}</strong>
                    <FormattedText text={turn.evaluation.feedback} className="text-[#434654]" />
                  </div>

                  {/* Better Version */}
                  <div className="bg-[#dbe1ff] p-5 rounded-xl border border-[#003fb1]/10">
                    <strong className="text-[#003fb1] block mb-2 font-bold text-base">{t.betterVersion}</strong>
                    <FormattedText text={turn.evaluation.betterVersion} className="text-[#00174d] italic" />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Current Question */}
        {session.status !== 'completed' && currentQuestion && (
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

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} src={audioUrl || ''} className="hidden" />

      {/* Controls — compact input bar */}
      {session.status !== 'completed' && (
        <div className="px-4 py-3 bg-white border-t border-[#c3c5d7]/20">
          {error && <div className="mb-3 text-sm font-bold text-[#ba1a1a] text-center bg-[#ffdad6] p-2.5 rounded-xl">{error}</div>}

          {/* Voice recording mode */}
          {inputMode === 'voice' && recordingState === 'recording' && (
            <div className="flex items-center justify-center gap-3 mb-3">
              {/* Volume level bars */}
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
                {isVi ? 'Đang ghi âm...' : 'Recording...'}
              </div>
              {audioLevel <= 1 && (
                <span className="text-xs text-[#737686]">
                  {isVi ? '(Chưa nhận được âm thanh)' : '(No audio detected)'}
                </span>
              )}
              <button
                onClick={stopRecording}
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
                  <span className="text-xs font-bold text-[#737686] ml-2 mb-1 block">
                    {isVi ? 'Bản ghi âm của bạn:' : 'Your recording:'}
                  </span>
                  <audio src={audioUrl} controls className="w-full h-10" />
                </div>
              )}
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={reRecord}
                  className="flex items-center gap-1.5 bg-white hover:bg-[#e7e8e9] text-[#191c1d] px-4 py-2 rounded-full text-sm font-bold border border-[#c3c5d7]/30 shadow-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t.reRecord}
                </button>
                <button
                  onClick={handleSubmitAnswer}
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
            {/* Text input — always visible in keyboard mode, shows transcript in voice mode */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (transcript.trim() || audioUrl) && !isProcessing) handleSubmitAnswer(); }}
                className="w-full border border-[#c3c5d7] rounded-xl pl-4 pr-12 py-3 focus:ring-2 focus:ring-[#003fb1] focus:border-transparent bg-[#f8f9fa] text-[#191c1d] text-sm"
                placeholder={inputMode === 'voice' && recordingState === 'recording' 
                  ? (isVi ? 'Đang nghe...' : 'Listening...')
                  : t.typePlaceholder}
                disabled={isProcessing || recordingState === 'recording'}
                readOnly={inputMode === 'voice' && recordingState === 'recording'}
              />

              {/* Mic / Keyboard toggle button inside input */}
              <button
                onClick={() => {
                  if (inputMode === 'keyboard') {
                    setInputMode('voice');
                    startRecording();
                  } else {
                    if (recordingState === 'recording') stopRecording();
                    setInputMode('keyboard');
                    setRecordingState('idle');
                    setAudioUrl(null);
                    audioBlobRef.current = null;
                  }
                }}
                disabled={isProcessing}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all disabled:opacity-50 ${
                  inputMode === 'voice' 
                    ? 'text-[#003fb1] hover:bg-[#dbe1ff]' 
                    : 'text-[#737686] hover:bg-[#f3f4f5]'
                }`}
                title={inputMode === 'voice' ? (isVi ? 'Chuyển sang bàn phím' : 'Switch to keyboard') : (isVi ? 'Chuyển sang giọng nói' : 'Switch to voice')}
              >
                {inputMode === 'voice' ? <Keyboard className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            </div>

            {/* Send button */}
            <button
              onClick={handleSubmitAnswer}
              disabled={(!transcript.trim() && !audioUrl) || isProcessing || recordingState === 'recording'}
              className="bg-[#003fb1] text-white p-3 rounded-xl hover:bg-[#003dab] disabled:opacity-30 transition-colors shadow-sm"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
