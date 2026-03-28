import React from 'react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { SortOption } from '../types';
import { Plus, Terminal, Lock } from 'lucide-react';

interface HeaderProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onSubmitClick: () => void;
  onAdminClick: () => void;
}

export function Header({ sortBy, onSortChange, onSubmitClick, onAdminClick }: HeaderProps) {
  const tabs: SortOption[] = ['TRENDING', 'TOP', 'NEW', 'UNRESOLVED'];

  return (
    <header className="sticky top-0 z-20 bg-[#0B0F14]/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-5xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-10 h-10 bg-[#00E5FF] flex items-center justify-center text-[#0B0F14]">
            <Terminal size={24} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-serif tracking-tighter leading-none text-[#E0E0E0] group-hover:text-white transition-colors">
              CAMPUS SIGNAL
            </h1>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#00E5FF] group-hover:tracking-[0.3em] transition-all">
              Public Terminal
            </span>
          </div>
        </div>

        {/* Desktop Sort Tabs */}
        <nav className="hidden md:flex items-center bg-white/5 p-1 rounded-sm">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => onSortChange(tab)}
              className={clsx(
                "relative px-4 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors",
                sortBy === tab ? "text-[#0B0F14] font-bold" : "text-white/50 hover:text-white"
              )}
            >
              {sortBy === tab && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-[#E0E0E0] shadow-sm"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{tab}</span>
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          <button 
            onClick={onAdminClick}
            className="p-2 text-white/20 hover:text-white transition-colors"
            title="Admin Access"
          >
            <Lock size={16} />
          </button>
          
          <button
            onClick={onSubmitClick}
            className="flex items-center space-x-2 bg-white/10 hover:bg-[#00E5FF] hover:text-[#0B0F14] text-[#E0E0E0] px-4 py-2 text-xs font-mono uppercase tracking-widest border border-white/20 hover:border-[#00E5FF] transition-all active:scale-95"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Signal</span>
          </button>
        </div>

      </div>
      
      {/* Mobile Sort Tabs (Horizontal Scroll) */}
      <div className="md:hidden overflow-x-auto border-t border-white/5 flex items-center space-x-4 px-4 py-3 scrollbar-hide">
         {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => onSortChange(tab)}
              className={clsx(
                "whitespace-nowrap text-xs font-mono uppercase tracking-wider px-3 py-1 border transition-colors",
                sortBy === tab 
                  ? "border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/10" 
                  : "border-transparent text-white/40"
              )}
            >
              {tab}
            </button>
          ))}
      </div>
    </header>
  );
}
