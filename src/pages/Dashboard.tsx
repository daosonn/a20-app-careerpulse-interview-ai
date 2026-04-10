import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Clock, FileText, TrendingUp, ChevronRight, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Session {
  id: string;
  jobDescription: string;
  interviewType: string;
  status: string;
  createdAt: string;
  avgScore?: number;
}

export function Dashboard() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        // Fetch sessions
        const qSessions = query(
          collection(db, 'interview_sessions'),
          where('userId', '==', user.uid)
        );
        const sessionSnap = await getDocs(qSessions);
        const fetchedSessions = sessionSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Session[];
        // Sort client-side to avoid needing a Firestore composite index
        fetchedSessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Fetch turns to calculate scores
        const qTurns = query(
          collection(db, 'interview_turns'),
          where('userId', '==', user.uid)
        );
        const turnsSnap = await getDocs(qTurns);
        const turns = turnsSnap.docs.map(d => d.data());

        // Calculate avg score per session
        const sessionsWithScores = fetchedSessions.map(session => {
          const sessionTurns = turns.filter(t => t.sessionId === session.id && t.evaluation);
          if (sessionTurns.length === 0) return session;

          const totalScore = sessionTurns.reduce((acc, turn) => {
            const s = turn.evaluation.scores;
            return acc + (s.relevance + s.structure + s.specificity + s.clarity + s.confidence) / 5;
          }, 0);
          
          return {
            ...session,
            avgScore: totalScore / sessionTurns.length
          };
        });

        setSessions(sessionsWithScores);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'interview_sessions');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    if (!window.confirm('Bạn có chắc chắn muốn xóa phiên phỏng vấn này không? Hành động này không thể hoàn tác.')) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'interview_sessions', sessionId));
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error("Error deleting session:", error);
      alert('Đã có lỗi xảy ra khi xóa phiên phỏng vấn. Vui lòng thử lại.');
    }
  };

  // Prepare chart data (reverse to show chronological order)
  const chartData = [...sessions]
    .filter(s => s.avgScore !== undefined)
    .reverse()
    .map((s, index) => ({
      name: `Phiên ${index + 1}`,
      score: Number(s.avgScore?.toFixed(1)),
      date: new Date(s.createdAt).toLocaleDateString('vi-VN')
    }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-[#191c1d]">Chào {user?.displayName || 'bạn'}, sẵn sàng cho buổi luyện hôm nay?</h1>
          <p className="text-[#434654] max-w-lg leading-relaxed">Tiếp tục từ nơi bạn đã dừng lại. AI của chúng tôi đã chuẩn bị những câu hỏi mới dựa trên những điểm bạn cần cải thiện.</p>
        </div>
        <Link
          to="/setup"
          className="bg-gradient-to-r from-[#003fb1] to-[#1a56db] text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-blue-900/20 transition-all active:scale-95 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Bắt đầu phỏng vấn mới
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-white rounded-xl border border-gray-200 animate-pulse"></div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-[#f3f4f5] rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-[#434654]" />
          </div>
          <h3 className="text-lg font-medium text-[#191c1d] mb-2">Chưa có phiên phỏng vấn nào</h3>
          <p className="text-[#434654] mb-6 max-w-md mx-auto">
            Bắt đầu luyện tập ngay hôm nay để cải thiện kỹ năng phỏng vấn của bạn với AI Coach.
          </p>
          <Link
            to="/setup"
            className="inline-flex items-center gap-2 bg-[#003fb1] text-white px-6 py-2.5 rounded-md hover:bg-[#003dab] transition-colors font-medium"
          >
            Bắt đầu ngay
          </Link>
        </div>
      ) : (
        <>
          {/* Progress Chart */}
          {chartData.length > 1 && (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#003fb1]" />
                  <h2 className="text-lg font-bold text-[#191c1d]">Biểu đồ tiến bộ</h2>
                </div>
                <span className="text-xs font-semibold text-[#003fb1] bg-[#dbe1ff] px-3 py-1 rounded-full uppercase tracking-tighter">Gần đây</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#434654', fontSize: 12 }} dy={10} />
                    <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fill: '#434654', fontSize: 12 }} dx={-10} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ color: '#191c1d', fontWeight: 600, marginBottom: '4px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      name="Điểm trung bình"
                      stroke="#7127e5" 
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#7127e5', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, fill: '#003fb1', strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Session List */}
          <div>
            <h2 className="text-2xl font-bold mb-6 text-[#191c1d]">Lịch sử luyện tập</h2>
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
              <div className="divide-y divide-gray-100">
                {sessions.map(session => (
                  <Link
                    key={session.id}
                    to={session.status === 'completed' ? `/session/${session.id}/summary` : `/session/${session.id}`}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-[#f8f9fa] transition-colors cursor-pointer gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                        session.avgScore ? 'bg-[#dbe1ff] text-[#003fb1]' : 'bg-[#f3f4f5] text-[#434654]'
                      }`}>
                        {session.avgScore ? session.avgScore.toFixed(1) : '-'}
                      </div>
                      <div>
                        <p className="font-bold text-[#191c1d] line-clamp-1">{session.jobDescription.substring(0, 50) || 'Phiên phỏng vấn'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-[#434654]">{new Date(session.createdAt).toLocaleDateString('vi-VN')}</span>
                          <span className="text-xs text-gray-300">•</span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            session.status === 'completed' ? 'bg-[#dbe1ff] text-[#003fb1]' :
                            session.status === 'in_progress' ? 'bg-[#ffdbcf] text-[#852b00]' :
                            'bg-[#eaddff] text-[#5a00c6]'
                          }`}>
                            {session.status === 'completed' ? 'Hoàn thành' : session.status === 'in_progress' ? 'Đang diễn ra' : 'Mới tạo'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f3f4f5] text-[#434654]">
                        {session.interviewType}
                      </span>
                      <button 
                        onClick={(e) => handleDeleteSession(e, session.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors z-10"
                        title="Xóa phiên phỏng vấn"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <ChevronRight className="text-[#434654] hidden sm:block w-6 h-6" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

