import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Send, Paperclip, Info, Clock, Shield, User, ChevronDown,
  Lock, MessageSquare, FileText, AlertTriangle, Check, Plus, X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import type { Message, InternalNote, MessageType } from '../types';
import { sendMessage as svcSend, addInternalNote as svcAddNote, markMessagesRead, getMessages, getInternalNotes } from '../services';

const C = {
  bg: '#08090E', surface: '#0F1117', surface2: '#161921', surface3: '#1D2029',
  border: '#1E222B', border2: '#2D3140', cyan: '#00C8E8', text: '#E2E5EE',
  textSub: '#8A8FA8', textDim: '#52576A', emerald: '#10B981', amber: '#F59E0B',
  blue: '#38BDF8', violet: '#8B5CF6', rose: '#F43F5E', orange: '#F97316',
} as const;

const MSG_TYPE_META: Record<MessageType, { label: string; color: string; icon: React.ReactNode }> = {
  MESSAGE: { label: 'Message', color: C.text, icon: <MessageSquare size={11} /> },
  INFORMATION_REQUEST: { label: 'Information Requested', color: C.amber, icon: <AlertTriangle size={11} /> },
  EVIDENCE_REQUEST: { label: 'Evidence Requested', color: C.orange, icon: <Paperclip size={11} /> },
  SYSTEM_UPDATE: { label: 'System Update', color: C.cyan, icon: <Info size={11} /> },
};

