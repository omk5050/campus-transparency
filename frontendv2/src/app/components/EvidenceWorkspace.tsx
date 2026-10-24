import React, { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Paperclip, Check, Eye, Download, Clock, Shield, Upload, Image, FileText, Video, Link, Hash } from 'lucide-react';
import { toast } from 'sonner';
import type { Evidence } from '../types';

const C = {
  bg: '#08090E', surface: '#0F1117', surface2: '#161921',
  border: '#1E222B', border2: '#2D3140', cyan: '#00C8E8', text: '#E2E5EE',
  textSub: '#8A8FA8', textDim: '#52576A', emerald: '#10B981', amber: '#F59E0B',
  violet: '#8B5CF6', rose: '#F43F5E',
} as const;

const TYPE_ICONS: Record<Evidence['type'], React.ReactNode> = {
  IMAGE: <Image size={14} />,
  DOCUMENT: <FileText size={14} />,
  VIDEO: <Video size={14} />,
  LINK: <Link size={14} />,
};

interface EvidenceWorkspaceProps {
  evidence: Evidence[];
  caseId: string;
  isAdmin: boolean;
  onEvidenceAdded?: (ev: Evidence) => void;
}

export function EvidenceWorkspace({ evidence, caseId, isAdmin, onEvidenceAdded }: EvidenceWorkspaceProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [accessLog, setAccessLog] = useState<Record<string, { by: string; at: string; action: string }[]>>({});

  const selectedItem = evidence.find(e => e.id === selected);

  const handleView = (id: string) => {
    setAccessLog(prev => ({
      ...prev,
      [id]: [...(prev[id] ?? []), { by: 'a.chen@northfield.edu', at: new Date().toISOString(), action: 'VIEWED' }],
    }));
    setSelected(id);
    toast.info('Evidence preview opened — access logged');
  };

  const handleDownload = (id: string, name: string) => {
    setAccessLog(prev => ({
      ...prev,
      [id]: [...(prev[id] ?? []), { by: 'a.chen@northfield.edu', at: new Date().toISOString(), action: 'DOWNLOADED' }],
    }));
    toast.success(`Download initiated: ${name}`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.textDim }}>
          Evidence ({evidence.length} items)
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 border font-mono text-[10px] uppercase tracking-widest transition-opacity hover:opacity-70"
          style={{ borderColor: C.border, color: C.textSub }}
        >
          <Upload size={11} /> Upload Evidence
        </button>
      </div>

      {evidence.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border gap-3" style={{ borderColor: C.border }}>
          <Paperclip size={28} style={{ color: C.border2 }} />
          <p className="font-mono text-xs uppercase tracking-widest" style={{ color: C.textDim }}>No evidence attached</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-0 border" style={{ borderColor: C.border }}>
          {/* Column headers */}
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-2 border-b" style={{ borderColor: C.border }}>
            {['Type', 'File', 'Size', 'Integrity', 'Actions'].map(h => (
              <div key={h} className="font-mono text-[9px] uppercase tracking-widest" style={{ color: C.textDim }}>{h}</div>
            ))}
          </div>

          {evidence.map(ev => {
            const logs = [...(ev.accessHistory ?? []), ...(accessLog[ev.id] ?? [])];
            return (
              <div key={ev.id}>
                <div
                  className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-4 py-3 border-b cursor-pointer transition-colors"
                  style={{ borderColor: C.border, background: selected === ev.id ? `${C.cyan}06` : 'transparent' }}
                  onClick={() => setSelected(selected === ev.id ? null : ev.id)}
                >
                  {/* Type */}
                  <div style={{ color: C.textSub }}>{TYPE_ICONS[ev.type]}</div>

                  {/* Name */}
                  <div>
                    <div className="font-mono text-xs truncate" style={{ color: C.text }}>{ev.name}</div>
                    <div className="font-mono text-[9px]" style={{ color: C.textDim }}>
                      Uploaded by {ev.uploadedBy ?? 'Reporter'} · {formatDistanceToNow(new Date(ev.uploadedAt), { addSuffix: true })}
                    </div>
                  </div>

                  {/* Size */}
                  <div className="font-mono text-[10px]" style={{ color: C.textDim }}>{ev.size ?? '—'}</div>

                  {/* Integrity */}
                  <div>
                    {ev.verified ? (
                      <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest" style={{ color: C.emerald }}>
                        <Check size={9} /> Verified
                      </span>
                    ) : (
                      <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: C.amber }}>Pending</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); handleView(ev.id); }}
                      className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest px-2 py-1 border transition-all"
                      style={{ borderColor: C.border2, color: C.textSub }}
                    >
                      <Eye size={9} /> View
                    </button>
                    {isAdmin && (
                      <button
                        onClick={e => { e.stopPropagation(); handleDownload(ev.id, ev.name); }}
                        className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest px-2 py-1 border transition-all"
                        style={{ borderColor: C.border2, color: C.textSub }}
                      >
                        <Download size={9} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {selected === ev.id && (
                  <div className="px-5 py-4 border-b space-y-3" style={{ borderColor: C.border, background: C.surface2 }}>
                    {ev.fileHash && (
                      <div className="flex items-center gap-2">
                        <Hash size={11} style={{ color: C.textDim }} />
                        <span className="font-mono text-[10px]" style={{ color: C.textDim }}>Integrity: </span>
                        <span className="font-mono text-[10px]" style={{ color: ev.verified ? C.emerald : C.amber }}>{ev.fileHash}</span>
                      </div>
                    )}

                    {ev.previewAvailable && (
                      <div className="flex flex-col items-center justify-center py-8 border" style={{ borderColor: C.border, background: C.surface }}>
                        <Image size={32} style={{ color: C.border2 }} />
                        <p className="font-mono text-[10px] mt-2" style={{ color: C.textDim }}>Preview available after download authorization</p>
                      </div>
                    )}

                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-widest mb-2" style={{ color: C.textDim }}>
                        Access History ({logs.length} events)
                      </div>
                      {logs.length === 0 ? (
                        <p className="font-mono text-[10px]" style={{ color: C.textDim }}>No access events recorded.</p>
                      ) : (
                        <div className="space-y-1">
                          {logs.map((a, i) => (
                            <div key={i} className="flex items-center gap-3 font-mono text-[9px]" style={{ color: C.textDim }}>
                              <Clock size={9} />
                              <span style={{ color: C.textSub }}>{a.by}</span>
                              <span>{a.action}</span>
                              <span>{format(new Date(a.at), 'dd MMM, HH:mm')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Upload area */}
      <div
        className="border-2 border-dashed flex flex-col items-center justify-center py-10 gap-2 transition-colors"
        style={{ borderColor: C.border2 }}
      >
        <Upload size={22} style={{ color: C.textDim }} />
        <div className="font-mono text-xs uppercase tracking-widest" style={{ color: C.textDim }}>Drag files to upload evidence</div>
        <div className="font-mono text-[10px]" style={{ color: C.textDim }}>Images, PDFs, documents · Max 20 MB · Metadata stripped automatically</div>
      </div>

      <div className="flex items-start gap-2 p-3 border" style={{ borderColor: C.border, background: `${C.violet}06` }}>
        <Shield size={11} className="flex-shrink-0 mt-0.5" style={{ color: C.violet }} />
        <p className="font-mono text-[10px] leading-relaxed" style={{ color: C.textDim }}>
          All evidence is stored with SHA-256 integrity hashing. Access is logged and visible in the audit trail. Downloads require authorization and are recorded.
        </p>
      </div>
    </div>
  );
}
