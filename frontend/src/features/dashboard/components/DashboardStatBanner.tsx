import { TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { Card } from '../../../components/ui';

export interface DashboardStatBannerProps {
  /** Percentage delta vs. previous session. Null when fewer than 2 scored sessions exist. */
  recentDeltaPct: number | null;
  /** Most recent average score (0..5). Null when no scored sessions exist. */
  latestScore: number | null;
  /** Total evaluated turns to-date. Used to decide the variant. */
  evaluatedTurnCount: number;
  /** Display name of the user (for empowering fallback copy). */
  userName?: string | null;
}

/**
 * Premium stat banner shown at the top of the Dashboard.
 *
 * Three display modes:
 *  - delta      — 2+ scored sessions; highlights improvement/regression %
 *  - score      — exactly 1 scored session; shows the latest score
 *  - kickoff    — no scored sessions yet; empowering welcome copy
 */
export function DashboardStatBanner({
  recentDeltaPct,
  latestScore,
  evaluatedTurnCount,
  userName,
}: DashboardStatBannerProps) {
  // Kickoff mode: no evaluated turns yet.
  if (evaluatedTurnCount === 0 || latestScore === null) {
    return (
      <Card variant="highlighted" padding="lg" className="overflow-hidden">
        <div className="flex items-center gap-5">
          <span
            className="hidden sm:inline-flex w-14 h-14 rounded-full bg-gold-500/10 border border-gold-500/40 items-center justify-center shrink-0"
            aria-hidden
          >
            <Sparkles className="w-6 h-6 text-gold-400" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-400 mb-2">
              Chào mừng
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl leading-tight text-text-primary">
              {userName ? `Sẵn sàng bứt phá, ${userName}?` : 'Sẵn sàng bứt phá?'}
            </h2>
            <p className="text-sm text-text-muted mt-2 max-w-xl leading-relaxed">
              Hoàn thành phiên phỏng vấn đầu tiên để AI bắt đầu lập bản đồ năng
              lực của bạn và tinh chỉnh lộ trình luyện tập.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Score-only mode: exactly one scored session.
  if (recentDeltaPct === null) {
    return (
      <Card variant="highlighted" padding="lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-400 mb-2">
              Bắt đầu hành trình
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl leading-tight text-text-primary">
              Điểm trung bình hiện tại: {latestScore.toFixed(1)}
              <span className="text-gold-400">/5</span>
            </h2>
            <p className="text-sm text-text-muted mt-2 leading-relaxed max-w-xl">
              Đây là cột mốc đầu tiên. Mỗi phiên tiếp theo sẽ giúp AI tinh
              chỉnh phản hồi theo đúng điểm yếu của bạn.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Delta mode: 2+ scored sessions.
  const improved = recentDeltaPct >= 0;
  const magnitude = Math.abs(recentDeltaPct);
  const Arrow = improved ? TrendingUp : TrendingDown;
  const label = improved ? 'Tiến bộ tuần qua' : 'Cần chú ý tuần qua';

  return (
    <Card variant="highlighted" padding="lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-400 mb-2 flex items-center gap-2">
            <Arrow className="w-3.5 h-3.5" aria-hidden />
            {label}
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl leading-tight text-text-primary">
            Chỉ số tự tin của bạn{' '}
            <span className={improved ? 'text-gold-400' : 'text-status-warning'}>
              {improved ? 'tăng' : 'giảm'} {magnitude.toFixed(0)}%
            </span>
          </h2>
          <p className="text-sm text-text-muted mt-3 leading-relaxed max-w-xl">
            So với phiên phỏng vấn gần nhất. Điểm trung bình hiện tại:{' '}
            <span className="text-text-primary font-semibold">
              {latestScore.toFixed(1)}/5
            </span>
            .
          </p>
        </div>
        <div className="shrink-0 self-start sm:self-center">
          <div
            className="w-20 h-20 rounded-full bg-gold-500/10 border border-gold-500/40 flex items-center justify-center"
            aria-hidden
          >
            <Arrow className="w-8 h-8 text-gold-400" />
          </div>
        </div>
      </div>
    </Card>
  );
}
