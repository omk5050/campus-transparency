import React, { useState, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Toaster, toast } from "sonner";
import {
  format,
  formatDistanceToNow,
  differenceInHours,
  addHours,
} from "date-fns";
import { clsx } from "clsx";
import {
  LayoutGrid,
  FileText,
  Plus,
  Activity,
  BarChart2,
  Settings,
  Shield,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  Search,
  X,
  Check,
  Filter,
  Copy,
  MoreHorizontal,
  LogOut,
  AlertTriangle,
  Clock,
  Eye,
  EyeOff,
  Cpu,
  Building2,
  Users,
  Hash,
  Mail,
  Paperclip,
  MapPin,
  User,
  Globe,
  TrendingUp,
  Send,
  Link,
  Key,
  CreditCard,
  CheckCircle2,
  XCircle,
  Info,
  Bell,
  Archive,
  Layers,
  Terminal,
  Zap,
  Flag,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  organizations as _orgs,
  myTrackedReports as _tracked,
  notifications as _notifications,
} from "./data";
import {
  login as apiLogin,
  logout as apiLogout,
  getToken,
  isAuthenticated,
  getPublicFeed,
  getAdminFeed,
  getIssueById,
  trackIssue,
  createIssue,
  transitionStatus,
  voteIssue,
  hideIssue,
  getCurrentUser,
  getUnreadNotificationCount,
  UserProfileResponse,
  ApiError,
} from "./api";
import { mapIssuePage } from "./mapper";
import type {
  Report,
  Organization,
  ReportStatus,
  Priority,
  TrackedReport,
  FilterStatus,
  SortOption,
  Notification,
} from "./types";
import { GlobalSearch } from "./components/GlobalSearch";
import { NotificationsPanel, NotificationBell } from "./components/Notifications";
import { TrackReportView } from "./components/TrackReport";
import { ModerationQueueView } from "./components/ModerationQueue";
import { WorkflowBuilder } from "./components/WorkflowBuilder";
import { PlatformAdminView } from "./components/PlatformAdmin";
import { CaseCommunication, InternalNotesPanel } from "./components/CaseCommunication";
import { CaseAssignment } from "./components/CaseAssignment";
import { ResolutionForm, ResolutionDisplay } from "./components/ResolutionFlow";
import { EvidenceWorkspace } from "./components/EvidenceWorkspace";
import { AIOverridePanel } from "./components/AIOverridePanel";
import { OrganizationApplicationApply } from "./components/OrganizationApplicationApply";
import { SuperAdminApplications } from "./components/SuperAdminApplications";
import { JoinCodeRegistration } from "./components/JoinCodeRegistration";
import { JoinCodeManagement } from "./components/JoinCodeManagement";

// ─── Design constants ──────────────────────────────────────────────────────────
const C = {
  bg: "#08090E",
  surface: "#0F1117",
  surface2: "#161921",
  surface3: "#1D2029",
  border: "#1E222B",
  border2: "#2D3140",
  cyan: "#00C8E8",
  text: "#E2E5EE",
  textSub: "#8A8FA8",
  textDim: "#52576A",
  emerald: "#10B981",
  amber: "#F59E0B",
  blue: "#38BDF8",
  violet: "#8B5CF6",
  rose: "#F43F5E",
  orange: "#F97316",
} as const;

const STATUS: Record<
  ReportStatus,
  { label: string; color: string; bg: string }
> = {
  // ── Real backend statuses ─────────────────────────────────────────────────
  REPORTED: {
    label: "REPORTED",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.08)",
  },
  UNDER_REVIEW: {
    // Backend status — no direct transition endpoint yet
    label: "UNDER REVIEW",
    color: "#38BDF8",
    bg: "rgba(56,189,248,0.08)",
  },
  IN_PROGRESS: {
    label: "IN PROGRESS",
    color: "#00C8E8",
    bg: "rgba(0,200,232,0.08)",
  },
  RESOLVED: {
    label: "RESOLVED",
    color: "#10B981",
    bg: "rgba(16,185,129,0.08)",
  },
  REJECTED: {
    label: "REJECTED",
    color: "#F43F5E",
    bg: "rgba(244,63,94,0.08)",
  },
  // ── Frontend-only mock statuses (no backend equivalent) ───────────────────
  TRIAGED: {
    label: "TRIAGED",
    color: "#38BDF8",
    bg: "rgba(56,189,248,0.08)",
  },
  PENDING_REVIEW: {
    label: "PENDING REVIEW",
    color: "#8B5CF6",
    bg: "rgba(139,92,246,0.08)",
  },
  ARCHIVED: {
    label: "ARCHIVED",
    color: "#6B7280",
    bg: "rgba(107,114,128,0.08)",
  },
};

const PRIORITY: Record<
  Priority,
  { label: string; color: string; stripe: string }
> = {
  LOW: { label: "LOW", color: "#52576A", stripe: "#52576A" },
  MEDIUM: { label: "MED", color: "#F59E0B", stripe: "#F59E0B" },
  HIGH: { label: "HIGH", color: "#F97316", stripe: "#F97316" },
  CRITICAL: {
    label: "CRIT",
    color: "#F43F5E",
    stripe: "#F43F5E",
  },
};

// ─── Utility ────────────────────────────────────────────────────────────────
function genId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

function slaLabel(
  deadline: string,
  breached: boolean,
): { text: string; color: string } {
  const h = differenceInHours(new Date(deadline), new Date());
  if (breached || h < 0)
    return { text: "SLA BREACHED", color: C.rose };
  if (h < 4) return { text: `${h}h left`, color: C.amber };
  if (h < 24) return { text: `${h}h left`, color: C.textSub };
  return {
    text: `${Math.ceil(h / 24)}d left`,
    color: C.textDim,
  };
}

// ─── UI Primitives ────────────────────────────────────────────────────────────
function StatusBadge({
  status,
  size = "sm",
}: {
  status: ReportStatus;
  size?: "xs" | "sm" | "md";
}) {
  const cfg = STATUS[status];
  return (
    <span
      style={{
        color: cfg.color,
        background: cfg.bg,
        borderColor: `${cfg.color}28`,
      }}
      className={clsx(
        "font-mono uppercase tracking-widest border select-none inline-flex items-center gap-1.5 flex-shrink-0",
        size === "xs"
          ? "text-[9px] px-1.5 py-0.5"
          : size === "sm"
            ? "text-[10px] px-2 py-0.5"
            : "text-xs px-2.5 py-1",
      )}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse"
        style={{ background: cfg.color }}
      />
      {cfg.label}
    </span>
  );
}

function PriorityMark({ priority }: { priority: Priority }) {
  return (
    <span
      className="font-mono text-[9px] uppercase tracking-widest font-bold"
      style={{ color: PRIORITY[priority].color }}
    >
      {PRIORITY[priority].label}
    </span>
  );
}

function SLAChip({
  deadline,
  breached,
}: {
  deadline: string;
  breached: boolean;
}) {
  const { text, color } = slaLabel(deadline, breached);
  return (
    <span
      className="font-mono text-[9px] uppercase tracking-widest"
      style={{ color }}
    >
      {text}
    </span>
  );
}

function AIChip({ confidence }: { confidence: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest"
      style={{ color: C.violet }}
    >
      <Cpu size={9} />
      {Math.round(confidence * 100)}%
    </span>
  );
}

function CopyBtn({
  text,
  label,
}: {
  text: string;
  label?: string;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        toast.success(`Copied${label ? ` ${label}` : ""}`);
      }}
      className="p-1 transition-colors hover:opacity-80"
      style={{ color: C.textDim }}
      title={`Copy ${label ?? ""}`}
    >
      <Copy size={11} />
    </button>
  );
}

function Divider() {
  return (
    <div
      className="h-px w-full"
      style={{ background: C.border }}
    />
  );
}

