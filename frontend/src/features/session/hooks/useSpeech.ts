import { useRef, useCallback } from 'react';

export function useSpeech() {
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  const speakWithBrowser = useCallback((text: string, langCode: string) => {
    if (!('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;

    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find(v => v.lang === langCode && v.name.toLowerCase().includes('google')) ||
      voices.find(v => v.lang === langCode) ||
      voices.find(v => v.lang.startsWith(langCode.split('-')[0]));

    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }, []);

  const speakText = useCallback(async (text: string, lang: string) => {
    // Stop any currently playing TTS
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (lang === 'vi') {
      try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(import.meta as any).env.VITE_OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: text,
            voice: 'nova',
            speed: 0.95,
          }),
        });

        if (!response.ok) throw new Error(`OpenAI TTS error: ${response.status}`);

        const audioBlob = await response.blob();
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        ttsAudioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(url);
          ttsAudioRef.current = null;
        };

        await audio.play();
      } catch (err) {
        console.warn('[TTS] OpenAI TTS failed, falling back to browser:', err);
        speakWithBrowser(text, 'vi-VN');
      }
    } else {
      speakWithBrowser(text, 'en-US');
    }
  }, [speakWithBrowser]);

  const stopSpeaking = useCallback(() => {
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { speakText, stopSpeaking };
}
