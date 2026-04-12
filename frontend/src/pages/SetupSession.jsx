import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractTextFromFile } from '../lib/fileParser';
import { Loader2, Upload, FileText, X, Sparkles, Brain, Code, Users, Smile, Zap, ArrowRight } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function SetupSession() {
  const navigate = useNavigate();

  const [cvText, setCvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isParsingFile, setIsParsingFile] = useState(false);
  const fileInputRef = useRef(null);

  const [jobDescription, setJobDescription] = useState('');
  const [interviewType, setInterviewType] = useState('Behavioral');
  const [language, setLanguage] = useState('vi');
  const [isStressTest, setIsStressTest] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [predictedQuestions, setPredictedQuestions] = useState([]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsingFile(true);
    setError('');
    try {
      const text = await extractTextFromFile(file);
      setCvText(text);
      setFileName(file.name);
    } catch (err) {
      setError(err.message || 'Lỗi khi đọc file CV.');
    } finally {
      setIsParsingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fetchPredictions = async () => {
    if (!cvText.trim() || !jobDescription.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/interview/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv_text: cvText, jd_text: jobDescription, language }),
      });
      if (res.ok) {
        const data = await res.json();
        setPredictedQuestions(data.questions || []);
      }
    } catch (err) {
      console.error('Predict error (non-critical):', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cvText.trim() || !jobDescription.trim()) {
      setError('Vui lòng nhập đầy đủ CV và Job Description.');
      return;
    }
    setIsGenerating(true);
    setError('');

    try {
      // Tạo session ID local, lưu setup vào sessionStorage
      const sessionId = crypto.randomUUID();
      const sessionData = {
        id: sessionId,
        cvText,
        jobDescription,
        interviewType,
        language,
        isStressTest,
        predictedQuestions,
        createdAt: new Date().toISOString(),
        status: 'setup',
      };
      sessionStorage.setItem(`session_${sessionId}`, JSON.stringify(sessionData));
      navigate(`/session/${sessionId}`);
    } catch (err) {
      setError('Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        <div className="lg:col-span-7">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#191c1d] tracking-tight mb-4">
            Chuẩn bị cho <span className="text-[#003fb1]">bước ngoặt.</span>
          </h1>
          <p className="text-[#434654] text-lg leading-relaxed max-w-2xl">
            Cấu hình phiên phỏng vấn với AI Coach. Chúng tôi sẽ tùy chỉnh câu hỏi dựa trên hồ sơ và vị trí mục tiêu của bạn.
          </p>
        </div>
        <div className="lg:col-span-5 flex items-center justify-end">
          <div className="bg-[#8b4aff]/10 p-6 rounded-xl border border-[#c3c5d7]/20 flex items-center gap-4">
            <Sparkles className="text-[#7127e5] w-10 h-10 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-[#7127e5]">AI Insight</p>
              <p className="text-xs text-[#434654]">Stress-test tăng độ chân thực lên 40% dựa trên xu hướng HR gần đây.</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {error && (
          <div className="md:col-span-2 p-4 bg-[#ffdad6] text-[#ba1a1a] rounded-xl text-sm border border-[#ba1a1a]/20 font-medium">
            {error}
          </div>
        )}

        {/* Left Column */}
        <div className="space-y-8">
          <section>
            <h2 className="text-sm font-bold tracking-widest text-[#434654] uppercase mb-4">1. Cung cấp ngữ cảnh</h2>
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-xl border border-[#c3c5d7]/20 shadow-sm">
                <div className="mb-4">
                  <label className="block font-bold text-[#191c1d] mb-1">CV của bạn</label>
                  <p className="text-sm text-[#434654] mb-3">Tải lên hoặc dán nội dung CV</p>

                  {!fileName ? (
                    <div
                      className="border-2 border-dashed border-[#c3c5d7] rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-[#f8f9fa] transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-8 h-8 text-[#737686] mb-2" />
                      <p className="text-sm text-[#434654] font-medium">Click để tải lên CV (PDF, DOCX, TXT)</p>
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.docx,.txt" className="hidden" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-[#dbe1ff] border border-[#003fb1]/20 p-3 rounded-xl">
                      <div className="flex items-center gap-2 text-[#003fb1]">
                        <FileText className="w-5 h-5" />
                        <span className="font-medium text-sm">{fileName}</span>
                      </div>
                      <button type="button" onClick={() => { setFileName(''); setCvText(''); }} className="p-1 hover:bg-[#b5c4ff] rounded-md text-[#003fb1]">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {isParsingFile && (
                    <div className="flex items-center gap-2 text-sm text-[#003fb1] mt-2 font-medium">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang đọc file...
                    </div>
                  )}

                  <textarea
                    value={cvText}
                    onChange={(e) => { setCvText(e.target.value); if (!e.target.value) setFileName(''); }}
                    rows={4}
                    placeholder="Nội dung CV sẽ hiển thị ở đây. Bạn cũng có thể dán text trực tiếp..."
                    className="w-full rounded-xl border border-[#c3c5d7] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#003fb1] focus:border-transparent resize-y mt-3 text-sm bg-[#f8f9fa]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#191c1d] mb-1">Job Description (JD)</label>
                  <p className="text-sm text-[#434654] mb-3">Dán mô tả công việc mục tiêu</p>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    onBlur={fetchPredictions}
                    rows={4}
                    placeholder="Dán nội dung JD vào đây..."
                    className="w-full rounded-xl border border-[#c3c5d7] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#003fb1] focus:border-transparent resize-y text-sm bg-[#f8f9fa]"
                  />
                </div>
              </div>

              {predictedQuestions.length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-[#c3c5d7]/20 shadow-sm">
                  <h3 className="text-sm font-bold text-[#8b4aff] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Câu hỏi dự đoán
                  </h3>
                  <div className="space-y-2">
                    {predictedQuestions.map((q, idx) => (
                      <div key={idx} className="bg-[#f8f9fa] p-3 rounded-lg text-sm text-[#434654] border border-[#c3c5d7]/20">{q}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold tracking-widest text-[#434654] uppercase mb-4">2. Ngôn ngữ phỏng vấn</h2>
            <div className="grid grid-cols-2 gap-4">
              {[{ value: 'vi', label: 'Tiếng Việt', sub: 'Mặc định' }, { value: 'en', label: 'English', sub: 'Tiếng Anh' }].map(({ value, label, sub }) => (
                <label key={value} className={`flex flex-col items-center justify-center p-6 rounded-xl cursor-pointer transition-all border ${language === value ? 'bg-[#003fb1] text-white border-[#003fb1] shadow-lg' : 'bg-white text-[#191c1d] border-[#c3c5d7]/20 hover:bg-[#f3f4f5]'}`}>
                  <input type="radio" name="language" value={value} checked={language === value} onChange={() => setLanguage(value)} className="hidden" />
                  <span className="text-sm font-bold">{label}</span>
                  <span className={`text-xs ${language === value ? 'opacity-80' : 'text-[#434654]'}`}>{sub}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          <section>
            <h2 className="text-sm font-bold tracking-widest text-[#434654] uppercase mb-4">3. Loại phỏng vấn</h2>
            <div className="bg-[#f3f4f5] p-2 rounded-xl flex flex-col gap-2">
              {[
                { value: 'Behavioral', icon: Brain, label: 'Behavioral (Hành vi)' },
                { value: 'Technical', icon: Code, label: 'Technical (Kỹ thuật)' },
                { value: 'HR', icon: Users, label: 'HR (Văn hóa)' },
              ].map(({ value, icon: Icon, label }) => (
                <label key={value} className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors ${interviewType === value ? 'bg-white border border-[#c3c5d7]/20 shadow-sm' : 'hover:bg-[#e7e8e9]'}`}>
                  <div className="flex items-center gap-3">
                    <Icon className={`w-6 h-6 ${interviewType === value ? 'text-[#003fb1]' : 'text-[#434654]'}`} />
                    <span className="font-semibold text-[#191c1d]">{label}</span>
                  </div>
                  <input type="radio" name="type" value={value} checked={interviewType === value} onChange={() => setInterviewType(value)} className="w-5 h-5 text-[#003fb1]" />
                </label>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold tracking-widest text-[#434654] uppercase mb-4">4. Cường độ</h2>
            <div className="grid grid-cols-2 gap-4">
              <label className={`block p-6 rounded-xl cursor-pointer transition-all border ${!isStressTest ? 'bg-[#003fb1]/5 border-[#003fb1]' : 'bg-white border-[#c3c5d7]/20 hover:bg-[#f3f4f5]'}`}>
                <input type="radio" name="mode" checked={!isStressTest} onChange={() => setIsStressTest(false)} className="hidden" />
                <Smile className={`block mb-2 w-8 h-8 ${!isStressTest ? 'text-[#003fb1]' : 'text-[#434654]'}`} />
                <span className="block font-bold text-[#191c1d]">Normal</span>
                <span className="block text-xs text-[#434654]">Phản hồi xây dựng</span>
              </label>
              <label className={`block p-6 rounded-xl cursor-pointer transition-all border ${isStressTest ? 'bg-[#ffdad6]/50 border-[#ba1a1a]' : 'bg-white border-[#c3c5d7]/20 hover:bg-[#f3f4f5]'}`}>
                <input type="radio" name="mode" checked={isStressTest} onChange={() => setIsStressTest(true)} className="hidden" />
                <Zap className={`block mb-2 w-8 h-8 ${isStressTest ? 'text-[#ba1a1a]' : 'text-[#434654]'}`} />
                <span className={`block font-bold ${isStressTest ? 'text-[#ba1a1a]' : 'text-[#191c1d]'}`}>Stress-test</span>
                <span className="block text-xs text-[#434654]">Hỏi xoáy, ngắt lời</span>
              </label>
            </div>
          </section>

          <div className="pt-4">
            <button
              id="btn-start-interview"
              type="submit"
              disabled={isGenerating || !cvText.trim()}
              className="w-full py-5 rounded-xl bg-gradient-to-r from-[#003fb1] to-[#1a56db] text-white font-bold text-lg shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <><Loader2 className="w-6 h-6 animate-spin" /> Đang chuẩn bị...</>
              ) : (
                <><span>Bắt đầu phỏng vấn</span><ArrowRight className="w-6 h-6" /></>
              )}
            </button>
            <p className="text-center text-xs text-[#434654] mt-4">Thời gian dự kiến: 20-30 phút</p>
          </div>
        </div>
      </form>
    </div>
  );
}
