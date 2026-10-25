import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  ArrowLeft, Search, Shield, Lock, Check, Clock, MessageSquare,
  Paperclip, ChevronRight, Eye, EyeOff, Copy, Info, Send,
} from 'lucide-react';
import { toast } from 'sonner';
import type { TrackedReport, Report, Message, Resolution, ResolutionFeedback } from '../types';
import { getMessages, getResolution, getResolutionFeedback, sendMessage, submitFeedback } from '../services';
import { trackIssue } from '../api';
import { mapIssueToReport } from '../mapper';
import { FeedbackForm, ResolutionDisplay } from './ResolutionFlow';

const C = {
  bg: '#08090E', surface: '#0F1117', surface2: '#161921',
  border: '#1E222B', border2: '#2D3140', cyan: '#00C8E8', text: '#E2E5EE',
  textSub: '#8A8FA8', textDim: '#52576A', emerald: '#10B981', amber: '#F59E0B',
  violet: '#8B5CF6', rose: '#F43F5E',
} as const;

const TIMELINE_STEPS = [
  { status: 'REPORTED', label: 'Submitted' },
  { status: 'TRIAGED', label: 'Triaged' },
  { status: 'IN_PROGRESS', label: 'Investigation' },
  { status: 'PENDING_REVIEW', label: 'Pending Review' },
  { status: 'RESOLVED', label: 'Resolved' },
];

