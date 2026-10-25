import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ShieldAlert,
  Building2,
  Filter,
  BarChart3,
  MessageSquare,
  Lock,
  EyeOff,
  CheckCircle2,
  RefreshCw,
  Clock,
  Layers,
  History,
} from 'lucide-react';
import {
  ForumGovernanceStats,
  getSuperAdminForumGovernance,
  getForumModerationQueue,
  getForumAuditLogs,
  ForumPostSummary,
  ForumAuditLog,
  publishForumPost,
  hideForumPost,
  lockForumPost,
  unlockForumPost,
  SpringPage,
} from '../api';
import { toast } from 'sonner';

interface SuperAdminForumGovernanceProps {
  onBack?: () => void;
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
  rose: '#F43F5E',
  purple: '#8B5CF6',
};

export function SuperAdminForumGovernance({ onBack }: SuperAdminForumGovernanceProps) {
  const [stats, setStats] = useState<ForumGovernanceStats | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<number | undefined>(undefined);
  const [postsPage, setPostsPage] = useState<SpringPage<ForumPostSummary> | null>(null);
  const [auditPage, setAuditPage] = useState<SpringPage<ForumAuditLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState<'METRICS' | 'QUEUE' | 'AUDIT'>('METRICS');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsData, queueData, auditData] = await Promise.all([
        getSuperAdminForumGovernance(selectedOrgId),
        getForumModerationQueue({ organizationId: selectedOrgId, size: 10 }),
        getForumAuditLogs({ organizationId: selectedOrgId, size: 15 }),
      ]);
      setStats(statsData);
      setPostsPage(queueData);
      setAuditPage(auditData);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load governance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [selectedOrgId]);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: C.border }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-bold"
            style={{ background: 'rgba(244, 63, 94, 0.15)', color: C.rose }}
          >
            <ShieldAlert size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                Super Admin Forum Governance
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded uppercase font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Cross-Tenant Oversight
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: C.textSub }}>
              Platform-wide discussion supervision, multi-tenant moderation policies, and governance audit trails.
            </p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 border rounded p-1" style={{ background: C.surface2, borderColor: C.border }}>
          <button
            onClick={() => setViewTab('METRICS')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              viewTab === 'METRICS' ? 'bg-cyan-500/10 text-cyan-400 font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setViewTab('QUEUE')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              viewTab === 'QUEUE' ? 'bg-cyan-500/10 text-cyan-400 font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Cross-Org Queue
          </button>
          <button
            onClick={() => setViewTab('AUDIT')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              viewTab === 'AUDIT' ? 'bg-cyan-500/10 text-cyan-400 font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Audit Trail
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="border rounded-lg p-4 space-y-1" style={{ background: C.surface, borderColor: C.border }}>
            <span className="text-[11px] text-zinc-400 uppercase">Total Posts</span>
            <div className="text-2xl font-bold text-white">{stats.totalPosts}</div>
            <span className="text-[10px] text-zinc-500">Platform-wide</span>
          </div>

          <div className="border rounded-lg p-4 space-y-1" style={{ background: C.surface, borderColor: C.border }}>
            <span className="text-[11px] text-zinc-400 uppercase">Published</span>
            <div className="text-2xl font-bold text-emerald-400">{stats.published}</div>
            <span className="text-[10px] text-zinc-500">Publicly visible</span>
          </div>

          <div className="border rounded-lg p-4 space-y-1" style={{ background: C.surface, borderColor: C.border }}>
            <span className="text-[11px] text-zinc-400 uppercase">Pending Review</span>
            <div className="text-2xl font-bold text-cyan-400">{stats.pendingReview}</div>
            <span className="text-[10px] text-zinc-500">Awaiting review</span>
          </div>

          <div className="border rounded-lg p-4 space-y-1" style={{ background: C.surface, borderColor: C.border }}>
            <span className="text-[11px] text-zinc-400 uppercase">Hidden</span>
            <div className="text-2xl font-bold text-red-400">{stats.hidden}</div>
            <span className="text-[10px] text-zinc-500">Policy violation</span>
          </div>

          <div className="border rounded-lg p-4 space-y-1" style={{ background: C.surface, borderColor: C.border }}>
            <span className="text-[11px] text-zinc-400 uppercase">Locked</span>
            <div className="text-2xl font-bold text-amber-400">{stats.locked}</div>
            <span className="text-[10px] text-zinc-500">Replies frozen</span>
          </div>

          <div className="border rounded-lg p-4 space-y-1" style={{ background: C.surface, borderColor: C.border }}>
            <span className="text-[11px] text-zinc-400 uppercase">Total Replies</span>
            <div className="text-2xl font-bold text-purple-400">{stats.replies}</div>
            <span className="text-[10px] text-zinc-500">Community answers</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {viewTab === 'METRICS' && (
        <div className="space-y-6">
          <div className="border rounded-lg p-6 space-y-4" style={{ background: C.surface, borderColor: C.border }}>
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: C.border }}>
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">System Governance Policies</h3>
              </div>
              <span className="text-[11px] text-emerald-400">Strict Isolation Active</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-zinc-400">
              <div className="p-4 rounded border bg-zinc-900/40 border-zinc-800 space-y-2">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  <span>Forum vs. Complaint Separation</span>
                </div>
                <p>
                  Forum content operates under zero cross-over with the private complaint architecture.
                  Post IDs, safe aliases, and moderation actions are isolated from all whistleblower identity vaults.
                </p>
              </div>

              <div className="p-4 rounded border bg-zinc-900/40 border-zinc-800 space-y-2">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  <span>Anti-Spam Token Bucket Protection</span>
                </div>
                <p>
                  Bucket4j rate-limiting enforces strict submission limits: maximum 5 discussions and 20 replies per hour per member.
                  Spam burst flooding triggers automated HTTP 429 back-off.
                </p>
              </div>
            </div>
          </div>

          {/* Recent Cross-Tenant Interventions */}
          <div className="border rounded-lg overflow-hidden" style={{ background: C.surface, borderColor: C.border }}>
            <div className="px-5 py-3 border-b text-xs font-semibold text-white flex items-center justify-between" style={{ borderColor: C.border }}>
              <span>Recent Platform Forum Interventions</span>
              <span className="text-[11px] text-zinc-500">Live Stream</span>
            </div>

            {auditPage && auditPage.content.length > 0 ? (
              <div className="divide-y divide-zinc-800">
                {auditPage.content.slice(0, 5).map((log) => (
                  <div key={log.id} className="p-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-semibold">{log.action}</span>
                      <span className="text-zinc-500">by {log.actor}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        {log.targetType} #{log.targetId}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <Clock size={11} />
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-zinc-500">No moderation records.</div>
            )}
          </div>
        </div>
      )}

      {viewTab === 'QUEUE' && (
        <div className="border rounded-lg p-6 space-y-4" style={{ background: C.surface, borderColor: C.border }}>
          <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: C.border }}>
            <h3 className="text-sm font-semibold text-white">Platform-wide Moderation Queue</h3>
            <span className="text-xs text-zinc-400">Total: {postsPage?.totalElements ?? 0}</span>
          </div>

          {postsPage && postsPage.content.length > 0 ? (
            <div className="space-y-3">
              {postsPage.content.map((post) => (
                <div key={post.id} className="p-4 border rounded bg-zinc-900/50 border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300 font-semibold">
                        {post.category}
                      </span>
                      <span className="text-cyan-400 font-semibold">{post.organizationName}</span>
                    </div>
                    <span className="text-zinc-500">{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-white text-sm font-semibold">{post.title}</h4>
                  <p className="text-xs text-zinc-400">{post.snippet}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-zinc-500">Queue is empty.</div>
          )}
        </div>
      )}

      {viewTab === 'AUDIT' && (
        <div className="border rounded-lg overflow-hidden" style={{ background: C.surface, borderColor: C.border }}>
          <div className="px-5 py-3 border-b text-xs font-semibold text-white" style={{ borderColor: C.border }}>
            Complete Governance Audit Stream
          </div>
          {auditPage && auditPage.content.length > 0 ? (
            <div className="divide-y divide-zinc-800">
              {auditPage.content.map((log) => (
                <div key={log.id} className="p-3.5 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-semibold">{log.action}</span>
                      <span className="text-zinc-500">Actor: {log.actor}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        {log.targetType} #{log.targetId}
                      </span>
                    </div>
                    {log.reason && <p className="text-[11px] text-zinc-400 italic">"{log.reason}"</p>}
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-zinc-500">No audit records.</div>
          )}
        </div>
      )}
    </div>
  );
}
