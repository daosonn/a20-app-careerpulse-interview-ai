import { Fragment } from 'react';
import { motion } from 'motion/react';
import { Bot, Mic } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface Interviewer {
  id: string;
  name: string;
  role: string;
  accentColor: string;
  isLead?: boolean;
}

interface CardProps {
  interviewer: Interviewer;
  isActive: boolean;
  isSpeaking: boolean;
}

function InterviewerCard({ interviewer, isActive, isSpeaking }: CardProps) {
  const { name, role, accentColor, isLead } = interviewer;

  return (
    <motion.div
      animate={{
        scale: isActive ? (isLead ? 1.06 : 1.02) : isLead ? 0.97 : 0.88,
        opacity: isActive ? 1 : 0.6,
      }}
      transition={{ type: 'spring', stiffness: 200, damping: 26 }}
      className={cn('relative flex flex-col items-center', isLead ? 'z-10' : 'z-0')}
    >
      {/* Ambient glow while speaking */}
      {isActive && isSpeaking && (
        <motion.div
          animate={{ opacity: [0.3, 0.55, 0.3] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute -inset-4 rounded-3xl blur-2xl"
          style={{ background: `radial-gradient(ellipse at center, ${accentColor}50, transparent 70%)` }}
        />
      )}

      {/* Card */}
      <div
        className={cn(
          'relative flex flex-col items-center overflow-hidden rounded-2xl border bg-navy-900/80 backdrop-blur-md transition-all duration-500',
          isLead ? 'w-36 sm:w-40' : 'w-28 sm:w-32',
        )}
        style={{
          borderColor: isActive ? `${accentColor}55` : 'rgba(255,255,255,0.08)',
          boxShadow: isActive
            ? `0 0 36px ${accentColor}20, 0 8px 32px rgba(0,0,0,0.45)`
            : '0 4px 16px rgba(0,0,0,0.3)',
        }}
      >
        {/* Avatar area */}
        <div
          className={cn(
            'relative flex w-full items-center justify-center',
            isLead ? 'h-24 sm:h-28' : 'h-18 sm:h-22',
          )}
          style={{
            background: `linear-gradient(160deg, ${accentColor}18 0%, rgba(12,22,40,0.95) 75%)`,
          }}
        >
          {/* Avatar circle */}
          <div
            className={cn(
              'flex items-center justify-center rounded-full border',
              isLead ? 'h-14 w-14' : 'h-11 w-11',
            )}
            style={{
              borderColor: `${accentColor}45`,
              background: `radial-gradient(circle at 38% 32%, ${accentColor}38, rgba(12,22,40,0.95) 65%)`,
            }}
          >
            <Bot size={isLead ? 26 : 20} style={{ color: accentColor }} />
          </div>

          {/* Speaking waveform bars */}
          {isActive && isSpeaking && (
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-[2px]">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className="w-[2px] rounded-full"
                  style={{ backgroundColor: accentColor }}
                  animate={{ height: [3, 10 + i * 2, 3] }}
                  transition={{ duration: 0.55, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}
                />
              ))}
            </div>
          )}

          {/* Mic icon */}
          <div className={cn(
            'absolute right-2 top-2 rounded-full p-1 transition-all duration-300',
            isActive ? 'bg-white/12' : 'bg-white/5',
          )}>
            <Mic size={9} style={{ color: isActive ? accentColor : 'rgba(255,255,255,0.25)' }} />
          </div>
        </div>

        {/* Info strip */}
        <div className="w-full border-t border-white/[0.07] bg-navy-950/60 px-2 py-2 text-center">
          <p
            className={cn(
              'font-headline font-bold leading-tight',
              isLead ? 'text-[11px]' : 'text-[10px]',
              isActive ? 'text-text-primary' : 'text-text-muted',
            )}
          >
            {name}
          </p>
          <p
            className="mt-0.5 font-headline text-[9px] uppercase tracking-wider"
            style={{ color: isActive ? `${accentColor}BB` : 'rgba(149,167,192,0.55)' }}
          >
            {role}
          </p>
        </div>
      </div>

      {/* Speaking badge */}
      {isActive && isSpeaking && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          className="mt-1.5 flex items-center gap-1.5 rounded-full border border-white/12 bg-navy-950/75 px-3 py-0.5 backdrop-blur"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: accentColor }} />
          <span className="font-headline text-[9px] uppercase tracking-wider text-text-muted">Speaking</span>
        </motion.div>
      )}
    </motion.div>
  );
}

interface PanelProps {
  interviewers: Interviewer[];
  activeId: string;
  isSpeaking: boolean;
}

export function InterviewerPanel({ interviewers, activeId, isSpeaking }: PanelProps) {
  return (
    <div className="absolute inset-x-[10%] top-[28%] z-10 flex items-end justify-center gap-4 sm:gap-8">
      {interviewers.map((iv) => (
        <Fragment key={iv.id}>
          <InterviewerCard
            interviewer={iv}
            isActive={iv.id === activeId}
            isSpeaking={isSpeaking}
          />
        </Fragment>
      ))}
    </div>
  );
}
