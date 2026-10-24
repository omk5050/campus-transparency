import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Building2,
  Shield,
  Check,
  X,
  Clock,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Mail,
  User,
  MapPin,
  Globe,
  FileText,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getOrganizationApplications,
  getOrganizationApplication,
  approveOrganizationApplication,
  rejectOrganizationApplication,
  OrganizationApplicationResponse,
  ApplicationStatus,
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
  rose: '#F43F5E',
} as const;

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  APPROVED: C.emerald,
  PENDING: C.amber,
  REJECTED: C.rose,
};

export function SuperAdminApplications({
  isSuperAdmin,
  onNavigateHome,
}: {
  isSuperAdmin: boolean;
  onNavigateHome?: () => void;
}) {
  const [applications, setApplications] = useState<OrganizationApplicationResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'ALL'>('ALL');
  const [selectedApp, setSelectedApp] = useState<OrganizationApplicationResponse | null>(null);

  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchApplications = async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const page = await getOrganizationApplications(
        statusFilter === 'ALL' ? undefined : statusFilter,
        0,
        100,
      );
      setApplications(page.content);
      // update selected if opened
      if (selectedApp) {
        const updated = page.content.find((a) => a.id === selectedApp.id);
        if (updated) setSelectedApp(updated);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load organization applications from server.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [isSuperAdmin, statusFilter]);

  const handleSelect = async (app: OrganizationApplicationResponse) => {
    setSelectedApp(app);
    try {
      const full = await getOrganizationApplication(app.id);
      setSelectedApp(full);
    } catch {
      // keep fallback
    }
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    setActionLoading(true);
    try {
      const approved = await approveOrganizationApplication(selectedApp.id);
      setSelectedApp(approved);
      setShowApproveModal(false);
      toast.success(`Organization "${approved.organizationName}" approved successfully!`);
      await fetchApplications();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Approval failed.';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp) return;
    if (!rejectReason.trim()) {
      toast.error('Rejection reason is required.');
      return;
    }
    setActionLoading(true);
    try {
      const rejected = await rejectOrganizationApplication(selectedApp.id, rejectReason.trim());
      setSelectedApp(rejected);
      setShowRejectModal(false);
      setRejectReason('');
      toast.success(`Organization application rejected.`);
      await fetchApplications();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Rejection failed.';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center p-8" style={{ background: C.bg }}>
        <div className="max-w-md w-full border p-6 text-center space-y-4" style={{ background: C.surface, borderColor: `${C.rose}40` }}>
          <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center" style={{ background: `${C.rose}14`, color: C.rose }}>
            <Lock size={24} />
          </div>
          <h2 className="font-serif text-xl" style={{ color: C.text }}>
            403 Forbidden — Super Admin Access Required
          </h2>
          <p className="font-mono text-xs leading-relaxed" style={{ color: C.textSub }}>
            Reviewing and activating institutional applications is restricted strictly to ETHOS Platform Super Administrators.
          </p>
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="px-4 py-2 font-mono text-xs uppercase tracking-widest border"
              style={{ borderColor: C.border, color: C.textSub }}
            >
              Return to Console
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full" style={{ background: C.bg }}>
      {/* Top Bar */}
      <div className="px-8 py-4 border-b flex items-center justify-between" style={{ borderColor: C.border, background: C.surface }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 flex items-center justify-center font-mono font-bold text-xs" style={{ background: C.rose, color: C.bg }}>
            S
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: C.rose }}>
              Platform Super Admin
            </div>
            <h1 className="font-serif text-lg" style={{ color: C.text }}>
              Institutional Applications
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchApplications}
            disabled={loading}
            className="p-2 border transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ borderColor: C.border, color: C.textSub }}
            title="Refresh applications"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left List */}
        <div className="w-1/2 border-r flex flex-col" style={{ borderColor: C.border }}>
          {/* Filter Bar */}
          <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: C.border, background: C.surface2 }}>
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="px-3 py-1 font-mono text-[10px] uppercase tracking-widest border transition-colors"
                style={{
                  borderColor: statusFilter === s ? (s === 'ALL' ? C.cyan : STATUS_COLORS[s as ApplicationStatus]) : C.border,
                  color: statusFilter === s ? (s === 'ALL' ? C.cyan : STATUS_COLORS[s as ApplicationStatus]) : C.textDim,
                  background: statusFilter === s ? `${(s === 'ALL' ? C.cyan : STATUS_COLORS[s as ApplicationStatus])}10` : 'transparent',
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* List items */}
          <div className="flex-1 overflow-auto divide-y" style={{ borderColor: C.border }}>
            {loading && applications.length === 0 ? (
              <div className="p-8 text-center font-mono text-xs" style={{ color: C.textDim }}>
                Loading applications…
              </div>
            ) : error ? (
              <div className="p-6 text-center font-mono text-xs" style={{ color: C.rose }}>
                {error}
              </div>
            ) : applications.length === 0 ? (
              <div className="p-12 text-center font-mono text-xs" style={{ color: C.textDim }}>
                No {statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''} applications found.
              </div>
            ) : (
              applications.map((app) => {
                const isSelected = selectedApp?.id === app.id;
                const statusColor = STATUS_COLORS[app.status];
                return (
                  <div
                    key={app.id}
                    onClick={() => handleSelect(app)}
                    className="p-4 cursor-pointer transition-colors relative"
                    style={{
                      background: isSelected ? `${C.cyan}0A` : 'transparent',
                    }}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: C.cyan }} />
                    )}
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="font-serif text-base" style={{ color: C.text }}>
                        {app.organizationName}
                      </div>
                      <span
                        className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 border"
                        style={{
                          borderColor: `${statusColor}40`,
                          color: statusColor,
                          background: `${statusColor}10`,
                        }}
                      >
                        {app.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[10px]" style={{ color: C.textSub }}>
                      <span>{app.organizationType}</span>
                      <span>•</span>
                      <span>{app.officialEmail}</span>
                    </div>

                    <div className="flex items-center justify-between mt-2 font-mono text-[9px]" style={{ color: C.textDim }}>
                      <span>Contact: {app.contactPerson}</span>
                      <span>{format(new Date(app.createdAt), 'dd MMM yyyy')}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail */}
        <div className="w-1/2 flex flex-col overflow-auto p-6" style={{ background: C.surface }}>
          {selectedApp ? (
            <div className="space-y-6">
              {/* Detail Header */}
              <div className="flex items-start justify-between pb-4 border-b" style={{ borderColor: C.border }}>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: C.textDim }}>
                    Application #{selectedApp.id} • {selectedApp.organizationType}
                  </div>
                  <h2 className="font-serif text-2xl" style={{ color: C.text }}>
                    {selectedApp.organizationName}
                  </h2>
                </div>
                <span
                  className="font-mono text-xs uppercase tracking-widest px-3 py-1 border"
                  style={{
                    borderColor: `${STATUS_COLORS[selectedApp.status]}40`,
                    color: STATUS_COLORS[selectedApp.status],
                    background: `${STATUS_COLORS[selectedApp.status]}10`,
                  }}
                >
                  {selectedApp.status}
                </span>
              </div>

              {/* Status Banner / Resolution info */}
              {selectedApp.status === 'APPROVED' && (
                <div className="p-3.5 border font-mono text-xs flex items-center gap-2.5" style={{ borderColor: `${C.emerald}40`, background: `${C.emerald}0A`, color: C.emerald }}>
                  <Check size={14} />
                  <span>
                    Approved by <strong>{selectedApp.reviewedBy}</strong> on{' '}
                    {selectedApp.reviewedAt ? format(new Date(selectedApp.reviewedAt), 'dd MMM yyyy, HH:mm') : 'N/A'}. Provisioned Org ID: #{selectedApp.approvedOrganizationId}
                  </span>
                </div>
              )}

              {selectedApp.status === 'REJECTED' && (
                <div className="p-3.5 border font-mono text-xs space-y-1" style={{ borderColor: `${C.rose}40`, background: `${C.rose}0A`, color: C.rose }}>
                  <div className="flex items-center gap-2 font-bold">
                    <X size={14} />
                    <span>Rejected by {selectedApp.reviewedBy}</span>
                  </div>
                  <div className="text-[11px] pl-6 text-white/80">
                    Reason: "{selectedApp.rejectionReason}"
                  </div>
                </div>
              )}

              {/* Institutional Details */}
              <div className="space-y-3">
                <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.cyan }}>
                  Institutional Metadata
                </div>
                <div className="p-4 border font-mono text-xs space-y-2.5" style={{ borderColor: C.border, background: C.surface2 }}>
                  <div className="flex items-center gap-2">
                    <Mail size={12} style={{ color: C.textDim }} />
                    <span style={{ color: C.textDim }}>Official Email:</span>
                    <span style={{ color: C.text }}>{selectedApp.officialEmail}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User size={12} style={{ color: C.textDim }} />
                    <span style={{ color: C.textDim }}>Contact Person:</span>
                    <span style={{ color: C.text }}>{selectedApp.contactPerson}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={12} style={{ color: C.textDim }} />
                    <span style={{ color: C.textDim }}>Campus Address:</span>
                    <span style={{ color: C.text }}>{selectedApp.address}</span>
                  </div>
                  {selectedApp.website && (
                    <div className="flex items-center gap-2">
                      <Globe size={12} style={{ color: C.textDim }} />
                      <span style={{ color: C.textDim }}>Website:</span>
                      <a
                        href={selectedApp.website}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                        style={{ color: C.cyan }}
                      >
                        {selectedApp.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.cyan }}>
                  Mission & Description
                </div>
                <div className="p-4 border font-mono text-xs leading-relaxed" style={{ borderColor: C.border, background: C.surface2, color: C.textSub }}>
                  {selectedApp.description}
                </div>
              </div>

              {/* Administrator Credential Request */}
              <div className="space-y-2">
                <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.cyan }}>
                  Requested Administrator Account
                </div>
                <div className="p-4 border font-mono text-xs space-y-2" style={{ borderColor: C.border, background: C.surface2 }}>
                  <div className="flex items-center gap-2">
                    <span style={{ color: C.textDim }}>Username:</span>
                    <span style={{ color: C.text }} className="font-bold">{selectedApp.requestedAdminUsername}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: C.textDim }}>Direct Email:</span>
                    <span style={{ color: C.text }}>{selectedApp.requestedAdminEmail}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {selectedApp.status === 'PENDING' && (
                <div className="pt-4 flex items-center gap-4 border-t" style={{ borderColor: C.border }}>
                  <button
                    onClick={() => setShowApproveModal(true)}
                    className="flex-1 py-2.5 font-mono text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2"
                    style={{ background: C.emerald, color: C.bg }}
                  >
                    <Check size={14} /> Approve & Activate Organization
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="flex-1 py-2.5 font-mono text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 border"
                    style={{ borderColor: C.rose, color: C.rose }}
                  >
                    <X size={14} /> Reject Application
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center font-mono text-xs" style={{ color: C.textDim }}>
              Select an application on the left to inspect and review details.
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal: Approve */}
      {showApproveModal && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-md border p-6 space-y-4" style={{ background: C.surface, borderColor: C.border2 }}>
            <div className="flex items-center gap-2 font-serif text-lg" style={{ color: C.text }}>
              <Check size={18} style={{ color: C.emerald }} />
              Confirm Approval
            </div>
            <p className="font-mono text-xs leading-relaxed" style={{ color: C.textSub }}>
              Are you sure you want to approve <strong style={{ color: C.text }}>{selectedApp.organizationName}</strong>?
            </p>
            <p className="font-mono text-xs leading-relaxed" style={{ color: C.textDim }}>
              This will create a new tenant organization in ACTIVE status and provision the requested administrator account ({selectedApp.requestedAdminUsername}).
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowApproveModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 font-mono text-xs uppercase tracking-widest border"
                style={{ borderColor: C.border, color: C.textDim }}
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="px-4 py-2 font-mono text-xs uppercase tracking-widest font-bold"
                style={{ background: C.emerald, color: C.bg }}
              >
                {actionLoading ? 'Approving…' : 'Confirm & Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Reject */}
      {showRejectModal && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-md border p-6 space-y-4" style={{ background: C.surface, borderColor: C.border2 }}>
            <div className="flex items-center gap-2 font-serif text-lg" style={{ color: C.rose }}>
              <X size={18} />
              Reject Application
            </div>
            <p className="font-mono text-xs" style={{ color: C.textSub }}>
              Please provide a clear reason for rejecting the application for <strong style={{ color: C.text }}>{selectedApp.organizationName}</strong>:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Unverified official email domain or duplicate institutional registration."
              rows={3}
              maxLength={1000}
              className="w-full p-3 font-mono text-xs border bg-transparent outline-none resize-none"
              style={{ borderColor: C.border, color: C.text }}
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 font-mono text-xs uppercase tracking-widest border"
                style={{ borderColor: C.border, color: C.textDim }}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="px-4 py-2 font-mono text-xs uppercase tracking-widest font-bold disabled:opacity-50"
                style={{ background: C.rose, color: C.text }}
              >
                {actionLoading ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
