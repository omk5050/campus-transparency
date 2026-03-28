import React, { useState, useMemo, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { initialSignals } from './data';
import { Signal, SortOption, SignalStatus } from './types';
import { api } from '../api';
import { Header } from './components/Header';
import { SignalMeter } from './components/SignalMeter';
import { SignalRow } from './components/SignalRow';
import { SubmitSignal } from './components/SubmitSignal';
import { SignalDetail } from './components/SignalDetail';
import { AdminPanel } from './components/AdminPanel';
import { format } from 'date-fns';

export default function App() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('TRENDING');
  const [view, setView] = useState<'FEED' | 'SUBMIT' | 'ADMIN' | 'DETAIL'>('FEED');
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);

  // Sorting Logic
  const sortedSignals = useMemo(() => {
    let sorted = [...signals];
    switch (sortBy) {
      case 'TRENDING':
        // Trending: Combination of recent votes and time (simple mock logic)
        sorted.sort((a, b) => (b.voteCount + (b.trending ? 50 : 0)) - (a.voteCount + (a.trending ? 50 : 0)));
        break;
      case 'TOP':
        sorted.sort((a, b) => b.voteCount - a.voteCount);
        break;
      case 'NEW':
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'UNRESOLVED':
        // Prioritize unresolved, then by votes
        sorted.sort((a, b) => {
          if (a.status === 'RESOLVED' && b.status !== 'RESOLVED') return 1;
          if (a.status !== 'RESOLVED' && b.status === 'RESOLVED') return -1;
          return b.voteCount - a.voteCount;
        });
        break;
    }
    return sorted;
  }, [signals, sortBy]);

  // Actions
  const handleVote = async (id: string, newCount: number) => {
    const signal = signals.find(s => s.id === id);
    if (!signal) return;
    
    // Optimistic update
    setSignals(prev => prev.map(s => s.id === id ? { ...s, voteCount: newCount } : s));
    
    try {
        if (newCount > signal.voteCount) {
             await api.upvote(id);
        } else {
             await api.downvote(id);
        }
    } catch (e) {
        toast.error("Failed to register vote");
        // Revert Optimistic
        setSignals(prev => prev.map(s => s.id === id ? { ...s, voteCount: signal.voteCount } : s));
    }
    
    // Simple feedback toast
    if (Math.random() > 0.7) {
       // toast("Vote recorded anonymously");
    }
  };

  const handleSubmit = async (newSignalData: Partial<Signal>) => {
    try {
        const title = newSignalData.title || 'Untitled';
        const description = newSignalData.description || '';
        const createdSignal = await api.createIssue(title, description);

        setSignals(prev => [createdSignal, ...prev]);
        setView('FEED');
        toast.success("Signal transmitted to public feed");
    } catch (e) {
        toast.error("Failed to transmit signal");
    }
  };

  const loadFeed = async () => {
    try {
       const feed = await api.getPublicFeed();
       setSignals(feed);
    } catch (e) {
       toast.error("Failed to sync main data link");
    }
  };

  // Initial Bootup
  useEffect(() => {
    const init = async () => {
      try {
        await api.login('student', 'student123'); // Silent auth for public interaction
        await loadFeed();
      } catch (e) {
        console.error("Bootup error", e);
      }
    };
    init();
  }, []);

  const handleUpdateStatus = (id: string, status: SignalStatus) => {
    setSignals(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    toast.success(`Status updated to ${status}`);
  };

  const handleOpenDetail = (id: string) => {
    setSelectedSignalId(id);
    setView('DETAIL');
  };

  const handleCloseDetail = () => {
    setSelectedSignalId(null);
    setView('FEED');
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'n' && view === 'FEED') {
        setView('SUBMIT');
      }
      if (e.key === 'Escape') {
        if (view !== 'FEED') setView('FEED');
        setSelectedSignalId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view]);

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#E0E0E0] font-sans selection:bg-[#00E5FF] selection:text-[#0B0F14]">
      <Toaster position="top-center" toastOptions={{
        style: { background: '#1A1F26', border: '1px solid rgba(255,255,255,0.1)', color: '#E0E0E0', fontFamily: 'JetBrains Mono, monospace' }
      }}/>

      {/* Stats Ticker */}
      <SignalMeter signals={signals} />

      {/* Navigation */}
      <Header 
        sortBy={sortBy} 
        onSortChange={setSortBy} 
        onSubmitClick={() => setView('SUBMIT')}
        onAdminClick={() => setView('ADMIN')}
      />

      {/* Main Feed */}
      <main className="max-w-5xl mx-auto px-4 md:px-6 py-8 pb-32">
        <div className="flex flex-col">
           {/* Date Header */}
           <div className="mb-6 font-mono text-xs text-white/30 uppercase tracking-widest pl-2 border-l border-[#00E5FF]">
             {format(new Date(), "EEEE, MMMM do, yyyy")} // Active Term
           </div>

           <div className="space-y-0">
             {sortedSignals.map((signal, index) => (
               <SignalRow 
                 key={signal.id} 
                 signal={signal} 
                 index={index} 
                 onClick={handleOpenDetail} 
               />
             ))}
           </div>
           
           <div className="mt-12 text-center text-xs font-mono text-white/20 uppercase tracking-widest">
              End of Public Feed // {sortedSignals.length} Signals
           </div>
        </div>
      </main>

      {/* Overlays */}
      <AnimatePresence>
        {view === 'SUBMIT' && (
          <SubmitSignal 
            key="submit"
            onClose={() => setView('FEED')} 
            onSubmit={handleSubmit} 
          />
        )}
        
        {view === 'DETAIL' && selectedSignalId && (
          <SignalDetail 
            key="detail"
            signal={signals.find(s => s.id === selectedSignalId)!} 
            onClose={handleCloseDetail}
            onVote={handleVote}
          />
        )}
        
        {view === 'ADMIN' && (
            <div className="fixed inset-0 z-50">
               <AdminPanel 
                 onClose={() => setView('FEED')} 
                 refreshFeed={loadFeed}
               />
            </div>
        )}
      </AnimatePresence>
    </div>
  );
}
