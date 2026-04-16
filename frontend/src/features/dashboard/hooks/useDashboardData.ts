import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../../lib/firebase';
import { useAuth } from '../../auth';
import {
  Session,
  ChartDataPoint,
  CompetencyAverages,
  RadarDataPoint,
} from '../types';

const EMPTY_COMPETENCIES: CompetencyAverages = {
  relevance: 0,
  structure: 0,
  specificity: 0,
  clarity: 0,
  confidence: 0,
};

/** Label each competency key in Vietnamese for the radar chart. */
const COMPETENCY_LABELS_VI: Record<keyof CompetencyAverages, string> = {
  relevance: 'Liên quan',
  structure: 'Cấu trúc',
  specificity: 'Chi tiết',
  clarity: 'Rõ ràng',
  confidence: 'Tự tin',
};

export function useDashboardData() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [competencyAverages, setCompetencyAverages] =
    useState<CompetencyAverages>(EMPTY_COMPETENCIES);
  const [evaluatedTurnCount, setEvaluatedTurnCount] = useState(0);
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

      // Aggregate per-competency averages across ALL evaluated turns.
      const evaluatedTurns = turns.filter(t => t?.evaluation?.scores);
      setEvaluatedTurnCount(evaluatedTurns.length);

      if (evaluatedTurns.length > 0) {
        const sums: CompetencyAverages = { ...EMPTY_COMPETENCIES };
        for (const turn of evaluatedTurns) {
          const s = turn.evaluation.scores;
          sums.relevance += s.relevance;
          sums.structure += s.structure;
          sums.specificity += s.specificity;
          sums.clarity += s.clarity;
          sums.confidence += s.confidence;
        }
        const n = evaluatedTurns.length;
        setCompetencyAverages({
          relevance: sums.relevance / n,
          structure: sums.structure / n,
          specificity: sums.specificity / n,
          clarity: sums.clarity / n,
          confidence: sums.confidence / n,
        });
      } else {
        setCompetencyAverages(EMPTY_COMPETENCIES);
      }
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

  /** Radar-chart-ready data (scores on a 0..5 scale). */
  const radarData: RadarDataPoint[] = (
    Object.keys(COMPETENCY_LABELS_VI) as (keyof CompetencyAverages)[]
  ).map((key) => ({
    competency: COMPETENCY_LABELS_VI[key],
    score: Number(competencyAverages[key].toFixed(2)),
    fullMark: 5,
  }));

  /**
   * Delta between the two most recent scored sessions, as a percentage.
   * Returns null when fewer than two scored sessions exist.
   */
  const recentDeltaPct: number | null = (() => {
    const scored = sessions.filter((s) => s.avgScore !== undefined);
    if (scored.length < 2) return null;
    const latest = scored[0].avgScore!;
    const prior = scored[1].avgScore!;
    if (prior === 0) return null;
    return ((latest - prior) / prior) * 100;
  })();

  /** Score of the most recent scored session (0..5), or null if none. */
  const latestScore: number | null = (() => {
    const scored = sessions.filter((s) => s.avgScore !== undefined);
    return scored.length ? scored[0].avgScore! : null;
  })();

  return {
    sessions,
    loading,
    chartData,
    radarData,
    competencyAverages,
    evaluatedTurnCount,
    recentDeltaPct,
    latestScore,
    removeSession,
    refresh: fetchData,
    user,
  };
}
