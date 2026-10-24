import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Signal, SignalStatus } from '../types';
import { clsx } from 'clsx';
import { AlertTriangle, Eye, EyeOff, MoreHorizontal, Check, X } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface AdminPanelProps {
  signals: Signal[];
  onUpdateStatus: (id: string, status: SignalStatus) => void;
  onClose: () => void;
}

export function AdminPanel({ signals, onUpdateStatus, onClose }: AdminPanelProps) {
  const [filter, setFilter] = useState<SignalStatus | 'ALL'>('ALL');

  const filteredSignals = filter === 'ALL' 
    ? signals 
    : signals.filter(s => s.status === filter);

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0F14] text-white overflow-hidden flex flex-col">
      <div className="bg-[#1A1F26] border-b border-white/10 p-4 flex items-center justify-between shadow-lg z-10">
        <div className="flex items-center space-x-4">
           <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
           <h2 className="text-sm font-mono uppercase tracking-widest font-bold">Admin Console // Moderator Access</h2>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-[#11151A] border-r border-white/5 p-6 flex flex-col space-y-6 hidden md:flex">
           <div className="text-xs font-mono uppercase text-white/30 mb-2 tracking-widest">Filters</div>
           {(['ALL', 'REPORTED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] as const).map((status) => (
             <button
               key={status}
               onClick={() => setFilter(status)}
               className={clsx(
                 "text-left px-3 py-2 text-xs font-mono uppercase tracking-wider transition-colors border-l-2",
                 filter === status 
                   ? "border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/5" 
                   : "border-transparent text-white/50 hover:text-white hover:bg-white/5"
               )}
             >
               {status}
             </button>
           ))}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto bg-[#0B0F14] p-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-xs font-mono uppercase text-white/30 tracking-widest">
                <th className="p-4 font-normal">ID</th>
                <th className="p-4 font-normal">Title</th>
                <th className="p-4 font-normal">Votes</th>
                <th className="p-4 font-normal">Status</th>
                <th className="p-4 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSignals.map((signal) => (
                <tr key={signal.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                  <td className="p-4 font-mono text-xs text-white/40">{signal.id}</td>
                  <td className="p-4 max-w-xs truncate font-medium text-white/80">{signal.title}</td>
                  <td className="p-4 font-mono text-white/60">
                    {signal.voteCount > 50 ? <span className="text-rose-400 font-bold flex items-center gap-1"><AlertTriangle size={12}/> {signal.voteCount}</span> : signal.voteCount}
                  </td>
                  <td className="p-4">
                    <select 
                      value={signal.status}
                      onChange={(e) => onUpdateStatus(signal.id, e.target.value as SignalStatus)}
                      className="bg-[#0B0F14] border border-white/20 text-xs font-mono uppercase text-white/70 px-2 py-1 focus:border-[#00E5FF] outline-none rounded-none"
                    >
                      <option value="REPORTED">Reported</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1 hover:bg-white/10 text-white/40 hover:text-white transition-colors" title="Hide Issue">
                        <EyeOff size={16} />
                      </button>
                      <button className="p-1 hover:bg-white/10 text-white/40 hover:text-white transition-colors" title="Flag User">
                        <AlertTriangle size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
