import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth';
import { SessionData, InterviewTurn } from '../types';
import { apiUrl } from '../../../lib/api';

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = await response.json();
    if (payload?.detail) {
      return payload.detail;
    }
  } catch {
    // Ignore parse failures and keep fallback.
  }
  return fallback;
}

export function useInterviewSession(id: string | undefined, speakText: (text: string, lang: string) => Promise<void>) {
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

  const loadData = useCallback(async () => {
    if (!id || !user) return;
    try {
      const response = await authenticatedFetch(apiUrl(`/api/v1/history/${id}`));
      if (!response.ok) throw new Error(await parseErrorMessage(response, 'Could not load session'));
      
      const data = await response.json();
      setSession(data);
      
      // Map transcript to turns
      const loadedTurns = (data.transcript || []).map((t: any, idx: number) => ({
        id: `turn-${idx}`,
        turnOrder: idx + 1,
        question: t.role === 'model' ? t.content : '',
        answer: t.role === 'user' ? t.content : '',
        tip: t.tip || '',
      }));
      setTurns(loadedTurns);
      if (loadedTurns.length > 0 && data.status === 'in_progress') {
          // Try to find the last AI tip if available in history (if stored)
          // For now we assume fresh tips for fresh questions
      }

      if (data.status === 'setup' || (data.status === 'in_progress' && loadedTurns.length === 0)) {
        // Start interview on backend
        const startResp = await authenticatedFetch(apiUrl(`/api/v1/interview/start?session_id=${id}`), {
          method: 'POST'
        });
        if (startResp.ok) {
          const startData = await startResp.json();
          setCurrentQuestion(startData.first_question);
          setCurrentTip(startData.tip || '');
          setCurrentPhase(startData.current_phase || 1);
          speakText(startData.first_question, data.language);
        } else {
          setError(await parseErrorMessage(startResp, 'Failed to start interview session.'));
        }
      } else if (data.status === 'completed') {
         setCurrentQuestion(data.language === 'vi' ? "Buổi phỏng vấn đã kết thúc." : "The interview has ended.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load interview session.");
    } finally {
      setLoading(false);
    }
  }, [id, user, speakText, authenticatedFetch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const endSession = useCallback(async (currentHistory: any[]) => {
    if (!session || !id) return;
    setIsProcessing(true);
    
    const mappedHistory: {role: string, content: string}[] = [];
    currentHistory.forEach(turn => {
      if (turn.question) mappedHistory.push({ role: 'model', content: turn.question });
      if (turn.answer) mappedHistory.push({ role: 'user', content: turn.answer });
    });

    try {
      const response = await authenticatedFetch(apiUrl('/api/v1/interview/end'), {
        method: 'POST',
        body: JSON.stringify({
          session_id: id,
          history: mappedHistory,
          cv_text: session.cvText,
          jd_text: session.jobDescription,
          interview_type: session.interviewType,
          language: session.language,
          evaluations: [] // Backend handles this now
        })
      });

      if (response.ok) {
        navigate(`/session/${id}/summary`);
      } else {
        setError(await parseErrorMessage(response, 'Failed to end session properly.'));
      }
    } catch (err) {
      console.error(err);
      setError("Failed to end session properly.");
    } finally {
      setIsProcessing(false);
    }
  }, [session, id, navigate, authenticatedFetch]);

  const submitAnswer = useCallback(async (answerText: string, audioBlob?: Blob | null, audioUrl?: string | null) => {
    if (!session || !user || !id) return;
    setIsProcessing(true);
    setError('');

    let finalAnswer = answerText.trim();

    if (!finalAnswer && audioBlob) {
        try {
            const formData = new FormData();
            formData.append('file', audioBlob);
            const resp = await authenticatedFetch(apiUrl('/api/v1/interview/transcribe'), {
                method: 'POST',
                body: formData
            });
            if (!resp.ok) {
              setError(await parseErrorMessage(resp, 'Transcription failed.'));
              setIsProcessing(false);
              return;
            }
            const data = await resp.json();
            finalAnswer = data.text;
        } catch (err) {
            setError('Transcription failed.');
            setIsProcessing(false);
            return;
        }
    }

    if (!finalAnswer) {
      setIsProcessing(false);
      return;
    }

    const turnOrder = turns.length + 1;
    const tempId = `temp-${Date.now()}`;
    const pendingTurn: InterviewTurn = {
      id: tempId,
      turnOrder,
      question: currentQuestion,
      answer: finalAnswer,
    };
    
    setTurns(prev => [...prev, { ...pendingTurn, tip: currentTip }]);

    try {
      const response = await authenticatedFetch(apiUrl('/api/v1/interview/chat'), {
        method: 'POST',
        body: JSON.stringify({
          session_id: id,
          message: finalAnswer
        })
      });

      if (!response.ok) throw new Error(await parseErrorMessage(response, 'Chat failed'));
      const result = await response.json();

      setCurrentQuestion(result.reply);
      setCurrentTip(result.tip || '');
      setCurrentPhase(result.current_phase || currentPhase);
      speakText(result.reply, session.language);

      if (result.should_end) {
        await endSession([...turns, pendingTurn]);
      }
    } catch (err: any) {
      setError(err?.message || 'Unknown error');
      setTurns(prev => prev.filter(t => t.id !== tempId));
    } finally {
      setIsProcessing(false);
    }
  }, [session, user, id, turns, currentQuestion, currentPhase, speakText, endSession, authenticatedFetch]);

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
