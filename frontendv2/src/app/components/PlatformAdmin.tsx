import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  Building2, Shield, Activity, AlertTriangle, Check, X, Clock,
  Users, FileText, BarChart2, Lock, ExternalLink, ChevronRight, Eye,
} from 'lucide-react';
import type { PlatformOrg, PlatformMetrics, SecurityStatus } from '../types';
import { platformOrgs, platformMetrics, securityStatuses } from '../data';

const C = {
  bg: '#08090E', surface: '#0F1117', surface2: '#161921',
  border: '#1E222B', border2: '#2D3140', cyan: '#00C8E8', text: '#E2E5EE',
  textSub: '#8A8FA8', textDim: '#52576A', emerald: '#10B981', amber: '#F59E0B',
  violet: '#8B5CF6', rose: '#F43F5E', orange: '#F97316',
} as const;

const ORG_STATUS_COLORS: Record<PlatformOrg['verificationStatus'], string> = {
  VERIFIED: C.emerald,
  PENDING: C.amber,
  SUSPENDED: C.rose,
  UNVERIFIED: C.textDim,
  REJECTED: C.rose,
};

const SECURITY_COLORS: Record<SecurityStatus['severity'], string> = {
  LOW: C.emerald,
  MEDIUM: C.amber,
  HIGH: C.rose,
  CRITICAL: C.rose,
};

// ─── Metric Card ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="border p-4" style={{ borderColor: C.border, background: C.surface }}>
      <div className="font-mono text-[9px] uppercase tracking-widest mb-2" style={{ color: C.textDim }}>{label}</div>
      <div className="font-mono text-2xl font-bold" style={{ color: color ?? C.text }}>{value}</div>
      {sub && <div className="font-mono text-[10px] mt-1" style={{ color: C.textDim }}>{sub}</div>}
    </div>
  );
}

// ─── Org Table ─────────────────────────────────────────────────────────────────

