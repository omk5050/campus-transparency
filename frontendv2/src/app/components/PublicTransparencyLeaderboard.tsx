import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  ArrowUpDown,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  X,
  TrendingUp,
  BarChart3,
  Layers,
  Sparkles,
  Info,
  ArrowLeft,
  Share2,
  Check,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  getPublicTransparency,
  getPublicLeaderboard,
  getOrganizationTransparencyProfile,
  LeaderboardEntry,
  PublicTransparencySummary,
  OrganizationTransparencyProfile,
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

type TimePeriod = 'ALL_TIME' | 'LAST_90_DAYS' | 'LAST_30_DAYS' | 'LAST_7_DAYS';

const PERIOD_LABELS: Record<TimePeriod, string> = {
  ALL_TIME: 'All Time',
  LAST_90_DAYS: 'Last 90 Days',
  LAST_30_DAYS: 'Last 30 Days',
  LAST_7_DAYS: 'Last 7 Days',
};

const ORG_TYPE_LABELS: Record<string, string> = {
  ALL: 'All Institutions',
  UNIVERSITY: 'Universities',
  COLLEGE: 'Colleges',
  SCHOOL: 'Schools',
  NGO: 'NGOs',
  CORPORATE: 'Corporates',
  OTHER: 'Other Tenants',
};

interface PublicTransparencyLeaderboardProps {
  onBack?: () => void;
  initialOrgId?: number | null;
}

