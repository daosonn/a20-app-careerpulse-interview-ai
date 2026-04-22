import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth';
import { extractTextFromFile } from '../../../lib/fileParser';
import {
  Loader2,
  Upload,
  FileText,
  X,
  Sparkles,
  Brain,
  Code,
  Users,
  Smile,
  Zap,
  ArrowRight,
  Briefcase,
  MapPin,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { apiUrl } from '../../../lib/api';
import {
  Button,
  Card,
  Textarea,
  SectionHeading,
} from '../../../components/ui';
import { cn } from '../../../lib/utils';

async function parseErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const payload = await response.json();
    if (payload?.detail) return payload.detail;
  } catch {
    /* ignore */
  }
  return fallback;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StepHeading({ index, label }: { index: number; label: string }) {
  return (
    <h2 className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.25em] text-gold-400 mb-4">
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-gold-500/60 text-gold-300 font-serif text-sm">
        {index}
      </span>
      {label}
    </h2>
  );
}

interface TileOption<V extends string> {
  value: V;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  subtitle: string;
}

function TileRadioGroup<V extends string>({
  name,
  value,
  options,
  onChange,
  columns = 3,
}: {
  name: string;
  value: V;
  options: TileOption<V>[];
  onChange: (v: V) => void;
  columns?: 2 | 3;
}) {
  return (
    <div
      className={cn(
        'grid gap-3',
        columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <label
            key={opt.value}
            className={cn(
              'relative flex flex-col gap-2 p-4 rounded-xl cursor-pointer transition-all border',
              active
                ? 'bg-gold-500/10 border-gold-500 shadow-[0_0_20px_-8px_rgba(201,169,97,0.35)]'
                : 'bg-navy-800 border-navy-600 hover:border-gold-500/40',
            )}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={active}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            <Icon
              className={cn(
                'w-6 h-6',
                active ? 'text-gold-400' : 'text-text-muted',
              )}
              aria-hidden
            />
            <span
              className={cn(
                'font-semibold leading-tight',
                active ? 'text-text-primary' : 'text-text-primary/90',
              )}
            >
              {opt.title}
            </span>
            <span className="text-xs text-text-muted leading-relaxed">
              {opt.subtitle}
            </span>
          </label>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function SetupSession() {
  const { user, authenticatedFetch } = useAuth();
  const navigate = useNavigate();

  const [cvText, setCvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isParsingFile, setIsParsingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [jobDescription, setJobDescription] = useState('');
  const [interviewType, setInterviewType] = useState<'Behavioral' | 'Technical' | 'HR'>('Behavioral');
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');
  const [isStressTest, setIsStressTest] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const [recommendedJobs, setRecommendedJobs] = useState<any[]>([]);
  const [isFetchingRecommendations, setIsFetchingRecommendations] = useState(false);
  const [selectedJobIndex, setSelectedJobIndex] = useState<number | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingFile(true);
    setError('');
    try {
      const text = await extractTextFromFile(file);
      setCvText(text);
      setFileName(file.name);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi đọc file CV.');
    } finally {
      setIsParsingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fetchRecommendations = async (text: string) => {
    if (!text.trim()) return;
    setIsFetchingRecommendations(true);
    try {
      const response = await authenticatedFetch(apiUrl('/api/v1/interview/recommend-jobs'), {
        method: 'POST',
        body: JSON.stringify({ cv_text: text, limit: 3 }),
      });
      if (response.ok) {
        const data = await response.json();
        setRecommendedJobs(data);
        if (data.length > 0) {
          // Auto-select first job if none selected
          setSelectedJobIndex(0);
          setJobDescription(data[0].description);
        }
      }
    } catch (err) {
      console.error('Failed to fetch recommendations', err);
    } finally {
      setIsFetchingRecommendations(false);
    }
  };

  // Trigger recommendations when cvText changes (and is long enough)
  React.useEffect(() => {
    if (cvText.length > 100 && recommendedJobs.length === 0) {
      const timer = setTimeout(() => fetchRecommendations(cvText), 1000);
      return () => clearTimeout(timer);
    }
  }, [cvText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Vui lòng đăng nhập để bắt đầu phỏng vấn.');
      return;
    }
    if (!cvText.trim() || !jobDescription.trim()) {
      setError('Vui lòng nhập đầy đủ CV và Job Description.');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await authenticatedFetch(apiUrl('/api/v1/interview/setup'), {
        method: 'POST',
        body: JSON.stringify({
          cv_text: cvText,
          jd_text: jobDescription,
          interview_type: interviewType,
          language: language,
          is_stress_test: isStressTest,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await parseErrorMessage(response, 'Không thể khởi tạo phiên phỏng vấn.'),
        );
      }

      const data = await response.json();
      navigate(`/session/${data.session_id}`);
    } catch (err) {
      console.error(err);
      setError(
        (err as Error)?.message ||
          'Đã có lỗi xảy ra khi phân tích dữ liệu. Vui lòng thử lại.',
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="px-4 sm:px-8 lg:px-12 py-8 sm:py-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-8 mb-10 items-end">
        <SectionHeading
          label="Cấu hình phiên"
          title={
            <>
              Chuẩn bị cho{' '}
              <span className="text-gold-400">bước ngoặt sự nghiệp.</span>
            </>
          }
          subtitle="Cấu hình phiên phỏng vấn với AI Coach. Chúng tôi sẽ tùy chỉnh câu hỏi dựa trên hồ sơ và vị trí mục tiêu của bạn."
          size="lg"
        />
        <Card variant="highlighted" padding="md" className="flex items-center gap-4">
          <span className="inline-flex w-11 h-11 rounded-full bg-gold-500/10 border border-gold-500/40 items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-gold-400" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-400 mb-1">
              AI Insight
            </p>
            <p className="text-sm text-text-muted leading-relaxed">
              Chế độ Stress-test tăng độ chân thực lên 40% dựa trên xu hướng HR gần đây.
            </p>
          </div>
        </Card>
      </div>

      <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-8">
        {/* ---------- Left column: context ---------- */}
        <div className="space-y-8">
          <section>
            <StepHeading index={1} label="Cung cấp ngữ cảnh" />
            <Card variant="dark" padding="md" className="space-y-6">
              {/* CV upload */}
              <div>
                <label className="block font-serif text-lg text-text-primary mb-1">
                  CV của bạn
                </label>
                <p className="text-sm text-text-muted mb-3 leading-relaxed">
                  Tải lên hoặc dán nội dung CV
                </p>

                {!fileName ? (
                  <div
                    className="border-2 border-dashed border-navy-600 hover:border-gold-500/60 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-navy-700/40 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span className="inline-flex w-10 h-10 rounded-full bg-gold-500/10 border border-gold-500/30 items-center justify-center mb-3">
                      <Upload className="w-4 h-4 text-gold-400" aria-hidden />
                    </span>
                    <p className="text-sm text-text-primary font-medium">
                      Nhấn để tải lên CV
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      PDF, DOCX, TXT
                    </p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".pdf,.docx,.txt"
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-gold-500/10 border border-gold-500/40 p-3 rounded-xl">
                    <div className="flex items-center gap-2 text-gold-300 min-w-0">
                      <FileText className="w-4 h-4 shrink-0" aria-hidden />
                      <span className="font-medium text-sm truncate">
                        {fileName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFileName('');
                        setCvText('');
                      }}
                      className="p-1 hover:bg-gold-500/20 rounded-md text-gold-300 shrink-0"
                      aria-label="Xóa file CV"
                    >
                      <X className="w-4 h-4" aria-hidden />
                    </button>
                  </div>
                )}

                {isParsingFile && (
                  <div className="flex items-center gap-2 text-sm text-gold-400 mt-2 font-medium">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    Đang đọc file...
                  </div>
                )}

                <div className="mt-3">
                  <Textarea
                    value={cvText}
                    onChange={(e) => {
                      setCvText(e.target.value);
                      if (!e.target.value) setFileName('');
                    }}
                    rows={4}
                    placeholder="Nội dung CV sẽ hiển thị ở đây. Bạn cũng có thể dán trực tiếp text vào..."
                  />
                </div>
              </div>

              {/* JD matching */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-serif text-lg text-text-primary">
                    Vị trí ứng tuyển
                  </label>
                  {cvText && (
                    <button 
                      type="button" 
                      onClick={() => fetchRecommendations(cvText)}
                      className="text-xs text-gold-400 hover:text-gold-300 transition-colors flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Tìm lại job phù hợp
                    </button>
                  )}
                </div>
                
                <p className="text-sm text-text-muted mb-3 leading-relaxed">
                  {recommendedJobs.length > 0 
                    ? "Chúng tôi đã tìm thấy các vị trí phù hợp với CV của bạn. Hãy chọn một vị trí để bắt đầu."
                    : "Tải CV lên để hệ thống tự động tìm kiếm vị trí phù hợp hoặc dán JD thủ công."}
                </p>

                {isFetchingRecommendations ? (
                  <div className="flex flex-col items-center justify-center py-8 bg-navy-800/50 rounded-xl border border-navy-600 border-dashed">
                    <Loader2 className="w-8 h-8 text-gold-500 animate-spin mb-3" />
                    <p className="text-sm text-gold-400 font-medium">Đang tìm kiếm job phù hợp...</p>
                  </div>
                ) : recommendedJobs.length > 0 ? (
                  <div className="space-y-3">
                    {recommendedJobs.map((job, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedJobIndex(idx);
                          setJobDescription(job.description);
                        }}
                        className={cn(
                          "relative p-4 rounded-xl border cursor-pointer transition-all hover:translate-x-1",
                          selectedJobIndex === idx
                            ? "bg-gold-500/10 border-gold-500 shadow-lg shadow-gold-500/5"
                            : "bg-navy-800 border-navy-600 hover:border-gold-500/30"
                        )}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <h4 className={cn(
                              "font-bold text-sm mb-1 truncate",
                              selectedJobIndex === idx ? "text-gold-300" : "text-text-primary"
                            )}>
                              {job.title}
                            </h4>
                            <div className="flex items-center gap-3 text-[11px] text-text-muted">
                              <span className="flex items-center gap-1">
                                <Briefcase className="w-3 h-3" />
                                {job.company}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {job.location || "Việt Nam"}
                              </span>
                              {job.url && (
                                <a
                                  href={job.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 text-gold-400 hover:text-gold-300 transition-colors ml-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Chi tiết
                                </a>
                              )}
                            </div>
                          </div>
                          {selectedJobIndex === idx && (
                            <CheckCircle2 className="w-5 h-5 text-gold-400 shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                    
                    <button 
                      type="button"
                      onClick={() => {
                        setRecommendedJobs([]);
                        setSelectedJobIndex(null);
                        setJobDescription('');
                      }}
                      className="text-[11px] text-text-muted hover:text-gold-400 underline underline-offset-4"
                    >
                      Nhập JD thủ công thay thế
                    </button>
                  </div>
                ) : (
                  <Textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    rows={5}
                    placeholder="Dán nội dung JD vào đây hoặc để AI tự tìm kiếm từ CV..."
                  />
                )}
              </div>
            </Card>
          </section>

          <section>
            <StepHeading index={2} label="Ngôn ngữ phỏng vấn" />
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'vi' as const, title: 'Tiếng Việt', subtitle: 'Mặc định' },
                { value: 'en' as const, title: 'English', subtitle: 'Tiếng Anh' },
              ].map((opt) => {
                const active = opt.value === language;
                return (
                  <label
                    key={opt.value}
                    className={cn(
                      'flex flex-col items-center justify-center p-6 rounded-xl cursor-pointer transition-all border text-center',
                      active
                        ? 'bg-gold-500/10 border-gold-500 shadow-[0_0_20px_-8px_rgba(201,169,97,0.35)]'
                        : 'bg-navy-800 border-navy-600 hover:border-gold-500/40',
                    )}
                  >
                    <input
                      type="radio"
                      name="language"
                      value={opt.value}
                      checked={active}
                      onChange={() => setLanguage(opt.value)}
                      className="sr-only"
                    />
                    <span
                      className={cn(
                        'font-serif text-xl leading-tight',
                        active ? 'text-gold-400' : 'text-text-primary',
                      )}
                    >
                      {opt.title}
                    </span>
                    <span className="text-xs text-text-muted mt-1">
                      {opt.subtitle}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        </div>

        {/* ---------- Right column: mode & submit ---------- */}
        <div className="space-y-8">
          <section>
            <StepHeading index={3} label="Loại phỏng vấn" />
            <TileRadioGroup
              name="type"
              value={interviewType}
              onChange={setInterviewType}
              columns={3}
              options={[
                {
                  value: 'Behavioral',
                  icon: Brain,
                  title: 'Behavioral',
                  subtitle: 'Tình huống & hành vi',
                },
                {
                  value: 'Technical',
                  icon: Code,
                  title: 'Technical',
                  subtitle: 'Kỹ thuật chuyên môn',
                },
                {
                  value: 'HR',
                  icon: Users,
                  title: 'HR',
                  subtitle: 'Văn hóa & phù hợp',
                },
              ]}
            />
          </section>

          <section>
            <StepHeading index={4} label="Cường độ" />
            <div className="grid grid-cols-2 gap-3">
              <label
                className={cn(
                  'flex flex-col gap-2 p-5 rounded-xl cursor-pointer transition-all border',
                  !isStressTest
                    ? 'bg-gold-500/10 border-gold-500 shadow-[0_0_20px_-8px_rgba(201,169,97,0.35)]'
                    : 'bg-navy-800 border-navy-600 hover:border-gold-500/40',
                )}
              >
                <input
                  type="radio"
                  name="mode"
                  checked={!isStressTest}
                  onChange={() => setIsStressTest(false)}
                  className="sr-only"
                />
                <Smile
                  className={cn(
                    'w-6 h-6',
                    !isStressTest ? 'text-gold-400' : 'text-text-muted',
                  )}
                  aria-hidden
                />
                <span className="font-semibold text-text-primary">Normal</span>
                <span className="text-xs text-text-muted leading-relaxed">
                  Phản hồi mang tính xây dựng
                </span>
              </label>
              <label
                className={cn(
                  'flex flex-col gap-2 p-5 rounded-xl cursor-pointer transition-all border',
                  isStressTest
                    ? 'bg-status-error/10 border-status-error/60 shadow-[0_0_20px_-8px_rgba(248,113,113,0.25)]'
                    : 'bg-navy-800 border-navy-600 hover:border-status-error/40',
                )}
              >
                <input
                  type="radio"
                  name="mode"
                  checked={isStressTest}
                  onChange={() => setIsStressTest(true)}
                  className="sr-only"
                />
                <Zap
                  className={cn(
                    'w-6 h-6',
                    isStressTest ? 'text-status-error' : 'text-text-muted',
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    'font-semibold',
                    isStressTest ? 'text-status-error' : 'text-text-primary',
                  )}
                >
                  Stress-test
                </span>
                <span className="text-xs text-text-muted leading-relaxed">
                  Hỏi xoáy, ngắt lời
                </span>
              </label>
            </div>
          </section>

          <div className="pt-2">
            {error && (
              <div
                role="alert"
                className="mb-4 p-4 bg-status-error/10 text-status-error rounded-xl text-sm border border-status-error/40 font-medium"
              >
                {error}
              </div>
            )}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isGenerating}
              disabled={isGenerating}
            >
              {isGenerating ? (
                'Đang phân tích...'
              ) : (
                <>
                  Bắt đầu phỏng vấn
                  <ArrowRight className="w-5 h-5" aria-hidden />
                </>
              )}
            </Button>
            <p className="text-center text-xs text-text-muted mt-4 font-medium">
              Thời gian phỏng vấn dự kiến: 20-30 phút
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
