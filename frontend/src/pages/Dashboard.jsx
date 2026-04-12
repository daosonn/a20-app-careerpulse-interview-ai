import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Plus, FileText, TrendingUp, ChevronRight, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Dashboard() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/history`);
      if (!res.ok) throw new Error('Failed to fetch history');
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, sessionId) => {
    e.preventDefault();
    if (!window.confirm('Bạn có chắc muốn xóa phiên phỏng vấn này không?')) return;
    try {
      await fetch(`${API_URL}/api/v1/history/${sessionId}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err) {
      alert('Xóa thất bại. Vui lòng thử lại.');
    }
  };

  // Build chart data from sessions with score
  const chartData = [...sessions]
    .filter(s => s.score > 0)
    .reverse()
    .map((s, index) => ({
      name: `Phiên ${index + 1}`,
      score: s.score,
      date: new Date(s.created_at).toLocaleDateString('vi-VN'),
    }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-[#191c1d]">
            Chào {user?.name || 'bạn'}, sẵn sàng cho buổi luyện hôm nay?
          </h1>
          <p className="text-[#434654] max-w-lg leading-relaxed">
            Tiếp tục từ nơi bạn đã dừng lại. AI Coach đã sẵn sàng để giúp bạn cải thiện.
          </p>
        </div>
        <Link
          to="/setup"
          id="btn-new-interview"
          className="bg-gradient-to-r from-[#003fb1] to-[#1a56db] text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-blue-900/20 transition-all active:scale-95 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Bắt đầu phỏng vấn mới
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-white rounded-xl border border-gray-200 animate-pulse" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-[#f3f4f5] rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-[#434654]" />
          </div>
          <h3 className="text-lg font-medium text-[#191c1d] mb-2">Chưa có phiên phỏng vấn nào</h3>
          <p className="text-[#434654] mb-6 max-w-md mx-auto">
            Bắt đầu luyện tập ngay hôm nay để cải thiện kỹ năng phỏng vấn với AI Coach.
          </p>
          <Link to="/setup" className="inline-flex items-center gap-2 bg-[#003fb1] text-white px-6 py-2.5 rounded-md hover:bg-[#003dab] transition-colors font-medium">
            Bắt đầu ngay
          </Link>
        </div>
      ) : (
        <>
          {/* Progress chart */}
          {chartData.length > 1 && (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#003fb1]" />
                  <h2 className="text-lg font-bold text-[#191c1d]">Biểu đồ tiến bộ</h2>
                </div>
                <span className="text-xs font-semibold text-[#003fb1] bg-[#dbe1ff] px-3 py-1 rounded-full uppercase">Gần đây</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#434654', fontSize: 12 }} dy={10} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#434654', fontSize: 12 }} dx={-10} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Line type="monotone" dataKey="score" name="Điểm" stroke="#7127e5" strokeWidth={3} dot={{ r: 4, fill: '#7127e5', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#003fb1' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Session list */}
          <div>
            <h2 className="text-2xl font-bold mb-6 text-[#191c1d]">Lịch sử luyện tập</h2>
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
              <div className="divide-y divide-gray-100">
                {sessions.map(session => (
                  <Link
                    key={session.id}
                    to={`/session/${session.id}/summary`}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-[#f8f9fa] transition-colors cursor-pointer gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${session.score > 0 ? 'bg-[#dbe1ff] text-[#003fb1]' : 'bg-[#f3f4f5] text-[#434654]'}`}>
                        {session.score > 0 ? `${session.score}` : '-'}
                      </div>
                      <div>
                        <p className="font-bold text-[#191c1d]">Phiên #{session.id} — {session.interview_type}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-[#434654]">{new Date(session.created_at).toLocaleDateString('vi-VN')}</span>
                          <span className="text-xs text-gray-300">•</span>
                          <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-[#dbe1ff] text-[#003fb1]">
                            {session.language === 'vi' ? 'Tiếng Việt' : 'English'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => handleDelete(e, session.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title="Xóa phiên"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="text-[#434654] hidden sm:block w-5 h-5" />
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
