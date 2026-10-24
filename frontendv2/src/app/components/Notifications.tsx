import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell, AlertTriangle, Clock, MessageSquare, Paperclip, Users,
  Cpu, CheckCircle2, ArrowRight, Check, X, Shield,
} from 'lucide-react';
import type { Notification, NotificationType } from '../types';
import { markNotificationRead, markAllNotificationsRead } from '../services';

const C = {
  bg: '#08090E', surface: '#0F1117', surface2: '#161921',
  border: '#1E222B', border2: '#2D3140', cyan: '#00C8E8', text: '#E2E5EE',
  textSub: '#8A8FA8', textDim: '#52576A', emerald: '#10B981', amber: '#F59E0B',
  violet: '#8B5CF6', rose: '#F43F5E', orange: '#F97316',
} as const;

const NOTIFICATION_META: Record<NotificationType, { icon: React.ReactNode; color: string }> = {
  NEW_REPORT: { icon: <Shield size={12} />, color: C.cyan },
  NEW_MESSAGE: { icon: <MessageSquare size={12} />, color: C.cyan },
  NEW_EVIDENCE: { icon: <Paperclip size={12} />, color: C.cyan },
  ASSIGNMENT: { icon: <Users size={12} />, color: '#38BDF8' },
  SLA_WARNING: { icon: <Clock size={12} />, color: C.amber },
  SLA_BREACH: { icon: <AlertTriangle size={12} />, color: C.rose },
  ESCALATION: { icon: <AlertTriangle size={12} />, color: C.orange },
  DUPLICATE_DETECTED: { icon: <Cpu size={12} />, color: C.violet },
  RESOLUTION_SUBMITTED: { icon: <CheckCircle2 size={12} />, color: C.emerald },
  CASE_UPDATED: { icon: <Shield size={12} />, color: C.cyan },
  INFO_REQUESTED: { icon: <MessageSquare size={12} />, color: C.amber },
  CASE_RESOLVED: { icon: <CheckCircle2 size={12} />, color: C.emerald },
};

const SEVERITY_BORDER: Record<Notification['severity'], string> = {
  CRITICAL: C.rose,
  WARNING: C.amber,
  INFO: C.border,
};

interface NotificationsPanelProps {
  notifications: Notification[];
  onNotificationUpdate: () => void;
  onOpenCase?: (caseId: string) => void;
}

export function NotificationsPanel({ notifications, onNotificationUpdate, onOpenCase }: NotificationsPanelProps) {
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'CRITICAL'>('ALL');
  const [localNotifs, setLocalNotifs] = useState<Notification[]>(notifications);

  const filtered = localNotifs
    .filter(n => n.recipientType === 'INVESTIGATOR')
    .filter(n => {
      if (filter === 'UNREAD') return !n.readAt;
      if (filter === 'CRITICAL') return n.severity === 'CRITICAL';
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = localNotifs.filter(n => !n.readAt && n.recipientType === 'INVESTIGATOR').length;

  const handleRead = (id: string) => {
    markNotificationRead(id);
    setLocalNotifs(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
    onNotificationUpdate();
  };

  const handleReadAll = () => {
    markAllNotificationsRead();
    const now = new Date().toISOString();
    setLocalNotifs(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? now })));
    onNotificationUpdate();
  };

  return (
    <div className="flex-1 overflow-auto" style={{ background: C.bg }}>
      {/* Header */}
      <div className="px-8 py-6 border-b" style={{ borderColor: C.border }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: C.textDim }}>
              Investigation Team
            </div>
            <h1 className="font-serif text-2xl" style={{ color: C.text }}>
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="font-mono text-xs mt-1" style={{ color: C.amber }}>
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleReadAll}
              className="flex items-center gap-2 px-4 py-2 border font-mono text-xs uppercase tracking-widest transition-opacity hover:opacity-70"
              style={{ borderColor: C.border, color: C.textSub }}
            >
              <Check size={12} /> Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-0 border-b px-8" style={{ borderColor: C.border }}>
        {(['ALL', 'UNREAD', 'CRITICAL'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest border-b-2 transition-all"
            style={{
              borderBottomColor: filter === f ? C.cyan : 'transparent',
              color: filter === f ? C.cyan : C.textDim,
            }}
          >
            {f}
            {f === 'UNREAD' && unreadCount > 0 && (
              <span className="ml-2 font-mono text-[9px] px-1.5 py-0.5" style={{ background: `${C.amber}20`, color: C.amber }}>
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="max-w-3xl mx-auto px-8 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Bell size={32} style={{ color: C.border2 }} />
            <p className="font-mono text-xs uppercase tracking-widest" style={{ color: C.textDim }}>
              {filter === 'UNREAD' ? "You're all caught up." : 'No notifications.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(n => {
              const meta = NOTIFICATION_META[n.type];
              const isUnread = !n.readAt;
              return (
                <div
                  key={n.id}
                  className="flex items-stretch border transition-colors cursor-pointer"
                  style={{
                    borderColor: isUnread ? SEVERITY_BORDER[n.severity] : C.border,
                    background: isUnread ? `${SEVERITY_BORDER[n.severity]}06` : C.surface,
                  }}
                  onClick={() => { if (isUnread) handleRead(n.id); }}
                >
                  {/* Severity stripe */}
                  <div className="w-0.5 flex-shrink-0" style={{ background: isUnread ? SEVERITY_BORDER[n.severity] : 'transparent' }} />

                  <div className="flex items-start gap-4 px-4 py-4 flex-1">
                    {/* Icon */}
                    <div
                      className="w-8 h-8 flex items-center justify-center border flex-shrink-0"
                      style={{ borderColor: `${meta.color}30`, background: `${meta.color}0C`, color: meta.color }}
                    >
                      {meta.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="font-mono text-xs font-bold" style={{ color: isUnread ? C.text : C.textSub }}>
                          {n.title}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="font-mono text-[9px]" style={{ color: C.textDim }}>
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                          </span>
                          {isUnread && (
                            <div className="w-2 h-2 rounded-full" style={{ background: SEVERITY_BORDER[n.severity] }} />
                          )}
                        </div>
                      </div>
                      <p className="font-mono text-[10px] leading-relaxed" style={{ color: C.textDim }}>{n.body}</p>

                      {n.caseId && (
                        <div className="flex items-center gap-3 mt-2">
                          <span className="font-mono text-[9px]" style={{ color: C.cyan }}>{n.caseId}</span>
                          {onOpenCase && (
                            <button
                              onClick={e => { e.stopPropagation(); onOpenCase(n.caseId!); }}
                              className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest"
                              style={{ color: C.cyan }}
                            >
                              Open <ArrowRight size={9} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Notification Bell (header) ────────────────────────────────────────────────

interface NotificationBellProps {
  count: number;
  onClick: () => void;
}

export function NotificationBell({ count, onClick }: NotificationBellProps) {
  return (
    <button
      onClick={onClick}
      className="relative p-1.5 transition-opacity hover:opacity-70"
      style={{ color: count > 0 ? C.amber : C.textDim }}
    >
      <Bell size={15} />
      {count > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center font-mono text-[9px] rounded-full"
          style={{ background: C.rose, color: C.text }}
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}
