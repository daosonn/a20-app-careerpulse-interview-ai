import React from 'react';
import { motion } from 'framer-motion';
import { Target, Zap, MessageCircle, Star } from 'lucide-react';

const EvaluationCard = ({ evaluation }) => {
  if (!evaluation) return null;
  
  let data = evaluation;
  if (typeof evaluation === 'string') {
    try {
      data = JSON.parse(evaluation.replace(/```json|```/g, ''));
    } catch (e) {
      return (
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-amber-800 text-sm">
          {evaluation}
        </div>
      );
    }
  }

  const scores = data.scores || {};
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <Star size={80} className="text-blue-500" />
      </div>

      <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <Target className="text-blue-400" size={20} />
        Real-time Performance Analysis
      </h4>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Object.entries(scores).map(([key, value]) => (
          <div key={key} className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
            <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">{key.replace('_', ' ')}</div>
            <div className="text-2xl font-black text-white">{value}<span className="text-xs text-gray-500">/5</span></div>
            <div className="w-full h-1 bg-gray-800 rounded-full mt-2 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(value/5)*100}%` }}
                className={`h-full ${value >= 4 ? 'bg-green-500' : value >= 3 ? 'bg-blue-500' : 'bg-red-500'}`}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="text-blue-400" size={16} />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-300 mb-1">Feedback</div>
            <p className="text-sm text-gray-400 leading-relaxed">{data.feedback}</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
            <Zap className="text-violet-400" size={16} />
          </div>
          <div className="flex-1 bg-violet-500/5 rounded-xl p-4 border border-violet-500/10">
            <div className="text-sm font-bold text-violet-300 mb-1">Optimized Answer (STAR)</div>
            <p className="text-sm text-gray-300 italic leading-relaxed">{data.betterVersion}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EvaluationCard;
