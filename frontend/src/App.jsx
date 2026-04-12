import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UploadCloud, Mic, Square, SendHorizontal, FileText, CheckCircle2, XOctagon,
  Loader2, Sparkles, Brain, Code, Users, Smile, Zap, ArrowRight,
  RotateCcw, Send, Keyboard, AlertCircle, X as CloseIcon, FileText as FileIcon,
  Play, BarChart3, History, Settings, LogOut, ChevronRight
} from 'lucide-react';
import Layout from './components/Layout';
import Sidebar from './components/Sidebar';
import FormattedText from './components/FormattedText';
import PhaseIndicator from './components/PhaseIndicator';
import EvaluationCard from './components/EvaluationCard';
import './App.css';

// Cấu hình URL worker để giải mã PDF
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

function App() {
  const [user, setUser] = useState({ name: 'Candidate', email: 'test@example.com' });
  const [appState, setAppState] = useState('dashboard'); // 'dashboard', 'setup', 'interview', 'report', 'view_history'
  const [cvText, setCvText] = useState('');
  const [cvName, setCvName] = useState('');
  const [jdText, setJdText] = useState('');
  
  // Current Session ID
  const [sessionId, setSessionId] = useState(null);

  // New session settings
  const [interviewType, setInterviewType] = useState('Technical');
  const [language, setLanguage] = useState('vi');
  const [isStressTest, setIsStressTest] = useState(false);

  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [evaluations, setEvaluations] = useState([]);
  const [currentPhase, setCurrentPhase] = useState('Introduction');
  const [predictedQuestions, setPredictedQuestions] = useState([]);

  // Voice Recording
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);
  const [report, setReport] = useState('');

  // Tự động cuộn chat xuống cuối
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, transcript]);

  // Khởi tạo SpeechRecognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = language === 'vi' ? 'vi-VN' : 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript) setTranscript((prev) => prev + finalTranscript + ' ');
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
    }
  }, [language]);

  const playAIVoice = (base64Audio) => {
    if (!base64Audio) return;
    window.speechSynthesis.cancel();
    const audio = new Audio("data:audio/mp3;base64," + base64Audio);
    audio.play().catch(e => console.error("Audio error:", e));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCvName(file.name);
    if (file.type === 'application/pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(item => item.str).join(' ') + '\n';
        }
        setCvText(text);
      } catch (err) { alert('Error reading PDF'); }
    } else {
      setCvText(await file.text());
    }
  };

  const fetchPredictions = async () => {
    if (!cvText || !jdText) return;
    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/v1/interview/predict`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv_text: cvText, jd_text: jdText, language })
      });
      const data = await res.json();
      setPredictedQuestions(data.questions || []);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const handleStart = async (e) => {
    if (e) e.preventDefault();
    if (!cvText) return alert("Please upload CV!");
    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/v1/interview/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cv_text: cvText, jd_text: jdText,
          interview_type: interviewType, language, is_stress_test: isStressTest
        })
      });
      const data = await res.json();
      setMessages([{ role: 'ai', content: data.first_question }]);
      setCurrentPhase(data.current_phase || 'Introduction');
      setAppState('interview');
      playAIVoice(data.audio_base64);
    } catch (err) { alert("Backend Connection Error"); }
    finally { setIsLoading(false); }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) return alert("Mic not supported!");
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setTranscript('');
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleSendAnswer = async () => {
    const currentTranscript = transcript.trim();
    if (!currentTranscript) return;
    setTranscript('');
    setIsRecording(false);
    if (recognitionRef.current) recognitionRef.current.stop();
    setMessages(prev => [...prev, { role: 'user', content: currentTranscript }]);
    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/v1/interview/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentTranscript, history: messages,
          cv_text: cvText, jd_text: jdText,
          question_count: Math.floor(messages.length / 2),
          evaluations: evaluations, language, is_stress_test: isStressTest
        })
      });
      const data = await res.json();
      if (data.reply) {
        if (data.last_evaluation) setEvaluations(prev => [...prev, data.last_evaluation]);
        setMessages(prev => [...prev, { 
          role: 'ai', content: data.reply,
          evaluation: data.last_evaluation
        }]);
        setCurrentPhase(data.current_phase);
        playAIVoice(data.audio_base64);
      }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const handleFinishEarly = async () => {
    if (window.confirm("Finish and view report?")) {
      window.speechSynthesis.cancel();
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsLoading(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/api/v1/interview/end`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: "Finish", history: messages,
            cv_text: cvText, jd_text: jdText,
            question_count: Math.floor(messages.length / 2), evaluations: evaluations,
            interview_type: interviewType, language, is_stress_test: isStressTest
          })
        });
        const data = await res.json();
        setReport(data.feedback);
        setAppState('report');
        if (data.audio_base64) playAIVoice(data.audio_base64);
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    }
  };

  const handleSelectHistory = async (id) => {
    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/v1/history/${id}`);
      const data = await res.json();
      setSessionId(id);
      setMessages(data.transcript);
      setEvaluations(data.evaluations || []);
      setReport(data.final_report);
      setInterviewType(data.interview_type);
      setLanguage(data.language);
      setAppState('view_history');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const isVi = language === 'vi';

  return (
    <Layout 
      sidebar={<Sidebar onSelectHistory={handleSelectHistory} currentSessionId={sessionId} />}
      user={user}
      onLogin={() => alert("Google Login would be integrated here")}
    >
      <AnimatePresence mode="wait">
        {appState === 'dashboard' && (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-6xl mx-auto space-y-12 py-10"
          >
            <div className="text-center space-y-4">
              <motion.h1 
                initial={{ scale: 0.9 }} 
                animate={{ scale: 1 }}
                className="text-6xl font-black tracking-tight text-slate-900"
              >
                Welcome back, <span className="text-gradient">Candidate.</span>
              </motion.h1>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                Your journey to your dream job starts here. Master your interviews with personalized AI coaching.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { title: 'AI Sessions', value: '12', icon: Play, color: 'blue' },
                { title: 'Avg. Score', value: '84%', icon: BarChart3, color: 'violet' },
                { title: 'Phases Mastered', value: '6/7', icon: CheckCircle2, color: 'green' }
              ].map((stat) => (
                <div key={stat.title} className="glass p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all border border-slate-200">
                  <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-500/10 flex items-center justify-center mb-6`}>
                    <stat.icon className={`text-${stat.color}-600`} size={24} />
                  </div>
                  <div className="text-4xl font-black text-slate-900 mb-1">{stat.value}</div>
                  <div className="text-slate-500 font-bold uppercase tracking-widest text-xs">{stat.title}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-center pt-8">
              <button 
                onClick={() => setAppState('setup')}
                className="group relative px-12 py-6 bg-slate-900 text-white rounded-full font-black text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
              >
                Start New Mock Interview
                <ChevronRight className="group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          </motion.div>
        )}

        {appState === 'setup' && (
          <motion.div 
            key="setup"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="max-w-5xl mx-auto py-10"
          >
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setAppState('dashboard')} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors">
                <RotateCcw size={20} />
              </button>
              <h2 className="text-3xl font-black text-slate-900">Session <span className="text-blue-600">Configuration</span></h2>
            </div>

            <form onSubmit={handleStart} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-12 glass p-8 rounded-[2.5rem] shadow-2xl border border-slate-200 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <section className="space-y-6">
                    <div>
                      <label className="block text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Target Job / Context</label>
                      <div className="space-y-4">
                        <div 
                          className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                            cvName ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                          }`}
                          onClick={() => document.getElementById('cv-upload').click()}
                        >
                          {cvName ? (
                            <>
                              <FileText className="w-12 h-12 mb-4" />
                              <span className="font-black text-lg">{cvName}</span>
                              <p className="text-sm opacity-70">Resume uploaded successfully</p>
                            </>
                          ) : (
                            <>
                              <UploadCloud className="w-12 h-12 mb-4 text-slate-400" />
                              <span className="font-black text-lg">Upload Resume (PDF/TXT)</span>
                              <p className="text-sm text-slate-400">Our AI will parse your skills automatically</p>
                            </>
                          )}
                          <input id="cv-upload" type="file" onChange={handleFileUpload} accept=".pdf,.txt" className="hidden" />
                        </div>

                        <textarea
                          value={jdText}
                          onChange={(e) => setJdText(e.target.value)}
                          onBlur={fetchPredictions}
                          rows={4}
                          placeholder="Paste the Job Description here..."
                          className="w-full rounded-2xl border border-slate-200 px-6 py-4 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50 font-medium"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-10">
                    <div>
                      <label className="block text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Interview Logic</label>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { id: 'Technical', icon: Code, label: 'Technical' },
                          { id: 'Behavioral', icon: Users, label: 'Behavioral' }
                        ].map(type => (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setInterviewType(type.id)}
                            className={`flex flex-col items-center p-6 rounded-3xl border-2 transition-all ${
                              interviewType === type.id ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/30' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
                            }`}
                          >
                            <type.icon className="mb-3" />
                            <span className="font-bold">{type.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-10">
                      <div>
                        <label className="block text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Language</label>
                        <select 
                          value={language} 
                          onChange={(e) => setLanguage(e.target.value)}
                          className="w-full p-4 rounded-xl border border-slate-200 bg-white font-bold"
                        >
                          <option value="vi">Tiếng Việt</option>
                          <option value="en">English (US)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Intensity</label>
                        <button
                          type="button"
                          onClick={() => setIsStressTest(!isStressTest)}
                          className={`w-full p-4 rounded-xl font-bold flex items-center justify-center gap-2 border-2 transition-all ${
                            isStressTest ? 'bg-red-50 border-red-500 text-red-600 shadow-lg' : 'bg-white border-slate-200 text-slate-500'
                          }`}
                        >
                          <Zap size={16} className={isStressTest ? 'fill-current' : ''} />
                          {isStressTest ? 'Stress Test ON' : 'Normal Mode'}
                        </button>
                      </div>
                    </div>
                  </section>
                </div>

                {predictedQuestions.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-6 border-t border-slate-100">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                       <Sparkles size={16} className="text-yellow-500" />
                       Predicted Questions based on your profile
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {predictedQuestions.map((q, idx) => (
                        <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm font-medium text-slate-700">
                          {q}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={isLoading || !cvText}
                    className="w-full py-6 rounded-3xl bg-slate-900 text-white font-black text-2xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4"
                  >
                    {isLoading ? <Loader2 className="animate-spin" /> : <Play fill="currentColor" size={24} />}
                    <span>{isLoading ? 'PREPARING AI LOBBY...' : 'START SESSION'}</span>
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}

        {appState === 'interview' && (
          <motion.div 
            key="interview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-6xl mx-auto h-[calc(100vh-12rem)] flex flex-col glass rounded-[3rem] shadow-3xl border border-slate-200 overflow-hidden my-4"
          >
            {/* Phase Bar */}
            <div className="px-8 pt-6 pb-2 bg-slate-900 overflow-hidden">
               <PhaseIndicator currentPhase={currentPhase} />
            </div>

            {/* Room Header */}
            <div className="px-8 py-4 bg-slate-900 text-white flex justify-between items-center border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <div>
                  <h3 className="font-black tracking-tight">{isVi ? 'PHÒNG PHỎNG VẤN ỔN ĐỊNH' : 'SESSION LIVE'}</h3>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                    {interviewType} • {language.toUpperCase()} • {isStressTest ? 'STRESS MODE' : 'NORMAL'}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleFinishEarly}
                className="px-6 py-2.5 bg-white/10 hover:bg-red-500 text-white rounded-full font-bold text-xs transition-all flex items-center gap-2"
              >
                <XOctagon size={14} /> {isVi ? 'KẾT THÚC SỚM' : 'END EARLY'}
              </button>
            </div>

            {/* Chat Flow */}
            <div className="flex-1 overflow-y-auto p-8 space-y-10 scroll-smooth">
              {messages.map((m, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: m.role === 'ai' ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={i} 
                  className="space-y-6"
                >
                  {m.role === 'ai' ? (
                    <div className="flex gap-6 max-w-[90%]">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-lg border border-white/10">
                        <Brain className="text-white" size={24} />
                      </div>
                      <div className="space-y-6 flex-1">
                        <div className="bg-white p-7 rounded-[2rem] rounded-tl-none border border-slate-200 shadow-xl text-slate-800 leading-relaxed font-medium">
                          <FormattedText text={m.content} />
                        </div>
                        {m.evaluation && <EvaluationCard evaluation={m.evaluation} />}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-6 flex-row-reverse max-w-[80%] ml-auto">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-[0_10px_20_rgba(37,99,235,0.3)]">
                        <Users className="text-white" size={24} />
                      </div>
                      <div className="bg-blue-600 p-7 rounded-[2rem] rounded-tr-none text-white shadow-2xl font-bold leading-relaxed">
                        {m.content}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900/50 flex items-center justify-center animate-pulse">
                    <Loader2 className="text-slate-400" />
                  </div>
                  <div className="bg-slate-100/50 p-6 rounded-3xl rounded-tl-none italic text-slate-400 font-medium">
                    {isVi ? 'Interviewer đang suy nghĩ...' : 'Interviewer is thinking...'}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Premium Controls */}
            <div className="p-8 bg-white border-t border-slate-200">
               {isRecording && (
                 <div className="flex items-center justify-center mb-6">
                   <motion.div 
                     animate={{ scale: [1, 1.1, 1] }} 
                     transition={{ repeat: Infinity }}
                     className="bg-red-500/10 text-red-600 px-6 py-2 rounded-full font-black text-sm flex items-center gap-3 border border-red-500/20"
                   >
                     <div className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                     {isVi ? 'ĐANG GHI ÂM' : 'VOICE CAPTURE ACTIVE'}
                   </motion.div>
                 </div>
               )}

               <div className="flex items-center gap-4 relative">
                 <input
                   type="text"
                   value={transcript}
                   onChange={e => setTranscript(e.target.value)}
                   onKeyDown={e => { if (e.key === 'Enter' && transcript.trim() && !isLoading) handleSendAnswer(); }}
                   className="flex-1 bg-slate-100 border-none rounded-3xl px-8 py-5 text-lg font-bold placeholder:text-slate-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                   placeholder={isVi ? 'Gõ câu trả lời hoặc nhấn Mic...' : 'Type feedback or press mic...'}
                 />
                 <div className="flex gap-2">
                    <button 
                      onClick={toggleRecording}
                      className={`p-5 rounded-3xl transition-all ${isRecording ? 'bg-red-500 text-white shadow-xl shadow-red-500/30' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      <Mic size={24} />
                    </button>
                    <button 
                      onClick={handleSendAnswer}
                      disabled={!transcript.trim() || isLoading}
                      className="p-5 bg-blue-600 text-white rounded-3xl shadow-xl shadow-blue-500/30 hover:scale-105 active:scale-95 disabled:opacity-30 transition-all"
                    >
                      <Send size={24} />
                    </button>
                 </div>
               </div>
            </div>
          </motion.div>
        )}

        {(appState === 'report' || appState === 'view_history') && (
          <motion.div 
            key="report"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-5xl mx-auto space-y-10 py-10"
          >
            <div className="text-center space-y-4">
               <div className="inline-block px-4 py-1.5 bg-green-500/10 text-green-600 rounded-full font-black text-xs uppercase tracking-widest mb-4">
                 {appState === 'view_history' ? 'Session History View' : 'Session Completed'}
               </div>
               <h1 className="text-5xl font-black text-slate-900">Career <span className="text-blue-600">Roadmap</span> & Results</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="glass p-10 rounded-[3.5rem] shadow-3xl border border-slate-200">
                  <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                    <FileText className="text-blue-600" />
                    Final Evaluation Report
                  </h3>
                  <div className="prose prose-slate max-w-none">
                    <FormattedText text={report} />
                  </div>
                </div>

                <div className="glass p-10 rounded-[3.5rem] shadow-3xl border border-slate-200">
                  <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                    <History className="text-blue-600" />
                    Interview Transcript
                  </h3>
                  <div className="space-y-6">
                    {messages.map((m, i) => (
                      <div key={i} className={`p-4 rounded-2xl ${m.role === 'ai' ? 'bg-slate-50 border border-slate-100' : 'bg-blue-50/50 border border-blue-100'}`}>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{m.role}</div>
                        <p className="text-sm font-medium text-slate-700">{m.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="glass p-8 rounded-[2.5rem] shadow-xl border border-slate-200">
                  <h3 className="text-lg font-black text-slate-900 mb-6">Performance Metric</h3>
                  <div className="text-6xl font-black text-blue-600 mb-2">85%</div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Calculated AI Score</p>
                  <div className="w-full bg-slate-100 h-3 rounded-full mt-6 overflow-hidden">
                    <div className="bg-blue-600 h-full w-[85%]" />
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <button 
                    onClick={() => window.location.reload()}
                    className="w-full px-8 py-5 bg-slate-100 text-slate-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
                  >
                    <RotateCcw size={20} /> Back to Dashboard
                  </button>
                  <button 
                    className="w-full px-10 py-5 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-2xl hover:scale-105 transition-all"
                    onClick={() => window.print()}
                  >
                    <FileText size={20} /> Download PDF Report
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}

export default App;