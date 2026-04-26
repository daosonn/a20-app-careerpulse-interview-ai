import { motion } from 'motion/react';
import { Activity } from 'lucide-react';

interface Props {
  level?: number; // 0–100
  isVi?: boolean;
}

// SVG semi-circle gauge
// Center: (100, 104), Radius: 82
// Arc: M 18 104 A 82 82 0 0 0 182 104  (sweep=0 = CCW = top semi-circle)
// Color boundaries:
//   33% → θ=120.6° → (58, 33)
//   66% → θ=61.2°  → (142, 31)
const CX = 100, CY = 104, R = 82;
const PT33 = { x: 58, y: 33 };
const PT66 = { x: 142, y: 31 };

export function StressGauge({ level = 30, isVi = false }: Props) {
  // Needle: -90° = full left (0%), 0° = top (50%), +90° = full right (100%)
  const needleRotation = level * 1.8 - 90;

  const label = isVi
    ? level < 33 ? 'Bình tĩnh' : level < 66 ? 'Vừa phải' : 'Căng thẳng'
    : level < 33 ? 'Calm'       : level < 66 ? 'Moderate'  : 'High';

  const color = level < 33 ? '#4ade80' : level < 66 ? '#fbbf24' : '#f87171';

  return (
    <div className="absolute bottom-5 left-5 z-20 flex w-52 flex-col items-center rounded-[1.4rem] border border-cyan-300/20 bg-navy-950/65 px-4 pb-3.5 pt-3 shadow-[0_0_28px_rgba(34,211,238,.13)] backdrop-blur-xl">
      {/* Header */}
      <div className="mb-1.5 flex items-center gap-1.5 self-start">
        <Activity size={11} className="text-cyan-300/70" />
        <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-cyan-300/70">
          {isVi ? 'Mức độ stress' : 'Stress Level'}
        </p>
      </div>

      {/* SVG gauge */}
      <div className="w-36">
        <svg viewBox="0 0 200 114" className="w-full overflow-visible drop-shadow-lg">
          {/* Background track */}
          <path
            d={`M 18 ${CY} A ${R} ${R} 0 0 0 182 ${CY}`}
            stroke="rgba(30,58,95,0.9)"
            strokeWidth="15"
            fill="none"
            strokeLinecap="round"
          />
          {/* Calm — green */}
          <path
            d={`M 18 ${CY} A ${R} ${R} 0 0 0 ${PT33.x} ${PT33.y}`}
            stroke="#4ade80"
            strokeWidth="15"
            fill="none"
            strokeLinecap="round"
            opacity="0.75"
          />
          {/* Moderate — amber */}
          <path
            d={`M ${PT33.x} ${PT33.y} A ${R} ${R} 0 0 0 ${PT66.x} ${PT66.y}`}
            stroke="#fbbf24"
            strokeWidth="15"
            fill="none"
            strokeLinecap="round"
            opacity="0.75"
          />
          {/* High — red */}
          <path
            d={`M ${PT66.x} ${PT66.y} A ${R} ${R} 0 0 0 182 ${CY}`}
            stroke="#f87171"
            strokeWidth="15"
            fill="none"
            strokeLinecap="round"
            opacity="0.75"
          />

          {/* Needle */}
          <motion.g
            animate={{ rotate: needleRotation }}
            transition={{ type: 'spring', stiffness: 50, damping: 18 }}
            style={{ transformOrigin: `${CX}px ${CY}px` }}
          >
            <line
              x1={CX} y1={CY}
              x2={CX} y2={CY - 68}
              stroke="rgba(255,255,255,0.92)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx={CX} cy={CY - 68} r="3" fill="white" opacity="0.5" />
          </motion.g>

          {/* Cap */}
          <circle cx={CX} cy={CY} r="9" fill="#0b1628" stroke="#22d3ee" strokeWidth="1.5" opacity="0.9" />
          <circle cx={CX} cy={CY} r="3.5" fill="#22d3ee" opacity="0.65" />
        </svg>
      </div>

      {/* Label */}
      <div className="-mt-1 text-center">
        <p className="font-headline text-sm font-bold" style={{ color }}>{label}</p>
        <p className="font-headline text-[10px] text-text-muted">{Math.round(level)} / 100</p>
      </div>

      {/* Heartbeat strip */}
      <div className="mt-2 flex items-center gap-1">
        <div className="h-px w-3 rounded bg-status-success/40" />
        {[2, 4, 8, 12, 6, 3, 10, 5, 2].map((h, i) => (
          <div
            key={i}
            className="w-px rounded bg-status-success"
            style={{ height: h, opacity: 0.5 + h / 24 }}
          />
        ))}
        <div className="h-px w-3 rounded bg-status-success/40" />
        <span className="ml-1 font-headline text-[8px] uppercase tracking-wider text-status-success/60">Live</span>
      </div>
    </div>
  );
}