function CaseTimeline({ status }: { status: string }) {
  const order = ['REPORTED', 'TRIAGED', 'IN_PROGRESS', 'PENDING_REVIEW', 'RESOLVED'];
  const currentIdx = order.indexOf(status);
  const isRejected = status === 'REJECTED';

  return (
    <div className="flex items-center gap-0">
      {TIMELINE_STEPS.map((step, i) => {
        const done = i < currentIdx || (i === currentIdx && !isRejected);
        const active = i === currentIdx && !isRejected;
        return (
          <React.Fragment key={step.status}>
            <div className="flex flex-col items-center">
              <div
                className="w-6 h-6 flex items-center justify-center border"
                style={{
                  borderColor: done ? C.cyan : active ? C.amber : C.border2,
                  background: done && !active ? C.cyan : 'transparent',
                }}
              >
                {done && !active ? (
                  <Check size={11} style={{ color: C.bg }} />
                ) : active ? (
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: C.amber }} />
                ) : null}
              </div>
              <div className="font-mono text-[8px] uppercase tracking-widest mt-1" style={{ color: done || active ? C.text : C.textDim }}>
                {step.label}
              </div>
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
              <div className="flex-1 h-px mx-1" style={{ background: i < currentIdx ? C.cyan : C.border }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Privacy Center ────────────────────────────────────────────────────────────

function PrivacyCenter({ anonymousId }: { anonymousId: string }) {
  const [show, setShow] = useState(false);
  const masked = anonymousId.slice(0, 8) + '...';

  return (
    <div className="border p-5 space-y-4" style={{ borderColor: `${C.cyan}28`, background: `${C.cyan}06` }}>
      <div className="flex items-center gap-2">
        <Shield size={14} style={{ color: C.cyan }} />
        <div className="font-mono text-xs uppercase tracking-widest" style={{ color: C.cyan }}>Your Privacy</div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.textDim }}>Reporter Identity</span>
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest" style={{ color: C.emerald }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: C.emerald }} /> PROTECTED
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest mb-2" style={{ color: C.textDim }}>Organisation can see</div>
          {['Report content', 'Evidence submitted', 'Anonymous communication'].map(item => (
            <div key={item} className="flex items-center gap-2 mb-1">
              <Check size={10} style={{ color: C.textDim }} />
              <span className="font-mono text-[10px]" style={{ color: C.textSub }}>{item}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest mb-2" style={{ color: C.textDim }}>Organisation cannot see</div>
          {['Real identity', 'Personal profile', 'Account information', 'IP address'].map(item => (
            <div key={item} className="flex items-center gap-2 mb-1">
              <Lock size={10} style={{ color: C.rose }} />
              <span className="font-mono text-[10px]" style={{ color: C.textSub }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t" style={{ borderColor: `${C.cyan}20` }}>
        <div className="font-mono text-[9px] uppercase tracking-widest mb-1.5" style={{ color: C.textDim }}>
          Anonymous Case Identity
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-bold" style={{ color: C.cyan }}>
            ETH-RP-{show ? anonymousId : masked}
          </span>
          <button onClick={() => setShow(v => !v)} style={{ color: C.textDim }}>
            {show ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
          <button
            onClick={() => { navigator.clipboard.writeText(`ETH-RP-${anonymousId}`); toast.success('Copied'); }}
            style={{ color: C.textDim }}
          >
            <Copy size={12} />
          </button>
        </div>
        <p className="font-mono text-[9px] leading-relaxed mt-1" style={{ color: C.textDim }}>
          This identifier is only used to associate anonymous communication with your case. It cannot be linked to your personal identity.
        </p>
      </div>
    </div>
  );
}

// ─── Track Report View ─────────────────────────────────────────────────────────

interface TrackReportProps {
  tracked: TrackedReport[];
  reports: Report[];
  onBack: () => void;
}

export function TrackReportView({ tracked, reports, onBack }: TrackReportProps) {
  const [lookupCode, setLookupCode] = useState('');
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [liveReport, setLiveReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [replyDraft, setReplyDraft] = useState('');
  const [localMessages, setLocalMessages] = useState<Record<string, Message[]>>({});
  const [localFeedback, setLocalFeedback] = useState<Record<string, ResolutionFeedback>>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'communication' | 'privacy'>('overview');

  const updateUrl = (code?: string) => {
    if (typeof window === 'undefined') return;
    if (code) {
      const url = `/track?code=${encodeURIComponent(code)}`;
      if (window.location.pathname + window.location.search !== url) {
        window.history.pushState({ trackingCode: code }, '', url);
      }
    } else {
      if (window.location.pathname !== '/track' || window.location.search) {
        window.history.pushState({}, '', '/track');
      }
    }
  };

  const getTrackingCodeFromUrl = () => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code') || params.get('trackingCode');
    if (code) return code.trim();
    const match = window.location.pathname.match(/^\/track\/([a-zA-Z0-9_-]+)/);
    return match ? match[1].trim() : null;
  };

  const handleSelectTrackedCase = async (t: TrackedReport) => {
    // 1. If trackingCode is present, attempt live backend lookup first
    if (t.trackingCode) {
      setLoading(true);
      try {
        const issueRes = await trackIssue(t.trackingCode);
        const report = mapIssueToReport(issueRes);
        setLiveReport(report);
        setActiveReportId(report.id);
        updateUrl(t.trackingCode);
        return;
      } catch {
        // Fallback to local or synthesized report if offline or demo case
      } finally {
        setLoading(false);
      }
    }

    // 2. Check if already in reports
    const found = reports.find(
      r => r.id === t.reportId || (t.trackingCode && r.trackingCode?.toUpperCase() === t.trackingCode.toUpperCase())
    );
    if (found) {
      setLiveReport(found);
      setActiveReportId(found.id);
      if (t.trackingCode) updateUrl(t.trackingCode);
      return;
    }

    // 3. Synthesize safe Report from TrackedReport so the detail view always displays
    const synthReport: Report = {
      id: t.reportId,
      orgId: '1',
      title: t.title,
      description: `Case tracking for ${t.title}. Currently in status: ${t.status.replace('_', ' ')}.`,
      status: t.status,
      priority: 'MEDIUM',
      category: 'Campus Facilities',
      department: 'Administration',
      anonymousId: `ANON-${t.reportId.replace(/[^a-zA-Z0-9]/g, '').slice(-6)}`,
      trackingCode: t.trackingCode,
      createdAt: t.submittedAt,
      updatedAt: t.lastUpdate,
      slaDeadline: t.lastUpdate,
      slaBreached: false,
      voteCount: 0,
      userVoted: false,
      aiAnalysis: {
        sentiment: 'NEUTRAL',
        categoryMatch: true,
        urgencyScore: 50,
        duplicateConfidence: 0,
        recommendedAction: 'Review case documentation and follow timeline updates.',
      },
      auditLog: [
        {
          id: `aud-${t.reportId}`,
          action: 'STATUS_CHANGE',
          actor: 'System',
          timestamp: t.submittedAt,
          details: `Report registered with tracking code ${t.trackingCode}`,
        },
      ],
    };
    setLiveReport(synthReport);
    setActiveReportId(synthReport.id);
    if (t.trackingCode) updateUrl(t.trackingCode);
  };

  const handleLookup = async (codeOverride?: string) => {
    const raw = codeOverride ?? lookupCode;
    const code = raw.trim();
    if (!code) return;

    setLoading(true);
    try {
      // 1. First try live backend tracking endpoint
      const issueRes = await trackIssue(code);
      const report = mapIssueToReport(issueRes);
      setLiveReport(report);
      setActiveReportId(report.id);
      setLookupCode('');
      updateUrl(code);
      toast.success(`Found complaint: ${report.title}`);
    } catch {
      // 2. Fallback to local tracked items
      const found = tracked.find(t => t.trackingCode.toLowerCase() === code.toLowerCase());
      if (found) {
        await handleSelectTrackedCase(found);
        setLookupCode('');
      } else {
        toast.error(`No complaint found for tracking code "${code}".`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialCode = getTrackingCodeFromUrl();
    if (initialCode) {
      handleLookup(initialCode);
    }

    const onPop = () => {
      const poppedCode = getTrackingCodeFromUrl();
      if (poppedCode) {
        handleLookup(poppedCode);
      } else {
        setActiveReportId(null);
        setLiveReport(null);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const handleBackToList = () => {
    setActiveReportId(null);
    setLiveReport(null);
    updateUrl();
  };

  const getMessagesForCase = (caseId: string): Message[] => {
    const svc = getMessages(caseId);
    const local = localMessages[caseId] ?? [];
    const allIds = new Set(svc.map(m => m.id));
    return [...svc, ...local.filter(m => !allIds.has(m.id))].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  };

  const handleReply = (caseId: string) => {
    if (!replyDraft.trim()) return;
    const msg = sendMessage(caseId, replyDraft, 'REPORTER', 'MESSAGE');
    setLocalMessages(prev => ({ ...prev, [caseId]: [...(prev[caseId] ?? []), msg] }));
    setReplyDraft('');
    toast.success('Reply sent anonymously');
  };

  const activeReport = liveReport || reports.find(r => r.id === activeReportId);
  const activeTracked: TrackedReport | undefined = liveReport
    ? {
        reportId: liveReport.id,
        trackingCode: liveReport.trackingCode || lookupCode,
        title: liveReport.title,
        status: liveReport.status,
        submittedAt: liveReport.createdAt,
        lastUpdate: liveReport.updatedAt,
        hasNewUpdate: false,
      }
    : tracked.find(t => t.reportId === activeReportId);

  if (!activeReportId || !activeTracked || !activeReport) {
    return (
      <div className="flex-1 overflow-auto" style={{ background: C.bg }}>
        {/* Header */}
        <div className="px-8 py-6 border-b" style={{ borderColor: C.border }}>
          <div className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: C.textDim }}>Reporter</div>
          <h1 className="font-serif text-2xl mb-1" style={{ color: C.text }}>Track a Report</h1>
          <p className="font-mono text-xs" style={{ color: C.textSub }}>
            Enter your tracking code to view the status of your anonymous submission.
          </p>
        </div>

        <div className="max-w-2xl mx-auto px-8 py-8 space-y-8">
          {/* Lookup */}
          <div className="border p-6" style={{ borderColor: C.border, background: C.surface }}>
            <div className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: C.textDim }}>Enter Tracking Code</div>
            <div className="flex gap-3">
              <input
                type="text"
                value={lookupCode}
                onChange={e => setLookupCode(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleLookup(); }}
                placeholder="TRK-F8X2K9Q1"
                className="flex-1 px-4 py-3 font-mono text-sm border bg-transparent outline-none"
                style={{ borderColor: lookupCode ? C.cyan : C.border, color: C.text }}
                autoFocus
              />
              <button
                onClick={() => handleLookup()}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-3 font-mono text-xs uppercase tracking-widest cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ background: C.cyan, color: C.bg }}
              >
                <Search size={13} /> {loading ? 'Checking…' : 'Look Up'}
              </button>
            </div>
          </div>

          {/* Tracked cases */}
          {tracked.length > 0 && (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: C.textDim }}>
                Your Cases ({tracked.length})
              </div>
              <div className="border divide-y" style={{ borderColor: C.border }}>
                {tracked.map(t => (
                  <button
                    key={t.reportId}
                    type="button"
                    onClick={() => handleSelectTrackedCase(t)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left transition-all duration-150 cursor-pointer group hover:bg-white/[0.04]"
                    style={{ borderColor: C.border }}
                    title={`Open case ${t.title}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span
                          className="font-mono text-[10px] px-2 py-0.5 uppercase tracking-widest font-semibold"
                          style={{
                            color: t.status === 'RESOLVED' ? C.emerald : t.status === 'IN_PROGRESS' ? C.cyan : C.amber,
                            background: `${t.status === 'RESOLVED' ? C.emerald : t.status === 'IN_PROGRESS' ? C.cyan : C.amber}14`,
                            border: `1px solid ${t.status === 'RESOLVED' ? C.emerald : t.status === 'IN_PROGRESS' ? C.cyan : C.amber}30`,
                          }}
                        >
                          {t.status.replace('_', ' ')}
                        </span>
                        {t.hasNewUpdate && (
                          <span className="font-mono text-[9px] px-2 py-0.5" style={{ background: `${C.cyan}14`, color: C.cyan }}>Update</span>
                        )}
                        {t.unreadMessages && t.unreadMessages > 0 && (
                          <span className="font-mono text-[9px] px-2 py-0.5" style={{ background: `${C.amber}14`, color: C.amber }}>
                            {t.unreadMessages} message{t.unreadMessages > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-xs font-semibold group-hover:text-cyan-400 transition-colors truncate" style={{ color: C.text }}>
                        {t.title}
                      </div>
                      <div className="font-mono text-[10px] mt-1 flex items-center gap-2 flex-wrap" style={{ color: C.textDim }}>
                        <span className="group-hover:text-zinc-300 transition-colors">{t.reportId}</span>
                        <span>·</span>
                        <span className="text-cyan-400/90 font-mono font-medium">{t.trackingCode}</span>
                        <span>·</span>
                        <span>Updated {format(new Date(t.lastUpdate), 'dd MMM, HH:mm')}</span>
                      </div>
                    </div>
                    <div
                      className="p-2 -mr-2 rounded transition-transform duration-150 group-hover:translate-x-1 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectTrackedCase(t);
                      }}
                      title="Open report"
                    >
                      <ChevronRight
                        size={16}
                        className="transition-colors group-hover:text-cyan-400"
                        style={{ color: C.textDim }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Anonymity notice */}
          <div className="flex items-start gap-3 p-4 border" style={{ borderColor: `${C.cyan}28`, background: `${C.cyan}06` }}>
            <Info size={13} className="flex-shrink-0 mt-0.5" style={{ color: C.cyan }} />
            <p className="font-mono text-[10px] leading-relaxed" style={{ color: C.textSub }}>
              Your tracking code is the only link to your submission. ETHOS does not store any personal information with your report. If you lose your tracking code, your report will continue to be processed, but you will not be able to receive updates.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const messages = getMessagesForCase(activeReportId);
  const resolution = getResolution(activeReportId);
  const existingFeedback = localFeedback[activeReportId] ?? getResolutionFeedback(activeReportId);
  const unreadFromTeam = messages.filter(m => m.senderType === 'INVESTIGATION_TEAM' && !m.readAt).length;
  const pendingRequests = messages.filter(m => m.senderType === 'INVESTIGATION_TEAM' && (m.messageType === 'INFORMATION_REQUEST' || m.messageType === 'EVIDENCE_REQUEST'));

  return (
    <div className="flex-1 overflow-auto" style={{ background: C.bg }}>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b" style={{ background: C.bg, borderColor: C.border }}>
        <div className="flex items-center justify-between px-6 py-3">
          <button
            onClick={handleBackToList}
            className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest transition-opacity hover:opacity-70 cursor-pointer"
            style={{ color: C.textSub }}
          >
            <ArrowLeft size={13} /> My Reports
          </button>
          <span className="font-mono text-[10px]" style={{ color: C.textDim }}>{activeTracked.trackingCode}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {/* Case header */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span
              className="font-mono text-[10px] px-2.5 py-1 uppercase tracking-widest"
              style={{
                color: activeReport.status === 'RESOLVED' ? C.emerald : activeReport.status === 'IN_PROGRESS' ? C.cyan : C.amber,
                background: `${activeReport.status === 'RESOLVED' ? C.emerald : activeReport.status === 'IN_PROGRESS' ? C.cyan : C.amber}0C`,
                border: `1px solid ${activeReport.status === 'RESOLVED' ? C.emerald : activeReport.status === 'IN_PROGRESS' ? C.cyan : C.amber}28`,
              }}
            >
              {activeReport.status.replace('_', ' ')}
            </span>
            <span className="font-mono text-[10px]" style={{ color: C.textDim }}>{activeReport.id}</span>
          </div>
          <h2 className="font-serif text-2xl mb-3" style={{ color: C.text }}>{activeReport.title}</h2>
          <div className="font-mono text-[10px]" style={{ color: C.textDim }}>
            Submitted {format(new Date(activeTracked.submittedAt), 'dd MMM yyyy, HH:mm')} · Last update {format(new Date(activeTracked.lastUpdate), 'dd MMM yyyy, HH:mm')}
          </div>
        </div>

        {/* Timeline */}
        <div className="border p-5" style={{ borderColor: C.border, background: C.surface }}>
          <div className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: C.textDim }}>Case Timeline</div>
          <CaseTimeline status={activeReport.status} />
        </div>

        {/* Pending requests */}
        {pendingRequests.length > 0 && (
          <div className="border p-4 space-y-2" style={{ borderColor: `${C.amber}30`, background: `${C.amber}06` }}>
            <div className="flex items-center gap-2">
              <MessageSquare size={13} style={{ color: C.amber }} />
              <div className="font-mono text-xs uppercase tracking-widest" style={{ color: C.amber }}>
                Investigation Team Requested Information
              </div>
            </div>
            {pendingRequests.map(req => (
              <div key={req.id} className="pl-5 border-l-2" style={{ borderColor: C.amber }}>
                <p className="font-mono text-xs leading-relaxed" style={{ color: C.textSub }}>{req.content}</p>
                {req.requestDeadline && (
                  <div className="flex items-center gap-1 mt-1 font-mono text-[9px]" style={{ color: C.textDim }}>
                    <Clock size={9} />Requested by {format(new Date(req.requestDeadline), 'dd MMM')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: C.border }}>
          {[
            { id: 'overview' as const, label: 'Overview' },
            { id: 'communication' as const, label: `Communication${unreadFromTeam > 0 ? ` (${unreadFromTeam})` : ''}` },
            { id: 'privacy' as const, label: 'Privacy' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-5 py-3 font-mono text-xs uppercase tracking-widest border-b-2 transition-all"
              style={{
                borderBottomColor: activeTab === tab.id ? C.cyan : 'transparent',
                color: activeTab === tab.id ? C.cyan : C.textDim,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="border p-5" style={{ borderColor: C.border, background: C.surface }}>
              <div className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: C.textDim }}>Report Description</div>
              <p className="font-mono text-xs leading-relaxed" style={{ color: C.textSub }}>{activeReport.description}</p>
            </div>
            {resolution && <ResolutionDisplay resolution={resolution} />}
            {resolution && (
              <FeedbackForm
                caseId={activeReportId}
                existingFeedback={existingFeedback}
                onSubmitted={fb => setLocalFeedback(prev => ({ ...prev, [activeReportId]: fb }))}
              />
            )}
          </div>
        )}

        {activeTab === 'communication' && (
          <div className="space-y-4">
            <div className="space-y-3">
              {messages.map(msg => {
                const isTeam = msg.senderType === 'INVESTIGATION_TEAM';
                const isSystem = msg.senderType === 'SYSTEM';
                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center py-1">
                      <div className="flex items-center gap-2 px-4 py-2 border" style={{ borderColor: `${C.cyan}28`, background: `${C.cyan}06` }}>
                        <Info size={10} style={{ color: C.cyan }} />
                        <span className="font-mono text-[10px]" style={{ color: C.textSub }}>{msg.content}</span>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={msg.id} className={`flex gap-3 ${!isTeam ? 'justify-end' : ''}`}>
                    {isTeam && (
                      <div className="w-7 h-7 flex items-center justify-center border flex-shrink-0" style={{ borderColor: C.border2, background: C.surface2 }}>
                        <Shield size={12} style={{ color: C.cyan }} />
                      </div>
                    )}
                    <div className="max-w-[72%]">
                      <div className="font-mono text-[9px] mb-1" style={{ color: C.textDim }}>
                        {isTeam ? 'Investigation Team' : 'You'} · {format(new Date(msg.createdAt), 'dd MMM, HH:mm')}
                      </div>
                      {msg.messageType !== 'MESSAGE' && (
                        <div className="mb-1.5 px-2 py-1 border font-mono text-[9px] uppercase tracking-widest"
                          style={{ borderColor: `${C.amber}30`, color: C.amber, background: `${C.amber}08` }}>
                          {msg.messageType === 'INFORMATION_REQUEST' ? 'Information Requested' : 'Evidence Requested'}
                          {msg.requestDeadline && ` — Due ${format(new Date(msg.requestDeadline), 'dd MMM')}`}
                        </div>
                      )}
                      <div className="px-4 py-3 font-mono text-xs leading-relaxed"
                        style={{ background: isTeam ? C.surface2 : `${C.cyan}12`, color: C.textSub, borderLeft: isTeam ? `2px solid ${C.cyan}` : 'none' }}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply */}
            {activeReport.status !== 'RESOLVED' && activeReport.status !== 'REJECTED' && (
              <div className="border p-4 space-y-3" style={{ borderColor: C.border, background: C.surface }}>
                <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.textDim }}>Reply to Investigation Team</div>
                <textarea
                  value={replyDraft}
                  onChange={e => setReplyDraft(e.target.value)}
                  rows={3}
                  placeholder="Write your response..."
                  className="w-full px-4 py-3 font-mono text-xs border bg-transparent outline-none resize-none"
                  style={{ borderColor: C.border, color: C.text }}
                />
                <div className="flex items-center gap-3">
                  <button
                    className="flex items-center gap-2 px-3 py-2 border font-mono text-[10px] uppercase tracking-widest"
                    style={{ borderColor: C.border, color: C.textSub }}
                  >
                    <Paperclip size={11} /> Attach Evidence
                  </button>
                  <button
                    onClick={() => handleReply(activeReportId)}
                    disabled={!replyDraft.trim()}
                    className="flex items-center gap-2 px-4 py-2 font-mono text-[10px] uppercase tracking-widest disabled:opacity-40 ml-auto"
                    style={{ background: C.cyan, color: C.bg }}
                  >
                    <Send size={11} /> Send
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Lock size={10} style={{ color: C.emerald }} />
                  <span className="font-mono text-[9px]" style={{ color: C.textDim }}>
                    Your identity remains anonymous. Responses are linked to this case only.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'privacy' && (
          <PrivacyCenter anonymousId={activeReport.anonymousId} />
        )}
      </div>
    </div>
  );
}