export function PublicTransparencyLeaderboard({ onBack, initialOrgId }: PublicTransparencyLeaderboardProps) {
  const [period, setPeriod] = useState<TimePeriod>('ALL_TIME');
  const [summary, setSummary] = useState<PublicTransparencySummary | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [qualFilter, setQualFilter] = useState<'ALL' | 'QUALIFIED' | 'PROVISIONAL'>('ALL');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Detail Modal / Profile state
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(initialOrgId || null);
  const [orgProfile, setOrgProfile] = useState<OrganizationTransparencyProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);

  const fetchPlatformData = async (selectedPeriod: TimePeriod) => {
    setLoading(true);
    try {
      const [summaryRes, leaderboardRes] = await Promise.all([
        getPublicTransparency(selectedPeriod),
        getPublicLeaderboard(selectedPeriod),
      ]);
      setSummary(summaryRes);
      setLeaderboard(leaderboardRes);
    } catch (err) {
      console.error('Failed to load public transparency data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatformData(period);
  }, [period]);

  const loadOrgProfile = async (id: number, currentPeriod: TimePeriod) => {
    setProfileLoading(true);
    setSelectedOrgId(id);
    try {
      const profile = await getOrganizationTransparencyProfile(id, currentPeriod);
      setOrgProfile(profile);
    } catch (err) {
      console.error('Failed to fetch org transparency profile:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (selectedOrgId) {
      loadOrgProfile(selectedOrgId, period);
    }
  }, [selectedOrgId, period]);

  const filteredLeaderboard = useMemo(() => {
    return leaderboard.filter((entry) => {
      const matchesSearch =
        entry.organizationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.organizationType.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === 'ALL' || entry.organizationType === selectedType;
      const matchesQual =
        qualFilter === 'ALL' ||
        (qualFilter === 'QUALIFIED' && entry.qualificationStatus === 'QUALIFIED') ||
        (qualFilter === 'PROVISIONAL' && entry.qualificationStatus === 'PROVISIONAL');
      return matchesSearch && matchesType && matchesQual;
    });
  }, [leaderboard, searchQuery, selectedType, qualFilter]);

  const formatHours = (hours: number) => {
    if (hours === 0) return '0 hrs';
    if (hours < 24) return `${hours.toFixed(1)} hrs`;
    const days = (hours / 24).toFixed(1);
    return `${days} days (${hours.toFixed(0)}h)`;
  };

  const getEthosScoreTier = (score: number) => {
    if (score >= 80) return { label: 'Exceptional', color: C.emerald, bg: 'rgba(16,185,129,0.1)' };
    if (score >= 60) return { label: 'Strong', color: C.cyan, bg: 'rgba(0,200,232,0.1)' };
    if (score >= 40) return { label: 'Developing', color: C.amber, bg: 'rgba(245,158,11,0.1)' };
    return { label: 'Needs Focus', color: C.rose, bg: 'rgba(244,63,94,0.1)' };
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.origin + '/leaderboard');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="min-h-screen text-[#E2E5EE] font-sans pb-24" style={{ background: C.bg }}>
      {/* Top Banner & Navigation */}
      <header className="border-b sticky top-0 z-30 backdrop-blur-md" style={{ background: `${C.surface}F0`, borderColor: C.border }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-1.5 border font-mono text-xs uppercase tracking-wider transition-all hover:bg-white/5"
                style={{ borderColor: C.border, color: C.textSub }}
              >
                <ArrowLeft size={13} />
                <span>Back</span>
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded flex items-center justify-center font-mono font-bold text-sm shadow-md" style={{ background: C.cyan, color: C.bg }}>
                <Trophy size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold font-mono tracking-tight uppercase" style={{ color: C.text }}>
                    ETHOS Public Transparency & Leaderboard
                  </h1>
                  <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest border rounded" style={{ borderColor: `${C.cyan}40`, color: C.cyan, background: `${C.cyan}10` }}>
                    Phase P3
                  </span>
                </div>
                <p className="text-[11px] font-mono" style={{ color: C.textDim }}>
                  Aggregate Ethical Governance & Accountability Across Active Institutions
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 border font-mono text-xs transition-colors hover:bg-white/5"
              style={{ borderColor: C.border, color: C.textSub }}
              title="Copy link to public leaderboard"
            >
              {copiedLink ? <Check size={13} className="text-emerald-400" /> : <Share2 size={13} />}
              <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Share'}</span>
            </button>
            <button
              onClick={() => fetchPlatformData(period)}
              className="p-1.5 border transition-colors hover:bg-white/5"
              style={{ borderColor: C.border, color: C.textSub }}
              title="Refresh statistics"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {/* Hero Section & Period Selector */}
        <section className="relative overflow-hidden border p-6 sm:p-8" style={{ background: C.surface, borderColor: C.border }}>
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 text-xs font-mono border" style={{ borderColor: `${C.emerald}40`, background: `${C.emerald}10`, color: C.emerald }}>
                <ShieldCheck size={14} />
                <span>Zero-Knowledge Multi-Tenant Transparency Protocol</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: C.text }}>
                Institutional Accountability & Governance Index
              </h2>
              <p className="text-xs sm:text-sm leading-relaxed" style={{ color: C.textSub }}>
                Rankings are determined objectively by the <strong>ETHOS Algorithm</strong> evaluating four pillars:
                Resolution Rate (40%), Turnaround Speed (30%), Investigation Activity (20%), and Total Case Accountability (10%).
                Institutions with fewer than 10 eligible cases are automatically designated <em>PROVISIONAL</em> to prevent small-sample gaming.
              </p>
            </div>

            {/* Period Filter Buttons */}
            <div className="flex flex-col items-start lg:items-end gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: C.textDim }}>
                Reporting Time Window
              </span>
              <div className="flex flex-wrap gap-1 p-1 border" style={{ background: C.surface2, borderColor: C.border }}>
                {(['ALL_TIME', 'LAST_90_DAYS', 'LAST_30_DAYS', 'LAST_7_DAYS'] as TimePeriod[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className="px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-all"
                    style={{
                      background: period === p ? C.cyan : 'transparent',
                      color: period === p ? C.bg : C.textSub,
                      fontWeight: period === p ? 700 : 400,
                    }}
                  >
                    {PERIOD_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Platform Key Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t" style={{ borderColor: C.border }}>
            <div className="p-4 border" style={{ background: C.surface2, borderColor: C.border }}>
              <div className="flex items-center justify-between text-xs font-mono" style={{ color: C.textDim }}>
                <span>Active Tenants</span>
                <Building2 size={14} style={{ color: C.blue }} />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono" style={{ color: C.text }}>
                {loading ? '…' : summary?.activeOrganizations ?? 0}
              </div>
              <div className="text-[10px] font-mono mt-1" style={{ color: C.textSub }}>
                out of {summary?.totalOrganizations ?? 0} registered institutions
              </div>
            </div>

            <div className="p-4 border" style={{ background: C.surface2, borderColor: C.border }}>
              <div className="flex items-center justify-between text-xs font-mono" style={{ color: C.textDim }}>
                <span>Platform Resolution Rate</span>
                <CheckCircle2 size={14} style={{ color: C.emerald }} />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono" style={{ color: C.emerald }}>
                {loading ? '…' : `${summary?.platformResolutionRate ?? 0}%`}
              </div>
              <div className="text-[10px] font-mono mt-1" style={{ color: C.textSub }}>
                {summary?.resolvedComplaintsPlatform ?? 0} of {summary?.totalComplaintsPlatform ?? 0} cases resolved
              </div>
            </div>

            <div className="p-4 border" style={{ background: C.surface2, borderColor: C.border }}>
              <div className="flex items-center justify-between text-xs font-mono" style={{ color: C.textDim }}>
                <span>Platform Median Turnaround</span>
                <Clock size={14} style={{ color: C.cyan }} />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono" style={{ color: C.cyan }}>
                {loading ? '…' : formatHours(summary?.platformMedianResolutionHours ?? 0)}
              </div>
              <div className="text-[10px] font-mono mt-1" style={{ color: C.textSub }}>
                Avg: {formatHours(summary?.platformAverageResolutionHours ?? 0)}
              </div>
            </div>

            <div className="p-4 border" style={{ background: C.surface2, borderColor: C.border }}>
              <div className="flex items-center justify-between text-xs font-mono" style={{ color: C.textDim }}>
                <span>Tenant Privacy Guarantee</span>
                <Shield size={14} style={{ color: C.violet }} />
              </div>
              <div className="mt-2 text-sm font-bold font-mono" style={{ color: C.violet }}>
                100% Isolated
              </div>
              <div className="text-[10px] font-mono mt-1" style={{ color: C.textSub }}>
                Zero cross-tenant individual complaint disclosure
              </div>
            </div>
          </div>
        </section>

        {/* Filter Controls & Search */}
        <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.textDim }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search institutions by name or type…"
              className="w-full pl-9 pr-4 py-2 border font-mono text-xs bg-transparent outline-none transition-all focus:border-cyan-400"
              style={{ borderColor: C.border, color: C.text }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Institution Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border font-mono text-xs uppercase bg-[#0F1117] outline-none cursor-pointer"
              style={{ borderColor: C.border, color: C.textSub }}
            >
              {Object.entries(ORG_TYPE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>

            {/* Qualification Filter */}
            <div className="flex border" style={{ borderColor: C.border, background: C.surface }}>
              {(['ALL', 'QUALIFIED', 'PROVISIONAL'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => setQualFilter(q)}
                  className="px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors"
                  style={{
                    background: qualFilter === q ? C.surface3 : 'transparent',
                    color: qualFilter === q ? C.cyan : C.textDim,
                    borderRight: q !== 'PROVISIONAL' ? `1px solid ${C.border}` : 'none',
                  }}
                >
                  {q === 'ALL' ? 'All Tiers' : q}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Leaderboard Table / Cards */}
        <section className="border overflow-hidden" style={{ background: C.surface, borderColor: C.border }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b font-mono text-[10px] uppercase tracking-widest" style={{ borderColor: C.border, color: C.textDim }}>
                  <th className="py-3 px-4 w-14 text-center">Rank</th>
                  <th className="py-3 px-4">Institution</th>
                  <th className="py-3 px-4">Ethos Score</th>
                  <th className="py-3 px-4">Qualification</th>
                  <th className="py-3 px-4">Resolution Rate</th>
                  <th className="py-3 px-4">Median Speed</th>
                  <th className="py-3 px-4 text-center">Volume</th>
                  <th className="py-3 px-4 text-right">Transparency Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: `${C.border}60` }}>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center font-mono text-xs" style={{ color: C.textDim }}>
                      <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-cyan-400" />
                      Loading verified institutional rankings…
                    </td>
                  </tr>
                ) : filteredLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center font-mono text-xs" style={{ color: C.textDim }}>
                      No institutions match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLeaderboard.map((entry) => {
                    const tier = getEthosScoreTier(entry.ethosScore);
                    const isTop1 = entry.rank === 1;
                    const isTop2 = entry.rank === 2;
                    const isTop3 = entry.rank === 3;

                    return (
                      <tr
                        key={entry.organizationId}
                        onClick={() => setSelectedOrgId(entry.organizationId)}
                        className="group hover:bg-white/[0.02] cursor-pointer transition-colors"
                      >
                        {/* Rank */}
                        <td className="py-4 px-4 text-center font-mono font-bold">
                          {isTop1 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs">
                              🥇 1
                            </span>
                          ) : isTop2 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-400/20 text-slate-200 border border-slate-400/40 text-xs">
                              🥈 2
                            </span>
                          ) : isTop3 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 text-amber-500 border border-amber-700/40 text-xs">
                              🥉 3
                            </span>
                          ) : (
                            <span className="text-xs" style={{ color: C.textDim }}>
                              #{entry.rank}
                            </span>
                          )}
                        </td>

                        {/* Institution Name & Type */}
                        <td className="py-4 px-4">
                          <div className="font-medium text-sm group-hover:text-cyan-400 transition-colors" style={{ color: C.text }}>
                            {entry.organizationName}
                          </div>
                          <div className="inline-block mt-0.5 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider border rounded" style={{ borderColor: C.border, color: C.textSub, background: C.surface2 }}>
                            {entry.organizationType}
                          </div>
                        </td>

                        {/* Ethos Score */}
                        <td className="py-4 px-4 font-mono">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold" style={{ color: tier.color }}>
                              {entry.ethosScore.toFixed(1)}
                            </span>
                            <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-semibold rounded" style={{ background: tier.bg, color: tier.color }}>
                              {tier.label}
                            </span>
                          </div>
                          <div className="w-24 h-1.5 bg-[#1A1F2B] rounded-full overflow-hidden mt-1.5">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.max(0, entry.ethosScore))}%`, background: tier.color }}
                            />
                          </div>
                        </td>

                        {/* Qualification Status */}
                        <td className="py-4 px-4 font-mono text-xs">
                          {entry.qualificationStatus === 'QUALIFIED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] uppercase font-bold rounded border" style={{ borderColor: `${C.emerald}30`, background: `${C.emerald}10`, color: C.emerald }}>
                              <ShieldCheck size={12} />
                              QUALIFIED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] uppercase font-semibold rounded border" style={{ borderColor: `${C.amber}30`, background: `${C.amber}10`, color: C.amber }} title="Fewer than 10 eligible complaints recorded. Score marked provisional to prevent small-sample gaming.">
                              <ShieldAlert size={12} />
                              PROVISIONAL
                            </span>
                          )}
                        </td>

                        {/* Resolution Rate */}
                        <td className="py-4 px-4 font-mono text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold" style={{ color: entry.resolutionRate >= 75 ? C.emerald : entry.resolutionRate >= 50 ? C.amber : C.rose }}>
                              {entry.resolutionRate.toFixed(1)}%
                            </span>
                            <span className="text-[10px]" style={{ color: C.textDim }}>
                              ({entry.resolvedComplaints}/{entry.totalEligibleComplaints})
                            </span>
                          </div>
                          <div className="w-20 h-1 bg-[#1A1F2B] rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, Math.max(0, entry.resolutionRate))}%`,
                                background: entry.resolutionRate >= 75 ? C.emerald : entry.resolutionRate >= 50 ? C.amber : C.rose,
                              }}
                            />
                          </div>
                        </td>

                        {/* Median Turnaround Speed */}
                        <td className="py-4 px-4 font-mono text-xs">
                          <div className="flex items-center gap-1" style={{ color: C.text }}>
                            <Clock size={12} style={{ color: C.cyan }} />
                            <span>{formatHours(entry.medianResolutionHours)}</span>
                          </div>
                          <div className="text-[10px]" style={{ color: C.textDim }}>
                            Avg: {formatHours(entry.averageResolutionHours)}
                          </div>
                        </td>

                        {/* Total Complaints Volume */}
                        <td className="py-4 px-4 text-center font-mono text-xs">
                          <div style={{ color: C.text }}>{entry.totalComplaints}</div>
                          <div className="text-[10px]" style={{ color: C.textDim }}>
                            {entry.totalEligibleComplaints} eligible
                          </div>
                        </td>

                        {/* View Profile Action */}
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrgId(entry.organizationId);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 border font-mono text-xs uppercase tracking-wider transition-all group-hover:border-cyan-400 group-hover:text-cyan-400"
                            style={{ borderColor: C.border, color: C.textSub }}
                          >
                            <span>Profile</span>
                            <ChevronRight size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Methodology & Privacy Invariant Explainer */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="p-5 border" style={{ background: C.surface, borderColor: C.border }}>
            <div className="flex items-center gap-2 mb-2 font-mono text-xs font-bold uppercase tracking-wider" style={{ color: C.cyan }}>
              <Sparkles size={14} />
              <span>Ethos Score Formula</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: C.textSub }}>
              Calculated dynamically via four normalized dimensions: <strong>40%</strong> Resolution Success, <strong>30%</strong> Turnaround Velocity, <strong>20%</strong> Active Investigation Ratio, and <strong>10%</strong> Reporting Volume Accountability.
            </p>
          </div>

          <div className="p-5 border" style={{ background: C.surface, borderColor: C.border }}>
            <div className="flex items-center gap-2 mb-2 font-mono text-xs font-bold uppercase tracking-wider" style={{ color: C.amber }}>
              <ShieldAlert size={14} />
              <span>Anti-Gaming Guardrail</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: C.textSub }}>
              Institutions with fewer than 10 eligible complaints are classified as <em>PROVISIONAL</em>. This prevents organizations from artificially inflating their rank with 1 or 2 cherry-picked resolutions.
            </p>
          </div>

          <div className="p-5 border" style={{ background: C.surface, borderColor: C.border }}>
            <div className="flex items-center gap-2 mb-2 font-mono text-xs font-bold uppercase tracking-wider" style={{ color: C.emerald }}>
              <ShieldCheck size={14} />
              <span>Strict Privacy Invariant</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: C.textSub }}>
              Zero cross-tenant individual complaint details are ever revealed. All statistics are mathematically aggregated at the server boundary with strict zero-knowledge isolation.
            </p>
          </div>
        </section>
      </main>

      {/* Organization Public Transparency Profile Drawer / Modal */}
      <AnimatePresence>
        {selectedOrgId && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-2xl h-full border-l flex flex-col overflow-y-auto"
              style={{ background: C.surface, borderColor: C.border }}
            >
              {/* Profile Header */}
              <div className="p-6 border-b flex items-start justify-between sticky top-0 z-10" style={{ background: C.surface, borderColor: C.border }}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 border" style={{ borderColor: `${C.cyan}40`, color: C.cyan, background: `${C.cyan}10` }}>
                      Public Transparency Profile
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 border" style={{ borderColor: C.border, color: C.textSub }}>
                      {PERIOD_LABELS[period]}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold tracking-tight" style={{ color: C.text }}>
                    {profileLoading ? 'Loading profile…' : orgProfile?.organizationName}
                  </h2>
                  <div className="flex items-center gap-2 text-xs font-mono" style={{ color: C.textSub }}>
                    <span>Type: {orgProfile?.organizationType}</span>
                    <span>•</span>
                    <span className="text-emerald-400">Status: {orgProfile?.status}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedOrgId(null);
                    setOrgProfile(null);
                  }}
                  className="p-2 border transition-colors hover:bg-white/10"
                  style={{ borderColor: C.border, color: C.textSub }}
                  title="Close Profile"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Profile Body */}
              <div className="p-6 space-y-6 flex-1">
                {profileLoading ? (
                  <div className="py-24 text-center font-mono text-xs" style={{ color: C.textDim }}>
                    <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-cyan-400" />
                    Calculating aggregate metrics for {PERIOD_LABELS[period]}…
                  </div>
                ) : orgProfile ? (
                  <>
                    {/* Ethos Score Card */}
                    <div className="p-6 border relative overflow-hidden" style={{ background: C.surface2, borderColor: C.border }}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: C.textDim }}>
                            Institutional Governance Rating
                          </span>
                          <div className="flex items-baseline gap-3 mt-1">
                            <span className="text-4xl font-extrabold font-mono" style={{ color: getEthosScoreTier(orgProfile.ethosScore).color }}>
                              {orgProfile.ethosScore.toFixed(1)}
                            </span>
                            <span className="text-xs font-mono" style={{ color: C.textDim }}>
                              / 100.0
                            </span>
                            <span className="px-2 py-0.5 text-xs font-mono uppercase font-bold rounded" style={{ background: getEthosScoreTier(orgProfile.ethosScore).bg, color: getEthosScoreTier(orgProfile.ethosScore).color }}>
                              {getEthosScoreTier(orgProfile.ethosScore).label}
                            </span>
                          </div>
                        </div>

                        <div>
                          {orgProfile.qualificationStatus === 'QUALIFIED' ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 border text-xs font-mono font-bold" style={{ borderColor: `${C.emerald}50`, color: C.emerald, background: `${C.emerald}10` }}>
                              <ShieldCheck size={16} />
                              <span>QUALIFIED (10+ Cases)</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 border text-xs font-mono font-bold" style={{ borderColor: `${C.amber}50`, color: C.amber, background: `${C.amber}10` }}>
                              <ShieldAlert size={16} />
                              <span>PROVISIONAL (Small Sample)</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono text-xs" style={{ borderColor: C.border }}>
                        <div>
                          <div className="text-[10px]" style={{ color: C.textDim }}>Resolution Rate</div>
                          <div className="font-bold text-sm mt-0.5" style={{ color: C.emerald }}>{orgProfile.resolutionRate.toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-[10px]" style={{ color: C.textDim }}>Median Turnaround</div>
                          <div className="font-bold text-sm mt-0.5" style={{ color: C.cyan }}>{formatHours(orgProfile.medianResolutionHours)}</div>
                        </div>
                        <div>
                          <div className="text-[10px]" style={{ color: C.textDim }}>Average Turnaround</div>
                          <div className="font-bold text-sm mt-0.5" style={{ color: C.text }}>{formatHours(orgProfile.averageResolutionHours)}</div>
                        </div>
                        <div>
                          <div className="text-[10px]" style={{ color: C.textDim }}>Eligible / Total</div>
                          <div className="font-bold text-sm mt-0.5" style={{ color: C.text }}>{orgProfile.eligibleComplaints} / {orgProfile.totalComplaints}</div>
                        </div>
                      </div>
                    </div>

                    {/* Complaint Breakdown Counters */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 border text-center font-mono" style={{ background: C.surface2, borderColor: C.border }}>
                        <div className="text-[10px] uppercase" style={{ color: C.textDim }}>Active Cases</div>
                        <div className="text-xl font-bold mt-1" style={{ color: C.cyan }}>{orgProfile.activeComplaints}</div>
                        <div className="text-[9px]" style={{ color: C.textDim }}>Reported & In-Progress</div>
                      </div>

                      <div className="p-3 border text-center font-mono" style={{ background: C.surface2, borderColor: C.border }}>
                        <div className="text-[10px] uppercase" style={{ color: C.textDim }}>Resolved Cases</div>
                        <div className="text-xl font-bold mt-1" style={{ color: C.emerald }}>{orgProfile.resolvedComplaints}</div>
                        <div className="text-[9px]" style={{ color: C.textDim }}>Successfully closed</div>
                      </div>

                      <div className="p-3 border text-center font-mono" style={{ background: C.surface2, borderColor: C.border }}>
                        <div className="text-[10px] uppercase" style={{ color: C.textDim }}>Rejected (Spam/Dup)</div>
                        <div className="text-xl font-bold mt-1" style={{ color: C.textDim }}>{orgProfile.rejectedComplaints}</div>
                        <div className="text-[9px]" style={{ color: C.textDim }}>Excluded from denominator</div>
                      </div>

                      <div className="p-3 border text-center font-mono" style={{ background: C.surface2, borderColor: C.border }}>
                        <div className="text-[10px] uppercase" style={{ color: C.textDim }}>Total Recorded</div>
                        <div className="text-xl font-bold mt-1" style={{ color: C.text }}>{orgProfile.totalComplaints}</div>
                        <div className="text-[9px]" style={{ color: C.textDim }}>Lifetime logged</div>
                      </div>
                    </div>

                    {/* Category Distribution Chart */}
                    <div className="p-5 border space-y-4" style={{ background: C.surface2, borderColor: C.border }}>
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: C.text }}>
                          <BarChart3 size={14} style={{ color: C.cyan }} />
                          <span>Complaints by Category</span>
                        </div>
                        <span className="text-[10px] font-mono" style={{ color: C.textDim }}>
                          {Object.keys(orgProfile.complaintsByCategory || {}).length} Categories Logged
                        </span>
                      </div>

                      {Object.keys(orgProfile.complaintsByCategory || {}).length === 0 ? (
                        <div className="py-6 text-center font-mono text-xs" style={{ color: C.textDim }}>
                          No categorised cases logged in this time window.
                        </div>
                      ) : (
                        <div className="space-y-2 font-mono text-xs">
                          {Object.entries(orgProfile.complaintsByCategory).map(([cat, count]) => {
                            const pct = orgProfile.totalComplaints > 0 ? (count / orgProfile.totalComplaints) * 100 : 0;
                            return (
                              <div key={cat} className="space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span style={{ color: C.text }}>{cat}</span>
                                  <span style={{ color: C.textDim }}>{count} ({pct.toFixed(0)}%)</span>
                                </div>
                                <div className="w-full h-1.5 bg-[#1A1F2B] rounded-full overflow-hidden">
                                  <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Department Distribution Chart */}
                    <div className="p-5 border space-y-4" style={{ background: C.surface2, borderColor: C.border }}>
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: C.text }}>
                          <Building2 size={14} style={{ color: C.blue }} />
                          <span>Complaints by Department</span>
                        </div>
                        <span className="text-[10px] font-mono" style={{ color: C.textDim }}>
                          {Object.keys(orgProfile.complaintsByDepartment || {}).length} Departments Logged
                        </span>
                      </div>

                      {Object.keys(orgProfile.complaintsByDepartment || {}).length === 0 ? (
                        <div className="py-6 text-center font-mono text-xs" style={{ color: C.textDim }}>
                          No departmental cases logged in this time window.
                        </div>
                      ) : (
                        <div className="space-y-2 font-mono text-xs">
                          {Object.entries(orgProfile.complaintsByDepartment).map(([dept, count]) => {
                            const pct = orgProfile.totalComplaints > 0 ? (count / orgProfile.totalComplaints) * 100 : 0;
                            return (
                              <div key={dept} className="space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span style={{ color: C.text }}>{dept}</span>
                                  <span style={{ color: C.textDim }}>{count} ({pct.toFixed(0)}%)</span>
                                </div>
                                <div className="w-full h-1.5 bg-[#1A1F2B] rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Privacy Guarantee Seal */}
                    <div className="p-4 border flex items-start gap-3" style={{ background: `${C.surface3}80`, borderColor: C.border }}>
                      <ShieldCheck size={20} className="flex-shrink-0 text-emerald-400 mt-0.5" />
                      <div className="space-y-1 text-xs">
                        <div className="font-mono font-bold uppercase tracking-wider text-emerald-400">
                          Cryptographic Privacy Verification
                        </div>
                        <p className="leading-relaxed" style={{ color: C.textSub }}>
                          This public transparency profile reveals strictly aggregated institutional figures.
                          Complainant pseudonyms, case tracking codes, internal investigator assignments, and grievance narratives are protected under cryptographic isolation and will never be displayed publicly.
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center font-mono text-xs" style={{ color: C.textDim }}>
                    Could not retrieve institutional profile.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
