import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth';
import { extractTextFromFile } from '../../../lib/fileParser';
import { Upload, FileText, CheckCircle2, Loader2, Sparkles, Rocket } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'upload' | 'processing' | 'success'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File quá lớn (tối đa 5MB)');
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
      // 1. Extract text from CV
      const cvText = await extractTextFromFile(file);

      // 2. Call Backend API to extract skills and save to SQLite
      const response = await fetch('http://127.0.0.1:8000/api/v1/user/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          name: user.displayName || 'User',
          avatar: user.photoURL,
          cv_text: cvText
        })
      });

      if (!response.ok) throw new Error('Không thể cập nhật thông tin lên hệ thống.');

      // 3. Update Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        cvText: cvText,
        onboarded: true,
        updatedAt: new Date().toISOString()
      });

      // 4. Update Auth state
      await refreshProfile();
      
      setStep('success');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#003fb1]/5 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-[#7127e5]/5 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#c3c5d7]/20 relative z-10">
        <div className="p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#003fb1]/10 text-[#003fb1] mb-6">
              <Rocket className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-extrabold text-[#191c1d] mb-3">Chào mừng đến với CareerPulse!</h1>
            <p className="text-[#434654] max-w-md mx-auto">
              Để bắt đầu hành trình luyện tập, vui lòng tải lên CV của bạn. AI của chúng tôi sẽ phân tích kỹ năng và chuẩn bị các bài phỏng vấn phù hợp nhất.
            </p>
          </div>

          {step === 'upload' && (
            <div className="space-y-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  file ? 'border-[#003fb1] bg-[#dbe1ff]/20' : 'border-[#c3c5d7]/50 hover:border-[#003fb1] hover:bg-[#f3f4f5]'
                }`}
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
                      <div className="w-14 h-14 rounded-full bg-[#003fb1] flex items-center justify-center shadow-lg">
                        <FileText className="text-white w-7 h-7" />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-[#191c1d]">{file.name}</p>
                        <p className="text-sm text-[#737686]">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-full bg-[#f3f4f5] flex items-center justify-center group-hover:bg-[#dbe1ff] transition-colors">
                        <Upload className="text-[#434654] w-7 h-7" />
                      </div>
                      <div>
                        <p className="font-bold text-[#191c1d]">Click để tải lên CV</p>
                        <p className="text-sm text-[#737686]">Hỗ trợ PDF, DOCX, TXT. Tối đa 5MB</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-[#ffdad6] text-[#ba1a1a] text-sm font-bold flex items-center gap-2">
                  <span>⚠️ {error}</span>
                </div>
              )}

              <button
                onClick={handleOnboard}
                disabled={!file || isProcessing}
                className="w-full bg-[#003fb1] text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-[#003dab] transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                Tiếp tục
                <Sparkles className="w-5 h-5" />
              </button>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-12 space-y-6">
              <div className="relative inline-block">
                <div className="w-24 h-24 rounded-full border-4 border-[#dbe1ff] border-t-[#003fb1] animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-[#003fb1] animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#191c1d] mb-2">AI đang phân tích CV của bạn...</h3>
                <p className="text-[#737686]">Quá trình này có thể mất vài giây. Vui lòng chờ nhé!</p>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-12 space-y-6">
              <div className="w-24 h-24 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[#191c1d] mb-2">Tuyệt vời!</h3>
                <p className="text-[#737686]">Thông tin của bạn đã được cập nhật thành công. Đang chuyển hướng...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
