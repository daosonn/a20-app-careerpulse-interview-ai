import { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Check } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui';

export type BackgroundTheme = 'classic' | 'executive' | 'creative';

export const BACKGROUND_OPTIONS: { id: BackgroundTheme; name: string; url: string; viName: string }[] = [
  { id: 'classic', name: 'Boardroom (Classic)', viName: 'Phòng họp (Cơ bản)', url: '/background.png' },
  { id: 'executive', name: 'Executive Suite', viName: 'Phòng giám đốc', url: '/bg_executive.png' },
  { id: 'creative', name: 'Creative Studio', viName: 'Studio Sáng tạo', url: '/bg_creative.png' },
];

interface BackgroundSelectorProps {
  currentTheme: BackgroundTheme;
  onChange: (theme: BackgroundTheme) => void;
  isVi: boolean;
}

export function BackgroundSelector({ currentTheme, onChange, isVi }: BackgroundSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
        aria-label={isVi ? 'Đổi hình nền' : 'Change Background'}
      >
        <ImageIcon className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">{isVi ? 'Nền' : 'Background'}</span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-navy-600 bg-navy-800 p-2 shadow-xl z-50">
          <div className="mb-2 px-2 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              {isVi ? 'Chọn không gian' : 'Select Environment'}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            {BACKGROUND_OPTIONS.map((opt) => {
              const active = currentTheme === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-gold-500/10 text-gold-400'
                      : 'text-text-primary hover:bg-navy-700'
                  )}
                >
                  <span className="font-medium">{isVi ? opt.viName : opt.name}</span>
                  {active && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
