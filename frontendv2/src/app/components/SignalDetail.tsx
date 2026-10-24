import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, ArrowLeft, Share2, AlertTriangle, EyeOff, CheckCircle } from 'lucide-react';
import { Signal, SignalStatus } from '../types';
import { VoteControl } from './VoteControl';
import { StatusBadge } from './StatusBadge';
import { clsx } from 'clsx';
import { format } from 'date-fns';

interface SignalDetailProps {
  signal: Signal;
  onClose: () => void;
  onVote: (id: string, newCount: number) => void;
}

const steps: SignalStatus[] = ['REPORTED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'];

export function SignalDetail({ signal, onClose, onVote }: SignalDetailProps) {
  const currentStepIndex = steps.indexOf(signal.status);
  
  // Mock distribution
  const upPercent = 72;
  const downPercent = 28;

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed inset-0 z-50 bg-[#0B0F14] overflow-y-auto"
    >
      <div className="max-w-4xl mx-auto min-h-screen border-x border-white/5 bg-[#0B0F14] relative">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-[#0B0F14]/90 backdrop-blur-md border-b border-white/10">
          <button 
            onClick={onClose}
            className="flex items-center text-[#E0E0E0] hover:text-[#00E5FF] transition-colors font-mono text-sm uppercase tracking-wider group"
          >
            <ArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Terminal
          </button>
          <div className="flex space-x-4">
            <button className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors">
              <Share2 size={20} />
            </button>
            <button className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors">
              <AlertTriangle size={20} />
            </button>
          </div>
        </div>

        <div className="p-8 md:p-12 pb-32">
          <div className="flex flex-col md:flex-row gap-12">
            
            {/* Left: Vote Panel */}
            <div className="md:w-24 flex-shrink-0 flex flex-col items-center sticky top-32 self-start space-y-8">
               <VoteControl 
                 initialVotes={signal.voteCount} 
                 orientation="vertical" 
                 size="lg" 
                 onVote={(c) => onVote(signal.id, c)}
               />
               <div className="text-center space-y-2">
                 <div className="text-[10px] uppercase font-mono tracking-widest text-white/40">Rank</div>
                 <div className="text-2xl font-mono text-white">#{Math.floor(Math.random() * 100)}</div>
               </div>
            </div>

            {/* Right: Content */}
            <div className="flex-grow space-y-10">
              
              {/* Meta & Title */}
              <div className="space-y-6">
                <div className="flex items-center space-x-4 text-xs font-mono uppercase tracking-widest text-white/50">
                  <span>{format(new Date(signal.createdAt), "MMM d, yyyy • HH:mm")}</span>
                  <span>/</span>
                  <span>ID: {signal.id}</span>
                </div>
                
                <h1 className="text-4xl md:text-5xl font-serif text-[#E0E0E0] leading-tight">
                  {signal.title}
                </h1>

                <StatusBadge status={signal.status} size="lg" />
              </div>

              {/* Lifecycle */}
              <div className="border border-white/10 p-6 bg-white/[0.02]">
                <div className="flex items-center justify-between relative">
                  {/* Line */}
                  <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white/10 -z-10" />
                  
                  {steps.map((step, idx) => {
                    const isCompleted = idx <= currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    
                    return (
                      <div key={step} className="flex flex-col items-center bg-[#0B0F14] px-2 z-10">
                        <div className={clsx(
                          "w-4 h-4 rounded-full border-2 mb-2 transition-colors duration-500",
                          isCurrent ? "bg-[#00E5FF] border-[#00E5FF] shadow-[0_0_10px_#00E5FF]" :
                          isCompleted ? "bg-[#2E7D32] border-[#2E7D32]" :
                          "bg-[#0B0F14] border-white/20"
                        )} />
                        <span className={clsx(
                          "text-[10px] font-mono uppercase tracking-wider transition-colors",
                          isCurrent ? "text-[#00E5FF] font-bold" :
                          isCompleted ? "text-[#2E7D32]" :
                          "text-white/30"
                        )}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div className="prose prose-invert max-w-none prose-lg font-mono text-white/80 leading-loose">
                <p>{signal.description}</p>
              </div>

              {/* Vote Distribution (Mock) */}
              <div className="space-y-2 pt-8 border-t border-white/10">
                <div className="flex justify-between text-xs font-mono uppercase text-white/40">
                  <span>Agreement Signal</span>
                  <span>{upPercent}% Upvoted</span>
                </div>
                <div className="h-2 w-full bg-white/10 flex rounded-full overflow-hidden">
                  <div className="bg-[#00E5FF]" style={{ width: `${upPercent}%` }} />
                  <div className="bg-[#FFB300]" style={{ width: `${downPercent}%` }} />
                </div>
              </div>
              
              {/* Engagement Signal */}
              <div className="bg-[#00E5FF]/5 border border-[#00E5FF]/20 p-4 flex items-center space-x-4">
                 <div className="p-2 bg-[#00E5FF]/10 rounded-full">
                    <CheckCircle className="text-[#00E5FF]" size={20} />
                 </div>
                 <div>
                    <h4 className="text-sm font-bold text-[#00E5FF] uppercase tracking-wider mb-1">High Campus Interest</h4>
                    <p className="text-xs text-[#00E5FF]/70 font-mono">This issue is trending in the top 5% of signals this week.</p>
                 </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
