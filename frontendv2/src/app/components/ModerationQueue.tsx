import React, { useState } from 'react';
import { format } from 'date-fns';
import { Cpu, Check, X, AlertTriangle, Eye, RefreshCw, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { toast } from 'sonner';
import type { ModerationItem } from '../types';
import { moderationQueue as initialQueue } from '../data';
import { reviewModerationItem } from '../services';

const C = {
  bg: '#08090E', surface: '#0F1117', surface2: '#161921',
  border: '#1E222B', border2: '#2D3140', cyan: '#00C8E8', text: '#E2E5EE',
  textSub: '#8A8FA8', textDim: '#52576A', emerald: '#10B981', amber: '#F59E0B',
  violet: '#8B5CF6', rose: '#F43F5E', orange: '#F97316',
} as const;

const FLAG_COLORS: Record<string, string> = {
  SPAM: C.rose,
  PROFANITY: C.orange,
  ABUSE: C.rose,
  DUPLICATE: C.violet,
  OFF_TOPIC: C.amber,
  REVIEW: C.cyan,
};

const DECISION_LABELS: Record<ModerationItem['aiDecision'], { label: string; color: string }> = {
  ACCEPT: { label: 'Accept', color: C.emerald },
  REJECT: { label: 'Reject', color: C.rose },
  ESCALATE: { label: 'Escalate', color: C.amber },
  HOLD: { label: 'Hold for Review', color: C.violet },
};

interface ModerationCardProps {
  item: ModerationItem;
  onReview: (id: string, decision: 'ACCEPT' | 'REJECT', note?: string) => void;
}

function ModerationCard({ item, onReview }: ModerationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [overrideNote, setOverrideNote] = useState('');
  const [overriding, setOverriding] = useState(false);

  const isReviewed = !!item.humanDecision;
  const aiMeta = DECISION_LABELS[item.aiDecision];

  return (
    <div
      className="border transition-all"
      style={{
        borderColor: isReviewed ? C.border : `${FLAG_COLORS[item.flagType] ?? C.border}40`,
        background: isReviewed ? C.surface : `${FLAG_COLORS[item.flagType] ?? C.cyan}04`,
      }}
    >
      {/* Item header */}
      <div className="flex items-stretch">
        {/* Flag stripe */}
        <div className="w-0.5 flex-shrink-0" style={{ background: isReviewed ? C.border : FLAG_COLORS[item.flagType] ?? C.cyan }} />

        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {/* Flag badge */}
                <span
                  className="font-mono text-[9px] px-2 py-0.5 uppercase tracking-widest border"
                  style={{ color: FLAG_COLORS[item.flagType] ?? C.cyan, borderColor: `${FLAG_COLORS[item.flagType] ?? C.cyan}28`, background: `${FLAG_COLORS[item.flagType] ?? C.cyan}08` }}
                >
                  {item.flagType.replace('_', ' ')}
                </span>
                {/* AI confidence */}
                <div className="flex items-center gap-1.5">
                  <Cpu size={9} style={{ color: C.violet }} />
                  <span className="font-mono text-[9px]" style={{ color: C.violet }}>
                    AI: {aiMeta.label}
                  </span>
                  <div className="h-1 w-12" style={{ background: C.border }}>
                    <div className="h-full" style={{ width: `${item.aiConfidence * 100}%`, background: C.violet }} />
                  </div>
                  <span className="font-mono text-[9px]" style={{ color: C.violet }}>{Math.round(item.aiConfidence * 100)}%</span>
                </div>

                {/* Human decision */}
                {isReviewed && (
                  <span
                    className="flex items-center gap-1 font-mono text-[9px] px-2 py-0.5 uppercase tracking-widest"
                    style={{ color: item.humanDecision === 'ACCEPT' ? C.emerald : C.rose, background: `${item.humanDecision === 'ACCEPT' ? C.emerald : C.rose}0C` }}
                  >
                    <Shield size={8} /> Human: {item.humanDecision}
                  </span>
                )}
              </div>

              <div className="font-mono text-xs font-bold truncate" style={{ color: C.text }}>{item.title}</div>
              <div className="flex items-center gap-3 mt-1 font-mono text-[9px]" style={{ color: C.textDim }}>
                <span>{item.caseId}</span>
                <span>·</span>
                <span>{format(new Date(item.flaggedAt), 'dd MMM yyyy, HH:mm')}</span>
                {item.reviewedAt && <span>· Reviewed {format(new Date(item.reviewedAt), 'dd MMM')}</span>}
              </div>
            </div>

            {!isReviewed && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onReview(item.id, 'ACCEPT')}
                  className="flex items-center gap-1.5 px-3 py-2 font-mono text-[10px] uppercase tracking-widest"
                  style={{ background: `${C.emerald}14`, color: C.emerald, border: `1px solid ${C.emerald}28` }}
                >
                  <Check size={10} /> Accept
                </button>
                <button
                  onClick={() => { setOverriding(true); setExpanded(true); }}
                  className="flex items-center gap-1.5 px-3 py-2 font-mono text-[10px] uppercase tracking-widest"
                  style={{ background: `${C.rose}14`, color: C.rose, border: `1px solid ${C.rose}28` }}
                >
                  <X size={10} /> Reject
                </button>
                <button
                  onClick={() => setExpanded(v => !v)}
                  className="p-2"
                  style={{ color: C.textDim }}
                >
                  {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>
            )}
          </div>

          {/* Excerpt */}
          <div className="mt-3 px-3 py-2 border-l-2" style={{ borderColor: `${FLAG_COLORS[item.flagType] ?? C.cyan}30` }}>
            <p className="font-mono text-[10px] leading-relaxed line-clamp-3" style={{ color: C.textSub }}>
              {item.excerpt}
            </p>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t px-5 py-4 space-y-4" style={{ borderColor: C.border, background: C.surface2 }}>
          {/* AI explanation */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Cpu size={10} style={{ color: C.violet }} />
              <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: C.violet }}>AI Analysis</span>
            </div>
            <p className="font-mono text-[10px] leading-relaxed" style={{ color: C.textSub }}>{item.aiReason}</p>
          </div>

          {/* Override form */}
          {overriding && !isReviewed && (
            <div className="space-y-3">
              <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.amber }}>
                <AlertTriangle size={10} className="inline mr-1" />Reject with Note
              </div>
              <textarea
                value={overrideNote}
                onChange={e => setOverrideNote(e.target.value)}
                rows={2}
                placeholder="Reason for rejection (optional)..."
                className="w-full px-3 py-2 border font-mono text-xs bg-transparent outline-none resize-none"
                style={{ borderColor: C.border, color: C.text }}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setOverriding(false); setExpanded(false); }}
                  className="font-mono text-[10px] uppercase tracking-widest"
                  style={{ color: C.textDim }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => onReview(item.id, 'REJECT', overrideNote)}
                  className="px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest"
                  style={{ background: C.rose, color: C.text }}
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          )}

          {/* Reviewed note */}
          {isReviewed && item.reviewNote && (
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: C.textDim }}>Reviewer Note</div>
              <p className="font-mono text-[10px]" style={{ color: C.textSub }}>{item.reviewNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Moderation Queue View ─────────────────────────────────────────────────────

export function ModerationQueueView() {
  const [items, setItems] = useState<ModerationItem[]>(initialQueue);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'REVIEWED'>('PENDING');
  const [flagFilter, setFlagFilter] = useState<string | null>(null);

  const flagTypes = Array.from(new Set(items.map(i => i.flagType)));

  const filtered = items
    .filter(item => {
      if (filter === 'PENDING') return !item.humanDecision;
      if (filter === 'REVIEWED') return !!item.humanDecision;
      return true;
    })
    .filter(item => !flagFilter || item.flagType === flagFilter);

  const pendingCount = items.filter(i => !i.humanDecision).length;
  const acceptedCount = items.filter(i => i.humanDecision === 'ACCEPT').length;
  const rejectedCount = items.filter(i => i.humanDecision === 'REJECT').length;

  const handleReview = (id: string, decision: 'ACCEPT' | 'REJECT', note?: string) => {
    reviewModerationItem(id, decision, 'a.chen@northfield.edu', note);
    setItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, humanDecision: decision, reviewedBy: 'a.chen@northfield.edu', reviewedAt: new Date().toISOString(), reviewNote: note }
        : item
    ));
    toast.success(`Moderation decision: ${decision}`);
  };

  return (
    <div className="flex-1 overflow-auto" style={{ background: C.bg }}>
      {/* Header */}
      <div className="px-8 py-6 border-b" style={{ borderColor: C.border }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: C.textDim }}>Moderation</div>
            <h1 className="font-serif text-2xl" style={{ color: C.text }}>Moderation Queue</h1>
          </div>
          <div className="flex items-center gap-5 font-mono text-xs">
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: C.amber }}>{pendingCount}</div>
              <div className="text-[9px] uppercase tracking-widest" style={{ color: C.textDim }}>Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: C.emerald }}>{acceptedCount}</div>
              <div className="text-[9px] uppercase tracking-widest" style={{ color: C.textDim }}>Accepted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: C.rose }}>{rejectedCount}</div>
              <div className="text-[9px] uppercase tracking-widest" style={{ color: C.textDim }}>Rejected</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-8 py-3 border-b flex-wrap" style={{ borderColor: C.border }}>
        <div className="flex border" style={{ borderColor: C.border }}>
          {(['ALL', 'PENDING', 'REVIEWED'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-all"
              style={{
                background: filter === f ? C.cyan : 'transparent',
                color: filter === f ? C.bg : C.textDim,
                borderRight: f !== 'REVIEWED' ? `1px solid ${C.border}` : 'none',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 ml-4">
          <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: C.textDim }}>Flag:</span>
          {flagTypes.map(ft => (
            <button
              key={ft}
              onClick={() => setFlagFilter(flagFilter === ft ? null : ft)}
              className="px-3 py-1.5 border font-mono text-[9px] uppercase tracking-widest transition-all"
              style={{
                borderColor: flagFilter === ft ? (FLAG_COLORS[ft] ?? C.cyan) : C.border,
                color: flagFilter === ft ? (FLAG_COLORS[ft] ?? C.cyan) : C.textDim,
                background: flagFilter === ft ? `${FLAG_COLORS[ft] ?? C.cyan}0C` : 'transparent',
              }}
            >
              {ft.replace('_', ' ')}
            </button>
          ))}
        </div>

        <button
          onClick={() => { setFilter('ALL'); setFlagFilter(null); }}
          className="ml-auto flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest"
          style={{ color: C.textDim }}
        >
          <RefreshCw size={10} /> Reset
        </button>
      </div>

      {/* AI / Human note */}
      <div className="px-8 py-3 border-b flex items-center gap-3" style={{ borderColor: C.border, background: `${C.violet}06` }}>
        <Cpu size={11} style={{ color: C.violet }} />
        <p className="font-mono text-[10px]" style={{ color: C.textDim }}>
          ETHOS Intelligence pre-screens reports and flags potential issues. Human moderators review AI decisions before any action is taken.
          All decisions are logged in the audit trail.
        </p>
      </div>

      {/* Items */}
      <div className="max-w-4xl mx-auto px-8 py-6 space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Eye size={32} style={{ color: C.border2 }} />
            <p className="font-mono text-xs uppercase tracking-widest" style={{ color: C.textDim }}>
              {filter === 'PENDING' ? 'No items awaiting review.' : 'No items to display.'}
            </p>
          </div>
        ) : (
          filtered.map(item => (
            <ModerationCard key={item.id} item={item} onReview={handleReview} />
          ))
        )}
      </div>
    </div>
  );
}
