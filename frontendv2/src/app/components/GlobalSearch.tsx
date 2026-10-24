import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight, FileText, Building2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Report, ReportStatus } from '../types';

const C = {
  bg: '#08090E', surface: '#0F1117', surface2: '#161921',
  border: '#1E222B', border2: '#2D3140', cyan: '#00C8E8', text: '#E2E5EE',
  textSub: '#8A8FA8', textDim: '#52576A', emerald: '#10B981', amber: '#F59E0B',
  violet: '#8B5CF6', rose: '#F43F5E', orange: '#F97316',
} as const;

const STATUS_COLOR: Record<ReportStatus, string> = {
  REPORTED: C.amber, UNDER_REVIEW: '#38BDF8', TRIAGED: '#38BDF8', IN_PROGRESS: C.cyan,
  PENDING_REVIEW: C.violet, RESOLVED: C.emerald, REJECTED: C.rose, ARCHIVED: '#6B7280',
};

const QUICK_FILTERS = [
  { label: 'Critical', filter: (r: Report) => r.priority === 'CRITICAL', color: C.rose },
  { label: 'Unassigned', filter: (r: Report) => !r.assignedTo, color: C.amber },
  { label: 'Escalated', filter: (r: Report) => r.isEscalated, color: C.orange },
  { label: 'Resolved', filter: (r: Report) => r.status === 'RESOLVED', color: C.emerald },
  { label: 'SLA Risk', filter: (r: Report) => !r.slaBreached && r.priority === 'HIGH', color: C.amber },
];

interface GlobalSearchProps {
  reports: Report[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function GlobalSearch({ reports, onSelect, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = React.useMemo(() => {
    let list = [...reports];

    if (activeFilter !== null) {
      list = list.filter(QUICK_FILTERS[activeFilter].filter);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(r =>
        r.id.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        r.priority.toLowerCase().includes(q) ||
        (r.assignedTo ?? '').toLowerCase().includes(q) ||
        (r.location ?? '').toLowerCase().includes(q)
      );
    }

    return list.slice(0, 12);
  }, [query, activeFilter, reports]);

  useEffect(() => { setSelectedIndex(0); }, [results]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && results[selectedIndex]) { onSelect(results[selectedIndex].id); onClose(); }
    else if (e.key === 'Escape') onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]" style={{ background: 'rgba(8,9,14,0.88)' }} onClick={onClose}>
      <div
        className="w-full max-w-2xl mx-4 border overflow-hidden"
        style={{ background: C.surface, borderColor: C.border2 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: C.border }}>
          <Search size={16} style={{ color: C.textDim, flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search ETHOS — case ID, title, category, department..."
            className="flex-1 font-mono text-sm bg-transparent outline-none"
            style={{ color: C.text }}
          />
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="font-mono text-[9px] px-2 py-0.5 border" style={{ borderColor: C.border2, color: C.textDim }}>ESC</span>
            <button onClick={onClose} style={{ color: C.textDim }}><X size={15} /></button>
          </div>
        </div>

        {/* Quick filters */}
        <div className="flex items-center gap-1.5 px-5 py-2.5 border-b overflow-x-auto" style={{ borderColor: C.border }}>
          <span className="font-mono text-[9px] uppercase tracking-widest flex-shrink-0 mr-1" style={{ color: C.textDim }}>Quick:</span>
          {QUICK_FILTERS.map((f, i) => (
            <button
              key={f.label}
              onClick={() => setActiveFilter(activeFilter === i ? null : i)}
              className="flex-shrink-0 px-3 py-1 border font-mono text-[9px] uppercase tracking-widest transition-all"
              style={{
                borderColor: activeFilter === i ? f.color : C.border,
                color: activeFilter === i ? f.color : C.textDim,
                background: activeFilter === i ? `${f.color}0C` : 'transparent',
              }}
            >
              {f.label}
            </button>
          ))}
          {(query || activeFilter !== null) && (
            <button
              onClick={() => { setQuery(''); setActiveFilter(null); }}
              className="flex-shrink-0 ml-auto px-2 py-1 font-mono text-[9px] uppercase tracking-widest"
              style={{ color: C.textDim }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[440px] overflow-auto">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Search size={24} style={{ color: C.border2 }} />
              <p className="font-mono text-xs uppercase tracking-widest" style={{ color: C.textDim }}>
                {query ? 'No cases match your search.' : 'Start typing to search cases.'}
              </p>
            </div>
          ) : (
            results.map((r, i) => (
              <div
                key={r.id}
                onClick={() => { onSelect(r.id); onClose(); }}
                className="flex items-stretch border-b cursor-pointer transition-colors"
                style={{
                  borderColor: C.border,
                  background: i === selectedIndex ? `${C.cyan}08` : 'transparent',
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                {/* Priority stripe */}
                <div className="w-0.5 flex-shrink-0" style={{
                  background: r.priority === 'CRITICAL' ? C.rose : r.priority === 'HIGH' ? C.orange : r.priority === 'MEDIUM' ? C.amber : C.textDim
                }} />
                <div className="flex items-center gap-4 px-4 py-3 flex-1 min-w-0">
                  <FileText size={13} style={{ color: C.textDim, flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-[10px]" style={{ color: STATUS_COLOR[r.status] }}>●</span>
                      <span className="font-mono text-[9px] font-bold" style={{ color: C.textDim }}>{r.id}</span>
                      <span className="font-mono text-[9px]" style={{ color: C.textDim }}>·</span>
                      <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: C.textDim }}>{r.priority}</span>
                    </div>
                    <div className="font-mono text-xs truncate" style={{ color: C.text }}>{r.title}</div>
                    <div className="font-mono text-[9px]" style={{ color: C.textDim }}>
                      {r.category} · {r.department} · {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  {i === selectedIndex && <ArrowRight size={12} style={{ color: C.cyan, flexShrink: 0 }} />}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t" style={{ borderColor: C.border }}>
          <div className="flex items-center gap-4 font-mono text-[9px]" style={{ color: C.textDim }}>
            <span><span className="px-1 border" style={{ borderColor: C.border2 }}>↑↓</span> navigate</span>
            <span><span className="px-1 border" style={{ borderColor: C.border2 }}>↵</span> open</span>
            <span><span className="px-1 border" style={{ borderColor: C.border2 }}>esc</span> close</span>
          </div>
          <span className="font-mono text-[9px]" style={{ color: C.textDim }}>
            {results.length} result{results.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
