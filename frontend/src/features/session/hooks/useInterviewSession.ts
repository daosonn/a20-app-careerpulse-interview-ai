import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth';
import { SessionData, InterviewTurn } from '../types';
import { apiUrl } from '../../../lib/api';

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = await response.json();
    if (payload?.detail) {
      if (Array.isArray(payload.detail)) {
        // Handle validation errors from Pydantic
        return payload.detail.map((err: any) => `${err.loc.join('.')}: ${err.msg}`).join('; ');
      }
      return typeof payload.detail === 'string' ? payload.detail : JSON.stringify(payload.detail);
    }
  } catch {
    // Ignore parse failures and keep fallback.
  }
  return fallback;
}

export function useInterviewSession(id: string | undefined, speakText: (text: string, lang: string, base64?: string) => Promise<void>) {
  const { user, authenticatedFetch } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState<SessionData | null>(null);
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentTip, setCurrentTip] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [currentPhase, setCurrentPhase] = useState<number>(1);

  // Use a ref to track latest turns for async callbacks
  const turnsRef = useRef<InterviewTurn[]>([]);
  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  const handleStream = useCallback(async (response: Response, lang: string) => {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let partialChunk = '';

    // Clear current state for new response
    setCurrentQuestion('');
    setCurrentTip('');

    let shouldEnd = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = (partialChunk + chunk).split('\n');
        partialChunk = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine || !cleanLine.startsWith('data: ')) continue;

          const dataStr = cleanLine.replace('data: ', '');
          if (dataStr === '[DONE]') continue;

          try {
            const data = JSON.parse(dataStr);
            console.log('[Stream] Received:', data.type, data.c ? '(content)' : '');

            if (data.type === 't') {
              // Text token
              setCurrentQuestion(prev => prev + data.c);
            } else if (data.type === 'u') {
              // User transcript (for audio messages)
              setTurns(prev => {
                const lastTurn = prev[prev.length - 1];
                if (lastTurn && lastTurn.id.startsWith('temp-') && !lastTurn.answer) {
                  return prev.map((t, idx) => idx === prev.length - 1 ? { ...t, answer: data.c } : t);
                }
                return [...prev, {
                  id: `temp-${Date.now()}`,
                  turnOrder: prev.length + 1,
                  question: '',
                  answer: data.c,
                  tip: ''
                }];
              });
            } else if (data.type === 'a') {
              // Audio base64
              speakText('', lang, data.c);
            } else if (data.type === 'm') {
              // Metadata
              if (data.tip) setCurrentTip(data.tip);
              if (data.phase) setCurrentPhase(data.phase);
              if (data.evaluations && data.evaluations.length > 0) {
                const ev = data.evaluations[0];
                setTurns(prev => {
                  const newTurns = [...prev];
                  if (newTurns.length > 0) {
                    newTurns[newTurns.length - 1].evaluation = ev;
                  }
                  return newTurns;
                });
              }
              if (data.should_end) shouldEnd = true;
            }
          } catch (e) {
            console.error('Error parsing stream chunk:', e);
          }
        }
      }
      return shouldEnd;
    } catch (err) {
      console.error('Stream reading error:', err);
      throw err;
    }
  }, [speakText]);

  const loadData = useCallback(async () => {
    if (!id || !user) return;
    try {
      const response = await authenticatedFetch(apiUrl(`/api/v1/history/${id}`));
      if (!response.ok) throw new Error(await parseErrorMessage(response, 'Could not load session'));

      const data = await response.json();
      setSession(data);

      const transcript = data.transcript || [];
      const loadedTurns: InterviewTurn[] = [];

      for (let i = 0; i < transcript.length; i++) {
        const msg = transcript[i];
        if (msg.role === 'model' || msg.role === 'ai') {
          const nextMsg = transcript[i + 1];
          if (nextMsg && nextMsg.role === 'user') {
            loadedTurns.push({
              id: `turn-${i}`,
              turnOrder: loadedTurns.length + 1,
              question: msg.content,
              answer: nextMsg.content,
              tip: msg.tip || '',
            });
            i++;
          } else {
            setCurrentQuestion(msg.content);
            setCurrentTip(msg.tip || '');
          }
        }
      }
      setTurns(loadedTurns);

      if (data.status === 'setup' || (data.status === 'in_progress' && transcript.length === 0)) {
        setLoading(false); // Show the room UI so we can see streaming tokens
        setIsProcessing(true);
        const startResp = await authenticatedFetch(apiUrl(`/api/v1/interview/start?session_id=${id}`), {
          method: 'POST'
        });
        if (startResp.ok) {
          await handleStream(startResp, data.language);
        } else {
          setError(await parseErrorMessage(startResp, 'Failed to start interview session.'));
        }
        setIsProcessing(false);
      } else if (data.status === 'completed') {
        setCurrentQuestion(data.language === 'vi' ? "Buổi phỏng vấn đã kết thúc." : "The interview has ended.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load interview session.");
    } finally {
      setLoading(false);
    }
  }, [id, user, authenticatedFetch, handleStream]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const endSession = useCallback(async (currentHistory?: any[]) => {
    if (!session || !id) return;
    setIsProcessing(true);

    // Always use the ref if no history provided to get most recent state
    const historyToUse = currentHistory || turnsRef.current;
    const mappedHistory: { role: string, content: string }[] = [];
    historyToUse.forEach(turn => {
      if (turn.question) mappedHistory.push({ role: 'model', content: turn.question });
      if (turn.answer) mappedHistory.push({ role: 'user', content: turn.answer });
    });

    const allEvaluations = historyToUse.map(turn => turn.evaluation).filter(Boolean);

    try {
      const response = await authenticatedFetch(apiUrl('/api/v1/interview/end'), {
        method: 'POST',
        body: JSON.stringify({
          session_id: id,
          message: "",
          history: mappedHistory,
          cv_text: session.cvText,
          jd_text: session.jobDescription,
          interview_type: session.interviewType,
          language: session.language,
          evaluations: allEvaluations
        })
      });

      if (response.ok) {
        navigate(`/session/${id}/summary`);
      } else {
        const errorMsg = await parseErrorMessage(response, 'Failed to end session properly.');
        setError(errorMsg);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to end session properly.");
    } finally {
      setIsProcessing(false);
    }
  }, [session, id, navigate, authenticatedFetch]); // turns removed from deps as we use turnsRef

  const submitAnswer = useCallback(async (answerText: string, audioBlob?: Blob | null) => {
    if (!session || !user || !id) return;
    setIsProcessing(true);
    setError('');

    const turnOrder = turns.length + 1;
    const tempId = `temp-${Date.now()}`;
    const questionAsked = currentQuestion;
    const tipGiven = currentTip;

    if (answerText.trim()) {
      setTurns(prev => [...prev, { id: tempId, turnOrder, question: questionAsked, answer: answerText.trim(), tip: tipGiven }]);
    }

    // Clear current question and tip immediately after recording the turn to history
    // This prevents the previous question from showing up while the new one is loading/streaming
    setCurrentQuestion('');
    setCurrentTip('');

    try {
      let response: Response;

      if (audioBlob) {
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.wav');
        response = await authenticatedFetch(apiUrl(`/api/v1/interview/transcribe-and-chat?session_id=${id}`), {
          method: 'POST',
          body: formData
        });
      } else {
        response = await authenticatedFetch(apiUrl('/api/v1/interview/chat'), {
          method: 'POST',
          body: JSON.stringify({ session_id: id, message: answerText.trim() })
        });
      }

      if (!response.ok) throw new Error(await parseErrorMessage(response, 'Chat failed'));

      const shouldEnd = await handleStream(response, session.language);
      if (shouldEnd) {
        // Slight delay so user can see the final state/question before redirection
        setTimeout(() => {
          endSession();
        }, 2500);
      }

    } catch (err: any) {
      setError(err?.message || 'Unknown error');
      if (answerText.trim()) {
        setTurns(prev => prev.filter(t => t.id !== tempId));
      }
    } finally {
      setIsProcessing(false);
    }
  }, [session, user, id, turns, currentQuestion, currentTip, handleStream, authenticatedFetch]);


  return {
    session,
    turns,
    loading,
    currentQuestion,
    currentTip,
    isProcessing,
    error,
    currentPhase,
    submitAnswer,
    endSession,
    setError
  };
}
