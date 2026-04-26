import { useState, useRef, useCallback } from 'react';

export function useAudioRecorder(language: string) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'reviewing'>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [silenceMs, setSilenceMs] = useState(0);
  const [permissionState, setPermissionState] = useState<'unknown' | 'prompt' | 'granted' | 'denied'>('unknown');

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const startedAtRef = useRef<number>(0);
  const lastVoiceAtRef = useRef<number>(0);
  const stopRef = useRef<() => void>(() => {});

  const MAX_DURATION_MS = 120_000;
  const SILENCE_STOP_MS = 12_000;

  const cleanupMedia = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    analyserRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError('');
      setRecordingDurationMs(0);
      setSilenceMs(0);

      if (!navigator.mediaDevices?.getUserMedia) {
        setPermissionState('denied');
        setError('Trinh duyet khong ho tro ghi am micro.');
        return;
      }

      try {
        const status = await navigator.permissions?.query({ name: 'microphone' as PermissionName });
        if (status?.state) setPermissionState(status.state as 'prompt' | 'granted' | 'denied');
        if (status?.state === 'denied') {
          setError('Micro dang bi chan. Hay cap quyen micro trong trinh duyet roi thu lai.');
          return;
        }
      } catch {
        setPermissionState('unknown');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      setPermissionState('granted');

      const audioCtx = new AudioContext();
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);

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

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        cleanupMedia();
      };

      mediaRecorder.start(200);
      startedAtRef.current = performance.now();
      lastVoiceAtRef.current = startedAtRef.current;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const monitorVolume = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const now = performance.now();
        const elapsed = now - startedAtRef.current;
        const silentFor = now - lastVoiceAtRef.current;

        setAudioLevel(avg);
        setRecordingDurationMs(elapsed);
        if (avg > 4) lastVoiceAtRef.current = now;
        setSilenceMs(silentFor);

        if (elapsed >= MAX_DURATION_MS) {
          setError('Đã đạt giới hạn ghi âm 2 phút. Bạn có thể gửi hoặc ghi lại.');
          stopRef.current();
          return;
        }
        if (elapsed > 3000 && silentFor >= SILENCE_STOP_MS) {
          setError('Da tu dung vi khong phat hien giong noi trong 12 giay.');
          stopRef.current();
          return;
        }

        animFrameRef.current = requestAnimationFrame(monitorVolume);
      };
      monitorVolume();

      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = language === 'vi' ? 'vi-VN' : 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let completeTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            completeTranscript += event.results[i][0].transcript;
          }
          setTranscript(completeTranscript);
        };

        recognitionRef.current = recognition;
        recognition.start();
      }

      setIsRecording(true);
      setRecordingState('recording');
    } catch (err) {
      console.error(err);
      setPermissionState('denied');
      cleanupMedia();
      setError('Khong the truy cap micro. Vui long kiem tra quyen micro.');
    }
  }, [cleanupMedia, language]);

  const stopRecording = useCallback(() => {
    cleanupMedia();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setAudioLevel(0);
    setRecordingState('reviewing');
  }, [cleanupMedia]);

  stopRef.current = stopRecording;

  const resetRecording = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    setTranscript('');
    setRecordingDurationMs(0);
    setSilenceMs(0);
    setRecordingState('idle');
    setError('');
  }, [audioUrl]);

  return {
    isRecording,
    recordingState,
    audioUrl,
    transcript,
    audioLevel,
    error,
    recordingDurationMs,
    maxDurationMs: MAX_DURATION_MS,
    silenceMs,
    silenceStopMs: SILENCE_STOP_MS,
    permissionState,
    audioBlob,
    startRecording,
    stopRecording,
    resetRecording,
    setTranscript,
    setError,
  };
}
