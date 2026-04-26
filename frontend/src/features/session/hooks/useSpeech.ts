import { useRef, useCallback } from 'react';
import { useAuth } from '../../auth';
import { apiUrl } from '../../../lib/api';

export function useSpeech() {
  const { authenticatedFetch, user } = useAuth();
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

  const audioQueue = useRef<Array<{ audioBase64: string; mimeType: string }>>([]);
  const isPlaying = useRef(false);

  const playNextInQueue = useCallback(async () => {
    if (audioQueue.current.length === 0) {
      isPlaying.current = false;
      return;
    }

    isPlaying.current = true;
    const queuedAudio = audioQueue.current.shift();
    if (!queuedAudio) {
        playNextInQueue();
        return;
    }

    try {
      const url = `data:${queuedAudio.mimeType};base64,${queuedAudio.audioBase64}`;
      const audio = new Audio(url);
      ttsAudioRef.current = audio;
      
      audio.onended = () => {
        ttsAudioRef.current = null;
        playNextInQueue();
      };

      await audio.play();
    } catch (err) {
      console.warn('[TTS] Playback failed, skipping chunk:', err);
      playNextInQueue();
    }
  }, []);

  const speakText = useCallback(async (
    text: string,
    lang: string,
    base64Audio?: string,
    mimeType = 'audio/wav',
    character?: string,
  ) => {
    // 1. If we have base64 audio from backend, queue it
    if (base64Audio) {
      audioQueue.current.push({ audioBase64: base64Audio, mimeType });
      if (!isPlaying.current) {
        playNextInQueue();
      }
      return;
    }

    // Stop any currently playing non-queued TTS (e.g. browser synth or older OpenAI call)
    if (ttsAudioRef.current && !isPlaying.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const trimmedText = text.trim();
    if (trimmedText && user) {
      try {
        const response = await authenticatedFetch(apiUrl('/api/v1/tts/speak'), {
          method: 'POST',
          body: JSON.stringify({
            text: trimmedText,
            language: lang,
            character,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.audio_base64) {
            audioQueue.current.push({
              audioBase64: data.audio_base64,
              mimeType: data.mime_type || 'audio/wav',
            });
            if (!isPlaying.current) {
              playNextInQueue();
            }
            return;
          }
        }
      } catch (err) {
        console.warn('[TTS] Backend TTS failed:', err);
      }
    }

    speakWithBrowser(trimmedText, lang === 'vi' ? 'vi-VN' : 'en-US');
  }, [authenticatedFetch, user, speakWithBrowser, playNextInQueue]);

  const stopSpeaking = useCallback(() => {
    audioQueue.current = [];
    isPlaying.current = false;
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
