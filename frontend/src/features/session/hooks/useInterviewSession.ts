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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeEvaluation(value: unknown): Record<string, unknown> | null {
  if (isPlainObject(value)) return value;
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return isPlainObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function fetchSessionDetailWithRetry(
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>,
  sessionId: string,
): Promise<Response> {
  let lastResponse: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await authenticatedFetch(apiUrl(`/api/v1/history/${sessionId}`));
    if (response.ok) return response;
    lastResponse = response;
    if (![404, 409, 500, 502, 503, 504].includes(response.status)) break;
    await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
  }
  return lastResponse!;
}

export function useInterviewSession(
  id: string | undefined,
  speakText: (
    text: string,
    lang: string,
    base64?: string,
    mimeType?: string,
    character?: string,
  ) => Promise<void>,
) {
  const { user, authenticatedFetch } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState<SessionData | null>(null);
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentTip, setCurrentTip] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [currentPhase, setCurrentPhase] = useState<number | string>(1);
  const [currentQuestionType, setCurrentQuestionType] = useState<'warmup' | 'main' | 'candidate_qa'>('warmup');
  const [activeAttempt, setActiveAttempt] = useState(0);
  const [planStatus, setPlanStatus] = useState<'pending' | 'ready' | 'failed'>('pending');
  const [gateReason, setGateReason] = useState('');
  const [questionProgress, setQuestionProgress] = useState({ index: 0, total: 5 });

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
              speakText('', lang, data.c, data.mime_type, data.character);
            } else if (data.type === 'm') {
              // Metadata
              if (data.tip) setCurrentTip(data.tip);
              if (data.phase) setCurrentPhase(data.phase);
              if (data.question_type === 'warmup' || data.question_type === 'main' || data.question_type === 'candidate_qa') {
                setCurrentQuestionType(data.question_type);
              }
              if (typeof data.attempt === 'number') setActiveAttempt(data.attempt);
              if (data.plan_status === 'pending' || data.plan_status === 'ready' || data.plan_status === 'failed') {
                setPlanStatus(data.plan_status);
              }
              setGateReason(data.gate_reason || '');
              if (typeof data.question_index === 'number' && typeof data.total_questions === 'number') {
                setQuestionProgress({ index: data.question_index, total: data.total_questions });
              }
              if (data.gate_result || data.evaluation_status) {
                setTurns(prev => {
                  if (prev.length === 0) return prev;
                  const next = [...prev];
                  const last = next[next.length - 1];
                  next[next.length - 1] = {
                    ...last,
                    gateResult: data.gate_result || last.gateResult,
                    evaluationStatus: data.evaluation_status || last.evaluationStatus,
                    skippedAfterRetries: Boolean(data.gate_result && data.gate_result.pass === false && data.attempt > 2) || last.skippedAfterRetries,
                  };
                  return next;
                });
              }
              if (data.evaluations && data.evaluations.length > 0) {
                const ev = data.evaluations[0];
                setTurns(prev => {
                  const newTurns = [...prev];
                  if (newTurns.length > 0) {
                    newTurns[newTurns.length - 1] = {
                      ...newTurns[newTurns.length - 1],
                      evaluation: ev,
                      evaluationStatus: 'ready',
                    };
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

  const isStartingRef = useRef(false);

  const loadData = useCallback(async () => {
    if (!id || !user || isStartingRef.current) return;
    isStartingRef.current = true; // Block further calls immediately

    if (!/^\d+$/.test(id)) {
      setError(`Session id không hợp lệ: ${id}`);
      setLoading(false);
      isStartingRef.current = false;
      return;
    }
    try {
      const response = await fetchSessionDetailWithRetry(authenticatedFetch, id);
      if (!response.ok) throw new Error(await parseErrorMessage(response, 'Could not load session'));

      const data = await response.json();
      setSession(data);
      if (data.planStatus === 'pending' || data.planStatus === 'ready' || data.planStatus === 'failed') {
        setPlanStatus(data.planStatus);
      }
      setQuestionProgress({
        index: 0,
        total: data.questionCount || data.predictedQuestions?.length || 5,
      });

      const transcript = data.transcript || [];
      const loadedTurns: InterviewTurn[] = Array.isArray(data.turns)
        ? [...data.turns].sort((a, b) => a.turnOrder - b.turnOrder)
        : [];
      let pendingQuestion = '';
      let pendingTip = '';

      if (loadedTurns.length === 0) {
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
              pendingQuestion = msg.content;
              pendingTip = msg.tip || '';
            }
          }
        }
      } else {
        const lastMessage = transcript[transcript.length - 1];
        if (lastMessage && (lastMessage.role === 'model' || lastMessage.role === 'ai')) {
          pendingQuestion = lastMessage.content;
          pendingTip = lastMessage.tip || '';
        }
      }
      setTurns(loadedTurns);
      if (pendingQuestion) {
        setCurrentQuestion(pendingQuestion);
        setCurrentTip(pendingTip);
      }

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
          // Allow retrying if the start request itself failed
          isStartingRef.current = false;
        }
        setIsProcessing(false);
      } else if (data.status === 'completed') {
        setCurrentQuestion(data.language === 'vi' ? "Buổi phỏng vấn đã kết thúc." : "The interview has ended.");
      }
    } catch (err) {
      console.error(err);
      setError((err as Error)?.message || "Failed to load interview session.");
      // Reset on error to allow the effect to potentially retry or be manually re-run
      isStartingRef.current = false;
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

    const allEvaluations = historyToUse
      .map(turn => normalizeEvaluation(turn.evaluation))
      .filter((evaluation): evaluation is Record<string, unknown> => evaluation !== null);

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

  const submitAnswer = useCallback(async (answerText: string, audioBlob?: Blob | null, audioUrl?: string | null) => {
    if (!session || !user || !id) return;
    setIsProcessing(true);
    setError('');

    const turnOrder = turns.length + 1;
    const tempId = `temp-${Date.now()}`;
    const questionAsked = currentQuestion;
    const tipGiven = currentTip;

    if (answerText.trim()) {
      setTurns(prev => [...prev, {
        id: tempId,
        turnOrder,
        question: questionAsked,
        answer: answerText.trim(),
        tip: tipGiven,
        audioUrl: audioUrl || undefined,
        questionType: currentQuestionType,
        isWarmup: currentQuestionType === 'warmup',
        attempt: activeAttempt,
        evaluationStatus: currentQuestionType === 'main' ? 'pending' : undefined,
      }]);
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
  }, [session, user, id, turns, currentQuestion, currentTip, currentQuestionType, activeAttempt, handleStream, authenticatedFetch, endSession]);


  return {
    session,
    turns,
    loading,
    currentQuestion,
    currentTip,
    isProcessing,
    error,
    currentPhase,
    currentQuestionType,
    activeAttempt,
    planStatus,
    gateReason,
    questionProgress,
    submitAnswer,
    endSession,
    setError
  };
}
