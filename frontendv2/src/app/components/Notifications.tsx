import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell, AlertTriangle, Clock, MessageSquare, Users,
  CheckCircle2, ArrowRight, Check, Shield, Building2, RefreshCw, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead as apiMarkRead,
  markAllNotificationsRead as apiMarkAllRead,
  NotificationResponse,
  BackendNotificationType,
  ApiError
} from '../api';

const C = {
  bg: '#08090E', surface: '#0F1117', surface2: '#161921',
  border: '#1E222B', border2: '#2D3140', cyan: '#00C8E8', text: '#E2E5EE',
  textSub: '#8A8FA8', textDim: '#52576A', emerald: '#10B981', amber: '#F59E0B',
  violet: '#8B5CF6', rose: '#F43F5E', orange: '#F97316', blue: '#38BDF8',
} as const;

const NOTIFICATION_META: Record<BackendNotificationType, { icon: React.ReactNode; color: string }> = {
  ISSUE_CREATED: { icon: <Shield size={13} />, color: C.cyan },
  ISSUE_STATUS_CHANGED: { icon: <Clock size={13} />, color: C.amber },
  ISSUE_ASSIGNED: { icon: <Users size={13} />, color: C.blue },
  ISSUE_UNASSIGNED: { icon: <Users size={13} />, color: C.orange },
  ISSUE_RESOLVED: { icon: <CheckCircle2 size={13} />, color: C.emerald },
  ISSUE_REJECTED: { icon: <AlertTriangle size={13} />, color: C.rose },
  INTERNAL_MESSAGE_RECEIVED: { icon: <MessageSquare size={13} />, color: C.violet },
  ORGANIZATION_APPLICATION_APPROVED: { icon: <Building2 size={13} />, color: C.emerald },
  ORGANIZATION_APPLICATION_REJECTED: { icon: <Building2 size={13} />, color: C.rose },
};

interface NotificationsPanelProps {
  onNotificationUpdate?: () => void;
  onOpenCase?: (caseId: string) => void;
}

export function NotificationsPanel({ onNotificationUpdate, onOpenCase }: NotificationsPanelProps) {
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const [page, countRes] = await Promise.all([
        getNotifications({ unreadOnly: filter === 'UNREAD', size: 50 }),
        getUnreadNotificationCount()
      ]);
      setNotifications(page.content);
      setUnreadCount(countRes.unreadCount);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load notifications.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const handleRead = async (id: number) => {
    try {
      const updated = await apiMarkRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? updated : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      onNotificationUpdate?.();
    } catch {
      toast.error('Could not mark notification as read.');
    }
  };

  const handleReadAll = async () => {
    try {
      await apiMarkAllRead();
      const now = new Date().toISOString();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: now })));
      setUnreadCount(0);
      toast.success('All notifications marked as read.');
      onNotificationUpdate?.();
    } catch {
      toast.error('Could not mark all notifications as read.');
    }
  };

  return (
    <div className="flex-1 overflow-auto" style={{ background: C.bg }}>
      {/* Header */}
      <div className="px-8 py-6 border-b" style={{ borderColor: C.border }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: C.textDim }}>
              In-App Notification Center
            </div>
            <h1 className="font-serif text-2xl" style={{ color: C.text }}>
              Notifications
            </h1>
            {unreadCount > 0 ? (
              <p className="font-mono text-xs mt-1" style={{ color: C.amber }}>
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            ) : (
              <p className="font-mono text-xs mt-1" style={{ color: C.textDim }}>
                All notifications caught up.
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadNotifications}
              disabled={loading}
              className="p-2 border transition-opacity hover:opacity-70 disabled:opacity-50"
              style={{ borderColor: C.border, color: C.textSub }}
              title="Refresh"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
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
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-0 border-b px-8" style={{ borderColor: C.border }}>
        {(['ALL', 'UNREAD'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest border-b-2 transition-all flex items-center gap-2"
            style={{
              borderBottomColor: filter === f ? C.cyan : 'transparent',
              color: filter === f ? C.cyan : C.textDim,
            }}
          >
            <span>{f}</span>
            {f === 'UNREAD' && unreadCount > 0 && (
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${C.amber}20`, color: C.amber }}>
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="max-w-3xl mx-auto px-8 py-6">
        {loading && notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 size={24} className="animate-spin" style={{ color: C.cyan }} />
            <p className="font-mono text-xs uppercase tracking-widest" style={{ color: C.textDim }}>
              Loading notifications...
            </p>
          </div>
        ) : error ? (
          <div className="p-4 border font-mono text-xs" style={{ borderColor: `${C.rose}30`, color: C.rose, background: `${C.rose}0A` }}>
            <AlertTriangle size={14} className="inline mr-2" />
            {error}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Bell size={32} style={{ color: C.border2 }} />
            <p className="font-mono text-xs uppercase tracking-widest" style={{ color: C.textDim }}>
              {filter === 'UNREAD' ? "You're all caught up." : 'No notifications yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {notifications.map(n => {
              const meta = NOTIFICATION_META[n.type] ?? { icon: <Bell size={13} />, color: C.cyan };
              const isUnread = !n.isRead;
              return (
                <div
                  key={n.id}
                  className="flex items-stretch border transition-all hover:border-[#2D3140]"
                  style={{
                    borderColor: isUnread ? `${meta.color}50` : C.border,
                    background: isUnread ? `${meta.color}06` : C.surface,
                  }}
                  onClick={() => { if (isUnread) handleRead(n.id); }}
                >
                  {/* Left accent stripe */}
                  <div className="w-1 flex-shrink-0" style={{ background: isUnread ? meta.color : 'transparent' }} />

                  <div className="flex items-start gap-4 px-4 py-3.5 flex-1">
                    {/* Icon */}
                    <div
                      className="w-8 h-8 flex items-center justify-center border flex-shrink-0 mt-0.5"
                      style={{ borderColor: `${meta.color}35`, background: `${meta.color}0C`, color: meta.color }}
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
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                          )}
                        </div>
                      </div>

                      <p className="font-mono text-[11px] leading-relaxed" style={{ color: C.textSub }}>
                        {n.message}
                      </p>

                      <div className="flex items-center gap-4 mt-2.5 pt-2 border-t" style={{ borderColor: `${C.border}60` }}>
                        {n.entityType === 'ISSUE' && n.entityId && (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[9px]" style={{ color: C.cyan }}>
                              Case #{n.entityId}
                            </span>
                            {onOpenCase && (
                              <button
                                onClick={e => { e.stopPropagation(); onOpenCase(String(n.entityId)); }}
                                className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest transition-opacity hover:opacity-70"
                                style={{ color: C.cyan }}
                              >
                                View Case <ArrowRight size={9} />
                              </button>
                            )}
                          </div>
                        )}
                        {isUnread && (
                          <button
                            onClick={e => { e.stopPropagation(); handleRead(n.id); }}
                            className="ml-auto font-mono text-[9px] uppercase tracking-widest flex items-center gap-1 hover:underline"
                            style={{ color: C.textDim }}
                          >
                            <Check size={9} /> Mark read
                          </button>
                        )}
                      </div>
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
      title={count > 0 ? `${count} unread notifications` : 'Notifications'}
    >
      <Bell size={15} />
      {count > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center font-mono text-[9px] font-bold rounded-full shadow"
          style={{ background: C.rose, color: '#FFFFFF' }}
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}
