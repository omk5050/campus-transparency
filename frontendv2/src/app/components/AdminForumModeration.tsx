import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Shield,
  Filter,
  Search,
  CheckCircle,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  AlertTriangle,
  Clock,
  Building2,
  RefreshCw,
  FileText,
  X,
  History,
} from 'lucide-react';
import {
  ForumPostSummary,
  ForumAuditLog,
  getForumModerationQueue,
  publishForumPost,
  hideForumPost,
  lockForumPost,
  unlockForumPost,
  deleteForumPost,
  getForumAuditLogs,
  SpringPage,
} from '../api';
import { toast } from 'sonner';

interface AdminForumModerationProps {
  onBack?: () => void;
  isSuperAdmin?: boolean;
}

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
  red: '#EF4444',
  purple: '#8B5CF6',
};

const STATUS_FILTERS = ['ALL', 'PUBLISHED', 'PENDING_REVIEW', 'HIDDEN', 'LOCKED', 'DELETED'];

export function AdminForumModeration({ onBack, isSuperAdmin }: AdminForumModerationProps) {
  const [activeTab, setActiveTab] = useState<'QUEUE' | 'AUDIT'>('QUEUE');
  const [postsPage, setPostsPage] = useState<SpringPage<ForumPostSummary> | null>(null);
  const [auditPage, setAuditPage] = useState<SpringPage<ForumAuditLog> | null>(null);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  // Reason prompt modal
  const [actionTarget, setActionTarget] = useState<{ id: number; action: 'HIDE' | 'LOCK' } | null>(null);
  const [reason, setReason] = useState('');

  const loadQueue = async () => {
    setLoading(true);
    try {
      const res = await getForumModerationQueue({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        category: categoryFilter === 'ALL' ? undefined : categoryFilter,
        search: search.trim() || undefined,
        page,
        size: 15,
      });
      setPostsPage(res);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load moderation queue');
    } finally {
      setLoading(false);
    }
  };

  const loadAudit = async () => {
    setLoading(true);
    try {
      const res = await getForumAuditLogs({ page, size: 20 });
      setAuditPage(res);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'QUEUE') {
      loadQueue();
    } else {
      loadAudit();
    }
  }, [activeTab, statusFilter, categoryFilter, search, page]);

  const handlePublish = async (id: number) => {
    try {
      await publishForumPost(id);
      toast.success('Post published to public forum');
      loadQueue();
    } catch (err: any) {
      toast.error(err.message || 'Publish action failed');
    }
  };

  const handleUnlock = async (id: number) => {
    try {
      await unlockForumPost(id);
      toast.success('Discussion unlocked');
      loadQueue();
    } catch (err: any) {
      toast.error(err.message || 'Unlock action failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this forum post? This action will be audited.')) return;
    try {
      await deleteForumPost(id);
      toast.success('Post marked as deleted');
      loadQueue();
    } catch (err: any) {
      toast.error(err.message || 'Delete action failed');
    }
  };

  const handleConfirmActionWithReason = async () => {
    if (!actionTarget) return;
    try {
      if (actionTarget.action === 'HIDE') {
        await hideForumPost(actionTarget.id, reason.trim() || undefined);
        toast.success('Post hidden from public view');
      } else if (actionTarget.action === 'LOCK') {
        await lockForumPost(actionTarget.id, reason.trim() || undefined);
        toast.success('Discussion locked');
      }
      setActionTarget(null);
      setReason('');
      loadQueue();
    } catch (err: any) {
      toast.error(err.message || 'Moderation action failed');
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: C.border }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(239, 68, 68, 0.1)', color: C.red }}
          >
            <Shield size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
              <span>Forum Moderation Console</span>
              {isSuperAdmin && (
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  Platform Admin
                </span>
              )}
            </h1>
            <p className="font-mono text-xs" style={{ color: C.textSub }}>
              Safeguard campus public discussions, enforce community standards, and audit moderator interventions.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border rounded-md p-1" style={{ background: C.surface2, borderColor: C.border }}>
          <button
            onClick={() => { setActiveTab('QUEUE'); setPage(0); }}
            className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
              activeTab === 'QUEUE' ? 'bg-cyan-500/10 text-cyan-400 font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Moderation Queue
          </button>
          <button
            onClick={() => { setActiveTab('AUDIT'); setPage(0); }}
            className={`px-3 py-1 text-xs font-mono rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'AUDIT' ? 'bg-cyan-500/10 text-cyan-400 font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <History size={12} />
            <span>Audit Trail</span>
          </button>
        </div>
      </div>

      {activeTab === 'QUEUE' ? (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {STATUS_FILTERS.map((st) => (
                <button
                  key={st}
                  onClick={() => { setStatusFilter(st); setPage(0); }}
                  className={`px-2.5 py-1 rounded text-xs font-mono uppercase font-medium border transition-colors ${
                    statusFilter === st
                      ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400'
                      : 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.textDim }} />
              <input
                type="text"
                placeholder="Search moderation queue..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="w-full pl-9 pr-3 py-1.5 border rounded font-mono text-xs focus:outline-none"
                style={{ background: C.surface, borderColor: C.border, color: C.text }}
              />
            </div>
          </div>

          {/* Posts Queue */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 font-mono text-xs" style={{ color: C.textSub }}>
              <RefreshCw size={24} className="animate-spin text-cyan-400 mb-2" />
              <span>Loading moderation queue...</span>
            </div>
          ) : !postsPage || postsPage.content.length === 0 ? (
            <div className="border rounded-lg p-12 text-center font-mono space-y-2" style={{ background: C.surface, borderColor: C.border }}>
              <CheckCircle size={32} className="mx-auto text-emerald-400 mb-1" />
              <h3 className="text-sm font-semibold text-white">Queue is Clear</h3>
              <p className="text-xs" style={{ color: C.textSub }}>
                No discussions matching current status or filter criteria.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {postsPage.content.map((post) => (
                <div
                  key={post.id}
                  className="border rounded-lg p-4 space-y-3 shadow-sm transition-colors"
                  style={{ background: C.surface, borderColor: C.border }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {post.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border ${
                          post.status === 'PUBLISHED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : post.status === 'HIDDEN'
                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                            : post.status === 'LOCKED'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}
                      >
                        {post.status}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400">
                        <Building2 size={11} />
                        <span>{post.organizationName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-500">
                      <span>Author: <strong className="text-cyan-300">{post.authorAlias}</strong></span>
                      <span>·</span>
                      <span>{new Date(post.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-mono text-sm font-semibold text-white">{post.title}</h3>
                    <p className="font-mono text-xs line-clamp-2 mt-1 text-zinc-400">{post.snippet}</p>
                  </div>

                  {/* Action Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t" style={{ borderColor: C.border }}>
                    <div className="text-[11px] font-mono text-zinc-500">
                      Replies: {post.replyCount}
                    </div>

                    <div className="flex items-center gap-2">
                      {post.status !== 'PUBLISHED' && (
                        <button
                          onClick={() => handlePublish(post.id)}
                          className="px-2.5 py-1 rounded text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 flex items-center gap-1"
                        >
                          <CheckCircle size={12} />
                          <span>Publish</span>
                        </button>
                      )}

                      {post.status !== 'HIDDEN' && (
                        <button
                          onClick={() => setActionTarget({ id: post.id, action: 'HIDE' })}
                          className="px-2.5 py-1 rounded text-xs font-mono font-semibold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 flex items-center gap-1"
                        >
                          <EyeOff size={12} />
                          <span>Hide</span>
                        </button>
                      )}

                      {post.locked ? (
                        <button
                          onClick={() => handleUnlock(post.id)}
                          className="px-2.5 py-1 rounded text-xs font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 flex items-center gap-1"
                        >
                          <Unlock size={12} />
                          <span>Unlock</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setActionTarget({ id: post.id, action: 'LOCK' })}
                          className="px-2.5 py-1 rounded text-xs font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 flex items-center gap-1"
                        >
                          <Lock size={12} />
                          <span>Lock</span>
                        </button>
                      )}

                      {post.status !== 'DELETED' && (
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
                          title="Delete post"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Audit Trail Tab */
        <div className="space-y-4">
          <div className="border rounded-lg overflow-hidden" style={{ background: C.surface, borderColor: C.border }}>
            <div className="px-4 py-3 border-b font-mono text-xs font-semibold text-white flex items-center justify-between" style={{ borderColor: C.border }}>
              <span>Recorded Forum Interventions</span>
              <span className="text-[11px] text-zinc-400">Chronological Audit Log</span>
            </div>

            {loading ? (
              <div className="py-12 text-center font-mono text-xs text-zinc-400">Loading audit history...</div>
            ) : !auditPage || auditPage.content.length === 0 ? (
              <div className="py-12 text-center font-mono text-xs text-zinc-500">No audit events recorded yet.</div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {auditPage.content.map((log) => (
                  <div key={log.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-cyan-400">{log.action}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          {log.targetType} #{log.targetId}
                        </span>
                        <span className="text-[10px] text-zinc-500">Actor: {log.actor}</span>
                      </div>
                      {log.reason && (
                        <p className="text-[11px] text-zinc-400 italic">"{log.reason}"</p>
                      )}
                    </div>

                    <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <Clock size={11} />
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Moderation Reason Modal */}
      {actionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md border rounded-lg overflow-hidden shadow-2xl p-6 space-y-4" style={{ background: C.surface, borderColor: C.border2 }}>
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-sm font-semibold text-white flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-400" />
                <span>Confirm {actionTarget.action === 'HIDE' ? 'Hide Discussion' : 'Lock Discussion'}</span>
              </h3>
              <button onClick={() => setActionTarget(null)} className="text-zinc-500 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <p className="font-mono text-xs text-zinc-400">
              Please enter an optional reason for this moderation intervention. This will be recorded in the audit trail.
            </p>

            <div>
              <label className="block font-mono text-xs uppercase mb-1 text-zinc-400">Moderation Reason</label>
              <textarea
                rows={3}
                placeholder="e.g. Violation of campus community standards..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2.5 border rounded font-mono text-xs focus:outline-none"
                style={{ background: C.surface2, borderColor: C.border, color: C.text }}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: C.border }}>
              <button
                onClick={() => setActionTarget(null)}
                className="px-3 py-1.5 border rounded font-mono text-xs hover:bg-white/5 text-zinc-400"
                style={{ borderColor: C.border }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmActionWithReason}
                className="px-4 py-1.5 rounded font-mono text-xs font-semibold uppercase bg-cyan-400 text-black hover:opacity-90"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
