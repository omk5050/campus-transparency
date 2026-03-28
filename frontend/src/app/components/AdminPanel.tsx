import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Signal, SignalStatus } from '../types';
import { clsx } from 'clsx';
import { AlertTriangle, Eye, EyeOff, X, Lock, TerminalSquare } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { api } from '../../api';
import { toast } from 'sonner';

interface AdminPanelProps {
  onClose: () => void;
  refreshFeed: () => Promise<void>;
}

export function AdminPanel({ onClose, refreshFeed }: AdminPanelProps) {
  const [isLogged, setIsLogged] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [signals, setSignals] = useState<Signal[]>([]);
  const [filter, setFilter] = useState<SignalStatus | 'ALL'>('ALL');

  useEffect(() => {
    if (isLogged) {
       loadAdminFeed();
    }
  }, [isLogged]);

  const loadAdminFeed = async () => {
     try {
         const data = await api.getAdminFeed();
         setSignals(data);
     } catch(e) {
         toast.error("Failed to fetch admin data via secure link.");
     }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
       await api.login(username, password);
       setIsLogged(true);
       toast.success("Administrator access granted.");
    } catch(e) {
       toast.error("Access Denied.");
    } finally {
       setIsLoggingIn(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: SignalStatus) => {
    try {
        await api.updateStatus(id, status);
        toast.success(`Signal ${id} updated to ${status}`);
        loadAdminFeed(); // refresh local
        refreshFeed(); // refresh background main feed
    } catch(e) {
        toast.error("Failed to execute directive");
    }
  };

  const handleHide = async (id: string) => {
      try {
          await api.hideIssue(id);
          toast.success(`Signal ${id} scrubbed from public view`);
          loadAdminFeed();
          refreshFeed();
      } catch (e) {
          toast.error("Scrub operation failed");
      }
  };

  if (!isLogged) {
      return (
        <div className="fixed inset-0 z-50 bg-[#0B0F14]/90 backdrop-blur-sm text-white flex items-center justify-center p-4">
           <motion.div 
             initial={{ scale: 0.95, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             exit={{ scale: 0.95, opacity: 0 }}
             className="w-full max-w-md bg-[#11151A] border border-white/10 p-8 relative overflow-hidden shadow-2xl"
           >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent" />
              <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white transition">
                 <X size={20} />
              </button>
              
              <div className="flex items-center space-x-3 mb-8">
                 <TerminalSquare className="text-[#00E5FF]" size={28} />
                 <h2 className="text-xl font-mono uppercase tracking-widest text-white/90">Authentication</h2>
              </div>
              
              <form onSubmit={handleLogin} className="space-y-6">
                 <div>
                    <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-2">Identifier</label>
                    <input 
                      autoFocus
                      type="text" 
                      value={username}
                      onChange={(e)=>setUsername(e.target.value)}
                      className="w-full bg-[#0B0F14] border border-white/20 p-3 font-mono text-white placeholder-white/20 focus:border-[#00E5FF] focus:outline-none transition-colors"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-2">Passphrase</label>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e)=>setPassword(e.target.value)}
                      className="w-full bg-[#0B0F14] border border-white/20 p-3 font-mono text-white placeholder-white/20 focus:border-[#00E5FF] focus:outline-none transition-colors"
                    />
                 </div>
                 
                 <button 
                   type="submit" 
                   disabled={isLoggingIn}
                   className="w-full flex items-center justify-center space-x-2 bg-[#00E5FF] hover:bg-[#00E5FF]/80 text-[#0B0F14] font-bold p-3 uppercase font-mono tracking-widest transition-all disabled:opacity-50"
                 >
                    <Lock size={16} />
                    <span>{isLoggingIn ? 'Verifying...' : 'Establish Uplink'}</span>
                 </button>
              </form>
           </motion.div>
        </div>
      );
  }

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
                      onChange={(e) => handleUpdateStatus(signal.id, e.target.value as SignalStatus)}
                      className="bg-[#0B0F14] border border-white/20 text-xs font-mono uppercase text-white/70 px-2 py-1 focus:border-[#00E5FF] outline-none rounded-none w-full max-w-[140px]"
                    >
                      <option value="REPORTED">Reported</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleHide(signal.id)} className="p-1 hover:bg-white/10 text-white/40 hover:text-rose-400 transition-colors" title="Scrub / Hide Issue">
                        <EyeOff size={16} />
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
