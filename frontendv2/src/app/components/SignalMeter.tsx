import React from 'react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { Signal } from '../types';

interface SignalMeterProps {
  signals: Signal[];
}

export function SignalMeter({ signals }: SignalMeterProps) {
  const total = signals.length;
  const resolved = signals.filter(s => s.status === 'RESOLVED').length;
  const reported = signals.filter(s => s.status === 'REPORTED').length;
  const inProgress = signals.filter(s => s.status === 'IN_PROGRESS').length;
  const trending = signals.filter(s => s.trending).length;

  const resolvedPercent = Math.round((resolved / total) * 100) || 0;
  const reportedPercent = Math.round((reported / total) * 100) || 0;

  return (
    <div className="bg-[#0B0F14] border-b border-white/10 p-4 font-mono text-xs uppercase tracking-wider text-white/60 flex items-center justify-between overflow-x-auto whitespace-nowrap scrollbar-hide">
      <div className="flex space-x-8">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 bg-[#00E5FF] rounded-full animate-pulse" />
          <span className="text-[#00E5FF]">System Status: Online</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span>Active Signals:</span>
          <span className="text-white font-bold">{total}</span>
        </div>

        <div className="flex items-center space-x-2">
          <span>Resolution Rate:</span>
          <span className="text-emerald-400 font-bold">{resolvedPercent}%</span>
          <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden ml-1">
            <div 
              className="h-full bg-emerald-500 transition-all duration-1000" 
              style={{ width: `${resolvedPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex space-x-6">
        <div className="text-amber-500/80">
          In Progress: <span className="text-amber-400 font-bold">{inProgress}</span>
        </div>
        <div className="text-rose-500/80">
          Trending: <span className="text-rose-400 font-bold">{trending}</span>
        </div>
        <div>
           Updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
