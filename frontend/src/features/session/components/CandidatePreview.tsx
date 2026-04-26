import { Mic, Video } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface Props {
  name: string;
  photoURL?: string | null;
  isRecording: boolean;
  isVi?: boolean;
}

export function CandidatePreview({ name, photoURL, isRecording, isVi = false }: Props) {
  return (
    <div className="absolute bottom-5 right-5 z-20 flex flex-col items-center gap-2">
      {/* Avatar / camera circle */}
      <div
        className={cn(
          'relative h-28 w-28 overflow-hidden rounded-full border-2 shadow-2xl transition-all duration-500',
          isRecording
            ? 'border-gold-400 shadow-[0_0_30px_rgba(201,169,97,.35)]'
            : 'border-cyan-300/50 shadow-[0_0_30px_rgba(34,211,238,.22)]',
        )}
      >
        {/* Pulsing outer ring while recording */}
        {isRecording && (
          <div className="absolute -inset-2 animate-ping rounded-full border-2 border-gold-400/35" />
        )}

        {photoURL ? (
          <img
            src={photoURL}
            alt={name}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-300/15 via-navy-800 to-navy-900">
            <span className="font-headline text-2xl font-bold text-cyan-200/70">
              {name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}

        {/* REC dot */}
        {isRecording && (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            <span className="font-headline text-[8px] uppercase tracking-wider text-white">rec</span>
          </div>
        )}
      </div>

      {/* Name badge */}
      <div className="rounded-full border border-cyan-300/20 bg-navy-950/80 px-3 py-0.5 backdrop-blur">
        <p className="font-headline text-[10px] font-semibold text-text-primary">{name}</p>
      </div>

      {/* Status chips */}
      <div className="flex items-center gap-1.5">
        <div
          className={cn(
            'flex items-center gap-1 rounded-full border px-2 py-0.5 transition-all duration-300',
            isRecording
              ? 'border-gold-400/40 bg-gold-400/10 text-gold-300'
              : 'border-white/10 bg-white/5 text-text-muted',
          )}
        >
          <Mic size={9} />
          <span className="font-headline text-[8px] uppercase tracking-wider">
            {isRecording ? (isVi ? 'Đang thu' : 'Live') : (isVi ? 'Sẵn sàng' : 'Ready')}
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-cyan-300/20 bg-cyan-300/5 px-2 py-0.5 text-cyan-300/60">
          <Video size={9} />
          <span className="font-headline text-[8px] uppercase tracking-wider">Cam</span>
        </div>
      </div>
    </div>
  );
}
