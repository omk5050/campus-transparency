import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Send,
  Lock,
  MessageSquare,
  FileText,
  AlertTriangle,
  Check,
  Plus,
  X,
  Edit2,
  Trash2,
  User,
  Shield,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getIssueMessages,
  sendIssueMessage,
  updateIssueMessage,
  deleteIssueMessage,
  getInternalNotes,
  createInternalNote,
  updateInternalNote,
  deleteInternalNote,
  getCurrentUser,
  IssueMessageResponse,
  InternalNoteResponse,
  ApiError,
} from '../api';

const C = {
  bg: '#08090E',
  surface: '#0F1117',
  surface2: '#161921',
  surface3: '#1D2029',
  border: '#1E222B',
  border2: '#2D3140',
  cyan: '#00C8E8',
  text: '#E2E5EE',
  textSub: '#8A8FA8',
  textDim: '#52576A',
  emerald: '#10B981',
  amber: '#F59E0B',
  blue: '#38BDF8',
  violet: '#8B5CF6',
  rose: '#F43F5E',
  orange: '#F97316',
} as const;

// ─── Investigator Messaging Component ──────────────────────────────────────────

interface CaseCommunicationProps {
  caseId: string | number;
  isAdmin?: boolean;
}

export function CaseCommunication({ caseId }: CaseCommunicationProps) {
  const [messages, setMessages] = useState<IssueMessageResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const msgs = await getIssueMessages(caseId);
      setMessages(msgs);
    } catch (err) {
      // 403 or 404 is expected if user does not have permission
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
        setMessages([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    getCurrentUser()
      .then((user) => setCurrentUsername(user.username))
      .catch(() => {});
  }, [caseId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    if (!draft.trim()) return;
    setSending(true);
    try {
      const created = await sendIssueMessage(caseId, draft.trim());
      setMessages((prev) => [...prev, created]);
      setDraft('');
      toast.success('Message sent to case investigators');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to send message.';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const handleStartEdit = (msg: IssueMessageResponse) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  const handleSaveEdit = async (messageId: number) => {
    if (!editContent.trim()) return;
    try {
      const updated = await updateIssueMessage(caseId, messageId, editContent.trim());
      setMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
      setEditingId(null);
      setEditContent('');
      toast.success('Message updated');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to update message.';
      toast.error(msg);
    }
  };

  const handleDelete = async (messageId: number) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      await deleteIssueMessage(caseId, messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      toast.success('Message deleted');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to delete message.';
      toast.error(msg);
    }
  };

  return (
    <div className="flex flex-col border" style={{ background: C.bg, borderColor: C.border }}>
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: C.border, background: C.surface }}>
        <div className="flex items-center gap-3">
          <MessageSquare size={16} style={{ color: C.cyan }} />
          <div>
            <div className="font-mono text-xs uppercase tracking-widest font-bold" style={{ color: C.text }}>
              Investigator Messages
            </div>
            <div className="font-mono text-[10px]" style={{ color: C.textDim }}>
              Internal communication related to this case. Visible only to authorized case managers.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Lock size={12} style={{ color: C.emerald }} />
          <span className="font-mono text-[10px]" style={{ color: C.emerald }}>
            Internal Case Channel
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="p-6 space-y-4 max-h-96 overflow-y-auto" style={{ background: C.surface2 }}>
        {loading ? (
          <div className="flex items-center justify-center py-10 font-mono text-xs" style={{ color: C.textDim }}>
            <Loader2 size={16} className="animate-spin mr-2" /> Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 font-mono text-xs space-y-1" style={{ color: C.textDim }}>
            <MessageSquare size={24} className="mx-auto mb-2 opacity-30" />
            <p>No investigator messages recorded yet.</p>
            <p className="text-[10px]">Use the input below to start private coordination on this case.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = currentUsername === msg.senderUsername;
            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${isOwn ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <div className="flex items-center gap-2 mb-1 font-mono text-[10px]" style={{ color: C.textDim }}>
                  <span className="font-bold" style={{ color: isOwn ? C.cyan : C.textSub }}>
                    {msg.senderUsername}
                  </span>
                  <span>{format(new Date(msg.createdAt), 'dd MMM, HH:mm')}</span>
                  {msg.updatedAt && msg.updatedAt !== msg.createdAt && (
                    <span className="text-[9px] italic">(edited)</span>
                  )}
                  {isOwn && editingId !== msg.id && (
                    <button
                      onClick={() => handleStartEdit(msg)}
                      className="hover:opacity-100 opacity-60 p-0.5"
                      title="Edit message"
                    >
                      <Edit2 size={10} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(msg.id)}
                    className="hover:text-rose-400 opacity-60 p-0.5"
                    title="Delete message"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>

                {editingId === msg.id ? (
                  <div className="w-full space-y-2 p-3 border" style={{ background: C.surface, borderColor: C.cyan }}>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={2}
                      className="w-full p-2 font-mono text-xs border bg-transparent outline-none"
                      style={{ borderColor: C.border, color: C.text }}
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider border"
                        style={{ borderColor: C.border, color: C.textDim }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(msg.id)}
                        className="px-3 py-1 font-mono text-[10px] uppercase tracking-wider font-bold"
                        style={{ background: C.cyan, color: C.bg }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="p-3.5 border font-mono text-xs leading-relaxed"
                    style={{
                      background: isOwn ? `${C.cyan}0A` : C.surface,
                      borderColor: isOwn ? `${C.cyan}40` : C.border,
                      color: C.text,
                    }}
                  >
                    {msg.content}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div className="p-4 border-t flex gap-3" style={{ borderColor: C.border, background: C.surface }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Send an internal message to case investigators (Press Enter to send)…"
          rows={2}
          disabled={sending}
          className="flex-1 p-3 font-mono text-xs border bg-transparent outline-none resize-none leading-relaxed"
          style={{ borderColor: C.border, color: C.text }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !draft.trim()}
          className="px-5 font-mono text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
          style={{ background: C.cyan, color: C.bg }}
        >
          {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          <span>Send</span>
        </button>
      </div>
    </div>
  );
}

// ─── Internal Notes Component ──────────────────────────────────────────────────

interface InternalNotesPanelProps {
  caseId: string | number;
}

export function InternalNotesPanel({ caseId }: InternalNotesPanelProps) {
  const [notes, setNotes] = useState<InternalNoteResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await getInternalNotes(caseId);
      setNotes(res);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
        setNotes([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
    getCurrentUser()
      .then((user) => setCurrentUsername(user.username))
      .catch(() => {});
  }, [caseId]);

  const handleCreate = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      const note = await createInternalNote(caseId, draft.trim());
      setNotes((prev) => [note, ...prev]);
      setDraft('');
      toast.success('Internal note saved to case');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to save note.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (note: InternalNoteResponse) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = async (noteId: number) => {
    if (!editContent.trim()) return;
    try {
      const updated = await updateInternalNote(caseId, noteId, editContent.trim());
      setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
      setEditingId(null);
      setEditContent('');
      toast.success('Internal note updated');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to update note.';
      toast.error(msg);
    }
  };

  const handleDelete = async (noteId: number) => {
    if (!confirm('Are you sure you want to delete this internal note?')) return;
    try {
      await deleteInternalNote(caseId, noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast.success('Internal note deleted');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to delete note.';
      toast.error(msg);
    }
  };

  return (
    <div className="flex flex-col border" style={{ background: C.bg, borderColor: C.border }}>
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: C.border, background: C.surface }}>
        <div className="flex items-center gap-3">
          <FileText size={16} style={{ color: C.rose }} />
          <div>
            <div className="font-mono text-xs uppercase tracking-widest font-bold" style={{ color: C.text }}>
              Internal Notes
            </div>
            <div className="font-mono text-[10px]" style={{ color: C.textDim }}>
              Visible only to authorized institutional staff. Never exposed to public feeds or tracking.
            </div>
          </div>
        </div>
        <span
          className="font-mono text-[9px] uppercase tracking-widest px-2.5 py-1 border"
          style={{ borderColor: `${C.rose}40`, color: C.rose, background: `${C.rose}10` }}
        >
          Staff Confidential
        </span>
      </div>

      {/* Add Note Section */}
      <div className="p-6 border-b" style={{ borderColor: C.border, background: C.surface }}>
        <label className="block font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: C.textSub }}>
          Add Formal Investigation Note
        </label>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Record private investigation findings, evidence observations, or internal reasoning…"
          rows={3}
          disabled={saving}
          className="w-full p-3 font-mono text-xs border bg-transparent outline-none resize-none leading-relaxed"
          style={{ borderColor: C.border, color: C.text }}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="font-mono text-[10px]" style={{ color: C.textDim }}>
            {currentUsername ? `Author: ${currentUsername}` : 'Authenticated Staff'}
          </span>
          <button
            onClick={handleCreate}
            disabled={saving || !draft.trim()}
            className="px-4 py-1.5 font-mono text-xs uppercase tracking-widest font-bold flex items-center gap-1.5 disabled:opacity-40"
            style={{ background: C.rose, color: C.text }}
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            <span>Save Note</span>
          </button>
        </div>
      </div>

      {/* Notes List */}
      <div className="p-6 space-y-4 max-h-96 overflow-y-auto" style={{ background: C.surface2 }}>
        {loading ? (
          <div className="text-center py-8 font-mono text-xs" style={{ color: C.textDim }}>
            <Loader2 size={16} className="animate-spin mx-auto mb-2" />
            Loading internal notes…
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8 font-mono text-xs space-y-1" style={{ color: C.textDim }}>
            <FileText size={24} className="mx-auto mb-2 opacity-30" />
            <p>No internal notes recorded for this case.</p>
          </div>
        ) : (
          notes.map((note) => {
            const isAuthor = currentUsername === note.authorUsername;
            return (
              <div
                key={note.id}
                className="p-4 border relative space-y-2"
                style={{ borderColor: C.border, background: C.surface }}
              >
                <div className="flex items-center justify-between font-mono text-[10px] border-b pb-2" style={{ borderColor: C.border }}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold" style={{ color: C.cyan }}>
                      {note.authorUsername}
                    </span>
                    <span style={{ color: C.textDim }}>
                      {format(new Date(note.createdAt), 'dd MMM yyyy, HH:mm')}
                    </span>
                    {note.updatedAt && note.updatedAt !== note.createdAt && (
                      <span className="text-[9px] italic" style={{ color: C.textDim }}>
                        (edited)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isAuthor && editingId !== note.id && (
                      <button
                        onClick={() => handleStartEdit(note)}
                        className="hover:opacity-100 opacity-60 p-1"
                        title="Edit note"
                      >
                        <Edit2 size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="hover:text-rose-400 opacity-60 p-1"
                      title="Delete note"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {editingId === note.id ? (
                  <div className="space-y-2 pt-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="w-full p-2.5 font-mono text-xs border bg-transparent outline-none"
                      style={{ borderColor: C.cyan, color: C.text }}
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 font-mono text-[10px] uppercase tracking-wider border"
                        style={{ borderColor: C.border, color: C.textDim }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(note.id)}
                        className="px-3 py-1 font-mono text-[10px] uppercase tracking-wider font-bold"
                        style={{ background: C.cyan, color: C.bg }}
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="font-mono text-xs leading-relaxed" style={{ color: C.textSub }}>
                    {note.content}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
