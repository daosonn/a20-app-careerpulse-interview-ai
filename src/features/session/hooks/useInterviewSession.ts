import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../../lib/firebase';
import { processInterviewTurn, generateSessionSummary, generateOpeningMessage, INTERVIEW_PHASES, transcribeAudio as whisperTranscribe } from '../../../lib/gemini';
import { useAuth } from '../../auth';
import { SessionData, InterviewTurn } from '../types';

export function useInterviewSession(id: string | undefined, speakText: (text: string, lang: string) => Promise<void>) {
  const { user } = useAuth();
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
      const docRef = doc(db, 'interview_sessions', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const sessionData = docSnap.data() as SessionData;
        setSession({ ...sessionData, id: docSnap.id });
        
        const q = query(
          collection(db, 'interview_turns'),
          where('sessionId', '==', id),
          where('userId', '==', user.uid)
        );
        const turnsSnap = await getDocs(q);
        const loadedTurns = turnsSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as InterviewTurn))
          .sort((a, b) => a.turnOrder - b.turnOrder);
          
        setTurns(loadedTurns);

        if (sessionData.status === 'setup' || (sessionData.status === 'in_progress' && loadedTurns.length === 0)) {
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
          const lastTurn = loadedTurns[loadedTurns.length - 1];
          setCurrentPhase(lastTurn.phase || 1);
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
  }, [id, user, speakText]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const endSession = useCallback(async () => {
    if (!session || !id) return;
    setIsProcessing(true);
    try {
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
  }, [session, id, turns, navigate]);

  const submitAnswer = useCallback(async (answerText: string, audioBlob?: Blob | null, audioUrl?: string | null) => {
    if (!session || !user || !id) return;
    setIsProcessing(true);
    setError('');

    let finalAnswer = answerText.trim();

    // transcribed via hook or need whisper
    if (!finalAnswer && audioBlob) {
        try {
            finalAnswer = await whisperTranscribe(audioBlob, session.language);
        } catch (err) {
            setError(session.language === 'vi' ? 'Lỗi chuyển giọng nói thành văn bản.' : 'Speech-to-text failed.');
            setIsProcessing(false);
            return;
        }
    }

    if (!finalAnswer) {
      setError(session.language === 'vi' ? 'Chưa ghi nhận được câu trả lời.' : 'No answer detected.');
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
      audioUrl: audioUrl || undefined,
      phase: currentPhase,
      phaseName: INTERVIEW_PHASES[currentPhase - 1]?.[session.language === 'vi' ? 'vi' : 'en'] || '',
    };
    
    setTurns(prev => [...prev, pendingTurn]);
    setCurrentQuestion('');

    try {
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
        finalAnswer,
        currentPhase
      );

      const newTurn = {
        sessionId: session.id,
        userId: user.uid,
        turnOrder,
        question: currentQuestion,
        answer: finalAnswer,
        phase: result.phase || currentPhase,
        phaseName: result.phaseName || '',
        evaluation: result.evaluation || null,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'interview_turns'), newTurn);
      
      setTurns(prev => prev.map(t => 
        t.id === tempId 
          ? { ...t, id: docRef.id, evaluation: result.evaluation || null, phase: result.phase || currentPhase, phaseName: result.phaseName || '' }
          : t
      ));
      
      const fallbackQuestion = session.language === 'vi' ? 'Bạn có thể chia sẻ thêm được không?' : 'Could you share more about that?';
      setCurrentPhase(result.phase || currentPhase);
      setCurrentQuestion(result.nextQuestion || fallbackQuestion);
      speakText(result.nextQuestion || fallbackQuestion, session.language);

      if (result.shouldEndInterview) {
        await endSession();
      }
    } catch (err: any) {
      setError(err?.message || 'Unknown error');
      setTurns(prev => prev.filter(t => t.id !== tempId));
      setCurrentQuestion(pendingTurn.question);
    } finally {
      setIsProcessing(false);
    }
  }, [session, user, id, turns, currentQuestion, currentPhase, speakText, endSession]);

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
