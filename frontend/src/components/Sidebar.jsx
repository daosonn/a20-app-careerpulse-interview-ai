import React, { useState, useEffect } from 'react';
import { History, Trash2, ChevronRight, Clock, Star } from 'lucide-react';
import { motion } from 'framer-motion';

const Sidebar = ({ onSelectHistory, currentSessionId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/v1/history`);
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteHistory = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this session?")) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      await fetch(`${apiUrl}/api/v1/history/${id}`, { method: 'DELETE' });
      setHistory(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      console.error("Delete failed");
    }
  };

  return (
    <aside className="w-80 h-full bg-white border-r border-slate-200 flex flex-col overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 text-slate-900 font-black tracking-tight">
          <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg">
            <History size={18} />
          </div>
          <span className="text-lg">Interview History</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col gap-3">
             {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-10 px-4">
            <p className="text-slate-400 font-medium">No previous sessions found.</p>
          </div>
        ) : (
          history.map((item) => (
            <motion.div
              key={item.id}
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectHistory(item.id)}
              className={`group relative p-4 rounded-2xl border transition-all cursor-pointer ${
                currentSessionId === item.id 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20' 
                  : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-lg text-slate-600'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                  currentSessionId === item.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
                }`}>
                  {item.interview_type}
                </span>
                <button 
                  onClick={(e) => deleteHistory(e, item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500 hover:text-white rounded-md transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              
              <div className="font-bold truncate text-sm">
                Session #{item.id}
              </div>
              
              <div className="flex items-center gap-4 mt-2 text-[10px] font-bold opacity-70">
                <div className="flex items-center gap-1">
                  <Clock size={10} />
                  {new Date(item.created_at).toLocaleDateString()}
                </div>
                {item.score > 0 && (
                  <div className="flex items-center gap-1">
                    <Star size={10} className="fill-current text-yellow-400" />
                    {item.score}%
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100">
        <button 
          onClick={() => window.location.reload()}
          className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          New Interview
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