// ─── Spaces View ─────────────────────────────────────────────────────────────
function SpacesView({
  orgs,
  onEnter,
  onJoin,
}: {
  orgs: Organization[];
  onEnter: (o: Organization) => void;
  onJoin: () => void;
}) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: C.bg, color: C.text }}
    >
      {/* Top bar */}
      <div
        className="h-12 border-b flex items-center justify-between px-8"
        style={{ borderColor: C.border }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-6 h-6 flex items-center justify-center font-mono font-bold text-xs"
            style={{ background: C.cyan, color: C.bg }}
          >
            E
          </div>
          <span
            className="font-mono text-xs uppercase tracking-[0.2em]"
            style={{ color: C.textSub }}
          >
            ETHOS
          </span>
          <span
            className="font-mono text-xs"
            style={{ color: C.textDim }}
          >
            // Ethical Governance System
          </span>
        </div>
        <button
          className="font-mono text-xs uppercase tracking-widest flex items-center gap-1.5 transition-opacity hover:opacity-70"
          style={{ color: C.textDim }}
        >
          <User size={13} /> Account
        </button>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full px-8 py-14">
        <div className="mb-12">
          <h1
            className="font-serif text-3xl mb-2"
            style={{ color: C.text }}
          >
            Your Spaces
          </h1>
          <p
            className="font-mono text-sm"
            style={{ color: C.textSub }}
          >
            Member of {orgs.length} organization
            {orgs.length !== 1 ? "s" : ""}. Select a space to
            continue.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-14">
          {orgs.map((org) => (
            <button
              key={org.id}
              onClick={() => onEnter(org)}
              className="group text-left p-5 border transition-all duration-150"
              style={{
                background: C.surface,
                borderColor: C.border,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = C.border2;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.border;
              }}
            >
              <div className="flex items-start gap-4 mb-5">
                <div
                  className="w-11 h-11 flex items-center justify-center font-serif text-lg font-bold flex-shrink-0"
                  style={{
                    background: `${org.accentColor}14`,
                    color: org.accentColor,
                    border: `1px solid ${org.accentColor}28`,
                  }}
                >
                  {org.logoChar}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="font-serif text-base mb-0.5 truncate"
                    style={{ color: C.text }}
                  >
                    {org.name}
                  </div>
                  <div
                    className="font-mono text-xs"
                    style={{ color: C.textSub }}
                  >
                    {org.domain}
                  </div>
                </div>
                <span
                  className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 border flex-shrink-0"
                  style={{
                    color: org.accentColor,
                    borderColor: `${org.accentColor}35`,
                    background: `${org.accentColor}0C`,
                  }}
                >
                  {org.role}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  {
                    label: "Unresolved",
                    value: org.unresolvedCount,
                    color: C.amber,
                  },
                  {
                    label: "Total Reports",
                    value: org.reportCount,
                    color: C.textSub,
                  },
                  {
                    label: "Members",
                    value: org.memberCount.toLocaleString(),
                    color: C.textSub,
                  },
                ].map((s) => (
                  <div key={s.label}>
                    <div
                      className="font-mono text-sm font-bold mb-0.5"
                      style={{ color: s.color }}
                    >
                      {s.value}
                    </div>
                    <div
                      className="font-mono text-[10px] uppercase tracking-widest"
                      style={{ color: C.textDim }}
                    >
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <span
                  className="font-mono text-xs"
                  style={{ color: org.accentColor }}
                >
                  Enter space
                </span>
                <ArrowRight
                  size={12}
                  style={{ color: org.accentColor }}
                />
              </div>
            </button>
          ))}
        </div>

        <div
          className="border-t pt-10"
          style={{ borderColor: C.border }}
        >
          <div className="flex items-start justify-between gap-6">
            <div>
              <div
                className="font-serif text-xl mb-1.5"
                style={{ color: C.text }}
              >
                Join an Organization
              </div>
              <p
                className="font-mono text-sm"
                style={{ color: C.textSub }}
              >
                Use an invitation link, access code, or verified
                organization email.
              </p>
            </div>
            <button
              onClick={onJoin}
              className="flex items-center gap-2 px-5 py-2.5 font-mono text-xs uppercase tracking-widest flex-shrink-0 transition-opacity hover:opacity-90"
              style={{ background: C.cyan, color: C.bg }}
            >
              <Plus size={13} />
              Join Organization
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                icon: <Link size={15} />,
                title: "Invitation Link",
                desc: "Paste a direct invite URL from an organization administrator",
              },
              {
                icon: <Hash size={15} />,
                title: "Access Code",
                desc: "Enter a 6-character alphanumeric access code",
              },
              {
                icon: <Mail size={15} />,
                title: "Email Domain",
                desc: "Verify your organization email for automatic membership",
              },
            ].map((m) => (
              <div
                key={m.title}
                className="p-4 border"
                style={{
                  borderColor: C.border,
                  background: C.surface,
                }}
              >
                <div
                  className="mb-2.5"
                  style={{ color: C.textSub }}
                >
                  {m.icon}
                </div>
                <div
                  className="font-mono text-xs uppercase tracking-widest mb-1"
                  style={{ color: C.text }}
                >
                  {m.title}
                </div>
                <div
                  className="font-mono text-[11px] leading-relaxed"
                  style={{ color: C.textDim }}
                >
                  {m.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Join Org Modal ────────────────────────────────────────────────────────────
function JoinOrgView({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState(0);
  const [method, setMethod] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const methods = [
    {
      id: "link",
      icon: <Link size={18} />,
      label: "Invitation Link",
      hint: "Paste an invite URL from your organization",
    },
    {
      id: "code",
      icon: <Hash size={18} />,
      label: "Access Code",
      hint: "6-character alphanumeric code",
    },
    {
      id: "email",
      icon: <Mail size={18} />,
      label: "Organization Email",
      hint: "Verified institutional email address",
    },
    {
      id: "id",
      icon: <CreditCard size={18} />,
      label: "Member / Student ID",
      hint: "Organization-issued ID number",
    },
  ];

  const handleConfirm = () => {
    toast.success(
      "Membership request submitted. Pending verification.",
    );
    onSuccess();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(8,9,14,0.88)" }}
    >
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 8, opacity: 0 }}
        className="w-full max-w-lg mx-4 border"
        style={{
          background: C.surface,
          borderColor: C.border2,
          color: C.text,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: C.border }}
        >
          <div>
            <div
              className="font-mono text-xs uppercase tracking-widest mb-0.5"
              style={{ color: C.cyan }}
            >
              ETHOS // Join Organization
            </div>
            <div
              className="font-serif text-lg"
              style={{ color: C.text }}
            >
              {step === 0
                ? "Select verification method"
                : step === 1
                  ? "Enter credentials"
                  : step === 2
                    ? "Identity privacy notice"
                    : "Request submitted"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 transition-opacity hover:opacity-70"
            style={{ color: C.textSub }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div
          className="flex px-6 py-3 gap-1.5 border-b"
          style={{ borderColor: C.border }}
        >
          {["Method", "Credentials", "Privacy", "Done"].map(
            (s, i) => (
              <div
                key={s}
                className="flex items-center gap-1.5"
              >
                <div
                  className="w-5 h-5 flex items-center justify-center font-mono text-[10px] border"
                  style={{
                    borderColor: i <= step ? C.cyan : C.border2,
                    color:
                      i < step
                        ? C.bg
                        : i === step
                          ? C.cyan
                          : C.textDim,
                    background:
                      i < step ? C.cyan : "transparent",
                  }}
                >
                  {i < step ? <Check size={10} /> : i + 1}
                </div>
                <span
                  className="font-mono text-[10px] uppercase tracking-wider"
                  style={{
                    color: i === step ? C.text : C.textDim,
                  }}
                >
                  {s}
                </span>
                {i < 3 && (
                  <ChevronRight
                    size={10}
                    style={{ color: C.textDim }}
                  />
                )}
              </div>
            ),
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {step === 0 && (
            <div className="space-y-2">
              {methods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className="w-full flex items-center gap-4 p-4 border text-left transition-all"
                  style={{
                    borderColor:
                      method === m.id ? C.cyan : C.border,
                    background:
                      method === m.id
                        ? `${C.cyan}0C`
                        : "transparent",
                    color: C.text,
                  }}
                >
                  <span
                    style={{
                      color:
                        method === m.id ? C.cyan : C.textSub,
                    }}
                  >
                    {m.icon}
                  </span>
                  <div>
                    <div
                      className="font-mono text-xs uppercase tracking-widest mb-0.5"
                      style={{
                        color:
                          method === m.id ? C.cyan : C.text,
                      }}
                    >
                      {m.label}
                    </div>
                    <div
                      className="font-mono text-[11px]"
                      style={{ color: C.textDim }}
                    >
                      {m.hint}
                    </div>
                  </div>
                  {method === m.id && (
                    <Check
                      size={14}
                      className="ml-auto"
                      style={{ color: C.cyan }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label
                  className="block font-mono text-[10px] uppercase tracking-widest mb-2"
                  style={{ color: C.textSub }}
                >
                  {method === "code"
                    ? "Access Code"
                    : method === "email"
                      ? "Organization Email"
                      : method === "id"
                        ? "Member ID"
                        : "Invitation Link"}
                </label>
                <input
                  type={method === "email" ? "email" : "text"}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={
                    method === "code"
                      ? "E.g. NF-7X2K"
                      : method === "email"
                        ? "you@organization.edu"
                        : "Enter value..."
                  }
                  className="w-full px-4 py-3 font-mono text-sm border bg-transparent outline-none transition-all"
                  style={{
                    borderColor: code ? C.cyan : C.border,
                    color: C.text,
                  }}
                  autoFocus
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div
                className="border p-4"
                style={{
                  borderColor: `${C.cyan}30`,
                  background: `${C.cyan}06`,
                }}
              >
                <div className="flex items-start gap-3">
                  <Info
                    size={15}
                    className="flex-shrink-0 mt-0.5"
                    style={{ color: C.cyan }}
                  />
                  <div>
                    <div
                      className="font-mono text-xs uppercase tracking-widest mb-2"
                      style={{ color: C.cyan }}
                    >
                      About your identity
                    </div>
                    <p
                      className="font-mono text-xs leading-relaxed"
                      style={{ color: C.textSub }}
                    >
                      Verifying your membership confirms you
                      belong to the organization but does{" "}
                      <strong style={{ color: C.text }}>
                        not reveal your identity
                      </strong>{" "}
                      when submitting anonymous reports.
                    </p>
                    <p
                      className="font-mono text-xs leading-relaxed mt-2"
                      style={{ color: C.textSub }}
                    >
                      ETHOS uses separate cryptographic
                      identifiers for membership verification
                      and report submission. Your anonymous
                      reports cannot be traced back to your
                      verified identity.
                    </p>
                  </div>
                </div>
              </div>
              <div
                className="flex items-start gap-3 p-4 border"
                style={{
                  borderColor: C.border,
                  background: C.surface2,
                }}
              >
                <Cpu
                  size={13}
                  className="flex-shrink-0 mt-0.5"
                  style={{ color: C.violet }}
                />
                <p
                  className="font-mono text-[11px] leading-relaxed"
                  style={{ color: C.textDim }}
                >
                  ETHOS Intelligence processes reports for
                  categorization and routing. No personally
                  identifiable information is associated with
                  anonymous submissions. AI recommendations are
                  advisory only; human administrators make all
                  decisions.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-4 space-y-3">
              <div
                className="w-12 h-12 mx-auto flex items-center justify-center"
                style={{
                  background: `${C.emerald}14`,
                  border: `1px solid ${C.emerald}28`,
                }}
              >
                <CheckCircle2
                  size={24}
                  style={{ color: C.emerald }}
                />
              </div>
              <div
                className="font-serif text-lg"
                style={{ color: C.text }}
              >
                Request submitted
              </div>
              <p
                className="font-mono text-xs"
                style={{ color: C.textSub }}
              >
                Your membership request is pending verification.
                You will receive confirmation at the provided
                contact.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-4 border-t"
          style={{ borderColor: C.border }}
        >
          <button
            onClick={() =>
              step === 0 ? onClose() : setStep((s) => s - 1)
            }
            className="font-mono text-xs uppercase tracking-widest transition-opacity hover:opacity-70"
            style={{ color: C.textSub }}
          >
            {step === 0 ? "Cancel" : "← Back"}
          </button>
          {step < 3 ? (
            <button
              onClick={() => {
                if (step === 2) {
                  handleConfirm();
                  setStep(3);
                } else setStep((s) => s + 1);
              }}
              disabled={step === 0 && !method}
              className="flex items-center gap-2 px-5 py-2 font-mono text-xs uppercase tracking-widest transition-opacity disabled:opacity-40"
              style={{ background: C.cyan, color: C.bg }}
            >
              {step === 2 ? "Confirm & Submit" : "Continue"}
              <ArrowRight size={13} />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-5 py-2 font-mono text-xs uppercase tracking-widest"
              style={{ background: C.cyan, color: C.bg }}
            >
              Done
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Org Sidebar ──────────────────────────────────────────────────────────────
type OrgView =
  | "OVERVIEW"
  | "REPORTS"
  | "SUBMIT"
  | "DETAIL"
  | "ACTIVITY"
  | "INSIGHTS"
  | "ADMIN"
  | "SETTINGS"
  | "NOTIFICATIONS"
  | "TRACK"
  | "MODERATION"
  | "PLATFORM"
  | "JOIN_CODES"
  | "ORG_APPLICATIONS";

const NAV_MAIN: {
  id: OrgView;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "OVERVIEW",
    label: "Overview",
    icon: <LayoutGrid size={15} />,
  },
  {
    id: "REPORTS",
    label: "Reports",
    icon: <FileText size={15} />,
  },
  {
    id: "SUBMIT",
    label: "Submit Report",
    icon: <Plus size={15} />,
  },
  {
    id: "ACTIVITY",
    label: "My Activity",
    icon: <Activity size={15} />,
  },
  {
    id: "INSIGHTS",
    label: "Insights",
    icon: <BarChart2 size={15} />,
  },
];

function OrgSidebar({
  org,
  allOrgs,
  view,
  onView,
  onSwitchOrg,
  onLeave,
  unresolvedCount,
  unreadNotifications,
  onSearch,
  isSuperAdmin,
}: {
  org: Organization;
  allOrgs: Organization[];
  view: OrgView;
  onView: (v: OrgView) => void;
  onSwitchOrg: () => void;
  onLeave: () => void;
  unresolvedCount: number;
  unreadNotifications: number;
  onSearch: () => void;
  isSuperAdmin?: boolean;
}) {
  const [orgOpen, setOrgOpen] = useState(false);
  const isAdmin = isSuperAdmin || org.role === "ADMIN" || org.role === "OWNER";

  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col border-r"
      style={{ background: C.surface, borderColor: C.border }}
    >
      {/* ETHOS mark */}
      <div
        className="px-5 py-4 border-b flex items-center gap-2.5"
        style={{ borderColor: C.border }}
      >
        <div
          className="w-6 h-6 flex items-center justify-center font-mono font-bold text-xs flex-shrink-0"
          style={{ background: C.cyan, color: C.bg }}
        >
          E
        </div>
        <span
          className="font-mono text-xs uppercase tracking-[0.15em]"
          style={{ color: C.textSub }}
        >
          ETHOS
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={onSearch} className="p-1.5 transition-opacity hover:opacity-70" style={{ color: C.textDim }} title="Search (⌘K)">
            <Search size={13} />
          </button>
          <NotificationBell count={unreadNotifications} onClick={() => onView("NOTIFICATIONS")} />
        </div>
      </div>

      {/* Org switcher */}
      <div className="relative">
        <button
          onClick={() => setOrgOpen((x) => !x)}
          className="w-full flex items-center gap-3 px-5 py-3.5 border-b transition-colors hover:bg-white/[0.02] text-left"
          style={{ borderColor: C.border }}
        >
          <div
            className="w-7 h-7 flex items-center justify-center font-serif text-sm font-bold flex-shrink-0"
            style={{
              background: `${org.accentColor}14`,
              color: org.accentColor,
              border: `1px solid ${org.accentColor}28`,
            }}
          >
            {org.logoChar}
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="font-mono text-xs truncate"
              style={{ color: C.text }}
            >
              {org.shortName}
            </div>
            <div
              className="font-mono text-[10px] uppercase tracking-widest"
              style={{ color: C.textDim }}
            >
              {org.role}
            </div>
          </div>
          <ChevronDown
            size={13}
            style={{ color: C.textDim, flexShrink: 0 }}
          />
        </button>
        {orgOpen && (
          <div
            className="absolute left-0 right-0 z-30 border-b shadow-xl"
            style={{
              background: C.surface2,
              borderColor: C.border2,
            }}
          >
            {allOrgs.map((o) => (
              <button
                key={o.id}
                onClick={() => {
                  onSwitchOrg();
                  setOrgOpen(false);
                }}
                className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-white/[0.03] transition-colors"
              >
                <div
                  className="w-5 h-5 flex items-center justify-center font-serif text-xs font-bold flex-shrink-0"
                  style={{
                    background: `${o.accentColor}14`,
                    color: o.accentColor,
                  }}
                >
                  {o.logoChar}
                </div>
                <span
                  className="font-mono text-xs truncate"
                  style={{
                    color: o.id === org.id ? C.cyan : C.text,
                  }}
                >
                  {o.shortName}
                </span>
                {o.id === org.id && (
                  <Check
                    size={11}
                    className="ml-auto flex-shrink-0"
                    style={{ color: C.cyan }}
                  />
                )}
              </button>
            ))}
            <div
              className="border-t"
              style={{ borderColor: C.border }}
            >
              <button
                onClick={() => {
                  onLeave();
                  setOrgOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-5 py-3 text-left hover:bg-white/[0.02] transition-colors"
                style={{ color: C.textSub }}
              >
                <Layers size={13} />
                <span className="font-mono text-xs">
                  All Spaces
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-4 space-y-px">
        <div className="px-5 mb-2">
          <span
            className="font-mono text-[9px] uppercase tracking-[0.2em]"
            style={{ color: C.textDim }}
          >
            Navigation
          </span>
        </div>
        {NAV_MAIN.map((item) => (
          <button
            key={item.id}
            onClick={() => onView(item.id)}
            className="w-full flex items-center gap-3 px-5 py-2.5 transition-colors text-left relative"
            style={{
              color: view === item.id ? C.cyan : C.textSub,
              background:
                view === item.id
                  ? `${C.cyan}08`
                  : "transparent",
            }}
            onMouseEnter={(e) => {
              if (view !== item.id)
                e.currentTarget.style.color = C.text;
            }}
            onMouseLeave={(e) => {
              if (view !== item.id)
                e.currentTarget.style.color = C.textSub;
            }}
          >
            {view === item.id && (
              <div
                className="absolute left-0 top-0 bottom-0 w-0.5"
                style={{ background: C.cyan }}
              />
            )}
            {item.icon}
            <span className="font-mono text-xs">
              {item.label}
            </span>
            {item.id === "REPORTS" && unresolvedCount > 0 && (
              <span
                className="ml-auto font-mono text-[9px] px-1.5 py-0.5"
                style={{
                  background: `${C.amber}20`,
                  color: C.amber,
                }}
              >
                {unresolvedCount}
              </span>
            )}
          </button>
        ))}

        {isAdmin && (
          <>
            <div className="px-5 pt-4 pb-2">
              <div
                className="h-px mb-3"
                style={{ background: C.border }}
              />
              <span
                className="font-mono text-[9px] uppercase tracking-[0.2em]"
                style={{ color: C.textDim }}
              >
                Administration
              </span>
            </div>
            <button
              onClick={() => onView("ADMIN")}
              className="w-full flex items-center gap-3 px-5 py-2.5 transition-colors text-left relative"
              style={{
                color: view === "ADMIN" ? C.cyan : C.textSub,
                background:
                  view === "ADMIN"
                    ? `${C.cyan}08`
                    : "transparent",
              }}
            >
              {view === "ADMIN" && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-0.5"
                  style={{ background: C.cyan }}
                />
              )}
              <Shield size={15} />
              <span className="font-mono text-xs">
                Admin Console
              </span>
            </button>
            <button
              onClick={() => onView("SETTINGS")}
              className="w-full flex items-center gap-3 px-5 py-2.5 transition-colors text-left relative"
              style={{
                color: view === "SETTINGS" ? C.cyan : C.textSub,
                background:
                  view === "SETTINGS"
                    ? `${C.cyan}08`
                    : "transparent",
              }}
            >
              {view === "SETTINGS" && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-0.5"
                  style={{ background: C.cyan }}
                />
              )}
              <Settings size={15} />
              <span className="font-mono text-xs">
                Org Settings
              </span>
            </button>
            <button
              onClick={() => onView("JOIN_CODES")}
              className="w-full flex items-center gap-3 px-5 py-2.5 transition-colors text-left relative"
              style={{
                color: view === "JOIN_CODES" ? C.cyan : C.textSub,
                background: view === "JOIN_CODES" ? `${C.cyan}08` : "transparent",
              }}
            >
              {view === "JOIN_CODES" && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: C.cyan }} />
              )}
              <Hash size={15} />
              <span className="font-mono text-xs">Join Codes</span>
            </button>
            <button
              onClick={() => onView("MODERATION")}
              className="w-full flex items-center gap-3 px-5 py-2.5 transition-colors text-left relative"
              style={{
                color: view === "MODERATION" ? C.cyan : C.textSub,
                background: view === "MODERATION" ? `${C.cyan}08` : "transparent",
              }}
            >
              {view === "MODERATION" && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: C.cyan }} />
              )}
              <Flag size={15} />
              <span className="font-mono text-xs">Moderation</span>
            </button>
            {(isSuperAdmin || org.role === "OWNER") && (
              <>
                <button
                  onClick={() => onView("ORG_APPLICATIONS")}
                  className="w-full flex items-center gap-3 px-5 py-2.5 transition-colors text-left relative"
                  style={{
                    color: view === "ORG_APPLICATIONS" ? C.rose : C.textSub,
                    background: view === "ORG_APPLICATIONS" ? `${C.rose}08` : "transparent",
                  }}
                >
                  {view === "ORG_APPLICATIONS" && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: C.rose }} />
                  )}
                  <Building2 size={15} />
                  <span className="font-mono text-xs">Org Applications</span>
                </button>
                <button
                  onClick={() => onView("PLATFORM")}
                  className="w-full flex items-center gap-3 px-5 py-2.5 transition-colors text-left relative"
                  style={{
                    color: view === "PLATFORM" ? C.rose : C.textSub,
                    background: view === "PLATFORM" ? `${C.rose}08` : "transparent",
                  }}
                >
                  {view === "PLATFORM" && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: C.rose }} />
                  )}
                  <Terminal size={15} />
                  <span className="font-mono text-xs">Platform Admin</span>
                </button>
              </>
            )}
          </>
        )}
        {/* Track report - always visible */}
        <div className="px-5 pt-4 pb-2">
          <div className="h-px mb-3" style={{ background: C.border }} />
        </div>
        <button
          onClick={() => onView("TRACK")}
          className="w-full flex items-center gap-3 px-5 py-2.5 transition-colors text-left relative"
          style={{
            color: view === "TRACK" ? C.cyan : C.textSub,
            background: view === "TRACK" ? `${C.cyan}08` : "transparent",
          }}
        >
          {view === "TRACK" && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: C.cyan }} />
          )}
          <Eye size={15} />
          <span className="font-mono text-xs">Track a Report</span>
        </button>
      </nav>

      {/* Bottom */}
      <div
        className="border-t px-5 py-4 space-y-2.5"
        style={{ borderColor: C.border }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: C.emerald }}
          />
          <span
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color: C.textDim }}
          >
            Anonymous session active
          </span>
        </div>
        <button
          onClick={onLeave}
          className="flex items-center gap-2 transition-opacity hover:opacity-70"
          style={{ color: C.textDim }}
        >
          <LogOut size={12} />
          <span className="font-mono text-[10px] uppercase tracking-widest">
            All Spaces
          </span>
        </button>
      </div>
    </aside>
  );
}

