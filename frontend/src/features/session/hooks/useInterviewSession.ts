import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth';
import { SessionData, InterviewTurn } from '../types';

export function useInterviewSession(id: string | undefined, speakText: (text: string, lang: string) => Promise<void>) {
  const { user, authenticatedFetch } = useAuth();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<SessionData | null>(null);
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [currentPhase, setCurrentPhase] = useState<number>(1);

  const loadData = useCallback(async () => {
    if (!id || !user) return;
    try {
      const response = await authenticatedFetch(`http://127.0.0.1:8000/api/v1/history/${id}`);
      if (!response.ok) throw new Error("Could not load session");
      
      const data = await response.json();
      setSession(data);
      
      // Map transcript to turns
      const loadedTurns = (data.transcript || []).map((t: any, idx: number) => ({
        id: `turn-${idx}`,
        turnOrder: idx + 1,
        question: t.role === 'model' ? t.content : '',
        answer: t.role === 'user' ? t.content : '',
      }));
      setTurns(loadedTurns);

      if (data.status === 'setup' || (data.status === 'in_progress' && loadedTurns.length === 0)) {
        // Start interview on backend
        const startResp = await authenticatedFetch(`http://127.0.0.1:8000/api/v1/interview/start?session_id=${id}`, {
          method: 'POST'
        });
        if (startResp.ok) {
          const startData = await startResp.json();
          setCurrentQuestion(startData.first_question);
          setCurrentPhase(startData.current_phase || 1);
          speakText(startData.first_question, data.language);
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
    try {
      const response = await authenticatedFetch(`http://127.0.0.1:8000/api/v1/interview/end`, {
        method: 'POST',
        body: JSON.stringify({
          session_id: id,
          history: currentHistory,
          cv_text: session.cvText,
          jd_text: session.jobDescription,
          interview_type: session.interviewType,
          language: session.language,
          evaluations: [] // Backend handles this now
        })
      });

      if (response.ok) {
        navigate(`/session/${id}/summary`);
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
            const resp = await authenticatedFetch(`http://127.0.0.1:8000/api/v1/interview/transcribe`, {
                method: 'POST',
                body: formData
            });
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
    
    setTurns(prev => [...prev, pendingTurn]);

    try {
      const response = await authenticatedFetch(`http://127.0.0.1:8000/api/v1/interview/chat`, {
        method: 'POST',
        body: JSON.stringify({
          session_id: id,
          message: finalAnswer
        })
      });

      if (!response.ok) throw new Error("Chat failed");
      const result = await response.json();

      setCurrentQuestion(result.reply);
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
    isProcessing,
    error,
    currentPhase,
    submitAnswer,
    endSession,
    setError
  };
}
