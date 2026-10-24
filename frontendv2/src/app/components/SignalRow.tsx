import React from 'react';
import { motion } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { VoteControl } from './VoteControl';
import { StatusBadge } from './StatusBadge';
import { Signal } from '../types';
import { clsx } from 'clsx';
import { TrendingUp, Flame } from 'lucide-react';

interface SignalRowProps {
  signal: Signal;
  onClick: (id: string) => void;
  index: number;
}

export function SignalRow({ signal, onClick, index }: SignalRowProps) {
  const isNegative = signal.voteCount < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => onClick(signal.id)}
      className={clsx(
        "group relative flex items-start border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer",
        isNegative ? "opacity-40 grayscale" : "opacity-100"
      )}
    >
      {/* Vote Column */}
      <div className="flex-shrink-0 p-4 pl-6 border-r border-white/5 w-[88px] flex justify-center">
        <VoteControl initialVotes={signal.voteCount} />
      </div>

      {/* Main Content */}
      <div className="flex-grow p-5 min-w-0">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h3 className={clsx(
            "text-xl font-serif font-medium leading-tight text-[#E0E0E0] group-hover:text-[#00E5FF] transition-colors",
            "line-clamp-2"
          )}>
            {signal.title}
          </h3>
          <div className="flex-shrink-0 flex items-center space-x-3">
            {signal.trending && (
              <span className="flex items-center text-[10px] text-[#00E5FF] uppercase font-mono tracking-wider border border-[#00E5FF]/20 px-1.5 py-0.5 bg-[#00E5FF]/5">
                <TrendingUp size={12} className="mr-1" /> Trending
              </span>
            )}
            {signal.hot && (
              <span className="flex items-center text-[10px] text-[#FFB300] uppercase font-mono tracking-wider border border-[#FFB300]/20 px-1.5 py-0.5 bg-[#FFB300]/5 animate-pulse">
                <Flame size={12} className="mr-1" /> Hot
              </span>
            )}
            <StatusBadge status={signal.status} size="sm" />
          </div>
        </div>

        <p className="text-white/50 text-sm font-mono line-clamp-2 max-w-3xl mb-4 leading-relaxed">
          {signal.description}
        </p>

        <div className="flex items-center text-xs font-mono text-white/30 uppercase tracking-wider space-x-4">
          <span>ID: {signal.id}</span>
          <span className="w-px h-3 bg-white/10" />
          <span>{formatDistanceToNow(new Date(signal.createdAt), { addSuffix: true })}</span>
          <span className="w-px h-3 bg-white/10" />
          <span>Reporter: {signal.reporterHash}</span>
        </div>
      </div>
      
      {/* Hover Indicator */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00E5FF] opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );
}
