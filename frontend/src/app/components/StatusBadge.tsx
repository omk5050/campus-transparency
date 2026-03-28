import React from 'react';
import { clsx } from 'clsx';
import { SignalStatus } from '../types';

interface StatusBadgeProps {
  status: SignalStatus;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<SignalStatus, { color: string; bg: string; label: string }> = {
  REPORTED: { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'REPORTED' },
  IN_PROGRESS: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', label: 'IN_PROGRESS' },
  RESOLVED: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'RESOLVED' },
  REJECTED: { color: 'text-rose-500', bg: 'bg-rose-500/10', label: 'REJECTED' },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span className={clsx(
      "font-mono uppercase tracking-widest border border-current select-none inline-flex items-center justify-center",
      config.color,
      config.bg,
      size === 'sm' ? "text-[10px] px-2 py-0.5" : 
      size === 'lg' ? "text-sm px-4 py-1.5" : 
      "text-xs px-2.5 py-1"
    )}>
      <span className="w-1.5 h-1.5 bg-current mr-2 animate-pulse rounded-full opacity-70" />
      {config.label}
    </span>
  );
}
