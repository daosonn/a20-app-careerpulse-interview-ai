import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
  Sparkles,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../auth';
import { extractTextFromFile } from '../../../lib/fileParser';
import { db } from '../../../lib/firebase';
import { apiUrl } from '../../../lib/api';
import { Button, Card } from '../../../components/ui';
import { cn } from '../../../lib/utils';

export function Onboarding() {
  const { user, refreshProfile, authenticatedFetch } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'upload' | 'processing' | 'success'>(
    'upload',
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File quá lớn (tối đa 5MB).');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleOnboard = async () => {
    if (!file || !user) return;

    setIsProcessing(true);
    setStep('processing');
    try {
      const cvText = await extractTextFromFile(file);

      const response = await authenticatedFetch(apiUrl('/api/v1/user/onboard'), {
        method: 'POST',
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          name: user.displayName || 'User',
          avatar: user.photoURL,
          cv_text: cvText,
        }),
      });

      if (!response.ok) {
        throw new Error('Không thể cập nhật thông tin lên hệ thống.');
      }

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        cvText: cvText,
        onboarded: true,
        updatedAt: new Date().toISOString(),
      });

      await refreshProfile();

      setStep('success');
      setTimeout(() => navigate('/dashboard'), 1800);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-100 text-text-dark font-sans antialiased flex items-center justify-center p-5 sm:p-8 relative overflow-hidden">
      {/* Subtle ambient accents */}
      <div
        className="absolute -top-32 -left-24 w-[32rem] h-[32rem] rounded-full bg-gold-500/[0.08] blur-[120px] pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute -bottom-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-gold-500/[0.06] blur-[110px] pointer-events-none"
        aria-hidden
      />

      <Card
        variant="cream"
        padding="none"
        className="relative z-10 w-full max-w-2xl shadow-[0_30px_80px_-30px_rgba(26,26,46,0.2)] overflow-hidden"
      >
        <div className="p-8 sm:p-12">
          {/* ---------- Header ---------- */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2.5 mb-6">
              <img src="/logo.png" alt="" className="w-8 h-8 object-contain" />
              <span className="font-headline font-extrabold tracking-tight text-gold-600 text-lg">
                CareerPulse
              </span>
            </div>
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-600 mb-4">
              Bước đầu tiên
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl leading-tight text-text-dark mb-4">
              Chào mừng đến với{' '}
              <span className="text-gold-600">hành trình</span> của bạn.
            </h1>
            <p className="text-text-dark/70 leading-relaxed max-w-md mx-auto">
              Tải lên CV để AI phân tích kỹ năng và chuẩn bị các bài phỏng vấn
              phù hợp nhất với hồ sơ của bạn.
            </p>
          </div>

          {/* ---------- Upload state ---------- */}
          {step === 'upload' && (
            <div className="space-y-5">
              <div
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={file ? 'Đổi CV' : 'Tải lên CV'}
                className={cn(
                  'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50',
                  file
                    ? 'border-gold-500 bg-gold-500/[0.06]'
                    : 'border-cream-200 hover:border-gold-500/60 hover:bg-cream-50',
                )}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-4">
                  {file ? (
                    <>
                      <span className="inline-flex w-14 h-14 rounded-full bg-gold-500/15 border border-gold-500/50 items-center justify-center">
                        <FileText className="w-6 h-6 text-gold-600" aria-hidden />
                      </span>
                      <div>
                        <p className="font-serif text-lg text-text-dark leading-tight">
                          {file.name}
                        </p>
                        <p className="text-sm text-text-dark/60 mt-1">
                          {(file.size / 1024).toFixed(1)} KB · nhấn để chọn file khác
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex w-14 h-14 rounded-full bg-gold-500/10 border border-gold-500/30 items-center justify-center">
                        <Upload className="w-6 h-6 text-gold-600" aria-hidden />
                      </span>
                      <div>
                        <p className="font-serif text-lg text-text-dark leading-tight">
                          Nhấn để tải lên CV
                        </p>
                        <p className="text-sm text-text-dark/60 mt-1">
                          Hỗ trợ PDF, DOCX, TXT · Tối đa 5MB
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 p-4 rounded-xl bg-status-error/10 border border-status-error/40 text-status-error text-sm font-medium"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
                  <span>{error}</span>
                </div>
              )}

              <Button
                onClick={handleOnboard}
                disabled={!file || isProcessing}
                variant="primary"
                size="lg"
                fullWidth
              >
                Tiếp tục
                <ArrowRight className="w-5 h-5" aria-hidden />
              </Button>

              <p className="text-center text-xs text-text-dark/50">
                Dữ liệu CV của bạn được bảo mật và chỉ dùng để cá nhân hóa phiên
                luyện tập.
              </p>
            </div>
          )}

          {/* ---------- Processing state ---------- */}
          {step === 'processing' && (
            <div className="text-center py-14 space-y-6">
              <div className="relative inline-flex w-24 h-24 items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full border-[3px] border-cream-200"
                  aria-hidden
                />
                <div
                  className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-gold-500 border-r-gold-500 animate-spin"
                  aria-hidden
                />
                <Loader2
                  className="w-8 h-8 text-gold-600 animate-pulse"
                  aria-hidden
                />
              </div>
              <div>
                <h3 className="font-serif text-2xl text-text-dark mb-2">
                  AI đang phân tích CV...
                </h3>
                <p className="text-text-dark/60 text-sm leading-relaxed max-w-md mx-auto">
                  Quá trình này có thể mất vài giây. Chúng tôi đang trích xuất
                  kỹ năng và chuẩn bị hồ sơ của bạn.
                </p>
              </div>
            </div>
          )}

          {/* ---------- Success state ---------- */}
          {step === 'success' && (
            <div className="text-center py-14 space-y-6">
              <div
                className="inline-flex w-24 h-24 items-center justify-center rounded-full bg-gold-500/15 border-2 border-gold-500/50"
                aria-hidden
              >
                <CheckCircle2 className="w-10 h-10 text-gold-600" />
              </div>
              <div>
                <h3 className="font-serif text-3xl text-text-dark mb-2">
                  Tuyệt vời!
                </h3>
                <p className="text-text-dark/70 leading-relaxed flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-gold-600" aria-hidden />
                  Hồ sơ đã sẵn sàng. Đang chuyển tới Bảng điều khiển...
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
