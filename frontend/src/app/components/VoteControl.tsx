import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

interface VoteControlProps {
  initialVotes: number;
  onVote?: (newCount: number) => void;
  orientation?: 'vertical' | 'horizontal';
  size?: 'sm' | 'lg';
}

export function VoteControl({ initialVotes, onVote, orientation = 'vertical', size = 'sm' }: VoteControlProps) {
  const [votes, setVotes] = useState(initialVotes);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);

  React.useEffect(() => {
    setVotes(initialVotes);
  }, [initialVotes]);

  const handleUpvote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (userVote === 'up') {
      const newVotes = votes - 1;
      setVotes(newVotes);
      setUserVote(null);
      onVote?.(newVotes);
    } else {
      const newVotes = userVote === 'down' ? votes + 2 : votes + 1;
      setVotes(newVotes);
      setUserVote('up');
      onVote?.(newVotes);
    }
  };

  const handleDownvote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (userVote === 'down') {
      const newVotes = votes + 1;
      setVotes(newVotes);
      setUserVote(null);
      onVote?.(newVotes);
    } else {
      const newVotes = userVote === 'up' ? votes - 2 : votes - 1;
      setVotes(newVotes);
      setUserVote('down');
      onVote?.(newVotes);
    }
  };

  const isVertical = orientation === 'vertical';

  return (
    <div className={clsx(
      "flex items-center justify-center bg-[#0B0F14] border border-white/10",
      isVertical ? "flex-col w-12 py-1" : "flex-row px-3 py-1 space-x-4",
      size === 'lg' ? "scale-125" : ""
    )}>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleUpvote}
        className={clsx(
          "p-1 hover:bg-white/5 transition-colors",
          userVote === 'up' ? "text-[#00E5FF]" : "text-white/40 hover:text-white/80"
        )}
      >
        <ChevronUp size={20} strokeWidth={3} />
      </motion.button>
      
      <div className={clsx(
        "font-mono font-bold text-center tabular-nums relative overflow-hidden",
        size === 'lg' ? "text-2xl my-2" : "text-lg my-1",
        votes > 50 ? "text-[#00E5FF] drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]" : "text-[#E0E0E0]",
        votes < 0 ? "text-white/30" : ""
      )}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={votes}
            initial={{ y: userVote === 'up' ? 20 : -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: userVote === 'up' ? -20 : 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="block"
          >
            {votes}
          </motion.span>
        </AnimatePresence>
      </div>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleDownvote}
        className={clsx(
          "p-1 hover:bg-white/5 transition-colors",
          userVote === 'down' ? "text-[#FFB300]" : "text-white/40 hover:text-white/80"
        )}
      >
        <ChevronDown size={20} strokeWidth={3} />
      </motion.button>
    </div>
  );
}