function MessageBubble({ msg, isAdmin }: { msg: Message; isAdmin: boolean }) {
  const isTeam = msg.senderType === 'INVESTIGATION_TEAM';
  const isSystem = msg.senderType === 'SYSTEM';
  const meta = MSG_TYPE_META[msg.messageType];

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <div className="flex items-center gap-2 px-4 py-2 border" style={{ borderColor: `${C.cyan}28`, background: `${C.cyan}06` }}>
          <Info size={11} style={{ color: C.cyan }} />
          <span className="font-mono text-[10px]" style={{ color: C.textSub }}>{msg.content}</span>
          <span className="font-mono text-[9px]" style={{ color: C.textDim }}>{format(new Date(msg.createdAt), 'dd MMM, HH:mm')}</span>
        </div>
      </div>
    );
  }

  const isRight = isAdmin ? isTeam : !isTeam;

  return (
    <div className={clsx('flex gap-3 py-2', isRight ? 'justify-end' : 'justify-start')}>
      {!isRight && (
        <div className="w-7 h-7 flex items-center justify-center border flex-shrink-0 mt-1" style={{ borderColor: C.border2, background: C.surface2 }}>
          {isTeam ? <Shield size={13} style={{ color: C.cyan }} /> : <User size={13} style={{ color: C.textSub }} />}
        </div>
      )}
      <div className="max-w-[72%]">
        <div className="flex items-baseline gap-2 mb-1" style={{ justifyContent: isRight ? 'flex-end' : 'flex-start' }}>
          <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: isTeam ? C.cyan : C.textSub }}>
            {isTeam ? 'Investigation Team' : 'Anonymous Reporter'}
          </span>
          <span className="font-mono text-[9px]" style={{ color: C.textDim }}>{format(new Date(msg.createdAt), 'dd MMM, HH:mm')}</span>
          {msg.readAt && <Check size={9} style={{ color: C.emerald }} />}
        </div>

        {msg.messageType !== 'MESSAGE' && (
          <div className="flex items-center gap-1.5 mb-1.5 px-2 py-1 border" style={{ borderColor: `${meta.color}30`, background: `${meta.color}08` }}>
            <span style={{ color: meta.color }}>{meta.icon}</span>
            <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: meta.color }}>{meta.label}</span>
            {msg.requestDeadline && (
              <span className="ml-auto font-mono text-[9px] flex items-center gap-1" style={{ color: C.textDim }}>
                <Clock size={9} />Due {format(new Date(msg.requestDeadline), 'dd MMM')}
              </span>
            )}
          </div>
        )}

        <div
          className="px-4 py-3 font-mono text-xs leading-relaxed"
          style={{
            background: isRight ? `${C.cyan}12` : C.surface2,
            borderLeft: isRight ? 'none' : `2px solid ${isTeam ? C.cyan : C.textDim}`,
            color: C.textSub,
          }}
        >
          {msg.content}
        </div>

        {msg.attachments && msg.attachments.length > 0 && (
          <div className="mt-1 space-y-1">
            {msg.attachments.map((a, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 border" style={{ borderColor: C.border, background: C.surface }}>
                <Paperclip size={11} style={{ color: C.textDim }} />
                <span className="font-mono text-[10px]" style={{ color: C.textSub }}>{a}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {isRight && (
        <div className="w-7 h-7 flex items-center justify-center border flex-shrink-0 mt-1" style={{ borderColor: C.border2, background: C.surface2 }}>
          {isTeam ? <Shield size={13} style={{ color: C.cyan }} /> : <User size={13} style={{ color: C.textSub }} />}
        </div>
      )}
    </div>
  );
}

interface InfoRequestFormProps {
  onSend: (content: string, type: MessageType, deadline?: string) => void;
  onClose: () => void;
}

function InfoRequestForm({ onSend, onClose }: InfoRequestFormProps) {
  const [content, setContent] = useState('');
  const [requestType, setRequestType] = useState<MessageType>('INFORMATION_REQUEST');
  const [deadline, setDeadline] = useState('');

  const types: { id: MessageType; label: string }[] = [
    { id: 'INFORMATION_REQUEST', label: 'Information Request' },
    { id: 'EVIDENCE_REQUEST', label: 'Evidence Request' },
    { id: 'MESSAGE', label: 'General Message' },
  ];

  return (
    <div className="border p-5 space-y-4" style={{ borderColor: `${C.amber}28`, background: `${C.amber}04` }}>
      <div className="flex items-center justify-between">
        <div className="font-mono text-xs uppercase tracking-widest" style={{ color: C.amber }}>Request More Information</div>
        <button onClick={onClose} style={{ color: C.textDim }}><X size={14} /></button>
      </div>

      <div className="flex gap-2">
        {types.map(t => (
          <button
            key={t.id}
            onClick={() => setRequestType(t.id)}
            className="px-3 py-1.5 border font-mono text-[10px] uppercase tracking-widest transition-all"
            style={{
              borderColor: requestType === t.id ? C.amber : C.border,
              color: requestType === t.id ? C.amber : C.textDim,
              background: requestType === t.id ? `${C.amber}0C` : 'transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={3}
        placeholder="Describe what information or evidence is needed..."
        className="w-full px-4 py-3 font-mono text-xs border bg-transparent outline-none resize-none leading-relaxed"
        style={{ borderColor: C.border, color: C.text }}
        autoFocus
      />

      <div>
        <label className="block font-mono text-[10px] uppercase tracking-widest mb-1.5" style={{ color: C.textDim }}>
          Response deadline (optional)
        </label>
        <input
          type="date"
          value={deadline}
          onChange={e => setDeadline(e.target.value)}
          className="px-3 py-2 border font-mono text-xs bg-transparent outline-none"
          style={{ borderColor: C.border, color: C.text }}
        />
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="font-mono text-xs uppercase tracking-widest" style={{ color: C.textDim }}>Cancel</button>
        <button
          onClick={() => { if (content.trim()) { onSend(content, requestType, deadline || undefined); onClose(); } }}
          disabled={!content.trim()}
          className="flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-widest disabled:opacity-40"
          style={{ background: C.amber, color: C.bg }}
        >
          <Send size={11} /> Send Request
        </button>
      </div>
    </div>
  );
}

// ─── Communication Panel ──────────────────────────────────────────────────────

interface CaseCommunicationProps {
  caseId: string;
  isAdmin: boolean;
  messages?: Message[];
  onMessageSent?: (msg: Message) => void;
}

export function CaseCommunication({ caseId, isAdmin, messages: initialMessages, onMessageSent }: CaseCommunicationProps) {
  const [draft, setDraft] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? getMessages(caseId));
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initialMessages) setMessages(getMessages(caseId));
  }, [caseId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    markMessagesRead(caseId, isAdmin ? 'REPORTER' : 'INVESTIGATION_TEAM');
  }, [messages.length, caseId, isAdmin]);

  const handleSend = (content: string, type: MessageType = 'MESSAGE', deadline?: string) => {
    if (!content.trim()) return;
    const msg = svcSend(caseId, content, isAdmin ? 'INVESTIGATION_TEAM' : 'REPORTER', type, deadline);
    setMessages(prev => [...prev, msg]);
    onMessageSent?.(msg);
    setDraft('');
    toast.success('Message sent');
  };

  const unreadCount = messages.filter(m =>
    isAdmin ? (m.senderType === 'REPORTER' && !m.readAt) : (m.senderType === 'INVESTIGATION_TEAM' && !m.readAt)
  ).length;

  return (
    <div className="flex flex-col h-full" style={{ background: C.bg }}>
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: C.border }}>
        <div className="flex items-center gap-3">
          <MessageSquare size={15} style={{ color: C.cyan }} />
          <div>
            <div className="font-mono text-xs uppercase tracking-widest" style={{ color: C.text }}>Communication</div>
            <div className="font-mono text-[10px]" style={{ color: C.textDim }}>
              Anonymous Reporter ↔ Investigation Team
            </div>
          </div>
          {unreadCount > 0 && (
            <span className="font-mono text-[9px] px-2 py-0.5" style={{ background: `${C.cyan}20`, color: C.cyan }}>
              {unreadCount} unread
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Lock size={11} style={{ color: C.emerald }} />
          <span className="font-mono text-[10px]" style={{ color: C.textDim }}>End-to-end private</span>
        </div>
      </div>

      {/* Privacy notice */}
      <div className="px-6 py-2.5 border-b flex items-center gap-3" style={{ borderColor: C.border, background: `${C.emerald}04` }}>
        <Shield size={11} style={{ color: C.emerald }} />
        <span className="font-mono text-[10px]" style={{ color: C.textDim }}>
          Neither party's identity is revealed. Messages are linked to case {caseId} only.
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <MessageSquare size={28} style={{ color: C.border2 }} />
            <p className="font-mono text-xs uppercase tracking-widest" style={{ color: C.textDim }}>
              No messages yet — begin communication below
            </p>
          </div>
        ) : (
          messages.map(msg => <MessageBubble key={msg.id} msg={msg} isAdmin={isAdmin} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Info request form */}
      {showRequestForm && isAdmin && (
        <div className="px-6 pb-3">
          <InfoRequestForm
            onSend={(content, type, deadline) => { handleSend(content, type, deadline); setShowRequestForm(false); }}
            onClose={() => setShowRequestForm(false)}
          />
        </div>
      )}

      {/* Compose */}
      <div className="px-6 py-4 border-t" style={{ borderColor: C.border }}>
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(draft); } }}
              rows={2}
              placeholder={isAdmin ? 'Write a message to the anonymous reporter...' : 'Reply to the investigation team...'}
              className="w-full px-4 py-3 font-mono text-xs border bg-transparent outline-none resize-none leading-relaxed"
              style={{ borderColor: C.border, color: C.text }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleSend(draft)}
              disabled={!draft.trim()}
              className="flex items-center justify-center gap-1.5 px-4 py-2 font-mono text-[10px] uppercase tracking-widest disabled:opacity-40 transition-opacity"
              style={{ background: C.cyan, color: C.bg }}
            >
              <Send size={11} /> Send
            </button>
            <button
              className="flex items-center justify-center gap-1 px-3 py-2 border font-mono text-[10px] uppercase tracking-widest"
              style={{ borderColor: C.border, color: C.textDim }}
            >
              <Paperclip size={11} /> Attach
            </button>
          </div>
        </div>
        {isAdmin && !showRequestForm && (
          <button
            onClick={() => setShowRequestForm(true)}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest"
            style={{ color: C.amber }}
          >
            <Plus size={11} /> Request Information / Evidence
          </button>
        )}
        <div className="font-mono text-[9px] mt-1" style={{ color: C.textDim }}>
          Press Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}

// ─── Internal Notes Panel ─────────────────────────────────────────────────────

interface InternalNotesPanelProps {
  caseId: string;
  notes?: InternalNote[];
  onNoteAdded?: (note: InternalNote) => void;
}

export function InternalNotesPanel({ caseId, notes: initialNotes, onNoteAdded }: InternalNotesPanelProps) {
  const [draft, setDraft] = useState('');
  const [notes, setNotes] = useState<InternalNote[]>(initialNotes ?? getInternalNotes(caseId));
  const AUTHOR_ID = 'a.chen@northfield.edu';
  const AUTHOR_NAME = 'A. Chen';

  const handleAdd = () => {
    if (!draft.trim()) return;
    const note = svcAddNote(caseId, draft, AUTHOR_ID, AUTHOR_NAME);
    setNotes(prev => [...prev, note]);
    onNoteAdded?.(note);
    setDraft('');
    toast.success('Internal note saved');
  };

  return (
    <div className="flex flex-col h-full" style={{ background: C.bg }}>
      {/* Header */}
      <div className="px-6 py-4 border-b" style={{ borderColor: C.border }}>
        <div className="flex items-center gap-3 mb-1">
          <Lock size={13} style={{ color: C.rose }} />
          <div className="font-mono text-xs uppercase tracking-widest" style={{ color: C.text }}>Internal Notes</div>
          <span className="font-mono text-[9px] px-2 py-0.5 border" style={{ borderColor: `${C.rose}28`, color: C.rose, background: `${C.rose}08` }}>
            INVESTIGATORS ONLY
          </span>
        </div>
        <p className="font-mono text-[10px]" style={{ color: C.textDim }}>
          Internal notes are never visible to the anonymous reporter.
        </p>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <FileText size={28} style={{ color: C.border2 }} />
            <p className="font-mono text-xs uppercase tracking-widest" style={{ color: C.textDim }}>No internal notes yet</p>
          </div>
        ) : (
          notes.map(note => (
            <div key={note.id} className="border-l-2 pl-4" style={{ borderColor: C.border2 }}>
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="font-mono text-[10px] font-bold" style={{ color: C.text }}>{note.authorName}</span>
                <span className="font-mono text-[9px]" style={{ color: C.textDim }}>
                  {format(new Date(note.createdAt), 'dd MMM, HH:mm')}
                </span>
                {note.updatedAt && (
                  <span className="font-mono text-[9px]" style={{ color: C.textDim }}>(edited)</span>
                )}
              </div>
              <p className="font-mono text-xs leading-relaxed" style={{ color: C.textSub }}>
                {note.content.split(/(@\w+@[\w.]+)/).map((part, i) =>
                  part.startsWith('@') ? (
                    <span key={i} style={{ color: C.cyan }}>{part}</span>
                  ) : part
                )}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Add note */}
      <div className="px-6 py-4 border-t" style={{ borderColor: C.border }}>
        <div className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: C.textDim }}>
          Add Internal Note
        </div>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={3}
          placeholder="Add an internal note visible only to investigators. Use @email to mention colleagues."
          className="w-full px-4 py-3 font-mono text-xs border bg-transparent outline-none resize-none leading-relaxed"
          style={{ borderColor: C.border, color: C.text }}
          onFocus={e => { e.target.style.borderColor = C.rose; }}
          onBlur={e => { e.target.style.borderColor = C.border; }}
        />
        <div className="flex justify-between items-center mt-2">
          <span className="font-mono text-[9px]" style={{ color: C.textDim }}>Posting as {AUTHOR_NAME}</span>
          <button
            onClick={handleAdd}
            disabled={!draft.trim()}
            className="flex items-center gap-2 px-4 py-1.5 font-mono text-xs uppercase tracking-widest disabled:opacity-40"
            style={{ background: C.surface3, border: `1px solid ${C.border2}`, color: C.textSub }}
          >
            <Plus size={11} /> Add Note
          </button>
        </div>
      </div>
    </div>
  );
}
