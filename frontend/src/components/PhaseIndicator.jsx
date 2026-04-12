import React from 'react';
import { motion } from 'framer-motion';
import { Check, Circle } from 'lucide-react';

const PHASES = [
  "Introduction",
  "CV Deep-dive",
  "Job-fit",
  "Behavioral",
  "Motivation",
  "QA",
  "Closing"
];

const PhaseIndicator = ({ currentPhase }) => {
  const currentIndex = PHASES.findIndex(p => p.startsWith(currentPhase) || currentPhase.startsWith(p));
  
  return (
    <div className="flex items-center justify-between w-full px-4 py-2 bg-white/5 rounded-lg backdrop-blur-sm border border-white/10 mb-4 overflow-x-auto gap-4 no-scrollbar">
      {PHASES.map((phase, index) => {
        const isCompleted = index < currentIndex;
        const isActive = index === currentIndex;
        
        return (
          <div key={phase} className="flex items-center gap-2 flex-shrink-0">
            <div className={`relative flex items-center justify-center w-6 h-6 rounded-full border ${
              isCompleted ? 'bg-green-500 border-green-500 text-white' : 
              isActive ? 'bg-blue-500 border-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 
              'border-gray-600 text-gray-500'
            }`}>
              {isCompleted ? <Check size={12} /> : <span className="text-[10px] font-bold">{index + 1}</span>}
              {isActive && (
                <motion.div 
                  layoutId="active-glow"
                  className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-20"
                />
              )}
            </div>
            <span className={`text-[10px] font-medium uppercase tracking-wider ${
              isActive ? 'text-white' : 'text-gray-500'
            }`}>
              {phase}
            </span>
            {index < PHASES.length - 1 && (
              <div className={`h-[1px] w-4 ${isCompleted ? 'bg-green-500' : 'bg-gray-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PhaseIndicator;
