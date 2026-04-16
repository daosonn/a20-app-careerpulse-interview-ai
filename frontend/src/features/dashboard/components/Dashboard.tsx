import React from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  FileText,
  TrendingUp,
  ChevronRight,
  Trash2,
  Target,
  Sparkles,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { useDashboardData } from '../hooks/useDashboardData';
import { DashboardStatBanner } from './DashboardStatBanner';
import { Button, Card, Badge, SectionHeading } from '../../../components/ui';
import { navy, gold, text as textColors } from '../../../lib/colors';

/** Readable Vietnamese label + accent color per status. */
const STATUS_META: Record<string, { label: string; variant: 'gold' | 'warning' | 'navy' }> = {
  completed: { label: 'Hoàn thành', variant: 'gold' },
  in_progress: { label: 'Đang diễn ra', variant: 'warning' },
  created: { label: 'Mới tạo', variant: 'navy' },
};

export function Dashboard() {
  const {
    sessions,
    loading,
    chartData,
    radarData,
    evaluatedTurnCount,
    recentDeltaPct,
    latestScore,
    removeSession,
    user,
  } = useDashboardData();

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    removeSession(sessionId);
  };

  return (
    <div className="px-4 sm:px-8 lg:px-12 py-8 sm:py-10 space-y-10 max-w-7xl mx-auto">
      {/* ---------- Greeting + primary CTA ---------- */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <SectionHeading
          label="Bảng điều khiển"
          title={
            <>
              Chào {user?.displayName?.split(' ').slice(-1)[0] || 'bạn'},
              <br className="hidden sm:block" />
              sẵn sàng cho buổi luyện hôm nay?
            </>
          }
          subtitle="Tiếp tục từ nơi bạn đã dừng lại. AI đã chuẩn bị những câu hỏi mới dựa trên điểm cần cải thiện."
          size="lg"
        />
        <Link to="/setup" className="shrink-0">
          <Button variant="primary" size="lg" className="shadow-lg">
            <Plus className="w-5 h-5" aria-hidden />
            Bắt đầu phỏng vấn mới
          </Button>
        </Link>
      </header>

      {loading ? (
        <DashboardSkeleton />
      ) : sessions.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* ---------- Stat banner ---------- */}
          <DashboardStatBanner
            recentDeltaPct={recentDeltaPct}
            latestScore={latestScore}
            evaluatedTurnCount={evaluatedTurnCount}
            userName={user?.displayName?.split(' ').slice(-1)[0] ?? null}
          />

          {/* ---------- Charts row ---------- */}
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Skill Evolution — spans 3 on lg */}
            <Card variant="dark" padding="lg" className="lg:col-span-3">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex w-9 h-9 rounded-full bg-gold-500/10 border border-gold-500/30 items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-gold-400" aria-hidden />
                  </span>
                  <h3 className="font-serif text-xl text-text-primary leading-tight">
                    Diễn tiến điểm số
                  </h3>
                </div>
                <Badge variant="gold-outline">Gần đây</Badge>
              </div>

              {chartData.length > 1 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 5, right: 16, bottom: 5, left: -8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 6"
                        vertical={false}
                        stroke={navy[600]}
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: textColors.muted, fontSize: 12 }}
                        dy={8}
                      />
                      <YAxis
                        domain={[0, 5]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: textColors.muted, fontSize: 12 }}
                        dx={-4}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '10px',
                          border: `1px solid ${navy[600]}`,
                          backgroundColor: navy[800],
                          color: textColors.primary,
                          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                        }}
                        labelStyle={{
                          color: gold[400],
                          fontWeight: 600,
                          marginBottom: '4px',
                        }}
                        itemStyle={{ color: textColors.primary }}
                        cursor={{ stroke: gold[500], strokeOpacity: 0.25 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        name="Điểm trung bình"
                        stroke={gold[500]}
                        strokeWidth={2.5}
                        dot={{
                          r: 4,
                          fill: gold[500],
                          strokeWidth: 2,
                          stroke: navy[950],
                        }}
                        activeDot={{
                          r: 6,
                          fill: gold[400],
                          stroke: navy[950],
                          strokeWidth: 2,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 w-full flex flex-col items-center justify-center text-center rounded-lg border border-dashed border-navy-600 text-text-muted px-4">
                  <TrendingUp className="w-7 h-7 text-gold-400/60 mb-3" aria-hidden />
                  <p className="text-sm leading-relaxed max-w-xs">
                    Cần ít nhất 2 phiên đã đánh giá để vẽ biểu đồ tiến trình.
                  </p>
                </div>
              )}
            </Card>

            {/* Competency Radar — spans 2 on lg */}
            <Card variant="dark" padding="lg" className="lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-6">
                <span className="inline-flex w-9 h-9 rounded-full bg-gold-500/10 border border-gold-500/30 items-center justify-center">
                  <Target className="w-4 h-4 text-gold-400" aria-hidden />
                </span>
                <h3 className="font-serif text-xl text-text-primary leading-tight">
                  Năng lực cốt lõi
                </h3>
              </div>

              {evaluatedTurnCount > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      data={radarData}
                      margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
                    >
                      <PolarGrid stroke={navy[600]} />
                      <PolarAngleAxis
                        dataKey="competency"
                        tick={{ fill: textColors.muted, fontSize: 11 }}
                      />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 5]}
                        tick={false}
                        axisLine={false}
                      />
                      <Radar
                        name="Bạn"
                        dataKey="score"
                        stroke={gold[500]}
                        fill={gold[500]}
                        fillOpacity={0.35}
                        strokeWidth={2}
                        dot={{ r: 3, fill: gold[400], strokeWidth: 0 }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '10px',
                          border: `1px solid ${navy[600]}`,
                          backgroundColor: navy[800],
                          color: textColors.primary,
                        }}
                        labelStyle={{ color: gold[400], fontWeight: 600 }}
                        itemStyle={{ color: textColors.primary }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 w-full flex flex-col items-center justify-center text-center rounded-lg border border-dashed border-navy-600 text-text-muted px-4">
                  <Target className="w-7 h-7 text-gold-400/60 mb-3" aria-hidden />
                  <p className="text-sm leading-relaxed max-w-xs">
                    Hoàn thành vài câu trả lời có đánh giá để dựng bản đồ năng
                    lực.
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* ---------- Recent Missions ---------- */}
          <section>
            <div className="flex items-end justify-between mb-5">
              <h2 className="font-serif text-2xl text-text-primary leading-tight">
                Phiên gần đây
              </h2>
              <span className="text-xs font-medium text-text-muted">
                {sessions.length} phiên
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {sessions.map((session) => {
                const statusMeta = STATUS_META[session.status] ?? STATUS_META.created;
                const to =
                  session.status === 'completed'
                    ? `/session/${session.id}/summary`
                    : `/session/${session.id}`;

                return (
                  <Link
                    key={session.id}
                    to={to}
                    className="group"
                  >
                    <Card
                      variant="dark"
                      padding="md"
                      className="h-full transition-all hover:border-gold-500/60 hover:shadow-[0_0_24px_-8px_rgba(201,169,97,0.25)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Score badge */}
                        <div
                          className={
                            'w-14 h-14 shrink-0 rounded-full flex items-center justify-center font-serif text-xl font-semibold border ' +
                            (session.avgScore
                              ? 'bg-gold-500/10 border-gold-500/50 text-gold-300'
                              : 'bg-navy-700 border-navy-600 text-text-muted')
                          }
                        >
                          {session.avgScore ? session.avgScore.toFixed(1) : '—'}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-text-primary line-clamp-1 leading-tight">
                            {session.jobDescription.substring(0, 60) || 'Phiên phỏng vấn'}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="text-xs text-text-muted">
                              {new Date(session.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                            <span className="text-text-muted/50 text-xs">•</span>
                            <Badge variant={statusMeta.variant}>
                              {statusMeta.label}
                            </Badge>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <Badge variant="navy">{session.interviewType}</Badge>
                          </div>
                        </div>

                        <div className="flex items-center shrink-0 -mr-1">
                          <button
                            onClick={(e) => handleDeleteSession(e, session.id)}
                            className="p-2 rounded-lg text-text-muted hover:text-status-error hover:bg-status-error/10 transition-colors opacity-60 group-hover:opacity-100"
                            title="Xóa phiên phỏng vấn"
                            aria-label="Xóa phiên phỏng vấn"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden />
                          </button>
                          <ChevronRight
                            className="w-5 h-5 text-text-muted/40 group-hover:text-gold-400 group-hover:translate-x-0.5 transition-all"
                            aria-hidden
                          />
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* ---------- Recommended path CTA ---------- */}
          <Card
            variant="highlighted"
            padding="lg"
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5"
          >
            <div className="flex items-center gap-4 min-w-0">
              <span className="inline-flex w-12 h-12 rounded-full bg-gold-500/15 border border-gold-500/40 items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-gold-400" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-400 mb-1">
                  Lộ trình gợi ý
                </p>
                <p className="font-serif text-lg text-text-primary leading-tight">
                  Thử thách tư duy chiến lược tiếp theo
                </p>
              </div>
            </div>
            <Link to="/setup" className="shrink-0">
              <Button variant="secondary" size="md">
                Bắt đầu thử thách
                <ChevronRight className="w-4 h-4" aria-hidden />
              </Button>
            </Link>
          </Card>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state + skeleton                                            */
/* ------------------------------------------------------------------ */

function EmptyState() {
  return (
    <Card variant="dark" padding="lg" className="text-center">
      <div className="max-w-md mx-auto py-10">
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-gold-500/10 border border-gold-500/40 flex items-center justify-center">
          <FileText className="w-7 h-7 text-gold-400" aria-hidden />
        </div>
        <h3 className="font-serif text-2xl text-text-primary mb-2">
          Chưa có phiên phỏng vấn nào
        </h3>
        <p className="text-text-muted leading-relaxed mb-8">
          Bắt đầu luyện tập ngay hôm nay để cải thiện kỹ năng phỏng vấn của bạn
          với AI Coach.
        </p>
        <Link to="/setup">
          <Button variant="primary" size="lg">
            Bắt đầu ngay
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-28 rounded-xl bg-navy-800 border border-navy-600 animate-pulse" />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="h-64 lg:col-span-3 rounded-xl bg-navy-800 border border-navy-600 animate-pulse" />
        <div className="h-64 lg:col-span-2 rounded-xl bg-navy-800 border border-navy-600 animate-pulse" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-32 rounded-xl bg-navy-800 border border-navy-600 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
