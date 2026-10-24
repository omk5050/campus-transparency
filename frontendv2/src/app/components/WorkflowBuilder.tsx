import React, { useState } from 'react';
import { Plus, Trash2, ArrowRight, Clock, AlertTriangle, Settings, GripVertical, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import type { WorkflowStage, Workflow, SLARule } from '../types';
import { defaultWorkflow, slaRules as initialSlaRules } from '../data';

const C = {
  bg: '#08090E', surface: '#0F1117', surface2: '#161921',
  border: '#1E222B', border2: '#2D3140', cyan: '#00C8E8', text: '#E2E5EE',
  textSub: '#8A8FA8', textDim: '#52576A', emerald: '#10B981', amber: '#F59E0B',
  violet: '#8B5CF6', rose: '#F43F5E',
} as const;

const STAGE_COLORS: Record<WorkflowStage['type'], string> = {
  START: C.emerald,
  STANDARD: C.cyan,
  REVIEW: C.amber,
  END: C.textDim,
};

// ─── SLA Config Tab ────────────────────────────────────────────────────────────

function SLAConfigTab({ rules, onUpdate }: { rules: SLARule[]; onUpdate: (r: SLARule[]) => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<SLARule>>({});

  const startEdit = (rule: SLARule) => {
    setEditing(rule.id);
    setEditValues({ firstResponseHours: rule.firstResponseHours, resolutionHours: rule.resolutionHours });
  };

  const saveEdit = (ruleId: string) => {
    onUpdate(rules.map(r => r.id === ruleId ? { ...r, ...editValues } : r));
    setEditing(null);
    toast.success('SLA rule updated');
  };

  const PRIORITY_COLOR: Record<string, string> = {
    CRITICAL: C.rose,
    HIGH: C.amber,
    MEDIUM: C.cyan,
    LOW: C.textSub,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-mono text-xs" style={{ color: C.text }}>SLA Rules</div>
          <div className="font-mono text-[10px]" style={{ color: C.textDim }}>
            Configure response and resolution time targets by priority level.
          </div>
        </div>
      </div>

      <div className="border" style={{ borderColor: C.border }}>
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-2 border-b" style={{ borderColor: C.border }}>
          {['Rule / Priority', 'First Response', 'Resolution', 'Escalation', ''].map(h => (
            <div key={h} className="font-mono text-[9px] uppercase tracking-widest" style={{ color: C.textDim }}>{h}</div>
          ))}
        </div>

        {rules.map(rule => {
          const isEditing = editing === rule.id;
          const color = PRIORITY_COLOR[rule.priority ?? rule.name.includes('CRITICAL') ? 'CRITICAL' : 'MEDIUM'] ?? C.textSub;
          return (
            <div key={rule.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-4 py-3 border-b last:border-b-0"
              style={{ borderColor: C.border, background: isEditing ? `${C.cyan}05` : 'transparent' }}>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-2 h-2" style={{ background: color }} />
                  <span className="font-mono text-xs" style={{ color: C.text }}>{rule.name}</span>
                </div>
                {rule.priority && (
                  <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color }}>{rule.priority}</span>
                )}
              </div>

              {isEditing ? (
                <>
                  <input
                    type="number"
                    value={editValues.firstResponseHours ?? rule.firstResponseHours}
                    onChange={e => setEditValues(prev => ({ ...prev, firstResponseHours: +e.target.value }))}
                    className="w-16 px-2 py-1 border font-mono text-xs bg-transparent outline-none text-right"
                    style={{ borderColor: C.cyan, color: C.cyan }}
                  />
                  <input
                    type="number"
                    value={editValues.resolutionHours ?? rule.resolutionHours}
                    onChange={e => setEditValues(prev => ({ ...prev, resolutionHours: +e.target.value }))}
                    className="w-16 px-2 py-1 border font-mono text-xs bg-transparent outline-none text-right"
                    style={{ borderColor: C.cyan, color: C.cyan }}
                  />
                  <span className="font-mono text-[10px]" style={{ color: C.textDim }}>{rule.escalationHours ?? '—'}h</span>
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(rule.id)} className="font-mono text-[10px] uppercase tracking-widest px-2 py-1"
                      style={{ background: C.cyan, color: C.bg }}>Save</button>
                    <button onClick={() => setEditing(null)} className="font-mono text-[10px] uppercase tracking-widest"
                      style={{ color: C.textDim }}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1 font-mono text-xs" style={{ color: C.text }}>
                    <Clock size={10} style={{ color: C.textDim }} />
                    {rule.firstResponseHours}h
                  </div>
                  <div className="font-mono text-xs" style={{ color: C.text }}>{rule.resolutionHours}h</div>
                  <div className="font-mono text-xs" style={{ color: rule.escalationHours ? C.amber : C.textDim }}>
                    {rule.escalationHours ? `${rule.escalationHours}h` : '—'}
                  </div>
                  <button onClick={() => startEdit(rule)} className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest"
                    style={{ color: C.textDim }}>
                    <Settings size={10} /> Edit
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2 p-3 border" style={{ borderColor: `${C.amber}28`, background: `${C.amber}06` }}>
        <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" style={{ color: C.amber }} />
        <p className="font-mono text-[10px] leading-relaxed" style={{ color: C.textDim }}>
          SLA timers start when a case is triaged. Investigators receive alerts at 75% and 100% of response/resolution targets. Breached SLAs trigger escalation rules if configured.
        </p>
      </div>
    </div>
  );
}

// ─── Workflow Stage Card ────────────────────────────────────────────────────────

function StageCard({
  stage, index, total, onUpdate, onDelete,
}: {
  stage: WorkflowStage; index: number; total: number;
  onUpdate: (s: WorkflowStage) => void; onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const color = STAGE_COLORS[stage.type];

  return (
    <div className="border" style={{ borderColor: C.border, background: C.surface }}>
      <div className="flex items-center gap-3 px-4 py-3">
        <GripVertical size={13} style={{ color: C.textDim, cursor: 'grab' }} />
        <div className="w-2.5 h-2.5 border" style={{ borderColor: color, background: `${color}30` }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={stage.label}
              onChange={e => onUpdate({ ...stage, label: e.target.value })}
              className="font-mono text-xs bg-transparent outline-none border-b border-transparent focus:border-current"
              style={{ color: C.text, borderColor: C.border }}
            />
            <select
              value={stage.type}
              onChange={e => onUpdate({ ...stage, type: e.target.value as WorkflowStage['type'] })}
              className="font-mono text-[9px] uppercase bg-transparent border outline-none cursor-pointer"
              style={{ color, borderColor: `${color}28`, background: `${color}08` }}
            >
              {(['START', 'STANDARD', 'REVIEW', 'END'] as const).map(t => (
                <option key={t} value={t} style={{ background: C.surface2, color: C.text }}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {stage.slaHours && (
            <span className="flex items-center gap-1 font-mono text-[9px]" style={{ color: C.textDim }}>
              <Clock size={9} />{stage.slaHours}h
            </span>
          )}
          <button onClick={() => setExpanded(v => !v)} style={{ color: C.textDim }}>
            <ChevronDown size={13} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
          {stage.type !== 'START' && stage.type !== 'END' && (
            <button onClick={onDelete} style={{ color: C.textDim }}>
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t px-4 py-3 space-y-3" style={{ borderColor: C.border, background: C.surface2 }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[9px] uppercase tracking-widest block mb-1" style={{ color: C.textDim }}>SLA Hours (optional)</label>
              <input
                type="number"
                value={stage.slaHours ?? ''}
                onChange={e => onUpdate({ ...stage, slaHours: e.target.value ? +e.target.value : undefined })}
                placeholder="Hours in this stage..."
                className="w-full px-3 py-1.5 border font-mono text-xs bg-transparent outline-none"
                style={{ borderColor: C.border, color: C.text }}
              />
            </div>
            <div>
              <label className="font-mono text-[9px] uppercase tracking-widest block mb-1" style={{ color: C.textDim }}>Description</label>
              <input
                type="text"
                value={stage.description ?? ''}
                onChange={e => onUpdate({ ...stage, description: e.target.value })}
                placeholder="Brief description..."
                className="w-full px-3 py-1.5 border font-mono text-xs bg-transparent outline-none"
                style={{ borderColor: C.border, color: C.text }}
              />
            </div>
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: C.textDim }}>Transitions to</div>
            <div className="flex flex-wrap gap-1.5">
              {(stage.transitions ?? []).map(t => (
                <span key={t} className="font-mono text-[9px] px-2 py-0.5 border" style={{ borderColor: C.border2, color: C.textSub }}>→ {t}</span>
              ))}
              {(!stage.transitions || stage.transitions.length === 0) && (
                <span className="font-mono text-[9px]" style={{ color: C.textDim }}>No transitions defined</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Workflow Builder ──────────────────────────────────────────────────────────

interface WorkflowBuilderProps {
  workflow?: Workflow;
}

export function WorkflowBuilder({ workflow: initial }: WorkflowBuilderProps) {
  const [stages, setStages] = useState<WorkflowStage[]>(initial?.stages ?? defaultWorkflow.stages);
  const [slaRules, setSlaRules] = useState<SLARule[]>(initialSlaRules);
  const [activeTab, setActiveTab] = useState<'workflow' | 'sla'>('workflow');
  const [saved, setSaved] = useState(false);

  const addStage = () => {
    const newStage: WorkflowStage = {
      id: `stage-${Date.now()}`,
      name: 'New Stage',
      label: 'New Stage',
      type: 'STANDARD',
      order: stages.length,
      allowedTransitions: [],
      transitions: [],
      canTransitionRoles: ['ADMIN', 'OWNER'],
    };
    setStages(prev => [...prev, newStage]);
  };

  const updateStage = (id: string, updated: WorkflowStage) => {
    setStages(prev => prev.map(s => s.id === id ? updated : s));
  };

  const deleteStage = (id: string) => {
    setStages(prev => prev.filter(s => s.id !== id));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast.success('Workflow configuration saved');
  };

  return (
    <div className="flex-1 overflow-auto" style={{ background: C.bg }}>
      {/* Header */}
      <div className="px-8 py-6 border-b" style={{ borderColor: C.border }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: C.textDim }}>Settings → Workflow</div>
            <h1 className="font-serif text-2xl" style={{ color: C.text }}>Workflow Configuration</h1>
          </div>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 font-mono text-xs uppercase tracking-widest"
            style={{ background: saved ? C.emerald : C.cyan, color: C.bg }}
          >
            {saved ? 'Saved' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b px-8" style={{ borderColor: C.border }}>
        {[
          { id: 'workflow' as const, label: 'Case Stages' },
          { id: 'sla' as const, label: 'SLA Rules' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest border-b-2 transition-all"
            style={{
              borderBottomColor: activeTab === tab.id ? C.cyan : 'transparent',
              color: activeTab === tab.id ? C.cyan : C.textDim,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-3xl mx-auto px-8 py-6">
        {activeTab === 'workflow' && (
          <div className="space-y-4">
            {/* Visual pipeline */}
            <div className="flex items-center gap-1 overflow-x-auto py-4 px-2">
              {stages.map((stage, i) => {
                const color = STAGE_COLORS[stage.type];
                return (
                  <React.Fragment key={stage.id}>
                    <div className="flex-shrink-0 text-center">
                      <div
                        className="w-24 h-10 flex items-center justify-center border font-mono text-[9px] uppercase tracking-widest"
                        style={{ borderColor: color, color, background: `${color}10` }}
                      >
                        {stage.label}
                      </div>
                      <div className="font-mono text-[8px] mt-1" style={{ color: C.textDim }}>
                        {stage.type}
                      </div>
                    </div>
                    {i < stages.length - 1 && (
                      <ArrowRight size={12} className="flex-shrink-0" style={{ color: C.border2 }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Stage list */}
            <div className="space-y-2">
              {stages.map((stage, i) => (
                <StageCard
                  key={stage.id}
                  stage={stage}
                  index={i}
                  total={stages.length}
                  onUpdate={updated => updateStage(stage.id, updated)}
                  onDelete={() => deleteStage(stage.id)}
                />
              ))}
            </div>

            <button
              onClick={addStage}
              className="flex items-center gap-2 w-full py-3 border-2 border-dashed font-mono text-xs uppercase tracking-widest transition-all hover:opacity-70"
              style={{ borderColor: C.border2, color: C.textDim }}
            >
              <Plus size={13} /> Add Stage
            </button>
          </div>
        )}

        {activeTab === 'sla' && (
          <SLAConfigTab rules={slaRules} onUpdate={setSlaRules} />
        )}
      </div>
    </div>
  );
}
