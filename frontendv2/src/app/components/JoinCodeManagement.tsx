import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Hash,
  Plus,
  Copy,
  Check,
  Ban,
  Clock,
  RefreshCw,
  Lock,
  AlertTriangle,
  UserCheck,
  Shield,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getJoinCodes,
  createJoinCode,
  revokeJoinCode,
  JoinCodeResponse,
  TargetRole,
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

export function JoinCodeManagement({
  isAdmin,
  onNavigateHome,
}: {
  isAdmin: boolean;
  onNavigateHome?: () => void;
}) {
  const [codes, setCodes] = useState<JoinCodeResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New code form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [targetRole, setTargetRole] = useState<TargetRole>('STUDENT');
  const [maxUses, setMaxUses] = useState<number>(100);
  const [expiresInDays, setExpiresInDays] = useState<number>(30);
  const [customPrefix, setCustomPrefix] = useState<string>('');
  const [creating, setCreating] = useState(false);

  // Newly created code banner
  const [newlyCreatedCode, setNewlyCreatedCode] = useState<JoinCodeResponse | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Revoke state
  const [codeToRevoke, setCodeToRevoke] = useState<JoinCodeResponse | null>(null);
  const [revoking, setRevoking] = useState(false);

  const fetchCodes = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const page = await getJoinCodes({ size: 100 });
      setCodes(page.content);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load join codes from server.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, [isAdmin]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await createJoinCode({
        targetRole,
        maxUses: maxUses > 0 ? maxUses : undefined,
        expiresInDays: expiresInDays > 0 ? expiresInDays : undefined,
        customPrefix: customPrefix.trim() ? customPrefix.trim().toUpperCase() : undefined,
      });
      setShowCreateModal(false);
      setNewlyCreatedCode(res);
      setCustomPrefix('');
      toast.success(`Join code ${res.code} created!`);
      await fetchCodes();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to create join code.';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!codeToRevoke) return;
    setRevoking(true);
    try {
      await revokeJoinCode(codeToRevoke.id);
      toast.success(`Join code ${codeToRevoke.code} revoked.`);
      setCodeToRevoke(null);
      await fetchCodes();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Revocation failed.';
      toast.error(msg);
    } finally {
      setRevoking(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    toast.success('Join code copied to clipboard');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center p-8" style={{ background: C.bg }}>
        <div className="max-w-md w-full border p-6 text-center space-y-4" style={{ background: C.surface, borderColor: `${C.rose}40` }}>
          <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center" style={{ background: `${C.rose}14`, color: C.rose }}>
            <Lock size={24} />
          </div>
          <h2 className="font-serif text-xl" style={{ color: C.text }}>
            403 Forbidden — Institutional Admin Required
          </h2>
          <p className="font-mono text-xs leading-relaxed" style={{ color: C.textSub }}>
            Join code generation and management is restricted strictly to institutional administrators.
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
    <div className="flex-1 overflow-auto p-8" style={{ background: C.bg }}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: C.border }}>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: C.cyan }}>
              Campus Administration // Access Control
            </div>
            <h1 className="font-serif text-2xl" style={{ color: C.text }}>
              Organization Join Codes
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchCodes}
              disabled={loading}
              className="p-2 border transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ borderColor: C.border, color: C.textSub }}
              title="Refresh codes"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 font-mono text-xs uppercase tracking-widest font-bold flex items-center gap-2"
              style={{ background: C.cyan, color: C.bg }}
            >
              <Plus size={14} /> Generate Join Code
            </button>
          </div>
        </div>

        {/* Newly Created Code Highlight */}
        {newlyCreatedCode && (
          <div
            className="p-5 border flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            style={{
              borderColor: `${C.emerald}60`,
              background: `${C.emerald}0A`,
            }}
          >
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold" style={{ color: C.emerald }}>
                <Check size={14} />
                <span>New Join Code Activated</span>
              </div>
              <div className="font-mono text-2xl font-bold tracking-widest my-1" style={{ color: C.text }}>
                {newlyCreatedCode.code}
              </div>
              <div className="font-mono text-[10px]" style={{ color: C.textSub }}>
                Target Role: <strong style={{ color: C.cyan }}>{newlyCreatedCode.targetRole}</strong> • Max Uses: {newlyCreatedCode.maxUses} • Expires: {format(new Date(newlyCreatedCode.expiresAt), 'dd MMM yyyy')}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(newlyCreatedCode.code)}
                className="px-4 py-2 font-mono text-xs uppercase tracking-widest font-bold flex items-center gap-1.5"
                style={{ background: C.cyan, color: C.bg }}
              >
                {copiedCode === newlyCreatedCode.code ? <Check size={13} /> : <Copy size={13} />}
                {copiedCode === newlyCreatedCode.code ? 'Copied' : 'Copy Code'}
              </button>
              <button
                onClick={() => setNewlyCreatedCode(null)}
                className="p-2 border font-mono text-xs hover:opacity-70"
                style={{ borderColor: C.border, color: C.textDim }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {error && (
          <div
            className="p-4 border font-mono text-xs flex items-center gap-2"
            style={{ borderColor: `${C.rose}40`, background: `${C.rose}0A`, color: C.rose }}
          >
            <AlertTriangle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Join Codes Table */}
        <div className="border" style={{ borderColor: C.border, background: C.surface }}>
          <div className="px-6 py-3 border-b flex items-center justify-between font-mono text-[10px] uppercase tracking-widest" style={{ borderColor: C.border, color: C.textDim }}>
            <span>Active & Historic Codes ({codes.length})</span>
            <span>Server Authenticated Tenant</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b text-[10px] uppercase tracking-widest" style={{ borderColor: C.border, color: C.textDim }}>
                  <th className="px-6 py-3 font-normal">Code</th>
                  <th className="px-6 py-3 font-normal">Role</th>
                  <th className="px-6 py-3 font-normal">Uses</th>
                  <th className="px-6 py-3 font-normal">Expires</th>
                  <th className="px-6 py-3 font-normal">Status</th>
                  <th className="px-6 py-3 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: C.border }}>
                {codes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-xs" style={{ color: C.textDim }}>
                      {loading ? 'Loading join codes…' : 'No join codes found. Generate one above to onboard students and staff.'}
                    </td>
                  </tr>
                ) : (
                  codes.map((c) => {
                    const isExpired = new Date(c.expiresAt).getTime() < Date.now();
                    const statusText = c.revoked ? 'REVOKED' : isExpired ? 'EXPIRED' : 'ACTIVE';
                    const statusColor = c.revoked ? C.rose : isExpired ? C.amber : C.emerald;

                    return (
                      <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-3.5 font-bold tracking-wider" style={{ color: C.text }}>
                          <span className="flex items-center gap-2">
                            {c.code}
                            <button
                              onClick={() => copyToClipboard(c.code)}
                              className="opacity-40 hover:opacity-100 transition-opacity"
                              title="Copy code"
                            >
                              <Copy size={12} />
                            </button>
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className="text-[10px] uppercase tracking-widest px-2 py-0.5 border"
                            style={{
                              borderColor: c.targetRole === 'ADMIN' ? `${C.amber}40` : `${C.cyan}40`,
                              color: c.targetRole === 'ADMIN' ? C.amber : C.cyan,
                            }}
                          >
                            {c.targetRole}
                          </span>
                        </td>
                        <td className="px-6 py-3.5" style={{ color: C.textSub }}>
                          {c.usedCount} / {c.maxUses}
                        </td>
                        <td className="px-6 py-3.5 text-[11px]" style={{ color: C.textDim }}>
                          {format(new Date(c.expiresAt), 'dd MMM yyyy')}
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className="text-[9px] uppercase tracking-widest px-2 py-0.5 border"
                            style={{
                              borderColor: `${statusColor}40`,
                              color: statusColor,
                              background: `${statusColor}10`,
                            }}
                          >
                            {statusText}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          {!c.revoked && !isExpired ? (
                            <button
                              onClick={() => setCodeToRevoke(c)}
                              className="text-[10px] uppercase tracking-widest text-rose-400 hover:text-rose-300 underline"
                            >
                              Revoke
                            </button>
                          ) : (
                            <span className="text-[10px] uppercase tracking-widest" style={{ color: C.textDim }}>
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Create Join Code */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-md border p-6 space-y-4" style={{ background: C.surface, borderColor: C.border2 }}>
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: C.border }}>
              <div className="font-serif text-lg" style={{ color: C.text }}>
                Generate Organization Join Code
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:opacity-70"
                style={{ color: C.textDim }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest mb-1.5" style={{ color: C.textSub }}>
                  Target Role Binding *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTargetRole('STUDENT')}
                    className="p-3 border font-mono text-xs uppercase tracking-widest text-center transition-all"
                    style={{
                      borderColor: targetRole === 'STUDENT' ? C.cyan : C.border,
                      color: targetRole === 'STUDENT' ? C.cyan : C.textDim,
                      background: targetRole === 'STUDENT' ? `${C.cyan}0A` : 'transparent',
                    }}
                  >
                    STUDENT / MEMBER
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetRole('ADMIN')}
                    className="p-3 border font-mono text-xs uppercase tracking-widest text-center transition-all"
                    style={{
                      borderColor: targetRole === 'ADMIN' ? C.amber : C.border,
                      color: targetRole === 'ADMIN' ? C.amber : C.textDim,
                      background: targetRole === 'ADMIN' ? `${C.amber}0A` : 'transparent',
                    }}
                  >
                    STAFF / ADMIN
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: C.textSub }}>
                    Max Uses *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    value={maxUses}
                    onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                    required
                    className="w-full px-3 py-2 font-mono text-xs border bg-transparent outline-none"
                    style={{ borderColor: C.border, color: C.text }}
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: C.textSub }}>
                    Expires in Days *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 1)}
                    required
                    className="w-full px-3 py-2 font-mono text-xs border bg-transparent outline-none"
                    style={{ borderColor: C.border, color: C.text }}
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: C.textSub }}>
                  Custom Prefix (Optional)
                </label>
                <input
                  type="text"
                  maxLength={12}
                  value={customPrefix}
                  onChange={(e) => setCustomPrefix(e.target.value.toUpperCase())}
                  placeholder="e.g. CS2026, CAMPUS"
                  className="w-full px-3 py-2 font-mono text-xs border bg-transparent outline-none uppercase"
                  style={{ borderColor: C.border, color: C.text }}
                />
                <span className="font-mono text-[9px]" style={{ color: C.textDim }}>
                  Max 12 characters. A random cryptographic suffix will be appended.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="px-4 py-2 font-mono text-xs uppercase tracking-widest border"
                  style={{ borderColor: C.border, color: C.textDim }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 font-mono text-xs uppercase tracking-widest font-bold flex items-center gap-2"
                  style={{ background: C.cyan, color: C.bg }}
                >
                  {creating ? <Loader2 size={13} className="animate-spin" /> : 'Create Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Revoke Confirmation */}
      {codeToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-md border p-6 space-y-4" style={{ background: C.surface, borderColor: C.border2 }}>
            <div className="flex items-center gap-2 font-serif text-lg" style={{ color: C.rose }}>
              <Ban size={18} />
              Revoke Join Code
            </div>
            <p className="font-mono text-xs leading-relaxed" style={{ color: C.textSub }}>
              Are you sure you want to revoke code <strong style={{ color: C.text }}>{codeToRevoke.code}</strong>?
            </p>
            <p className="font-mono text-xs leading-relaxed" style={{ color: C.textDim }}>
              Once revoked, no new registrations will be permitted with this code. Existing accounts created previously remain unaffected.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setCodeToRevoke(null)}
                disabled={revoking}
                className="px-4 py-2 font-mono text-xs uppercase tracking-widest border"
                style={{ borderColor: C.border, color: C.textDim }}
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="px-4 py-2 font-mono text-xs uppercase tracking-widest font-bold"
                style={{ background: C.rose, color: C.text }}
              >
                {revoking ? 'Revoking…' : 'Confirm Revocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