function OrgTable({ orgs }: { orgs: PlatformOrg[] }) {
  const [filter, setFilter] = useState<string>('ALL');

  const filtered = orgs.filter(o => filter === 'ALL' || o.verificationStatus === filter);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {(['ALL', 'VERIFIED', 'PENDING', 'SUSPENDED', 'UNVERIFIED'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 border font-mono text-[9px] uppercase tracking-widest transition-all"
            style={{
              borderColor: filter === f ? (f === 'ALL' ? C.cyan : ORG_STATUS_COLORS[f as PlatformOrg['verificationStatus']]) : C.border,
              color: filter === f ? (f === 'ALL' ? C.cyan : ORG_STATUS_COLORS[f as PlatformOrg['verificationStatus']]) : C.textDim,
              background: filter === f ? `${f === 'ALL' ? C.cyan : ORG_STATUS_COLORS[f as PlatformOrg['verificationStatus']]}0C` : 'transparent',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="border" style={{ borderColor: C.border }}>
        <div
          className="grid gap-4 px-4 py-2 border-b font-mono text-[9px] uppercase tracking-widest"
          style={{ gridTemplateColumns: '1fr auto auto auto auto auto', borderColor: C.border, color: C.textDim }}
        >
          {['Organisation', 'Plan', 'Cases', 'Members', 'Status', ''].map(h => <div key={h}>{h}</div>)}
        </div>

        {filtered.map(org => {
          const statusColor = ORG_STATUS_COLORS[org.verificationStatus];
          return (
            <div
              key={org.id}
              className="grid gap-4 items-center px-4 py-3 border-b last:border-b-0 hover:bg-white/[0.02] transition-colors"
              style={{ gridTemplateColumns: '1fr auto auto auto auto auto', borderColor: C.border }}
            >
              <div>
                <div className="font-mono text-xs" style={{ color: C.text }}>{org.name}</div>
                <div className="font-mono text-[9px]" style={{ color: C.textDim }}>{org.id} · {org.domain}</div>
              </div>
              <div className="font-mono text-[10px] uppercase" style={{ color: C.textSub }}>{org.plan}</div>
              <div className="font-mono text-[10px]" style={{ color: C.text }}>{org.caseCount}</div>
              <div className="font-mono text-[10px]" style={{ color: C.text }}>{org.memberCount}</div>
              <div>
                <span
                  className="font-mono text-[9px] px-2 py-0.5 uppercase tracking-widest"
                  style={{ color: statusColor, background: `${statusColor}0C`, border: `1px solid ${statusColor}28` }}
                >
                  {org.verificationStatus}
                </span>
              </div>
              <button className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest" style={{ color: C.textDim }}>
                <Eye size={10} /> View
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Security Panel ────────────────────────────────────────────────────────────

function SecurityPanel({ statuses }: { statuses: SecurityStatus[] }) {
  return (
    <div className="space-y-3">
      {statuses.map(item => {
        const color = SECURITY_COLORS[item.severity];
        return (
          <div
            key={item.id}
            className="flex items-stretch border"
            style={{ borderColor: item.severity === 'LOW' ? C.border : `${color}30`, background: item.severity !== 'LOW' ? `${color}04` : C.surface }}
          >
            <div className="w-0.5 flex-shrink-0" style={{ background: color }} />
            <div className="flex items-start gap-4 px-4 py-4 flex-1">
              <div
                className="w-8 h-8 flex items-center justify-center border flex-shrink-0"
                style={{ borderColor: `${color}30`, background: `${color}0C`, color }}
              >
                {item.severity === 'LOW' ? <Check size={14} /> : <AlertTriangle size={14} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs font-bold" style={{ color: C.text }}>{item.label}</div>
                  <span
                    className="font-mono text-[9px] px-2 py-0.5 uppercase tracking-widest"
                    style={{ color, background: `${color}0C` }}
                  >
                    {item.severity}
                  </span>
                </div>
                <p className="font-mono text-[10px] mt-1 leading-relaxed" style={{ color: C.textDim }}>{item.detail}</p>
                {item.lastChecked && (
                  <div className="font-mono text-[9px] mt-2 flex items-center gap-1" style={{ color: C.textDim }}>
                    <Clock size={9} /> Checked {format(new Date(item.lastChecked), 'dd MMM, HH:mm')}
                  </div>
                )}
              </div>
              {item.actionRequired && (
                <button className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 border font-mono text-[9px] uppercase tracking-widest"
                  style={{ borderColor: `${color}28`, color }}>
                  Resolve <ChevronRight size={9} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Platform Admin View ───────────────────────────────────────────────────────

type AdminTab = 'overview' | 'organizations' | 'security' | 'audit';

export function PlatformAdminView() {
  const [tab, setTab] = useState<AdminTab>('overview');
  const metrics = platformMetrics;
  const orgs = platformOrgs;

  return (
    <div className="flex-1 overflow-auto" style={{ background: C.bg }}>
      {/* Header */}
      <div className="px-8 py-6 border-b" style={{ borderColor: C.border }}>
        <div className="flex items-center gap-3 mb-1">
          <Shield size={14} style={{ color: C.rose }} />
          <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.rose }}>ETHOS Platform Administration</div>
        </div>
        <h1 className="font-serif text-2xl" style={{ color: C.text }}>Platform Console</h1>
        <p className="font-mono text-xs mt-1" style={{ color: C.textDim }}>
          ETHOS internal administration — not visible to organisation accounts.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b px-8" style={{ borderColor: C.border }}>
        {([
          { id: 'overview', label: 'Overview', icon: <BarChart2 size={12} /> },
          { id: 'organizations', label: `Organisations (${orgs.length})`, icon: <Building2 size={12} /> },
          { id: 'security', label: 'Security', icon: <Lock size={12} /> },
          { id: 'audit', label: 'Audit Trail', icon: <FileText size={12} /> },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-4 py-3 font-mono text-[10px] uppercase tracking-widest border-b-2 transition-all"
            style={{
              borderBottomColor: tab === t.id ? C.cyan : 'transparent',
              color: tab === t.id ? C.cyan : C.textDim,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="px-8 py-6 space-y-6">
        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-4 gap-4">
              <MetricCard label="Total Organisations" value={metrics.totalOrgs} sub={`${metrics.activeOrgs} active`} color={C.cyan} />
              <MetricCard label="Total Reports" value={metrics.totalReports.toLocaleString()} sub="All time" />
              <MetricCard label="Avg Resolution (h)" value={metrics.avgResolutionHours} color={C.emerald} />
              <MetricCard label="Reporter Satisfaction" value={`${metrics.reporterSatisfaction}%`} color={C.emerald} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <MetricCard label="Active Investigators" value={metrics.activeInvestigators} color={C.cyan} />
              <MetricCard label="AI Override Rate" value={`${metrics.aiOverrideRate}%`} color={metrics.aiOverrideRate > 30 ? C.amber : C.emerald} />
              <MetricCard label="SLA Compliance" value={`${metrics.slaComplianceRate}%`} color={metrics.slaComplianceRate > 80 ? C.emerald : C.amber} />
            </div>

            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: C.textDim }}>Organisation Status</div>
              <div className="flex gap-4">
                {[
                  { label: 'Verified', count: orgs.filter(o => o.verificationStatus === 'VERIFIED').length, color: C.emerald },
                  { label: 'Pending', count: orgs.filter(o => o.verificationStatus === 'PENDING').length, color: C.amber },
                  { label: 'Suspended', count: orgs.filter(o => o.verificationStatus === 'SUSPENDED').length, color: C.rose },
                ].map(stat => (
                  <div key={stat.label} className="flex items-center gap-3 border px-4 py-3" style={{ borderColor: C.border, background: C.surface }}>
                    <div className="w-2 h-2" style={{ background: stat.color }} />
                    <span className="font-mono text-sm font-bold" style={{ color: stat.color }}>{stat.count}</span>
                    <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.textDim }}>{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'organizations' && <OrgTable orgs={orgs} />}

        {tab === 'security' && (
          <div className="max-w-3xl">
            <div className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: C.textDim }}>
              Security Status — Last updated {format(new Date(), 'dd MMM yyyy, HH:mm')}
            </div>
            <SecurityPanel statuses={securityStatuses} />
          </div>
        )}

        {tab === 'audit' && (
          <div className="max-w-3xl">
            <div className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: C.textDim }}>
              Platform Audit Log — Recent Events
            </div>
            <div className="border" style={{ borderColor: C.border }}>
              {[
                { at: '2026-09-29T08:22:00Z', actor: 'system@ethos.io', action: 'ORG_VERIFIED', target: 'ORG-8810 Lakewood Community College', severity: 'INFO' },
                { at: '2026-09-29T07:15:00Z', actor: 'platform@ethos.io', action: 'ORG_SUSPENDED', target: 'ORG-9203 Riverside Institute', severity: 'HIGH' },
                { at: '2026-09-28T21:44:00Z', actor: 'system@ethos.io', action: 'SECURITY_SCAN', target: 'Platform-wide', severity: 'INFO' },
                { at: '2026-09-28T14:32:00Z', actor: 'platform@ethos.io', action: 'PLAN_UPGRADED', target: 'ORG-6612 Northfield University', severity: 'INFO' },
                { at: '2026-09-27T09:10:00Z', actor: 'system@ethos.io', action: 'AI_MODEL_UPDATED', target: 'ethos-v2.4.1 → ethos-v2.4.2', severity: 'INFO' },
              ].map((event, i) => (
                <div key={i} className="grid gap-4 px-4 py-3 border-b last:border-b-0 font-mono text-[10px]"
                  style={{ gridTemplateColumns: 'auto 1fr auto auto', borderColor: C.border }}>
                  <span style={{ color: C.textDim }}>{format(new Date(event.at), 'dd MMM, HH:mm')}</span>
                  <span style={{ color: C.textSub }}>{event.target}</span>
                  <span style={{ color: C.cyan }}>{event.action}</span>
                  <span style={{ color: event.severity === 'HIGH' ? C.rose : C.textDim }}>{event.actor}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
