import React, { useState } from 'react';
import { Cpu, Check, ChevronDown, Info, X, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { AIAnalysis, AIOverride } from '../types';

const C = {
  bg: '#08090E', surface: '#0F1117', surface2: '#161921',
  border: '#1E222B', border2: '#2D3140', cyan: '#00C8E8', text: '#E2E5EE',
  textSub: '#8A8FA8', textDim: '#52576A', emerald: '#10B981', amber: '#F59E0B',
  violet: '#8B5CF6', rose: '#F43F5E',
} as const;

interface AIFieldProps {
  label: string;
  aiValue: string;
  confidence: number;
  explanation?: string[];
  override?: AIOverride;
  alternatives: string[];
  onOverride: (humanValue: string, reason: string) => void;
}

function AIField({ label, aiValue, confidence, explanation, override, alternatives, onOverride }: AIFieldProps) {
  const [expanded, setExpanded] = useState(false);
  const [overriding, setOverriding] = useState(false);
  const [selected, setSelected] = useState('');
  const [reason, setReason] = useState('');
  const [showWhy, setShowWhy] = useState(false);

  const handleApply = () => {
    if (!selected || !reason.trim()) return;
    onOverride(selected, reason);
    setOverriding(false);
    setSelected('');
    setReason('');
    toast.success(`Human override recorded for ${label}`);
  };

  return (
    <div className="border" style={{ borderColor: C.border }}>
      <div className="px-4 py-3" style={{ background: `${C.violet}06` }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Cpu size={11} style={{ color: C.violet }} />
            <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: C.violet }}>AI Suggestion · {label}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1 w-16" style={{ background: C.border }}>
              <div className="h-full" style={{ width: `${confidence * 100}%`, background: C.violet }} />
            </div>
            <span className="font-mono text-[9px]" style={{ color: C.violet }}>{Math.round(confidence * 100)}%</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold" style={{ color: override ? C.textSub : C.text }}>
            {override ? <s>{aiValue}</s> : aiValue}
          </span>
          {!override && !overriding && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setShowWhy(v => !v)}
                className="font-mono text-[9px] uppercase tracking-widest px-2 py-1 border transition-all"
                style={{ borderColor: `${C.violet}30`, color: C.violet }}
              >
                {showWhy ? 'Hide' : 'Why?'}
              </button>
              <button
                onClick={() => setOverriding(true)}
                className="font-mono text-[9px] uppercase tracking-widest px-2 py-1 border transition-all"
                style={{ borderColor: `${C.violet}30`, color: C.violet }}
              >
                Override
              </button>
              <button
                onClick={() => { onOverride(aiValue, 'Accepted AI suggestion'); toast.success('AI suggestion accepted'); }}
                className="font-mono text-[9px] uppercase tracking-widest px-2 py-1 flex items-center gap-1"
                style={{ background: C.violet, color: C.bg }}
              >
                <Check size={9} /> Accept
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Why explanation */}
      {showWhy && explanation && !override && (
        <div className="px-4 py-3 border-t" style={{ borderColor: C.border, background: C.surface2 }}>
          <div className="font-mono text-[9px] uppercase tracking-widest mb-2" style={{ color: C.textDim }}>
            Why this {label.toLowerCase()}?
          </div>
          <p className="font-mono text-[10px] leading-relaxed mb-2" style={{ color: C.textSub }}>
            {explanation[0] ?? `The report content contributed to this ${label.toLowerCase()} classification.`}
          </p>
          {explanation.slice(1).length > 0 && (
            <div className="space-y-0.5">
              <div className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: C.textDim }}>Contributing terms</div>
              <div className="flex flex-wrap gap-1.5">
                {explanation.slice(1).map((term, i) => (
                  <span key={i} className="font-mono text-[9px] px-2 py-0.5 border" style={{ borderColor: `${C.violet}28`, color: C.violet, background: `${C.violet}0C` }}>
                    {term}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="font-mono text-[9px] mt-2" style={{ color: C.textDim }}>
            This is a mock explanation. In production, explanations are generated by the AI model.
          </div>
        </div>
      )}

      {/* Override form */}
      {overriding && (
        <div className="px-4 py-3 border-t space-y-3" style={{ borderColor: C.border, background: C.surface }}>
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.amber }}>
              <AlertTriangle size={10} className="inline mr-1" />Human Override
            </div>
            <button onClick={() => setOverriding(false)} style={{ color: C.textDim }}><X size={12} /></button>
          </div>
          <div className="space-y-1.5">
            {alternatives.map(alt => (
              <button
                key={alt}
                onClick={() => setSelected(alt)}
                className="w-full px-3 py-2 border text-left font-mono text-xs transition-all"
                style={{
                  borderColor: selected === alt ? C.amber : C.border,
                  color: selected === alt ? C.amber : C.text,
                  background: selected === alt ? `${C.amber}0C` : 'transparent',
                }}
              >
                {alt}
              </button>
            ))}
          </div>
          <div>
            <label className="block font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: C.textDim }}>Reason for override *</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Brief reason..."
              className="w-full px-3 py-2 border font-mono text-xs bg-transparent outline-none"
              style={{ borderColor: C.border, color: C.text }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setOverriding(false)} className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.textDim }}>Cancel</button>
            <button
              onClick={handleApply}
              disabled={!selected || !reason.trim()}
              className="px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest disabled:opacity-40"
              style={{ background: C.amber, color: C.bg }}
            >
              Apply Override
            </button>
          </div>
        </div>
      )}

      {/* Override applied */}
      {override && (
        <div className="px-4 py-3 border-t" style={{ borderColor: C.border, background: C.surface2 }}>
          <div className="flex items-start gap-3">
            <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" style={{ color: C.amber }} />
            <div>
              <div className="font-mono text-[10px] font-bold mb-0.5" style={{ color: C.amber }}>Human classification applied</div>
              <div className="font-mono text-xs" style={{ color: C.text }}>{override.humanDecision}</div>
              {override.reason && <div className="font-mono text-[10px] mt-0.5" style={{ color: C.textDim }}>Reason: {override.reason}</div>}
              <div className="font-mono text-[9px] mt-1" style={{ color: C.textDim }}>
                By {override.overriddenBy} · {format(new Date(override.overriddenAt), 'dd MMM, HH:mm')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AI Override Panel ─────────────────────────────────────────────────────────

interface AIOverridePanelProps {
  ai: AIAnalysis;
  overrides: AIOverride[];
  caseId: string;
  onOverride: (override: AIOverride) => void;
  departments: string[];
  categories: string[];
}

export function AIOverridePanel({ ai, overrides, caseId, onOverride, departments, categories }: AIOverridePanelProps) {
  const findOverride = (field: AIOverride['field']) => overrides.find(o => o.field === field);

  const handleOverride = (field: AIOverride['field'], aiSuggestion: string, aiConfidence: number) => (humanDecision: string, reason: string) => {
    const ov: AIOverride = {
      id: `AIO-${Date.now()}`,
      caseId,
      field,
      aiSuggestion,
      aiConfidence,
      humanDecision,
      reason,
      overriddenBy: 'a.chen@northfield.edu',
      overriddenAt: new Date().toISOString(),
    };
    onOverride(ov);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Cpu size={13} style={{ color: C.violet }} />
        <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.violet }}>ETHOS Intelligence</div>
        <span className="font-mono text-[9px]" style={{ color: C.textDim }}>· {ai.modelVersion} · Advisory only</span>
      </div>

      <AIField
        label="Category"
        aiValue={ai.suggestedCategory}
        confidence={ai.categoryConfidence}
        explanation={ai.explanation ? [ai.explanation.explanation, ...ai.explanation.contributingTerms] : undefined}
        override={findOverride('CATEGORY')}
        alternatives={categories.filter(c => c !== ai.suggestedCategory)}
        onOverride={handleOverride('CATEGORY', ai.suggestedCategory, ai.categoryConfidence)}
      />

      <AIField
        label="Department"
        aiValue={ai.suggestedDepartment}
        confidence={ai.categoryConfidence * 0.95}
        explanation={ai.explanation ? [`Routing to ${ai.suggestedDepartment} based on category-department mapping.`] : undefined}
        override={findOverride('DEPARTMENT')}
        alternatives={departments.filter(d => d !== ai.suggestedDepartment)}
        onOverride={handleOverride('DEPARTMENT', ai.suggestedDepartment, ai.categoryConfidence * 0.95)}
      />

      <div className="border p-3 space-y-2" style={{ borderColor: C.border, background: C.surface }}>
        <div className="flex items-center gap-2">
          <Cpu size={10} style={{ color: C.violet }} />
          <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: C.violet }}>Additional Analysis</span>
        </div>
        {[
          { label: 'Severity', value: `${ai.severity}/10`, note: null },
          { label: 'Sentiment', value: ai.sentiment },
          { label: 'SLA Breach Risk', value: ai.slaBreachRisk, color: ai.slaBreachRisk === 'HIGH' ? C.rose : ai.slaBreachRisk === 'MEDIUM' ? C.amber : C.emerald },
          { label: 'Spam Score', value: `${Math.round(ai.spamScore * 100)}%` },
        ].map(row => (
          <div key={row.label} className="flex justify-between">
            <span className="font-mono text-[10px]" style={{ color: C.textDim }}>{row.label}</span>
            <span className="font-mono text-[10px]" style={{ color: (row as any).color ?? C.textSub }}>{row.value}</span>
          </div>
        ))}
        <div className="pt-2 border-t" style={{ borderColor: C.border }}>
          <div className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: C.textDim }}>Recommendation</div>
          <p className="font-mono text-[10px] leading-relaxed" style={{ color: C.textSub }}>{ai.recommendation}</p>
        </div>
        <div className="font-mono text-[9px]" style={{ color: C.textDim }}>
          AI decisions are advisory only. Human administrators make all final determinations.
        </div>
      </div>
    </div>
  );
}
