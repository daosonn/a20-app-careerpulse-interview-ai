import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../auth';
import { apiUrl } from '../../../lib/api';
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
  const { user, authenticatedFetch } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [competencyAverages, setCompetencyAverages] =
    useState<CompetencyAverages>(EMPTY_COMPETENCIES);
  const [evaluatedTurnCount, setEvaluatedTurnCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await authenticatedFetch(apiUrl('/api/v1/dashboard/metrics'));
      if (!response.ok) throw new Error(`Dashboard metrics failed: ${response.status}`);

      const data = await response.json();
      setSessions((data.sessions || []) as Session[]);
      setCompetencyAverages(data.competencyAverages || EMPTY_COMPETENCIES);
      setEvaluatedTurnCount(data.evaluatedTurnCount || 0);
    } catch (error) {
      console.error('Error loading dashboard metrics:', error);
      setSessions([]);
      setCompetencyAverages(EMPTY_COMPETENCIES);
      setEvaluatedTurnCount(0);
    } finally {
      setLoading(false);
    }
  }, [user, authenticatedFetch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const removeSession = useCallback(async (sessionId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phiên phỏng vấn này không? Hành động này không thể hoàn tác.')) {
      return;
    }

    try {
      const response = await authenticatedFetch(apiUrl(`/api/v1/dashboard/sessions/${sessionId}`), {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`Delete session failed: ${response.status}`);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Đã có lỗi xảy ra khi xóa phiên phỏng vấn. Vui lòng thử lại.');
    }
  }, [authenticatedFetch]);

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
