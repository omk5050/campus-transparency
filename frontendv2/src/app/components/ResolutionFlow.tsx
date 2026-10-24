import React, { useState } from 'react';
import { CheckCircle2, X, Upload, Bell, Eye, EyeOff, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import type { Resolution, ResolutionCategory, ResolutionFeedback } from '../types';
import { resolveCase, submitFeedback } from '../services';

const C = {
  bg: '#08090E', surface: '#0F1117', surface2: '#161921',
  border: '#1E222B', border2: '#2D3140', cyan: '#00C8E8', text: '#E2E5EE',
  textSub: '#8A8FA8', textDim: '#52576A', emerald: '#10B981', amber: '#F59E0B',
  violet: '#8B5CF6', rose: '#F43F5E',
} as const;

const CATEGORIES: { id: ResolutionCategory; label: string; desc: string }[] = [
  { id: 'CORRECTIVE_ACTION', label: 'Corrective Action', desc: 'Issue addressed through direct corrective measures.' },
  { id: 'POLICY_CHANGE', label: 'Policy Change', desc: 'Resolution involved updating or creating a policy.' },
  { id: 'INVESTIGATION_COMPLETED', label: 'Investigation Completed', desc: 'Full investigation conducted and documented.' },
  { id: 'NO_VIOLATION_FOUND', label: 'No Violation Found', desc: 'Investigation found no policy violation or issue.' },
  { id: 'REFERRED', label: 'Referred to Another Department', desc: 'Case transferred to a more appropriate department.' },
  { id: 'OTHER', label: 'Other', desc: 'Resolution does not fit the above categories.' },
];

const RATINGS: { id: ResolutionFeedback['rating']; label: string; color: string }[] = [
  { id: 'VERY_SATISFIED', label: 'Very Satisfied', color: '#10B981' },
  { id: 'SATISFIED', label: 'Satisfied', color: '#38BDF8' },
  { id: 'NEUTRAL', label: 'Neutral', color: '#8A8FA8' },
  { id: 'DISSATISFIED', label: 'Dissatisfied', color: '#F59E0B' },
  { id: 'VERY_DISSATISFIED', label: 'Very Dissatisfied', color: '#F43F5E' },
];

// ─── Resolution Form (investigator) ───────────────────────────────────────────

interface ResolutionFormProps {
  caseId: string;
  onResolved: (res: Resolution) => void;
  onClose: () => void;
}

export function ResolutionForm({ caseId, onResolved, onClose }: ResolutionFormProps) {
  const [category, setCategory] = useState<ResolutionCategory | ''>('');
  const [summary, setSummary] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [notifyReporter, setNotifyReporter] = useState(true);
  const [visibility, setVisibility] = useState<'PRIVATE' | 'ANONYMIZED'>('ANONYMIZED');

  const handleSubmit = () => {
    if (!category || !summary || !actionTaken) {
      toast.error('Please complete all required fields.');
      return;
    }
    const res = resolveCase(caseId, {
      category: category as ResolutionCategory,
      summary,
      actionTaken,
      resolvedBy: 'a.chen@northfield.edu',
      notifyReporter,
      publicVisibility: visibility,
    });
    onResolved(res);
    toast.success('Case resolved. Reporter notified.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(8,9,14,0.88)' }}>
      <div className="w-full max-w-2xl mx-4 border overflow-hidden" style={{ background: C.surface, borderColor: C.border2 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: C.border }}>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest mb-0.5" style={{ color: C.emerald }}>ETHOS // Resolution</div>
            <div className="font-serif text-lg" style={{ color: C.text }}>Resolve Case {caseId}</div>
          </div>
          <button onClick={onClose} style={{ color: C.textSub }}><X size={18} /></button>
        </div>

        <div className="px-6 py-6 space-y-6 max-h-[70vh] overflow-auto">
          {/* Category */}
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: C.textDim }}>
              Resolution Category *
            </label>
            <div className="space-y-1.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className="w-full flex items-start gap-4 px-4 py-3 border text-left transition-all"
                  style={{
                    borderColor: category === cat.id ? C.emerald : C.border,
                    background: category === cat.id ? `${C.emerald}0C` : 'transparent',
                  }}
                >
                  <div className="flex-1">
                    <div className="font-mono text-xs" style={{ color: category === cat.id ? C.emerald : C.text }}>{cat.label}</div>
                    <div className="font-mono text-[10px]" style={{ color: C.textDim }}>{cat.desc}</div>
                  </div>
                  {category === cat.id && <CheckCircle2 size={14} style={{ color: C.emerald, flexShrink: 0 }} />}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest mb-1.5" style={{ color: C.textDim }}>
              Resolution Summary * ({summary.length}/400)
            </label>
            <textarea
              value={summary}
              onChange={e => setSummary(e.target.value.slice(0, 400))}
              rows={3}
              placeholder="Brief description of the resolution outcome..."
              className="w-full px-4 py-3 font-mono text-xs border bg-transparent outline-none resize-none leading-relaxed"
              style={{ borderColor: C.border, color: C.text }}
              onFocus={e => { e.target.style.borderColor = C.emerald; }}
              onBlur={e => { e.target.style.borderColor = C.border; }}
            />
          </div>

          {/* Action taken */}
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest mb-1.5" style={{ color: C.textDim }}>
              Action Taken * ({actionTaken.length}/800)
            </label>
            <textarea
              value={actionTaken}
              onChange={e => setActionTaken(e.target.value.slice(0, 800))}
              rows={4}
              placeholder="Describe the specific actions taken to address this case..."
              className="w-full px-4 py-3 font-mono text-xs border bg-transparent outline-none resize-none leading-relaxed"
              style={{ borderColor: C.border, color: C.text }}
              onFocus={e => { e.target.style.borderColor = C.emerald; }}
              onBlur={e => { e.target.style.borderColor = C.border; }}
            />
          </div>

          {/* Evidence upload */}
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: C.textDim }}>
              Resolution Evidence (optional)
            </label>
            <button
              className="flex items-center gap-2 px-4 py-2.5 border font-mono text-xs uppercase tracking-widest transition-opacity hover:opacity-70"
              style={{ borderColor: C.border2, color: C.textSub }}
            >
              <Upload size={13} /> Upload Evidence
            </button>
          </div>

          {/* Options */}
          <div className="space-y-3 pt-2 border-t" style={{ borderColor: C.border }}>
            <button
              onClick={() => setNotifyReporter(v => !v)}
              className="flex items-center gap-3 w-full text-left"
            >
              <div
                className="w-5 h-5 flex items-center justify-center border flex-shrink-0"
                style={{ borderColor: notifyReporter ? C.emerald : C.border2, background: notifyReporter ? C.emerald : 'transparent' }}
              >
                {notifyReporter && <CheckCircle2 size={12} style={{ color: C.bg }} />}
              </div>
              <div>
                <div className="font-mono text-xs" style={{ color: C.text }}>
                  <Bell size={11} className="inline mr-1.5" style={{ color: C.textSub }} />
                  Notify anonymous reporter
                </div>
                <div className="font-mono text-[10px]" style={{ color: C.textDim }}>Send a resolution notification through the anonymous channel.</div>
              </div>
            </button>

            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: C.textDim }}>Public Transparency</div>
              <div className="flex gap-2">
                {([['PRIVATE', 'Keep Private'], ['ANONYMIZED', 'Publish Anonymized']] as const).map(([v, label]) => (
                  <button
                    key={v}
                    onClick={() => setVisibility(v)}
                    className="flex items-center gap-2 px-4 py-2 border font-mono text-[10px] uppercase tracking-widest transition-all"
                    style={{
                      borderColor: visibility === v ? C.cyan : C.border,
                      color: visibility === v ? C.cyan : C.textDim,
                      background: visibility === v ? `${C.cyan}0C` : 'transparent',
                    }}
                  >
                    {v === 'PRIVATE' ? <EyeOff size={11} /> : <Eye size={11} />} {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: C.border }}>
          <button onClick={onClose} className="font-mono text-xs uppercase tracking-widest" style={{ color: C.textDim }}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!category || !summary || !actionTaken}
            className="flex items-center gap-2 px-6 py-2.5 font-mono text-xs uppercase tracking-widest disabled:opacity-40"
            style={{ background: C.emerald, color: C.bg }}
          >
            <CheckCircle2 size={13} /> Resolve Case
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Resolution Display ────────────────────────────────────────────────────────

export function ResolutionDisplay({ resolution }: { resolution: Resolution }) {
  const cat = CATEGORIES.find(c => c.id === resolution.category);
  return (
    <div className="border p-5 space-y-4" style={{ borderColor: `${C.emerald}28`, background: `${C.emerald}06` }}>
      <div className="flex items-center gap-2">
        <CheckCircle2 size={15} style={{ color: C.emerald }} />
        <div className="font-mono text-xs uppercase tracking-widest" style={{ color: C.emerald }}>Case Resolved</div>
      </div>
      <div className="space-y-3">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest mb-0.5" style={{ color: C.textDim }}>Resolution Category</div>
          <div className="font-mono text-xs" style={{ color: C.text }}>{cat?.label}</div>
        </div>
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest mb-0.5" style={{ color: C.textDim }}>Summary</div>
          <p className="font-mono text-xs leading-relaxed" style={{ color: C.textSub }}>{resolution.summary}</p>
        </div>
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest mb-0.5" style={{ color: C.textDim }}>Action Taken</div>
          <p className="font-mono text-xs leading-relaxed" style={{ color: C.textSub }}>{resolution.actionTaken}</p>
        </div>
        <div className="flex gap-4 pt-2 border-t" style={{ borderColor: `${C.emerald}20` }}>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest mb-0.5" style={{ color: C.textDim }}>Resolved By</div>
            <div className="font-mono text-[10px]" style={{ color: C.textSub }}>{resolution.resolvedBy}</div>
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest mb-0.5" style={{ color: C.textDim }}>Visibility</div>
            <div className="font-mono text-[10px]" style={{ color: C.textSub }}>
              {resolution.publicVisibility === 'ANONYMIZED' ? <><Eye size={10} className="inline mr-1" />Anonymized</> : <><EyeOff size={10} className="inline mr-1" />Private</>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reporter Feedback Form ────────────────────────────────────────────────────

interface FeedbackFormProps {
  caseId: string;
  existingFeedback?: ResolutionFeedback;
  onSubmitted: (fb: ResolutionFeedback) => void;
}

export function FeedbackForm({ caseId, existingFeedback, onSubmitted }: FeedbackFormProps) {
  const [rating, setRating] = useState<ResolutionFeedback['rating'] | ''>(existingFeedback?.rating ?? '');
  const [comment, setComment] = useState(existingFeedback?.comment ?? '');
  const [submitted, setSubmitted] = useState(!!existingFeedback);

  const handleSubmit = () => {
    if (!rating) return;
    const fb = submitFeedback(caseId, rating as ResolutionFeedback['rating'], comment || undefined);
    onSubmitted(fb);
    setSubmitted(true);
    toast.success('Thank you for your feedback.');
  };

  if (submitted && existingFeedback) {
    const r = RATINGS.find(r => r.id === existingFeedback.rating);
    return (
      <div className="border p-4 space-y-2" style={{ borderColor: C.border, background: C.surface }}>
        <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.textDim }}>Your Feedback (submitted)</div>
        <div className="font-mono text-xs" style={{ color: r?.color ?? C.text }}>{r?.label}</div>
        {existingFeedback.comment && (
          <p className="font-mono text-[10px] leading-relaxed" style={{ color: C.textSub }}>{existingFeedback.comment}</p>
        )}
      </div>
    );
  }

  return (
    <div className="border p-5 space-y-4" style={{ borderColor: C.border, background: C.surface }}>
      <div className="font-mono text-xs uppercase tracking-widest" style={{ color: C.text }}>How was this issue handled?</div>
      <div className="space-y-2">
        {RATINGS.map(r => (
          <button
            key={r.id}
            onClick={() => setRating(r.id)}
            className="w-full flex items-center gap-3 px-4 py-2.5 border text-left transition-all"
            style={{
              borderColor: rating === r.id ? r.color : C.border,
              background: rating === r.id ? `${r.color}0C` : 'transparent',
            }}
          >
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: rating === r.id ? r.color : C.border2 }} />
            <span className="font-mono text-xs" style={{ color: rating === r.id ? r.color : C.text }}>{r.label}</span>
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        rows={3}
        placeholder="Optional comments about how this was handled..."
        className="w-full px-4 py-3 font-mono text-xs border bg-transparent outline-none resize-none leading-relaxed"
        style={{ borderColor: C.border, color: C.text }}
      />
      <button
        onClick={handleSubmit}
        disabled={!rating}
        className="w-full py-2.5 font-mono text-xs uppercase tracking-widest disabled:opacity-40"
        style={{ background: C.cyan, color: C.bg }}
      >
        Submit Feedback
      </button>
      <p className="font-mono text-[10px] text-center" style={{ color: C.textDim }}>
        Your feedback is anonymous and cannot be traced to your identity.
      </p>
    </div>
  );
}
