import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../../lib/firebase';
import { useAuth } from '../../auth';
import { Session, ChartDataPoint } from '../types';

export function useDashboardData() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch sessions
      const qSessions = query(
        collection(db, 'interview_sessions'),
        where('userId', '==', user.uid)
      );
      const sessionSnap = await getDocs(qSessions);
      const fetchedSessions = sessionSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Session[];
      
      // Sort client-side
      fetchedSessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Fetch turns to calculate scores
      const qTurns = query(
        collection(db, 'interview_turns'),
        where('userId', '==', user.uid)
      );
      const turnsSnap = await getDocs(qTurns);
      const turns = turnsSnap.docs.map(d => d.data());

      // Calculate avg score per session
      const sessionsWithScores = fetchedSessions.map(session => {
        const sessionTurns = turns.filter(t => t.sessionId === session.id && t.evaluation);
        if (sessionTurns.length === 0) return session;

        const totalScore = sessionTurns.reduce((acc, turn) => {
          const s = turn.evaluation.scores;
          return acc + (s.relevance + s.structure + s.specificity + s.clarity + s.confidence) / 5;
        }, 0);
        
        return {
          ...session,
          avgScore: totalScore / sessionTurns.length
        };
      });

      setSessions(sessionsWithScores);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'interview_sessions');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const removeSession = useCallback(async (sessionId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phiên phỏng vấn này không? Hành động này không thể hoàn tác.')) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'interview_sessions', sessionId));
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error("Error deleting session:", error);
      alert('Đã có lỗi xảy ra khi xóa phiên phỏng vấn. Vui lòng thử lại.');
    }
  }, []);

  const chartData: ChartDataPoint[] = [...sessions]
    .filter(s => s.avgScore !== undefined)
    .reverse()
    .map((s, index) => ({
      name: `Phiên ${index + 1}`,
      score: Number(s.avgScore?.toFixed(1)),
      date: new Date(s.createdAt).toLocaleDateString('vi-VN')
    }));

  return {
    sessions,
    loading,
    chartData,
    removeSession,
    refresh: fetchData,
    user
  };
}