// ─── Overview View ────────────────────────────────────────────────────────────
function OverviewView({
  org,
  reports,
  onViewReports,
  onViewDetail,
}: {
  org: Organization;
  reports: Report[];
  onViewReports: () => void;
  onViewDetail: (id: string) => void;
}) {
  const resolved = reports.filter(
    (r) => r.status === "RESOLVED",
  ).length;
  const unresolved = reports.filter(
    (r) =>
      !["RESOLVED", "REJECTED", "ARCHIVED"].includes(r.status),
  ).length;
  const critical = reports.filter(
    (r) => r.priority === "CRITICAL",
  ).length;
  const slaCompliance = Math.round(
    (reports.filter((r) => !r.slaBreached).length /
      Math.max(reports.length, 1)) *
      100,
  );
  const recent = [...reports]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  const weeklyData = [
    { week: "W45", reports: 7, resolved: 4 },
    { week: "W46", reports: 11, resolved: 8 },
    { week: "W47", reports: 9, resolved: 7 },
    { week: "W48", reports: 14, resolved: 9 },
    { week: "W49", reports: 8, resolved: 5 },
    { week: "W50", reports: reports.length, resolved },
  ];

  const categoryTotals: Record<string, number> = {};
  reports.forEach((r) => {
    categoryTotals[r.category] =
      (categoryTotals[r.category] || 0) + 1;
  });
  const catData = Object.entries(categoryTotals)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const TooltipStyle = {
    background: C.surface2,
    border: `1px solid ${C.border2}`,
    fontFamily: "IBM Plex Mono, monospace",
    fontSize: 11,
    color: C.text,
  };

  return (
    <div
      className="flex-1 overflow-auto"
      style={{ background: C.bg }}
    >
      {/* Page header */}
      <div
        className="px-8 py-6 border-b"
        style={{ borderColor: C.border }}
      >
        <div
          className="font-mono text-[10px] uppercase tracking-widest mb-1"
          style={{ color: C.textDim }}
        >
          {org.id} // {format(new Date(), "EEE dd MMM yyyy")}
        </div>
        <h1
          className="font-serif text-2xl"
          style={{ color: C.text }}
        >
          {org.name}
        </h1>
        <p
          className="font-mono text-xs mt-1"
          style={{ color: C.textSub }}
        >
          {org.domain} · {org.type}
        </p>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Metrics row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Unresolved",
              value: unresolved,
              sub: "active reports",
              color: C.amber,
            },
            {
              label: "Critical",
              value: critical,
              sub: "require immediate action",
              color: C.rose,
            },
            {
              label: "SLA Compliance",
              value: `${slaCompliance}%`,
              sub: "within deadline",
              color: C.emerald,
            },
            {
              label: "Total Reports",
              value: reports.length,
              sub: "all time",
              color: C.textSub,
            },
          ].map((m) => (
            <div
              key={m.label}
              className="p-5 border"
              style={{
                background: C.surface,
                borderColor: C.border,
              }}
            >
              <div
                className="font-mono text-2xl font-bold mb-1"
                style={{ color: m.color }}
              >
                {m.value}
              </div>
              <div
                className="font-mono text-[10px] uppercase tracking-widest"
                style={{ color: C.text }}
              >
                {m.label}
              </div>
              <div
                className="font-mono text-[10px] mt-0.5"
                style={{ color: C.textDim }}
              >
                {m.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Area chart */}
          <div
            className="md:col-span-2 p-5 border"
            style={{
              background: C.surface,
              borderColor: C.border,
            }}
          >
            <div
              className="font-mono text-[10px] uppercase tracking-widest mb-4"
              style={{ color: C.textDim }}
            >
              Report Volume — Last 6 Weeks
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart
                data={weeklyData}
                margin={{
                  top: 0,
                  right: 0,
                  left: -20,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient
                    id="repGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={C.cyan}
                      stopOpacity={0.15}
                    />
                    <stop
                      offset="95%"
                      stopColor={C.cyan}
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient
                    id="resGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={C.emerald}
                      stopOpacity={0.12}
                    />
                    <stop
                      offset="95%"
                      stopColor={C.emerald}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={C.border}
                  vertical={false}
                />
                <XAxis
                  dataKey="week"
                  tick={{
                    fill: C.textDim,
                    fontSize: 10,
                    fontFamily: "IBM Plex Mono",
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{
                    fill: C.textDim,
                    fontSize: 10,
                    fontFamily: "IBM Plex Mono",
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={TooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="reports"
                  stroke={C.cyan}
                  strokeWidth={1.5}
                  fill="url(#repGrad)"
                  name="Reports"
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  stroke={C.emerald}
                  strokeWidth={1.5}
                  fill="url(#resGrad)"
                  name="Resolved"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {/* Category bar */}
          <div
            className="p-5 border"
            style={{
              background: C.surface,
              borderColor: C.border,
            }}
          >
            <div
              className="font-mono text-[10px] uppercase tracking-widest mb-4"
              style={{ color: C.textDim }}
            >
              By Category
            </div>
            <div className="space-y-2.5">
              {catData.slice(0, 5).map((cat) => (
                <div key={cat.name}>
                  <div className="flex justify-between mb-1">
                    <span
                      className="font-mono text-[10px]"
                      style={{ color: C.textSub }}
                    >
                      {cat.name}
                    </span>
                    <span
                      className="font-mono text-[10px] font-bold"
                      style={{ color: C.text }}
                    >
                      {cat.count}
                    </span>
                  </div>
                  <div
                    className="h-1"
                    style={{ background: C.border }}
                  >
                    <div
                      className="h-full"
                      style={{
                        width: `${(cat.count / reports.length) * 100}%`,
                        background: C.cyan,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div
          className="border"
          style={{ borderColor: C.border }}
        >
          <div
            className="flex items-center justify-between px-5 py-3.5 border-b"
            style={{ borderColor: C.border }}
          >
            <div
              className="font-mono text-[10px] uppercase tracking-widest"
              style={{ color: C.textDim }}
            >
              Recent Reports
            </div>
            <button
              onClick={onViewReports}
              className="font-mono text-[10px] uppercase tracking-widest flex items-center gap-1 transition-opacity hover:opacity-70"
              style={{ color: C.cyan }}
            >
              View all <ArrowRight size={11} />
            </button>
          </div>
          {recent.map((r, i) => (
            <div
              key={r.id}
              onClick={() => onViewDetail(r.id)}
              className="flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors hover:bg-white/[0.02] border-b last:border-b-0"
              style={{ borderColor: C.border }}
            >
              <div
                className="w-1 h-8 flex-shrink-0"
                style={{
                  background: PRIORITY[r.priority].stripe,
                }}
              />
              <StatusBadge status={r.status} size="xs" />
              <div className="flex-1 min-w-0">
                <div
                  className="font-mono text-xs truncate"
                  style={{ color: C.text }}
                >
                  {r.title}
                </div>
                <div
                  className="font-mono text-[10px]"
                  style={{ color: C.textDim }}
                >
                  {r.id} · {r.department}
                </div>
              </div>
              <div
                className="font-mono text-[10px] flex-shrink-0"
                style={{ color: C.textDim }}
              >
                {formatDistanceToNow(new Date(r.createdAt), {
                  addSuffix: true,
                })}
              </div>
            </div>
          ))}
        </div>

        {/* AI status */}
        <div
          className="flex items-center justify-between p-4 border"
          style={{
            borderColor: `${C.violet}28`,
            background: `${C.violet}06`,
          }}
        >
          <div className="flex items-center gap-3">
            <Cpu size={15} style={{ color: C.violet }} />
            <div>
              <div
                className="font-mono text-xs uppercase tracking-widest"
                style={{ color: C.violet }}
              >
                ETHOS Intelligence
              </div>
              <div
                className="font-mono text-[10px]"
                style={{ color: C.textDim }}
              >
                ethos-analysis-v2.4 · All reports analyzed
                automatically
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: C.violet }}
            />
            <span
              className="font-mono text-[10px] uppercase tracking-widest"
              style={{ color: C.violet }}
            >
              Operational
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Report Row ───────────────────────────────────────────────────────────────
function ReportRow({
  report,
  index,
  onClick,
}: {
  report: Report;
  index: number;
  onClick: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      onClick={() => onClick(report.id)}
      className="group flex items-stretch border-b cursor-pointer transition-colors hover:bg-white/[0.02] relative"
      style={{
        borderColor: C.border,
        opacity: report.voteCount < 0 ? 0.45 : 1,
      }}
    >
      {/* Priority stripe */}
      <div
        className="w-0.5 flex-shrink-0"
        style={{ background: PRIORITY[report.priority].stripe }}
      />

      {/* Vote column */}
      <div
        className="flex-shrink-0 w-12 flex flex-col items-center justify-center py-3 border-r gap-0.5"
        style={{ borderColor: C.border }}
      >
        <ChevronUp size={13} style={{ color: C.textDim }} />
        <span
          className="font-mono text-xs font-bold"
          style={{
            color: report.voteCount > 50 ? C.cyan : C.text,
          }}
        >
          {report.voteCount}
        </span>
        <ChevronDown size={13} style={{ color: C.textDim }} />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <StatusBadge status={report.status} size="xs" />
          <PriorityMark priority={report.priority} />
          <span
            className="font-mono text-[9px] uppercase tracking-widest"
            style={{ color: C.textDim }}
          >
            {report.category}
          </span>
          {report.isEscalated && (
            <span
              className="font-mono text-[9px] uppercase tracking-widest"
              style={{ color: C.rose }}
            >
              ↑ Escalated
            </span>
          )}
        </div>
        <div
          className="font-mono text-xs mb-1.5 line-clamp-1 group-hover:text-white transition-colors"
          style={{ color: C.text }}
        >
          {report.title}
        </div>
        <div
          className="flex flex-wrap items-center gap-3 font-mono text-[10px]"
          style={{ color: C.textDim }}
        >
          <span>{report.id}</span>
          <span>·</span>
          <span>{report.department}</span>
          {report.assignedTo && (
            <>
              <span>·</span>
              <span className="font-semibold" style={{ color: C.cyan }}>
                Assigned: {report.assignedTo}
              </span>
            </>
          )}
          {report.location && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <MapPin size={9} />
                {report.location.split("—")[0].trim()}
              </span>
            </>
          )}
          <span>·</span>
          <span>
            {formatDistanceToNow(new Date(report.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
      </div>

      {/* Right meta */}
      <div className="flex-shrink-0 flex flex-col items-end justify-center px-4 py-3 gap-1.5">
        <SLAChip
          deadline={report.slaDeadline}
          breached={report.slaBreached}
        />
        {report.aiAnalysis != null && (
          <AIChip
            confidence={report.aiAnalysis.categoryConfidence}
          />
        )}
        <span
          className="font-mono text-[9px]"
          style={{ color: C.textDim }}
        >
          {report.viewCount} views
        </span>
      </div>
    </motion.div>
  );
}

// ─── Reports View ─────────────────────────────────────────────────────────────
function ReportsView({
  reports,
  onDetail,
}: {
  reports: Report[];
  onDetail: (id: string) => void;
}) {
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [deptFilter, setDeptFilter] = useState<string>("ALL");
  const [assignFilter, setAssignFilter] = useState<"ALL" | "ASSIGNED" | "UNASSIGNED">("ALL");
  const [sort, setSort] = useState<SortOption>("NEW");
  const [search, setSearch] = useState("");

  const processed = useMemo(() => {
    let list = [...reports];
    if (filter !== "ALL")
      list = list.filter((r) => r.status === filter);
    if (deptFilter !== "ALL")
      list = list.filter((r) => r.department === deptFilter);
    if (assignFilter === "ASSIGNED")
      list = list.filter((r) => Boolean(r.assignedTo));
    else if (assignFilter === "UNASSIGNED")
      list = list.filter((r) => !r.assignedTo);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          (r.department && r.department.toLowerCase().includes(q)) ||
          (r.assignedTo && r.assignedTo.toLowerCase().includes(q)),
      );
    }
    if (sort === "NEW")
      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      );
    else if (sort === "TOP")
      list.sort((a, b) => b.voteCount - a.voteCount);
    else if (sort === "PRIORITY") {
      const pw: Record<Priority, number> = {
        CRITICAL: 4,
        HIGH: 3,
        MEDIUM: 2,
        LOW: 1,
      };
      list.sort((a, b) => pw[b.priority] - pw[a.priority]);
    } else if (sort === "STATUS") {
      const sw: Record<ReportStatus, number> = {
        REPORTED: 7,
        UNDER_REVIEW: 6,
        TRIAGED: 5,
        IN_PROGRESS: 4,
        PENDING_REVIEW: 3,
        RESOLVED: 2,
        REJECTED: 1,
        ARCHIVED: 0,
      };
      list.sort((a, b) => sw[b.status] - sw[a.status]);
    }
    return list;
  }, [reports, filter, deptFilter, assignFilter, sort, search]);

  const FILTERS: FilterStatus[] = [
    "ALL",
    "REPORTED",
    "TRIAGED",
    "IN_PROGRESS",
    "RESOLVED",
    "REJECTED",
  ];
  const SORTS: { id: SortOption; label: string }[] = [
    { id: "NEW", label: "Newest" },
    { id: "TOP", label: "Most Supported" },
    { id: "PRIORITY", label: "Priority" },
    { id: "STATUS", label: "Status" },
  ];

  return (
    <div
      className="flex-1 overflow-auto flex flex-col"
      style={{ background: C.bg }}
    >
      {/* Toolbar */}
      <div
        className="sticky top-0 z-10 border-b"
        style={{ background: C.bg, borderColor: C.border }}
      >
        <div className="flex items-center gap-3 px-6 py-3">
          <div className="flex-1 relative">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: C.textDim }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports, IDs, categories, assignees..."
              className="w-full pl-8 pr-4 py-2 font-mono text-xs border bg-transparent outline-none"
              style={{ borderColor: C.border, color: C.text }}
              onFocus={(e) => {
                e.target.style.borderColor = C.cyan;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = C.border;
              }}
            />
          </div>
          <div className="flex items-center gap-1">
            {SORTS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSort(s.id)}
                className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest border transition-all"
                style={{
                  borderColor:
                    sort === s.id ? C.cyan : C.border,
                  color: sort === s.id ? C.cyan : C.textSub,
                  background:
                    sort === s.id
                      ? `${C.cyan}0C`
                      : "transparent",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 px-6 pb-2.5 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex-shrink-0 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest border transition-all"
              style={{
                borderColor:
                  filter === f
                    ? f === "ALL"
                      ? C.cyan
                      : (STATUS[f as ReportStatus]?.color ??
                        C.cyan)
                    : C.border,
                color:
                  filter === f
                    ? f === "ALL"
                      ? C.cyan
                      : (STATUS[f as ReportStatus]?.color ??
                        C.cyan)
                    : C.textDim,
                background:
                  filter === f
                    ? f === "ALL"
                      ? `${C.cyan}0C`
                      : `${STATUS[f as ReportStatus]?.color}0C`
                    : "transparent",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Department & Assignment Secondary Filters */}
        <div
          className="flex flex-wrap items-center gap-3 px-6 py-2 border-t"
          style={{ borderColor: `${C.border}70`, background: `${C.surface}60` }}
        >
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: C.textDim }}>
              Department:
            </span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-2 py-0.5 font-mono text-[10px] border outline-none cursor-pointer"
              style={{
                borderColor: deptFilter !== "ALL" ? C.cyan : C.border,
                color: deptFilter !== "ALL" ? C.cyan : C.text,
                background: C.surface,
              }}
            >
              <option value="ALL">All Departments</option>
              <option value="Facilities & Operations">Facilities & Operations</option>
              <option value="Campus Safety">Campus Safety</option>
              <option value="IT Services">IT Services</option>
              <option value="Student Services">Student Services</option>
              <option value="Academic Affairs">Academic Affairs</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="font-mono text-[9px] uppercase tracking-widest mr-1" style={{ color: C.textDim }}>
              Investigator:
            </span>
            {(["ALL", "ASSIGNED", "UNASSIGNED"] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAssignFilter(a)}
                className="px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest border transition-all"
                style={{
                  borderColor: assignFilter === a ? C.cyan : C.border,
                  color: assignFilter === a ? C.cyan : C.textDim,
                  background: assignFilter === a ? `${C.cyan}0C` : "transparent",
                }}
              >
                {a === "ALL" ? "All" : a === "ASSIGNED" ? "Assigned" : "Unassigned"}
              </button>
            ))}
          </div>

          <span
            className="ml-auto font-mono text-[10px] flex-shrink-0"
            style={{ color: C.textDim }}
          >
            {processed.length} report{processed.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Column headers */}
      <div
        className="flex items-center px-4 py-2 border-b"
        style={{ borderColor: C.border }}
      >
        <div className="w-0.5 flex-shrink-0" />
        <div className="w-12 flex-shrink-0" />
        <div
          className="flex-1 font-mono text-[9px] uppercase tracking-widest px-4"
          style={{ color: C.textDim }}
        >
          Report
        </div>
        <div
          className="flex-shrink-0 w-32 font-mono text-[9px] uppercase tracking-widest text-right"
          style={{ color: C.textDim }}
        >
          SLA / AI
        </div>
      </div>

      {/* Report list */}
      <div className="flex-1">
        {processed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <FileText size={32} style={{ color: C.border2 }} />
            <p
              className="font-mono text-xs uppercase tracking-widest"
              style={{ color: C.textDim }}
            >
              No reports match current filters
            </p>
          </div>
        ) : (
          processed.map((r, i) => (
            <ReportRow
              key={r.id}
              report={r}
              index={i}
              onClick={onDetail}
            />
          ))
        )}
      </div>

      <div
        className="px-6 py-4 border-t font-mono text-[10px] uppercase tracking-widest text-center"
        style={{ borderColor: C.border, color: C.textDim }}
      >
        End of report feed · {processed.length} records
      </div>
    </div>
  );
}

// ─── Report Detail View (Case Workspace) ─────────────────────────────────────
function ReportDetailView({
  report: initialReport,
  onBack,
  onUpdateStatus,
  onUpdateReport,
  isAdmin,
}: {
  report: Report;
  onBack: () => void;
  onUpdateStatus: (id: string, s: ReportStatus) => void;
  onUpdateReport?: (updated: Report) => void;
  isAdmin: boolean;
}) {
  const [report, setReport] = useState<Report>(initialReport);

  useEffect(() => {
    setReport(initialReport);
  }, [initialReport]);

  const [internalNote, setInternalNote] = useState(
    report.internalNote ?? "",
  );
  const [localStatus, setLocalStatus] = useState<ReportStatus>(
    report.status,
  );
  const [votes, setVotes] = useState(report.voteCount);
  const [userVote, setUserVote] = useState<
    "up" | "down" | null
  >(null);
  const [detailTab, setDetailTab] = useState<"overview" | "communication" | "evidence" | "assignment" | "resolution" | "ai">("overview");

  const handleVote = (dir: "up" | "down") => {
    if (userVote === dir) {
      setVotes((v) => v + (dir === "up" ? -1 : 1));
      setUserVote(null);
    } else {
      const delta = userVote
        ? dir === "up"
          ? 2
          : -2
        : dir === "up"
          ? 1
          : -1;
      setVotes((v) => v + delta);
      setUserVote(dir);
    }
  };

  const handleStatusChange = (s: ReportStatus) => {
    setLocalStatus(s);
    onUpdateStatus(report.id, s);
    toast.success(`Status updated to ${STATUS[s].label}`);
  };

  const actorIcon = (type: string) => {
    if (type === "AI")
      return <Cpu size={11} style={{ color: C.violet }} />;
    if (type === "REPORTER")
      return <User size={11} style={{ color: C.textSub }} />;
    return <Shield size={11} style={{ color: C.cyan }} />;
  };

  return (
    <div
      className="flex-1 overflow-auto"
      style={{ background: C.bg }}
    >
      {/* Back nav */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b"
        style={{ background: C.bg, borderColor: C.border }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest transition-opacity hover:opacity-70"
          style={{ color: C.textSub }}
        >
          <ArrowLeft size={13} />
          Reports
        </button>
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-[10px]"
            style={{ color: C.textDim }}
          >
            {report.id}
          </span>
          <CopyBtn text={report.id} label="ID" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-0">
        {/* Primary column */}
        <div
          className="border-r px-8 py-6 space-y-7"
          style={{ borderColor: C.border }}
        >
          {/* Report header */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <StatusBadge status={localStatus} size="sm" />
              <PriorityMark priority={report.priority} />
              {report.isEscalated && (
                <span
                  className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 border"
                  style={{
                    color: C.rose,
                    borderColor: `${C.rose}30`,
                    background: `${C.rose}08`,
                  }}
                >
                  ↑ Escalated
                </span>
              )}
            </div>
            <h1
              className="font-serif text-2xl leading-snug mb-3"
              style={{ color: C.text }}
            >
              {report.title}
            </h1>
            <div
              className="flex flex-wrap gap-4 font-mono text-[10px]"
              style={{ color: C.textDim }}
            >
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {format(
                  new Date(report.createdAt),
                  "dd MMM yyyy, HH:mm",
                )}
              </span>
              <span className="flex items-center gap-1">
                <User size={10} />
                {report.anonymousId}
              </span>
              {report.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={10} />
                  {report.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Eye size={10} />
                {report.viewCount} views
              </span>
            </div>
          </div>

          <Divider />

          {/* Vote + description */}
          <div className="flex gap-6">
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => handleVote("up")}
                className="p-1.5 border transition-all"
                style={{
                  borderColor:
                    userVote === "up" ? C.cyan : C.border,
                  color: userVote === "up" ? C.cyan : C.textDim,
                  background:
                    userVote === "up"
                      ? `${C.cyan}0C`
                      : "transparent",
                }}
              >
                <ChevronUp size={14} />
              </button>
              <span
                className="font-mono text-sm font-bold"
                style={{ color: votes > 50 ? C.cyan : C.text }}
              >
                {votes}
              </span>
              <button
                onClick={() => handleVote("down")}
                className="p-1.5 border transition-all"
                style={{
                  borderColor:
                    userVote === "down" ? C.amber : C.border,
                  color:
                    userVote === "down" ? C.amber : C.textDim,
                  background:
                    userVote === "down"
                      ? `${C.amber}0C`
                      : "transparent",
                }}
              >
                <ChevronDown size={14} />
              </button>
              <span
                className="font-mono text-[9px] uppercase tracking-widest mt-1"
                style={{ color: C.textDim }}
              >
                support
              </span>
            </div>
            <div>
              <p
                className="font-mono text-sm leading-relaxed"
                style={{ color: C.textSub }}
              >
                {report.description}
              </p>
            </div>
          </div>

          {/* Detail Tabs */}
          <div className="flex border-b -mx-8 px-8" style={{ borderColor: C.border }}>
            {(isAdmin
              ? [
                  { id: "overview", label: "Overview" },
                  { id: "communication", label: "Messages" },
                  { id: "evidence", label: `Evidence (${report.evidence.length})` },
                  { id: "assignment", label: "Assignment" },
                  { id: "resolution", label: "Resolution" },
                  { id: "ai", label: "AI Analysis" },
                ] as const
              : [
                  { id: "overview", label: "Overview" },
                  { id: "evidence", label: `Evidence (${report.evidence.length})` },
                ] as const
            ).map(tab => (
              <button
                key={tab.id}
                onClick={() => setDetailTab(tab.id as typeof detailTab)}
                className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest border-b-2 transition-all"
                style={{
                  borderBottomColor: detailTab === tab.id ? C.cyan : "transparent",
                  color: detailTab === tab.id ? C.cyan : C.textDim,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {detailTab === "overview" && (
            <div className="space-y-4">
              {/* Internal note (admin) */}
              {isAdmin && (
            <div>
              <div
                className="font-mono text-[10px] uppercase tracking-widest mb-2"
                style={{ color: C.textDim }}
              >
                Internal Note (Admin only)
              </div>
              <textarea
                value={internalNote}
                onChange={(e) =>
                  setInternalNote(e.target.value)
                }
                rows={3}
                placeholder="Add an internal note visible only to administrators..."
                className="w-full px-4 py-3 font-mono text-xs border bg-transparent outline-none resize-none transition-all"
                style={{ borderColor: C.border, color: C.text }}
                onFocus={(e) => {
                  e.target.style.borderColor = C.cyan;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = C.border;
                }}
              />
              <button
                onClick={() => toast.success("Note saved")}
                className="mt-2 flex items-center gap-2 px-4 py-1.5 font-mono text-xs uppercase tracking-widest"
                style={{
                  background: C.surface2,
                  color: C.textSub,
                  border: `1px solid ${C.border}`,
                }}
              >
                <Check size={11} /> Save Note
              </button>
            </div>
          )}
            </div>
          )}

          {detailTab === "communication" && isAdmin && (
            <div className="space-y-6">
              <CaseCommunication caseId={report.id} isAdmin={true} />
              <InternalNotesPanel caseId={report.id} />
            </div>
          )}

          {detailTab === "evidence" && (
            <EvidenceWorkspace evidence={report.evidence} caseId={report.id} isAdmin={isAdmin} />
          )}

          {detailTab === "assignment" && isAdmin && (
            <CaseAssignment
              caseId={report.id}
              assignment={report.assignment}
              currentDepartment={report.department}
              onAssigned={(updatedReport) => {
                setReport(updatedReport);
                onUpdateReport?.(updatedReport);
              }}
            />
          )}

          {detailTab === "resolution" && isAdmin && (
            <div className="space-y-4">
              <ResolutionForm
                caseId={report.id}
                onResolved={() => handleStatusChange("RESOLVED")}
                onClose={() => setDetailTab("overview")}
              />
            </div>
          )}

          {detailTab === "ai" && report.aiAnalysis && isAdmin && (
            <AIOverridePanel
              ai={report.aiAnalysis}
              overrides={[]}
              caseId={report.id}
              onOverride={() => {}}
              departments={["Campus Safety", "Facilities Management", "IT Services", "Student Services", "Academic Affairs"]}
              categories={["Academic Misconduct", "Discrimination", "Facilities", "Harassment", "Safety", "Other"]}
            />
          )}
        </div>

        {/* Right column: metadata + AI + audit */}
        <div className="flex flex-col">
          {/* Case metadata */}
          <div
            className="px-5 py-5 border-b"
            style={{ borderColor: C.border }}
          >
            <div
              className="font-mono text-[10px] uppercase tracking-widest mb-4"
              style={{ color: C.textDim }}
            >
              Case Metadata
            </div>
            <div className="space-y-3">
              {[
                { label: "Category", value: report.category },
                {
                  label: "Department",
                  value: report.department,
                },
                {
                  label: "Reporter",
                  value: report.anonymousId,
                },
                {
                  label: "Assigned To",
                  value: report.assignedTo ?? "Unassigned",
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex justify-between items-start gap-2"
                >
                  <span
                    className="font-mono text-[10px] uppercase tracking-widest"
                    style={{ color: C.textDim }}
                  >
                    {row.label}
                  </span>
                  <span
                    className="font-mono text-[10px] text-right"
                    style={{ color: C.text }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-start">
                <span
                  className="font-mono text-[10px] uppercase tracking-widest"
                  style={{ color: C.textDim }}
                >
                  SLA
                </span>
                <SLAChip
                  deadline={report.slaDeadline}
                  breached={report.slaBreached}
                />
              </div>
            </div>

            {isAdmin && (
              <div
                className="mt-4 pt-4 border-t"
                style={{ borderColor: C.border }}
              >
                <div
                  className="font-mono text-[10px] uppercase tracking-widest mb-2"
                  style={{ color: C.textDim }}
                >
                  Update Status
                </div>
                <select
                  value={localStatus}
                  onChange={(e) =>
                    handleStatusChange(
                      e.target.value as ReportStatus,
                    )
                  }
                  className="w-full px-3 py-2 font-mono text-xs border bg-transparent outline-none"
                  style={{
                    borderColor: C.border,
                    color: C.text,
                  }}
                >
                  {(Object.keys(STATUS) as ReportStatus[]).map(
                    (s) => (
                      <option
                        key={s}
                        value={s}
                        style={{ background: C.surface2 }}
                      >
                        {STATUS[s].label}
                      </option>
                    ),
                  )}
                </select>
              </div>
            )}
          </div>

          {/* AI Analysis */}
          <div
            className="px-5 py-5 border-b"
            style={{ borderColor: C.border }}
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className="font-mono text-[10px] uppercase tracking-widest"
                style={{ color: C.textDim }}
              >
                ETHOS Intelligence
              </div>
              <span
                className="font-mono text-[9px] uppercase tracking-widest"
                style={{ color: C.violet }}
              >
                v2.4
              </span>
            </div>
            {report.aiAnalysis == null ? (
              <div
                className="font-mono text-[10px] text-center py-4"
                style={{ color: C.textDim }}
              >
                AI analysis not available for this report.
              </div>
            ) : (
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between mb-1">
                  <span
                    className="font-mono text-[10px]"
                    style={{ color: C.textDim }}
                  >
                    Category confidence
                  </span>
                  <span
                    className="font-mono text-[10px] font-bold"
                    style={{ color: C.violet }}
                  >
                    {Math.round(
                      report.aiAnalysis.categoryConfidence *
                        100,
                    )}
                    %
                  </span>
                </div>
                <div
                  className="h-1"
                  style={{ background: C.border }}
                >
                  <div
                    className="h-full"
                    style={{
                      width: `${report.aiAnalysis.categoryConfidence * 100}%`,
                      background: C.violet,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span
                    className="font-mono text-[10px]"
                    style={{ color: C.textDim }}
                  >
                    Severity score
                  </span>
                  <span
                    className="font-mono text-[10px] font-bold"
                    style={{
                      color:
                        report.aiAnalysis.severity >= 7
                          ? C.rose
                          : report.aiAnalysis.severity >= 4
                            ? C.amber
                            : C.emerald,
                    }}
                  >
                    {report.aiAnalysis.severity}/10
                  </span>
                </div>
                <div
                  className="h-1"
                  style={{ background: C.border }}
                >
                  <div
                    className="h-full"
                    style={{
                      width: `${report.aiAnalysis.severity * 10}%`,
                      background:
                        report.aiAnalysis.severity >= 7
                          ? C.rose
                          : report.aiAnalysis.severity >= 4
                            ? C.amber
                            : C.emerald,
                    }}
                  />
                </div>
              </div>
              {[
                {
                  label: "Sentiment",
                  value: report.aiAnalysis.sentiment,
                },
                {
                  label: "SLA Breach Risk",
                  value: report.aiAnalysis.slaBreachRisk,
                },
                {
                  label: "Spam Score",
                  value: `${Math.round(report.aiAnalysis.spamScore * 100)}%`,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex justify-between"
                >
                  <span
                    className="font-mono text-[10px]"
                    style={{ color: C.textDim }}
                  >
                    {row.label}
                  </span>
                  <span
                    className="font-mono text-[10px]"
                    style={{
                      color:
                        row.value === "HIGH"
                          ? C.rose
                          : row.value === "MEDIUM"
                            ? C.amber
                            : C.textSub,
                    }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
              {report.aiAnalysis.isDuplicate && (
                <div
                  className="p-2.5 border"
                  style={{
                    borderColor: `${C.amber}30`,
                    background: `${C.amber}08`,
                  }}
                >
                  <div
                    className="font-mono text-[9px] uppercase tracking-widest"
                    style={{ color: C.amber }}
                  >
                    ⚠ Potential duplicate of{" "}
                    {report.aiAnalysis.duplicateOf}
                  </div>
                </div>
              )}
              <div
                className="p-2.5 border"
                style={{
                  borderColor: C.border,
                  background: C.surface,
                }}
              >
                <div
                  className="font-mono text-[9px] uppercase tracking-widest mb-1"
                  style={{ color: C.textDim }}
                >
                  AI Recommendation
                </div>
                <p
                  className="font-mono text-[10px] leading-relaxed"
                  style={{ color: C.textSub }}
                >
                  {report.aiAnalysis.recommendation}
                </p>
              </div>
              <div
                className="font-mono text-[9px]"
                style={{ color: C.textDim }}
              >
                Processed{" "}
                {formatDistanceToNow(
                  new Date(report.aiAnalysis.processedAt),
                  { addSuffix: true },
                )}{" "}
                · AI decisions are advisory only
              </div>
            </div>
            )}
          </div>

          {/* Audit trail */}
          <div className="px-5 py-5 flex-1">
            <div
              className="font-mono text-[10px] uppercase tracking-widest mb-4"
              style={{ color: C.textDim }}
            >
              Audit Trail
            </div>
            <div className="space-y-3">
              {report.auditEvents.map((ev, i) => (
                <div key={ev.id} className="flex gap-3">
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div
                      className="w-6 h-6 flex items-center justify-center border"
                      style={{
                        borderColor: C.border2,
                        background: C.surface2,
                      }}
                    >
                      {actorIcon(ev.actorType)}
                    </div>
                    {i < report.auditEvents.length - 1 && (
                      <div
                        className="w-px flex-1 min-h-[12px]"
                        style={{ background: C.border }}
                      />
                    )}
                  </div>
                  <div className="pb-3 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span
                        className="font-mono text-[9px] uppercase tracking-widest font-bold"
                        style={{
                          color:
                            ev.actorType === "AI"
                              ? C.violet
                              : ev.actorType === "REPORTER"
                                ? C.textSub
                                : C.cyan,
                        }}
                      >
                        {ev.actorType === "AI"
                          ? "ETHOS AI"
                          : ev.actorType === "REPORTER"
                            ? "Reporter"
                            : "Admin"}
                      </span>
                      <span
                        className="font-mono text-[9px]"
                        style={{ color: C.textDim }}
                      >
                        {format(
                          new Date(ev.timestamp),
                          "dd MMM, HH:mm",
                        )}
                      </span>
                    </div>
                    <p
                      className="font-mono text-[10px] leading-relaxed mt-0.5"
                      style={{ color: C.textSub }}
                    >
                      {ev.detail}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <span
                        className="font-mono text-[9px]"
                        style={{ color: C.textDim }}
                      >
                        #{ev.hash}
                      </span>
                      <CopyBtn text={ev.hash} label="hash" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Submit Report View ───────────────────────────────────────────────────────
const CATEGORIES_LIST = [
  "Technology",
  "Safety",
  "Facilities",
  "Transportation",
  "Infrastructure",
  "Student Wellbeing",
  "Academic",
  "Policy",
  "Financial",
];
const DEPTS_LIST = [
  "IT Services",
  "Campus Safety",
  "Facilities Management",
  "Campus Operations",
  "Student Services",
  "Academic Affairs",
  "Finance",
];
const URGENCIES = [
  {
    value: "LOW",
    label: "Low",
    desc: "General issue, no immediate impact",
  },
  {
    value: "MEDIUM",
    label: "Medium",
    desc: "Affects regular operations",
  },
  {
    value: "HIGH",
    label: "High",
    desc: "Significant disruption to many people",
  },
  {
    value: "CRITICAL",
    label: "Critical",
    desc: "Immediate safety or security risk",
  },
];

function SubmitReportView({
  onBack,
  onSubmit,
}: {
  onBack: () => void;
  onSubmit: (r: Partial<Report>) => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    category: "",
    department: "",
    title: "",
    description: "",
    location: "",
    urgency: "MEDIUM",
  });
  const [trackingCode] = useState(
    () =>
      `TRK-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
  );

  const set = (k: string, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const STEPS = [
    "Category",
    "Details",
    "Evidence",
    "Privacy",
    "Submitted",
  ];

  const handleSubmit = () => {
    onSubmit({
      title: form.title,
      description: form.description,
      category: form.category,
      department: form.department,
      location: form.location,
      priority: form.urgency as Priority,
      status: "REPORTED",
      voteCount: 1,
      isEscalated: form.urgency === "CRITICAL",
    });
    setStep(4);
    toast.success(
      "Report submitted. Track with your anonymous code.",
    );
  };

  return (
    <div
      className="flex-1 overflow-auto"
      style={{ background: C.bg }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b"
        style={{ background: C.bg, borderColor: C.border }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest transition-opacity hover:opacity-70"
          style={{ color: C.textSub }}
        >
          <ArrowLeft size={13} /> Reports
        </button>
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <div
                className="w-5 h-5 flex items-center justify-center font-mono text-[10px] border"
                style={{
                  borderColor: i <= step ? C.cyan : C.border,
                  color:
                    i < step
                      ? C.bg
                      : i === step
                        ? C.cyan
                        : C.textDim,
                  background: i < step ? C.cyan : "transparent",
                }}
              >
                {i < step ? <Check size={10} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="w-4 h-px"
                  style={{
                    background: i < step ? C.cyan : C.border,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {step === 0 && (
          <div>
            <h2
              className="font-serif text-2xl mb-1.5"
              style={{ color: C.text }}
            >
              Select Category
            </h2>
            <p
              className="font-mono text-xs mb-6"
              style={{ color: C.textSub }}
            >
              Choose the most relevant category. ETHOS
              Intelligence will refine this automatically.
            </p>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {CATEGORIES_LIST.map((cat) => (
                <button
                  key={cat}
                  onClick={() => set("category", cat)}
                  className="p-4 border text-left transition-all"
                  style={{
                    borderColor:
                      form.category === cat ? C.cyan : C.border,
                    background:
                      form.category === cat
                        ? `${C.cyan}0C`
                        : C.surface,
                    color:
                      form.category === cat ? C.cyan : C.text,
                  }}
                >
                  <div className="font-mono text-xs">{cat}</div>
                </button>
              ))}
            </div>
            {form.category && (
              <div>
                <div
                  className="font-mono text-[10px] uppercase tracking-widest mb-2"
                  style={{ color: C.textDim }}
                >
                  Routing Department
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {DEPTS_LIST.map((d) => (
                    <button
                      key={d}
                      onClick={() => set("department", d)}
                      className="px-4 py-2.5 border text-left font-mono text-xs transition-all"
                      style={{
                        borderColor:
                          form.department === d
                            ? C.cyan
                            : C.border,
                        color:
                          form.department === d
                            ? C.cyan
                            : C.textSub,
                        background:
                          form.department === d
                            ? `${C.cyan}0C`
                            : "transparent",
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2
                className="font-serif text-2xl mb-1.5"
                style={{ color: C.text }}
              >
                Report Details
              </h2>
              <p
                className="font-mono text-xs"
                style={{ color: C.textSub }}
              >
                Provide a clear, factual description. Your
                identity is not attached to this submission.
              </p>
            </div>
            <div>
              <label
                className="block font-mono text-[10px] uppercase tracking-widest mb-2"
                style={{ color: C.textDim }}
              >
                Report title ({form.title.length}/80)
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) =>
                  set("title", e.target.value.slice(0, 80))
                }
                placeholder="Concisely describe the issue..."
                className="w-full px-4 py-3 font-mono text-sm border bg-transparent outline-none transition-all"
                style={{ borderColor: C.border, color: C.text }}
                onFocus={(e) => {
                  e.target.style.borderColor = C.cyan;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = C.border;
                }}
                autoFocus
              />
            </div>
            <div>
              <label
                className="block font-mono text-[10px] uppercase tracking-widest mb-2"
                style={{ color: C.textDim }}
              >
                Detailed description ({form.description.length}
                /1000)
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  set(
                    "description",
                    e.target.value.slice(0, 1000),
                  )
                }
                rows={6}
                placeholder="Describe the context, timeline, scope of impact, and any prior actions taken..."
                className="w-full px-4 py-3 font-mono text-sm border bg-transparent outline-none resize-none transition-all leading-relaxed"
                style={{ borderColor: C.border, color: C.text }}
                onFocus={(e) => {
                  e.target.style.borderColor = C.cyan;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = C.border;
                }}
              />
            </div>
            <div>
              <label
                className="block font-mono text-[10px] uppercase tracking-widest mb-2"
                style={{ color: C.textDim }}
              >
                Location / Context (optional)
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) =>
                  set("location", e.target.value)
                }
                placeholder="Building name, floor, room number..."
                className="w-full px-4 py-3 font-mono text-sm border bg-transparent outline-none transition-all"
                style={{ borderColor: C.border, color: C.text }}
                onFocus={(e) => {
                  e.target.style.borderColor = C.cyan;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = C.border;
                }}
              />
            </div>
            <div>
              <label
                className="block font-mono text-[10px] uppercase tracking-widest mb-2"
                style={{ color: C.textDim }}
              >
                Urgency indicator
              </label>
              <div className="grid grid-cols-2 gap-2">
                {URGENCIES.map((u) => (
                  <button
                    key={u.value}
                    onClick={() => set("urgency", u.value)}
                    className="p-3 border text-left transition-all"
                    style={{
                      borderColor:
                        form.urgency === u.value
                          ? PRIORITY[u.value as Priority].color
                          : C.border,
                      background:
                        form.urgency === u.value
                          ? `${PRIORITY[u.value as Priority].color}0C`
                          : "transparent",
                    }}
                  >
                    <div
                      className="font-mono text-xs font-bold mb-0.5"
                      style={{
                        color:
                          PRIORITY[u.value as Priority].color,
                      }}
                    >
                      {u.label}
                    </div>
                    <div
                      className="font-mono text-[10px]"
                      style={{ color: C.textDim }}
                    >
                      {u.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2
                className="font-serif text-2xl mb-1.5"
                style={{ color: C.text }}
              >
                Evidence & Attachments
              </h2>
              <p
                className="font-mono text-xs"
                style={{ color: C.textSub }}
              >
                Attach supporting files, screenshots, or links.
                Attachments strengthen your report but are
                optional.
              </p>
            </div>
            <div
              className="border-2 border-dashed flex flex-col items-center justify-center py-16 gap-3 transition-colors"
              style={{ borderColor: C.border2 }}
            >
              <Paperclip
                size={28}
                style={{ color: C.textDim }}
              />
              <div
                className="font-mono text-xs uppercase tracking-widest"
                style={{ color: C.textDim }}
              >
                Drag files here or click to select
              </div>
              <div
                className="font-mono text-[10px]"
                style={{ color: C.textDim }}
              >
                Images, PDFs, documents — max 20 MB per file
              </div>
              <button
                className="px-4 py-2 border font-mono text-xs uppercase tracking-widest transition-opacity hover:opacity-70"
                style={{
                  borderColor: C.border2,
                  color: C.textSub,
                }}
              >
                Browse Files
              </button>
            </div>
            <div
              className="p-3 border"
              style={{
                borderColor: C.border,
                background: C.surface,
              }}
            >
              <div className="flex items-start gap-2.5">
                <Info
                  size={13}
                  className="flex-shrink-0 mt-0.5"
                  style={{ color: C.textDim }}
                />
                <p
                  className="font-mono text-[10px] leading-relaxed"
                  style={{ color: C.textDim }}
                >
                  ETHOS Intelligence automatically screens
                  evidence for sensitive information and
                  verifies file integrity. Metadata is stripped
                  to prevent identity exposure.
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2
                className="font-serif text-2xl mb-1.5"
                style={{ color: C.text }}
              >
                Privacy & Submission
              </h2>
              <p
                className="font-mono text-xs"
                style={{ color: C.textSub }}
              >
                Review your submission and understand how your
                anonymity is protected.
              </p>
            </div>
            <div
              className="border p-5 space-y-3"
              style={{
                borderColor: `${C.cyan}28`,
                background: `${C.cyan}06`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Info size={14} style={{ color: C.cyan }} />
                <span
                  className="font-mono text-xs uppercase tracking-widest"
                  style={{ color: C.cyan }}
                >
                  Anonymity guarantee
                </span>
              </div>
              {[
                "Your submission is cryptographically separated from your identity.",
                "No IP addresses or device identifiers are stored with your report.",
                "Your verified membership does not link to anonymous submissions.",
                "AI processing operates on report content only, not identity data.",
                "Administrators see only the anonymous identifier assigned at submission.",
              ].map((point) => (
                <div
                  key={point}
                  className="flex items-start gap-2.5"
                >
                  <Check
                    size={11}
                    className="flex-shrink-0 mt-0.5"
                    style={{ color: C.emerald }}
                  />
                  <p
                    className="font-mono text-[11px] leading-relaxed"
                    style={{ color: C.textSub }}
                  >
                    {point}
                  </p>
                </div>
              ))}
            </div>
            {/* Summary */}
            <div
              className="border p-5 space-y-2"
              style={{
                borderColor: C.border,
                background: C.surface,
              }}
            >
              <div
                className="font-mono text-[10px] uppercase tracking-widest mb-3"
                style={{ color: C.textDim }}
              >
                Submission Summary
              </div>
              {[
                { label: "Category", value: form.category },
                { label: "Department", value: form.department },
                { label: "Urgency", value: form.urgency },
                { label: "Title", value: form.title },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex justify-between"
                >
                  <span
                    className="font-mono text-[10px]"
                    style={{ color: C.textDim }}
                  >
                    {row.label}
                  </span>
                  <span
                    className="font-mono text-[10px]"
                    style={{ color: C.text }}
                  >
                    {row.value || "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="text-center py-8 space-y-5">
            <div
              className="w-14 h-14 mx-auto flex items-center justify-center border"
              style={{
                borderColor: `${C.emerald}28`,
                background: `${C.emerald}0C`,
              }}
            >
              <CheckCircle2
                size={28}
                style={{ color: C.emerald }}
              />
            </div>
            <div
              className="font-serif text-2xl"
              style={{ color: C.text }}
            >
              Report submitted
            </div>
            <p
              className="font-mono text-sm"
              style={{ color: C.textSub }}
            >
              Your report is being processed by ETHOS
              Intelligence and will be routed to the appropriate
              department.
            </p>
            <div
              className="inline-block border p-5 text-left mx-auto"
              style={{
                borderColor: C.border,
                background: C.surface,
              }}
            >
              <div
                className="font-mono text-[10px] uppercase tracking-widest mb-2"
                style={{ color: C.textDim }}
              >
                Anonymous Tracking Code
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="font-mono text-lg font-bold"
                  style={{ color: C.cyan }}
                >
                  {trackingCode}
                </span>
                <CopyBtn
                  text={trackingCode}
                  label="tracking code"
                />
              </div>
              <p
                className="font-mono text-[10px] mt-2"
                style={{ color: C.textDim }}
              >
                Save this code to monitor your report status. It
                cannot be recovered.
              </p>
            </div>
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-5 py-2.5 font-mono text-xs uppercase tracking-widest mx-auto"
              style={{ background: C.cyan, color: C.bg }}
            >
              Return to Reports
            </button>
          </div>
        )}

        {step < 4 && (
          <div
            className="flex items-center justify-between mt-10 pt-6 border-t"
            style={{ borderColor: C.border }}
          >
            <button
              onClick={() =>
                step === 0 ? onBack() : setStep((s) => s - 1)
              }
              className="font-mono text-xs uppercase tracking-widest transition-opacity hover:opacity-70"
              style={{ color: C.textSub }}
            >
              {step === 0 ? "Cancel" : "← Back"}
            </button>
            <button
              onClick={() =>
                step === 3
                  ? handleSubmit()
                  : setStep((s) => s + 1)
              }
              disabled={
                step === 0
                  ? !form.category || !form.department
                  : step === 1
                    ? !form.title || !form.description
                    : false
              }
              className="flex items-center gap-2 px-6 py-2.5 font-mono text-xs uppercase tracking-widest transition-opacity disabled:opacity-40 hover:opacity-90"
              style={{ background: C.cyan, color: C.bg }}
            >
              {step === 3 ? "Submit Report" : "Continue"}
              {step < 3 && <ArrowRight size={13} />}
              {step === 3 && <Send size={13} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── My Activity View ─────────────────────────────────────────────────────────
function MyActivityView({
  tracked,
  onDetail,
}: {
  tracked: TrackedReport[];
  onDetail: (id: string) => void;
}) {
  const [lookupCode, setLookupCode] = useState("");

  return (
    <div
      className="flex-1 overflow-auto"
      style={{ background: C.bg }}
    >
      <div
        className="px-8 py-6 border-b"
        style={{ borderColor: C.border }}
      >
        <div
          className="font-mono text-[10px] uppercase tracking-widest mb-1"
          style={{ color: C.textDim }}
        >
          Anonymous Session
        </div>
        <h1
          className="font-serif text-2xl mb-1"
          style={{ color: C.text }}
        >
          My Activity
        </h1>
        <p
          className="font-mono text-xs"
          style={{ color: C.textSub }}
        >
          Track your anonymous submissions using your tracking
          codes. No identity is stored.
        </p>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Lookup */}
        <div
          className="border p-5"
          style={{
            borderColor: C.border,
            background: C.surface,
          }}
        >
          <div
            className="font-mono text-[10px] uppercase tracking-widest mb-3"
            style={{ color: C.textDim }}
          >
            Look Up a Report
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value)}
              placeholder="Enter tracking code (e.g. TRK-F8X2K9Q1)"
              className="flex-1 px-4 py-2.5 font-mono text-xs border bg-transparent outline-none transition-all"
              style={{ borderColor: C.border, color: C.text }}
              onFocus={(e) => {
                e.target.style.borderColor = C.cyan;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = C.border;
              }}
            />
            <button
              onClick={async () => {
                const code = lookupCode.trim();
                if (!code) return;
                try {
                  const res = await trackIssue(code);
                  const [mapped] = mapIssuePage([res]);
                  setReports((prev) => {
                    const exists = prev.some((r) => r.id === mapped.id);
                    return exists ? prev.map((r) => (r.id === mapped.id ? mapped : r)) : [mapped, ...prev];
                  });
                  onDetail(mapped.id);
                  toast.success(`Found complaint: ${mapped.title}`);
                } catch {
                  toast.error(`No complaint found for tracking code "${code}".`);
                }
              }}
              className="px-4 py-2.5 font-mono text-xs uppercase tracking-widest flex items-center gap-2"
              style={{ background: C.cyan, color: C.bg }}
            >
              <Search size={13} /> Look Up
            </button>
          </div>
        </div>

        {/* Tracked list */}
        <div>
          <div
            className="font-mono text-[10px] uppercase tracking-widest mb-3"
            style={{ color: C.textDim }}
          >
            Reports in This Session ({tracked.length})
          </div>
          {tracked.length === 0 ? (
            <div
              className="flex flex-col items-center py-16 gap-3"
              style={{ border: `1px solid ${C.border}` }}
            >
              <Activity
                size={28}
                style={{ color: C.border2 }}
              />
              <p
                className="font-mono text-xs uppercase tracking-widest"
                style={{ color: C.textDim }}
              >
                No tracked reports yet
              </p>
            </div>
          ) : (
            <div
              className="space-y-0 border"
              style={{ borderColor: C.border }}
            >
              {tracked.map((t) => (
                <div
                  key={t.reportId}
                  onClick={() => onDetail(t.reportId)}
                  className="group flex items-center gap-5 px-5 py-4 border-b last:border-b-0 cursor-pointer transition-colors hover:bg-white/[0.02]"
                  style={{ borderColor: C.border }}
                >
                  <StatusBadge status={t.status} size="xs" />
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-mono text-xs mb-0.5 group-hover:text-white transition-colors truncate"
                      style={{ color: C.text }}
                    >
                      {t.title}
                    </div>
                    <div
                      className="font-mono text-[10px] flex items-center gap-2"
                      style={{ color: C.textDim }}
                    >
                      <span>{t.reportId}</span>
                      <span>·</span>
                      <span
                        className="font-bold"
                        style={{ color: C.cyan }}
                      >
                        {t.trackingCode}
                      </span>
                      <CopyBtn
                        text={t.trackingCode}
                        label="code"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {t.hasNewUpdate && (
                      <span
                        className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5"
                        style={{
                          background: `${C.cyan}14`,
                          color: C.cyan,
                        }}
                      >
                        Update
                      </span>
                    )}
                    <span
                      className="font-mono text-[10px]"
                      style={{ color: C.textDim }}
                    >
                      Updated{" "}
                      {formatDistanceToNow(
                        new Date(t.lastUpdate),
                        { addSuffix: true },
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="border p-4"
          style={{
            borderColor: C.border,
            background: `${C.violet}06`,
          }}
        >
          <div className="flex items-start gap-3">
            <Info
              size={13}
              className="flex-shrink-0 mt-0.5"
              style={{ color: C.violet }}
            />
            <p
              className="font-mono text-[10px] leading-relaxed"
              style={{ color: C.textDim }}
            >
              Activity is stored locally in this browser session
              only. Tracking codes are the only link to your
              submissions. If you clear your browser data, this
              history will be lost — but your tracking codes
              remain valid for lookups.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Insights View ────────────────────────────────────────────────────────────
function InsightsView({ reports }: { reports: Report[] }) {
  const statusCounts: Partial<Record<ReportStatus, number>> =
    {};
  reports.forEach((r) => {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  });
  const statusData = Object.entries(statusCounts).map(
    ([name, value]) => ({
      name: STATUS[name as ReportStatus].label,
      value,
      color: STATUS[name as ReportStatus].color,
    }),
  );

  const priorityCounts: Partial<Record<Priority, number>> = {};
  reports.forEach((r) => {
    priorityCounts[r.priority] =
      (priorityCounts[r.priority] || 0) + 1;
  });
  const priorityData = Object.entries(priorityCounts).map(
    ([name, count]) => ({
      name,
      count,
      color: PRIORITY[name as Priority].color,
    }),
  );

  const deptCounts: Record<string, number> = {};
  reports.forEach((r) => {
    deptCounts[r.department] =
      (deptCounts[r.department] || 0) + 1;
  });
  const deptData = Object.entries(deptCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name: name.split(" ")[0],
      count,
    }));

  const resolved = reports.filter(
    (r) => r.status === "RESOLVED",
  ).length;
  const slaOk = reports.filter((r) => !r.slaBreached).length;
  const escalated = reports.filter((r) => r.isEscalated).length;
  const avgVotes = Math.round(
    reports.reduce((a, r) => a + r.voteCount, 0) /
      Math.max(reports.length, 1),
  );

  const TooltipStyle = {
    background: C.surface2,
    border: `1px solid ${C.border2}`,
    fontFamily: "IBM Plex Mono, monospace",
    fontSize: 11,
    color: C.text,
  };

  return (
    <div
      className="flex-1 overflow-auto"
      style={{ background: C.bg }}
    >
      <div
        className="px-8 py-6 border-b"
        style={{ borderColor: C.border }}
      >
        <div
          className="font-mono text-[10px] uppercase tracking-widest mb-1"
          style={{ color: C.textDim }}
        >
          Organization Analytics
        </div>
        <h1
          className="font-serif text-2xl"
          style={{ color: C.text }}
        >
          Insights
        </h1>
        <p
          className="font-mono text-xs mt-1"
          style={{ color: C.textSub }}
        >
          Accountability-focused metrics. Updated in real time.
        </p>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Resolution Rate",
              value: `${Math.round((resolved / Math.max(reports.length, 1)) * 100)}%`,
              color: C.emerald,
            },
            {
              label: "SLA Compliance",
              value: `${Math.round((slaOk / Math.max(reports.length, 1)) * 100)}%`,
              color: C.cyan,
            },
            {
              label: "Escalated",
              value: escalated,
              color: C.rose,
            },
            {
              label: "Avg. Community Support",
              value: avgVotes,
              color: C.amber,
            },
          ].map((m) => (
            <div
              key={m.label}
              className="p-5 border"
              style={{
                background: C.surface,
                borderColor: C.border,
              }}
            >
              <div
                className="font-mono text-2xl font-bold mb-1"
                style={{ color: m.color }}
              >
                {m.value}
              </div>
              <div
                className="font-mono text-[10px] uppercase tracking-widest"
                style={{ color: C.textDim }}
              >
                {m.label}
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Status distribution */}
          <div
            className="p-5 border"
            style={{
              background: C.surface,
              borderColor: C.border,
            }}
          >
            <div
              className="font-mono text-[10px] uppercase tracking-widest mb-4"
              style={{ color: C.textDim }}
            >
              Status Distribution
            </div>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {statusData.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center gap-2"
                  >
                    <div
                      className="w-2 h-2 flex-shrink-0"
                      style={{ background: s.color }}
                    />
                    <span
                      className="font-mono text-[10px]"
                      style={{ color: C.textSub }}
                    >
                      {s.name}
                    </span>
                    <span
                      className="font-mono text-[10px] font-bold ml-auto"
                      style={{ color: C.text }}
                    >
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Department workload */}
          <div
            className="p-5 border"
            style={{
              background: C.surface,
              borderColor: C.border,
            }}
          >
            <div
              className="font-mono text-[10px] uppercase tracking-widest mb-4"
              style={{ color: C.textDim }}
            >
              Department Workload
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart
                data={deptData}
                margin={{
                  top: 0,
                  right: 0,
                  left: -24,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={C.border}
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{
                    fill: C.textDim,
                    fontSize: 10,
                    fontFamily: "IBM Plex Mono",
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{
                    fill: C.textDim,
                    fontSize: 10,
                    fontFamily: "IBM Plex Mono",
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={TooltipStyle} />
                <Bar
                  dataKey="count"
                  fill={C.cyan}
                  name="Reports"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority breakdown */}
        <div
          className="border p-5"
          style={{
            borderColor: C.border,
            background: C.surface,
          }}
        >
          <div
            className="font-mono text-[10px] uppercase tracking-widest mb-4"
            style={{ color: C.textDim }}
          >
            Priority Breakdown
          </div>
          <div className="flex gap-6">
            {priorityData.map((p) => (
              <div key={p.name} className="flex-1">
                <div
                  className="font-mono text-xl font-bold mb-0.5"
                  style={{ color: p.color }}
                >
                  {p.count}
                </div>
                <div
                  className="font-mono text-[10px] uppercase tracking-widest"
                  style={{ color: C.textDim }}
                >
                  {p.name}
                </div>
                <div
                  className="mt-2 h-1"
                  style={{ background: C.border }}
                >
                  <div
                    className="h-full"
                    style={{
                      width: `${(p.count / reports.length) * 100}%`,
                      background: p.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="p-4 border"
          style={{
            borderColor: C.border,
            background: C.surface,
          }}
        >
          <div
            className="font-mono text-[10px] uppercase tracking-widest mb-1"
            style={{ color: C.textDim }}
          >
            Data Notice
          </div>
          <p
            className="font-mono text-[10px] leading-relaxed"
            style={{ color: C.textDim }}
          >
            All analytics are aggregated and anonymized. No
            individual reporter data is visible in this view.
            Metrics reflect reports within the current
            organization space only.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Console View ───────────────────────────────────────────────────────
function AdminConsoleView({
  reports,
  onDetail,
  onUpdateStatus,
}: {
  reports: Report[];
  onDetail: (id: string) => void;
  onUpdateStatus: (id: string, s: ReportStatus) => void;
}) {
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(
    reports[0]?.id ?? null,
  );

  const filtered = useMemo(() => {
    if (filter === "ALL") return reports;
    return reports.filter((r) => r.status === filter);
  }, [reports, filter]);

  const selected = reports.find((r) => r.id === selectedId);
  const critical = reports.filter(
    (r) =>
      r.priority === "CRITICAL" &&
      !["RESOLVED", "REJECTED"].includes(r.status),
  );
  const slaAtRisk = reports.filter((r) => {
    const h = differenceInHours(
      new Date(r.slaDeadline),
      new Date(),
    );
    return (
      h < 12 &&
      h > 0 &&
      !["RESOLVED", "REJECTED"].includes(r.status)
    );
  });

  const QUEUE_FILTERS: { id: FilterStatus; label: string }[] = [
    { id: "ALL", label: "All" },
    { id: "REPORTED", label: "Reported" },
    { id: "TRIAGED", label: "Triaged" },
    { id: "IN_PROGRESS", label: "In Progress" },
  ];

  return (
    <div
      className="flex-1 overflow-hidden flex flex-col"
      style={{ background: C.bg }}
    >
      {/* Console header */}
      <div
        className="px-6 py-3 border-b flex items-center gap-6"
        style={{ borderColor: C.border, background: C.surface }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: C.rose }}
          />
          <span
            className="font-mono text-xs uppercase tracking-widest"
            style={{ color: C.text }}
          >
            Admin Console // Operations Queue
          </span>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          {critical.length > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-1 border"
              style={{
                borderColor: `${C.rose}30`,
                background: `${C.rose}0C`,
              }}
            >
              <AlertTriangle
                size={11}
                style={{ color: C.rose }}
              />
              <span
                className="font-mono text-[10px] uppercase tracking-widest"
                style={{ color: C.rose }}
              >
                {critical.length} critical
              </span>
            </div>
          )}
          {slaAtRisk.length > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-1 border"
              style={{
                borderColor: `${C.amber}30`,
                background: `${C.amber}0C`,
              }}
            >
              <Clock size={11} style={{ color: C.amber }} />
              <span
                className="font-mono text-[10px] uppercase tracking-widest"
                style={{ color: C.amber }}
              >
                {slaAtRisk.length} SLA at risk
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Left: queue */}
        <div
          className="w-96 flex-shrink-0 flex flex-col border-r"
          style={{ borderColor: C.border }}
        >
          {/* Filter tabs */}
          <div
            className="flex items-center gap-0 border-b"
            style={{ borderColor: C.border }}
          >
            {QUEUE_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest border-r transition-all"
                style={{
                  borderColor: C.border,
                  color: filter === f.id ? C.cyan : C.textDim,
                  background:
                    filter === f.id
                      ? `${C.cyan}08`
                      : "transparent",
                  borderBottomColor:
                    filter === f.id ? C.cyan : "transparent",
                  borderBottomWidth: 2,
                }}
              >
                {f.label}
              </button>
            ))}
            <span
              className="ml-auto pr-3 font-mono text-[10px]"
              style={{ color: C.textDim }}
            >
              {filtered.length}
            </span>
          </div>

          {/* Queue table */}
          <div className="flex-1 overflow-auto">
            {filtered.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className="flex items-stretch border-b cursor-pointer transition-colors"
                style={{
                  borderColor: C.border,
                  background:
                    selectedId === r.id
                      ? `${C.cyan}08`
                      : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (selectedId !== r.id)
                    e.currentTarget.style.background =
                      "rgba(255,255,255,0.02)";
                }}
                onMouseLeave={(e) => {
                  if (selectedId !== r.id)
                    e.currentTarget.style.background =
                      "transparent";
                }}
              >
                <div
                  className="w-0.5 flex-shrink-0"
                  style={{
                    background: PRIORITY[r.priority].stripe,
                  }}
                />
                <div className="flex-1 min-w-0 px-3 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={r.status} size="xs" />
                    {r.isEscalated && (
                      <Flag
                        size={10}
                        style={{ color: C.rose }}
                      />
                    )}
                  </div>
                  <div
                    className="font-mono text-xs truncate mb-1"
                    style={{ color: C.text }}
                  >
                    {r.title}
                  </div>
                  <div
                    className="flex items-center gap-2 font-mono text-[9px]"
                    style={{ color: C.textDim }}
                  >
                    <span>{r.id}</span>
                    <span>·</span>
                    <SLAChip
                      deadline={r.slaDeadline}
                      breached={r.slaBreached}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: case preview */}
        {selected ? (
          <div className="flex-1 overflow-auto">
            <div
              className="px-6 py-4 border-b flex items-center justify-between"
              style={{ borderColor: C.border }}
            >
              <div className="flex items-center gap-3">
                <StatusBadge
                  status={selected.status}
                  size="sm"
                />
                <span
                  className="font-mono text-[10px]"
                  style={{ color: C.textDim }}
                >
                  {selected.id}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onDetail(selected.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border font-mono text-xs uppercase tracking-widest transition-opacity hover:opacity-70"
                  style={{ borderColor: C.cyan, color: C.cyan }}
                >
                  Open Case <ArrowRight size={11} />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div>
                <h3
                  className="font-serif text-xl mb-2"
                  style={{ color: C.text }}
                >
                  {selected.title}
                </h3>
                <div
                  className="flex flex-wrap gap-3 font-mono text-[10px]"
                  style={{ color: C.textDim }}
                >
                  <PriorityMark priority={selected.priority} />
                  <span>{selected.department}</span>
                  <span>·</span>
                  <span>{selected.category}</span>
                  <span>·</span>
                  <span>
                    {formatDistanceToNow(
                      new Date(selected.createdAt),
                      { addSuffix: true },
                    )}
                  </span>
                </div>
              </div>

              <p
                className="font-mono text-xs leading-relaxed line-clamp-4"
                style={{ color: C.textSub }}
              >
                {selected.description}
              </p>

              {/* Quick controls */}
              <div className="space-y-3">
                <div
                  className="font-mono text-[10px] uppercase tracking-widest"
                  style={{ color: C.textDim }}
                >
                  Quick Status Update
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      "TRIAGED",
                      "IN_PROGRESS",
                      "RESOLVED",
                      "REJECTED",
                    ] as ReportStatus[]
                  ).map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        onUpdateStatus(selected.id, s);
                        toast.success(
                          `Status → ${STATUS[s].label}`,
                        );
                      }}
                      className="px-3 py-1.5 border font-mono text-[10px] uppercase tracking-widest transition-all"
                      style={{
                        borderColor:
                          selected.status === s
                            ? STATUS[s].color
                            : C.border,
                        color:
                          selected.status === s
                            ? STATUS[s].color
                            : C.textSub,
                        background:
                          selected.status === s
                            ? `${STATUS[s].color}0C`
                            : "transparent",
                      }}
                    >
                      {STATUS[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Summary */}
              {selected.aiAnalysis != null ? (
              <div
                className="border p-4"
                style={{
                  borderColor: `${C.violet}28`,
                  background: `${C.violet}06`,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Cpu size={12} style={{ color: C.violet }} />
                  <span
                    className="font-mono text-[10px] uppercase tracking-widest"
                    style={{ color: C.violet }}
                  >
                    ETHOS Intelligence Analysis
                  </span>
                  <span
                    className="ml-auto font-mono text-[9px]"
                    style={{ color: C.textDim }}
                  >
                    {Math.round(
                      selected.aiAnalysis.categoryConfidence *
                        100,
                    )}
                    % confidence
                  </span>
                </div>
                <p
                  className="font-mono text-[11px] leading-relaxed mb-2"
                  style={{ color: C.textSub }}
                >
                  {selected.aiAnalysis.recommendation}
                </p>
                <div className="flex gap-3 font-mono text-[9px]">
                  <span style={{ color: C.textDim }}>
                    Severity:{" "}
                    <strong style={{ color: C.text }}>
                      {selected.aiAnalysis.severity}/10
                    </strong>
                  </span>
                  <span style={{ color: C.textDim }}>
                    SLA Risk:{" "}
                    <strong
                      style={{
                        color:
                          selected.aiAnalysis.slaBreachRisk ===
                          "HIGH"
                            ? C.rose
                            : selected.aiAnalysis
                                  .slaBreachRisk === "MEDIUM"
                              ? C.amber
                              : C.emerald,
                      }}
                    >
                      {selected.aiAnalysis.slaBreachRisk}
                    </strong>
                  </span>
                  <span style={{ color: C.textDim }}>
                    Sentiment:{" "}
                    <strong style={{ color: C.text }}>
                      {selected.aiAnalysis.sentiment}
                    </strong>
                  </span>
                </div>
                <div
                  className="mt-2 font-mono text-[9px]"
                  style={{ color: C.textDim }}
                >
                  AI decisions are advisory only. Human
                  administrators make final determinations.
                </div>
              </div>
              ) : (
              <div
                className="border p-4 font-mono text-[10px] text-center"
                style={{ borderColor: C.border, color: C.textDim }}
              >
                AI analysis not available for this report.
              </div>
              )}

              {/* SLA + Assignment */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="border p-3"
                  style={{
                    borderColor: C.border,
                    background: C.surface,
                  }}
                >
                  <div
                    className="font-mono text-[9px] uppercase tracking-widest mb-1.5"
                    style={{ color: C.textDim }}
                  >
                    SLA Deadline
                  </div>
                  <SLAChip
                    deadline={selected.slaDeadline}
                    breached={selected.slaBreached}
                  />
                  <div
                    className="font-mono text-[9px] mt-1"
                    style={{ color: C.textDim }}
                  >
                    {format(
                      new Date(selected.slaDeadline),
                      "dd MMM, HH:mm",
                    )}
                  </div>
                </div>
                <div
                  className="border p-3"
                  style={{
                    borderColor: C.border,
                    background: C.surface,
                  }}
                >
                  <div
                    className="font-mono text-[9px] uppercase tracking-widest mb-1.5"
                    style={{ color: C.textDim }}
                  >
                    Assigned To
                  </div>
                  <div
                    className="font-mono text-[10px]"
                    style={{
                      color: selected.assignedTo
                        ? C.text
                        : C.textDim,
                    }}
                  >
                    {selected.assignedTo ?? "Unassigned"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Shield size={32} style={{ color: C.border2 }} />
            <p
              className="font-mono text-xs uppercase tracking-widest"
              style={{ color: C.textDim }}
            >
              Select a case to preview
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Org Settings View ────────────────────────────────────────────────────────
function OrgSettingsView({ org }: { org: Organization }) {
  const [tab, setTab] = useState("profile");
  const TABS = [
    { id: "profile", label: "Organization Profile" },
    { id: "departments", label: "Departments" },
    { id: "members", label: "Members & Roles" },
    { id: "invites", label: "Invite Codes" },
    { id: "workflow", label: "Workflow & SLA" },
    { id: "ai", label: "AI Policies" },
    { id: "privacy", label: "Privacy & Retention" },
  ];

  const mockDepts = [
    "Facilities Management",
    "IT Services",
    "Campus Safety",
    "Student Services",
    "Academic Affairs",
    "Campus Operations",
  ];
  const mockMembers = [
    {
      name: "A. Chen",
      email: "a.chen@northfield.edu",
      role: "ADMIN",
    },
    {
      name: "M. Torres",
      email: "m.torres@northfield.edu",
      role: "MODERATOR",
    },
    {
      name: "P. Nakamura",
      email: "p.nakamura@northfield.edu",
      role: "MODERATOR",
    },
  ];
  const mockCodes = [
    {
      code: "NF-7X2K",
      uses: 47,
      maxUses: 100,
      expires: addHours(new Date(), 72),
    },
    {
      code: "NF-9A4P",
      uses: 12,
      maxUses: 50,
      expires: addHours(new Date(), 168),
    },
  ];

  return (
    <div
      className="flex-1 overflow-auto"
      style={{ background: C.bg }}
    >
      <div
        className="px-8 py-6 border-b"
        style={{ borderColor: C.border }}
      >
        <div
          className="font-mono text-[10px] uppercase tracking-widest mb-1"
          style={{ color: C.textDim }}
        >
          {org.id}
        </div>
        <h1
          className="font-serif text-2xl"
          style={{ color: C.text }}
        >
          Organization Settings
        </h1>
        <p
          className="font-mono text-xs mt-1"
          style={{ color: C.textSub }}
        >
          Manage {org.name} configuration, access, and policies.
        </p>
      </div>

      <div className="flex">
        {/* Settings nav */}
        <div
          className="w-52 flex-shrink-0 border-r py-4"
          style={{ borderColor: C.border }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="w-full text-left px-5 py-2.5 font-mono text-xs transition-colors relative"
              style={{
                color: tab === t.id ? C.cyan : C.textSub,
                background:
                  tab === t.id ? `${C.cyan}08` : "transparent",
              }}
            >
              {tab === t.id && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-0.5"
                  style={{ background: C.cyan }}
                />
              )}
              {t.label}
            </button>
          ))}
        </div>

        {/* Settings content */}
        <div className="flex-1 px-8 py-6 max-w-2xl space-y-6">
          {tab === "profile" && (
            <>
              <div
                className="font-serif text-lg mb-4"
                style={{ color: C.text }}
              >
                Organization Profile
              </div>
              {[
                {
                  label: "Organization Name",
                  value: org.name,
                  type: "text",
                },
                {
                  label: "Short Name",
                  value: org.shortName,
                  type: "text",
                },
                {
                  label: "Primary Domain",
                  value: org.domain,
                  type: "text",
                },
                {
                  label: "Organization Type",
                  value: org.type,
                  type: "text",
                },
              ].map((f) => (
                <div key={f.label}>
                  <label
                    className="block font-mono text-[10px] uppercase tracking-widest mb-1.5"
                    style={{ color: C.textDim }}
                  >
                    {f.label}
                  </label>
                  <input
                    defaultValue={f.value}
                    className="w-full px-4 py-2.5 border font-mono text-sm bg-transparent outline-none"
                    style={{
                      borderColor: C.border,
                      color: C.text,
                    }}
                  />
                </div>
              ))}
              <button
                className="px-5 py-2.5 font-mono text-xs uppercase tracking-widest"
                style={{ background: C.cyan, color: C.bg }}
              >
                Save Profile
              </button>
            </>
          )}

          {tab === "departments" && (
            <>
              <div
                className="font-serif text-lg mb-4"
                style={{ color: C.text }}
              >
                Departments
              </div>
              <div
                className="border"
                style={{ borderColor: C.border }}
              >
                {mockDepts.map((d, i) => (
                  <div
                    key={d}
                    className="flex items-center justify-between px-5 py-3 border-b last:border-b-0"
                    style={{ borderColor: C.border }}
                  >
                    <div>
                      <div
                        className="font-mono text-xs"
                        style={{ color: C.text }}
                      >
                        {d}
                      </div>
                    </div>
                    <button
                      className="font-mono text-[10px] uppercase tracking-widest transition-opacity hover:opacity-70"
                      style={{ color: C.textDim }}
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="flex items-center gap-2 px-4 py-2 border font-mono text-xs uppercase tracking-widest"
                style={{
                  borderColor: C.border,
                  color: C.textSub,
                }}
              >
                <Plus size={13} /> Add Department
              </button>
            </>
          )}

          {tab === "members" && (
            <>
              <div
                className="font-serif text-lg mb-4"
                style={{ color: C.text }}
              >
                Members & Roles
              </div>
              <div
                className="border"
                style={{ borderColor: C.border }}
              >
                <div
                  className="flex items-center gap-4 px-5 py-2 border-b"
                  style={{ borderColor: C.border }}
                >
                  {["Name/Email", "Role", ""].map((h) => (
                    <div
                      key={h}
                      className={clsx(
                        "font-mono text-[9px] uppercase tracking-widest",
                        h === "" ? "ml-auto" : "flex-1",
                      )}
                      style={{ color: C.textDim }}
                    >
                      {h}
                    </div>
                  ))}
                </div>
                {mockMembers.map((m) => (
                  <div
                    key={m.email}
                    className="flex items-center gap-4 px-5 py-3 border-b last:border-b-0"
                    style={{ borderColor: C.border }}
                  >
                    <div className="flex-1">
                      <div
                        className="font-mono text-xs"
                        style={{ color: C.text }}
                      >
                        {m.name}
                      </div>
                      <div
                        className="font-mono text-[10px]"
                        style={{ color: C.textDim }}
                      >
                        {m.email}
                      </div>
                    </div>
                    <span
                      className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 border"
                      style={{
                        color: C.cyan,
                        borderColor: `${C.cyan}28`,
                      }}
                    >
                      {m.role}
                    </span>
                    <button
                      className="font-mono text-[10px] transition-opacity hover:opacity-70"
                      style={{ color: C.textDim }}
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
              <div
                className="font-mono text-[10px]"
                style={{ color: C.textDim }}
              >
                +{org.memberCount - mockMembers.length}{" "}
                additional members
              </div>
            </>
          )}

          {tab === "invites" && (
            <div className="py-2">
              <JoinCodeManagement isAdmin={true} />
            </div>
          )}

          {tab === "workflow" && (
            <WorkflowBuilder />
          )}

          {(tab === "ai" || tab === "privacy") && (
            <div className="py-16 text-center space-y-3">
              <Settings size={28} style={{ color: C.border2 }} />
              <div className="font-serif text-lg" style={{ color: C.textSub }}>
                {tab === "ai" ? "AI Governance Policies" : "Privacy & Retention Settings"}
              </div>
              <p className="font-mono text-xs" style={{ color: C.textDim }}>
                Advanced configuration available in the full backend-connected release.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
type AppState = "LOGIN" | "REGISTER" | "APPLY" | "SPACES" | "JOIN" | "ORG";

function parseInitialRoute(): { appState: AppState; orgView?: OrgView } {
  const path = window.location.pathname;
  if (path === '/organization/apply' || path === '/apply') {
    return { appState: 'APPLY' };
  }
  if (path === '/register') {
    return { appState: 'REGISTER' };
  }
  if (path === '/admin/organization-applications') {
    return { appState: isAuthenticated() ? 'ORG' : 'LOGIN', orgView: 'ORG_APPLICATIONS' };
  }
  if (path === '/admin/join-codes') {
    return { appState: isAuthenticated() ? 'ORG' : 'LOGIN', orgView: 'JOIN_CODES' };
  }
  if (path === '/track') {
    return { appState: isAuthenticated() ? 'ORG' : 'LOGIN', orgView: 'TRACK' };
  }
  return { appState: isAuthenticated() ? 'SPACES' : 'LOGIN' };
}

// ─── Login View ────────────────────────────────────────────────────────────────
function LoginView({
  onSuccess,
  onRegisterClick,
  onApplyClick,
}: {
  onSuccess: () => void;
  onRegisterClick: () => void;
  onApplyClick: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiLogin(username.trim(), password.trim());
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 401 ? "Invalid credentials." : err.message);
      } else {
        setError("Could not connect to the server. Is the backend running?");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: C.bg }}
    >
      <div
        className="w-full max-w-sm border p-8 shadow-2xl"
        style={{ background: C.surface, borderColor: C.border2 }}
      >
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-5">
            <div
              className="w-7 h-7 flex items-center justify-center font-mono font-bold text-sm"
              style={{ background: C.cyan, color: C.bg }}
            >
              E
            </div>
            <span
              className="font-mono text-sm uppercase tracking-[0.2em]"
              style={{ color: C.textSub }}
            >
              ETHOS
            </span>
          </div>
          <h1 className="font-serif text-2xl mb-1" style={{ color: C.text }}>
            Sign in
          </h1>
          <p className="font-mono text-xs" style={{ color: C.textSub }}>
            Ethical Governance & Campus Transparency
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block font-mono text-[10px] uppercase tracking-widest mb-1.5"
              style={{ color: C.textSub }}
            >
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
              className="w-full px-3 py-2.5 font-mono text-sm border bg-transparent outline-none transition-all"
              style={{
                borderColor: username ? C.cyan : C.border,
                color: C.text,
              }}
              disabled={loading}
            />
          </div>
          <div>
            <label
              className="block font-mono text-[10px] uppercase tracking-widest mb-1.5"
              style={{ color: C.textSub }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full px-3 py-2.5 font-mono text-sm border bg-transparent outline-none transition-all"
              style={{
                borderColor: password ? C.cyan : C.border,
                color: C.text,
              }}
              disabled={loading}
            />
          </div>

          {error && (
            <div
              className="flex items-start gap-2 px-3 py-2.5 border text-xs font-mono"
              style={{
                borderColor: `${C.rose}35`,
                background: `${C.rose}0A`,
                color: C.rose,
              }}
            >
              <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 font-mono text-xs uppercase tracking-widest transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: C.cyan, color: C.bg }}
          >
            {loading ? "Authenticating…" : "Sign In"}
          </button>
        </form>

        <p className="mt-4 font-mono text-[10px] text-center" style={{ color: C.textDim }}>
          Default credentials: admin / admin123 · student / student123
        </p>

        {/* Phase 2.7 Registration and Institutional Application Links */}
        <div className="mt-6 pt-5 border-t space-y-2.5 font-mono text-xs" style={{ borderColor: C.border }}>
          <button
            type="button"
            onClick={onRegisterClick}
            className="w-full text-left py-2 px-3 border transition-colors hover:bg-white/[0.03] flex items-center justify-between"
            style={{ borderColor: C.border, color: C.cyan }}
          >
            <span>Have an organization join code?</span>
            <span className="text-[10px] uppercase font-bold tracking-wider">Register →</span>
          </button>
          <button
            type="button"
            onClick={onApplyClick}
            className="w-full text-left py-2 px-3 border transition-colors hover:bg-white/[0.03] flex items-center justify-between"
            style={{ borderColor: C.border, color: C.textSub }}
          >
            <span>Register a new institution?</span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">Apply →</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const initialRoute = parseInitialRoute();
  const [appState, setAppState] = useState<AppState>(initialRoute.appState);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [orgView, setOrgView] = useState<OrgView>(initialRoute.orgView ?? "OVERVIEW");
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(null);

  const navigateTo = (path: string, state: AppState, view?: OrgView) => {
    window.history.pushState({}, '', path);
    setAppState(state);
    if (view) setOrgView(view);
  };

  useEffect(() => {
    const onPopState = () => {
      const route = parseInitialRoute();
      setAppState(route.appState);
      if (route.orgView) setOrgView(route.orgView);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const loadUserProfile = async () => {
    if (!isAuthenticated()) return;
    try {
      const profile = await getCurrentUser();
      setUserProfile(profile);
      if (profile.organization && !currentOrg) {
        setCurrentOrg({
          id: String(profile.organization.id),
          name: profile.organization.name,
          shortName: profile.organization.name.split(' ')[0] || profile.organization.name,
          domain: profile.organization.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.edu',
          type: (profile.organization.type as any) || 'UNIVERSITY',
          memberCount: 1,
          reportCount: 0,
          unresolvedCount: 0,
          pendingCount: 0,
          role: profile.role === 'SUPER_ADMIN' ? 'OWNER' : profile.role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
          logoChar: profile.organization.name[0] || 'E',
          accentColor: '#00C8E8',
          joinedAt: new Date().toISOString(),
          verificationStatus: 'VERIFIED',
        });
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isAuthenticated()) {
      loadUserProfile();
    }
  }, [appState]);

  // reports starts empty — populated from backend after auth
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showJoin, setShowJoin] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(_notifications);

  // Authoritative role evaluation
  const isSuperAdmin = userProfile?.role === "SUPER_ADMIN";
  const isAdmin =
    isSuperAdmin ||
    userProfile?.role === "ADMIN" ||
    (currentOrg ? currentOrg.role === "ADMIN" || currentOrg.role === "OWNER" : false);

  const selectedReport = useMemo(
    () => reports.find((r) => r.id === selectedReportId) ?? null,
    [reports, selectedReportId],
  );
  const unresolvedCount = useMemo(
    () =>
      reports.filter(
        (r) => !["RESOLVED", "REJECTED", "ARCHIVED"].includes(r.status),
      ).length,
    [reports],
  );

  // ── Load issues from backend ──────────────────────────────────────────────────
  const loadReports = async () => {
    if (!isAuthenticated()) return;
    setReportsLoading(true);
    setReportsError(null);
    try {
      // Try admin feed first; fall back to public feed if 403
      let page;
      try {
        page = await getAdminFeed({ size: 100, sort: "createdAt,desc" });
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          page = await getPublicFeed({ size: 100, sort: "createdAt,desc" });
        } else {
          throw err;
        }
      }
      setReports(mapIssuePage(page.content));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Token expired — go back to login
        setAppState("LOGIN");
      } else {
        const msg =
          err instanceof ApiError
            ? err.message
            : "Failed to load reports from server.";
        setReportsError(msg);
        toast.error(msg);
      }
    } finally {
      setReportsLoading(false);
    }
  };

  // Load reports whenever we enter the ORG view (which means user is authenticated)
  useEffect(() => {
    if (appState === "ORG") {
      loadReports();
    }
  }, [appState]);

  // ── Auth handlers ─────────────────────────────────────────────────────────────
  const handleLoginSuccess = async () => {
    await loadUserProfile();
    navigateTo("/", "SPACES");
  };

  const handleLogout = () => {
    apiLogout();
    setReports([]);
    setCurrentOrg(null);
    setUserProfile(null);
    navigateTo("/login", "LOGIN");
  };

  // ── Navigation handlers ───────────────────────────────────────────────────────
  const handleEnterOrg = (org: Organization) => {
    setCurrentOrg(org);
    setOrgView("OVERVIEW");
    setAppState("ORG");
  };

  const handleOpenDetail = async (id: string) => {
    setSelectedReportId(id);
    setOrgView("DETAIL");
    try {
      const liveRes = await getIssueById(id);
      const [liveReport] = mapIssuePage([liveRes]);
      setReports((prev) => {
        const exists = prev.some((r) => r.id === liveReport.id);
        return exists ? prev.map((r) => (r.id === liveReport.id ? liveReport : r)) : [liveReport, ...prev];
      });
    } catch {
      // Graceful fallback to existing report in memory
    }
  };

  // ── Status transition — calls real backend ────────────────────────────────────
  const handleUpdateStatus = async (id: string, status: ReportStatus) => {
    // Guard: TRIAGED, PENDING_REVIEW, ARCHIVED have no backend equivalent
    if (status === "TRIAGED" || status === "PENDING_REVIEW" || status === "ARCHIVED") {
      toast.error(`Status "${status}" is not supported by the backend yet.`);
      return;
    }
    if (status === "UNDER_REVIEW") {
      toast.error("UNDER_REVIEW cannot be set via the current API.");
      return;
    }

    // Optimistic update
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r)),
    );

    try {
      await transitionStatus(id, status);
      toast.success(`Status updated to ${STATUS[status].label}`);
    } catch (err) {
      // Revert optimistic update
      await loadReports();
      if (err instanceof ApiError) {
        toast.error(
          err.status === 403
            ? "Admin access required to change status."
            : err.message,
        );
      } else {
        toast.error("Failed to update status.");
      }
    }
  };

  // ── Submit new report — calls real backend ────────────────────────────────────
  const handleSubmitReport = async (partial: Partial<Report>) => {
    const title = partial.title?.trim() ?? "";
    const description = partial.description?.trim() ?? "";
    const category = partial.category?.trim() || "Infrastructure";
    const department = partial.department?.trim() || "Facilities & Operations";

    if (!title || !description) {
      toast.error("Title and description are required.");
      return;
    }

    // Generate a random reporter hash (opaque identifier, never exposed)
    const reporterHash = `anon_${Math.random().toString(36).substring(2, 10)}`;

    try {
      const created = await createIssue(title, description, reporterHash, category, department);
      // Map the backend response and prepend to local list
      const [newReport] = mapIssuePage([created]);
      setReports((prev) => [newReport, ...prev]);
      setOrgView("REPORTS");
      if (newReport.trackingCode) {
        toast.success(
          `Report submitted! Tracking code: ${newReport.trackingCode}`,
          { duration: 9000 }
        );
      } else {
        toast.success("Report submitted successfully.");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(
          err.status === 403
            ? "You must be logged in as a student to submit reports."
            : err.message,
        );
      } else {
        toast.error("Failed to submit report.");
      }
    }
  };

  // ── Vote handler — calls real backend ─────────────────────────────────────────
  const handleVote = async (id: string, delta: number) => {
    // Optimistic update
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, voteCount: r.voteCount + delta } : r)),
    );
    try {
      await voteIssue(id, delta);
    } catch (err) {
      // Revert optimistic update by reloading
      await loadReports();
      toast.error("Failed to register vote.");
    }
  };

  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);

  const refreshUnreadCount = async () => {
    if (!isAuthenticated()) return;
    try {
      const res = await getUnreadNotificationCount();
      setUnreadNotifications(res.unreadCount);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isAuthenticated()) {
      refreshUnreadCount();
      const interval = setInterval(refreshUnreadCount, 60000);
      return () => clearInterval(interval);
    }
  }, [appState, orgView]);


  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (appState === "ORG") setShowSearch(v => !v);
        return;
      }
      if (e.key === "Escape") {
        if (showSearch) { setShowSearch(false); return; }
        if (showJoin) {
          setShowJoin(false);
          return;
        }
        if (orgView === "DETAIL") {
          setOrgView("REPORTS");
          setSelectedReportId(null);
        }
        if (orgView === "SUBMIT") {
          setOrgView("REPORTS");
        }
      }
      if (
        e.key === "n" &&
        appState === "ORG" &&
        orgView !== "SUBMIT" &&
        !showJoin &&
        !showSearch &&
        (e.target as HTMLElement).tagName !== "INPUT" &&
        (e.target as HTMLElement).tagName !== "TEXTAREA"
      ) {
        setOrgView("SUBMIT");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [appState, orgView, showJoin, showSearch]);

  return (
    <div
      className="min-h-screen"
      style={{
        background: C.bg,
        color: C.text,
        fontFamily: "'IBM Plex Mono', monospace",
      }}
    >
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: C.surface2,
            border: `1px solid ${C.border2}`,
            color: C.text,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
          },
        }}
      />

      {appState === "LOGIN" && (
        <LoginView
          onSuccess={handleLoginSuccess}
          onRegisterClick={() => navigateTo("/register", "REGISTER")}
          onApplyClick={() => navigateTo("/organization/apply", "APPLY")}
        />
      )}

      {appState === "REGISTER" && (
        <JoinCodeRegistration
          onSuccess={() => {
            toast.success("Registration successful! Please sign in with your new credentials.");
            navigateTo("/login", "LOGIN");
          }}
          onBackToLogin={() => navigateTo("/login", "LOGIN")}
        />
      )}

      {appState === "APPLY" && (
        <OrganizationApplicationApply
          onBackToLogin={() => navigateTo("/login", "LOGIN")}
        />
      )}

      {appState === "SPACES" && (
        <>
          {/* Logout button injected into Spaces header */}
          <div className="absolute top-0 right-0 z-10 p-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 border transition-opacity hover:opacity-70"
              style={{ borderColor: C.border, color: C.textDim }}
            >
              <LogOut size={11} />
              Sign Out
            </button>
          </div>
          <SpacesView
            orgs={_orgs}
            onEnter={handleEnterOrg}
            onJoin={() => setShowJoin(true)}
          />
          <AnimatePresence>
            {showJoin && (
              <JoinOrgView
                onClose={() => setShowJoin(false)}
                onSuccess={() => setShowJoin(false)}
              />
            )}
          </AnimatePresence>
        </>
      )}

      {appState === "ORG" && currentOrg && (
        <div className="flex h-screen overflow-hidden">
          <OrgSidebar
            org={currentOrg}
            allOrgs={_orgs}
            view={orgView}
            isSuperAdmin={isSuperAdmin}
            onView={(v) => {
              setOrgView(v);
              if (v !== "DETAIL") setSelectedReportId(null);
            }}
            onSwitchOrg={() => {
              const next = _orgs.find(
                (o) => o.id !== currentOrg.id,
              );
              if (next) {
                setCurrentOrg(next);
                setOrgView("OVERVIEW");
              }
            }}
            onLeave={() => {
              handleLogout();
            }}
            unresolvedCount={unresolvedCount}
            unreadNotifications={unreadNotifications}
            onSearch={() => setShowSearch(true)}
          />

          <main className="flex-1 overflow-hidden flex flex-col">
            {orgView === "OVERVIEW" && (
              <OverviewView
                org={currentOrg}
                reports={reports}
                onViewReports={() => setOrgView("REPORTS")}
                onViewDetail={handleOpenDetail}
              />
            )}
            {orgView === "REPORTS" && (
              <ReportsView
                reports={reports}
                onDetail={handleOpenDetail}
              />
            )}
            {orgView === "DETAIL" && selectedReport && (
              <ReportDetailView
                report={selectedReport}
                onBack={() => {
                  setOrgView("REPORTS");
                  setSelectedReportId(null);
                }}
                onUpdateStatus={handleUpdateStatus}
                onUpdateReport={(updated) => {
                  setReports((prev) =>
                    prev.map((r) => (r.id === updated.id ? updated : r)),
                  );
                }}
                isAdmin={isAdmin}
              />
            )}
            {orgView === "SUBMIT" && (
              <SubmitReportView
                onBack={() => setOrgView("REPORTS")}
                onSubmit={handleSubmitReport}
              />
            )}
            {orgView === "ACTIVITY" && (
              <MyActivityView
                tracked={_tracked}
                onDetail={handleOpenDetail}
              />
            )}
            {orgView === "INSIGHTS" && (
              <InsightsView reports={reports} />
            )}
            {orgView === "ADMIN" && isAdmin && (
              <AdminConsoleView
                reports={reports}
                onDetail={handleOpenDetail}
                onUpdateStatus={handleUpdateStatus}
              />
            )}
            {orgView === "SETTINGS" && isAdmin && (
              <OrgSettingsView org={currentOrg} />
            )}
            {orgView === "NOTIFICATIONS" && (
              <NotificationsPanel
                onNotificationUpdate={refreshUnreadCount}
                onOpenCase={(id) => { setSelectedReportId(id); setOrgView("DETAIL"); }}
              />
            )}
            {orgView === "TRACK" && (
              <TrackReportView
                tracked={_tracked}
                reports={reports}
                onBack={() => setOrgView("OVERVIEW")}
              />
            )}
            {orgView === "MODERATION" && isAdmin && (
              <ModerationQueueView />
            )}
            {orgView === "PLATFORM" && (
              <PlatformAdminView />
            )}
            {orgView === "JOIN_CODES" && (
              <JoinCodeManagement
                isAdmin={isAdmin}
                onNavigateHome={() => setOrgView("OVERVIEW")}
              />
            )}
            {orgView === "ORG_APPLICATIONS" && (
              <SuperAdminApplications
                isSuperAdmin={isSuperAdmin}
                onNavigateHome={() => setOrgView("OVERVIEW")}
              />
            )}
          </main>

          {/* Global Search overlay */}
          {showSearch && (
            <GlobalSearch
              reports={reports}
              onSelect={(id) => { setSelectedReportId(id); setOrgView("DETAIL"); }}
              onClose={() => setShowSearch(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}