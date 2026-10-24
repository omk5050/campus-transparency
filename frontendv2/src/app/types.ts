export type ReportStatus =
  // ── Backend-supported statuses ─────────────────────────────────────────────
  // These values are returned by the Spring Boot backend and can appear in
  // data loaded from the real API.
  | 'REPORTED'
  | 'UNDER_REVIEW'   // backend: UNDER_REVIEW (no direct FE transition endpoint)
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED'
  // ── Frontend-only mock statuses ────────────────────────────────────────────
  // These exist only in the mock data (data.ts) and will NOT appear in
  // data returned by the real backend. They remain here to avoid breaking
  // the mock-data-driven components until those features are implemented.
  | 'TRIAGED'        // frontend mock only — no backend equivalent
  | 'PENDING_REVIEW' // frontend mock only — no backend equivalent
  | 'ARCHIVED';      // frontend mock only — no backend equivalent

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type MemberRole = 'MEMBER' | 'MODERATOR' | 'ADMIN' | 'OWNER';
export type SortOption = 'NEW' | 'TOP' | 'PRIORITY' | 'STATUS';
export type FilterStatus = ReportStatus | 'ALL';

export type SignalStatus = ReportStatus;

// ─── Organization ─────────────────────────────────────────────────────────────

export type OrgVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED' | 'UNVERIFIED';

export interface Organization {
  id: string;
  name: string;
  shortName: string;
  domain: string;
  type: 'UNIVERSITY' | 'CORPORATION' | 'NGO' | 'GOVERNMENT';
  memberCount: number;
  reportCount: number;
  unresolvedCount: number;
  pendingCount: number;
  role: MemberRole;
  logoChar: string;
  accentColor: string;
  joinedAt: string;
  verificationStatus: OrgVerificationStatus;
  description?: string;
  publicDescription?: string;
  contactEmail?: string;
  transparencySettings?: TransparencySettings;
}

export interface TransparencySettings {
  showAggregateStats: boolean;
  showAnonymizedCases: boolean;
  showCategoryTrends: boolean;
  showIndividualCases: boolean;
  showCommunityVoting: boolean;
}

// ─── Department & Category (org-configurable) ─────────────────────────────────

export interface Department {
  id: string;
  orgId: string;
  name: string;
  description: string;
  memberCount: number;
  responsibleRoles: string[];
  defaultEscalationTarget?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  orgId: string;
  name: string;
  code: string;
  description: string;
  defaultDepartmentId?: string;
  defaultDepartmentName?: string;
  defaultSeverity: number;
  defaultSLAHours: number;
  aiEnabled: boolean;
  isActive: boolean;
  order: number;
}

// ─── AI Analysis & Overrides ──────────────────────────────────────────────────

export interface AIAnalysis {
  categoryConfidence: number;
  suggestedCategory: string;
  suggestedDepartment: string;
  severity: number;
  urgency: number;
  isDuplicate: boolean;
  duplicateOf?: string;
  summary: string;
  tags: string[];
  sentiment: 'NEUTRAL' | 'CONCERNED' | 'URGENT' | 'DISTRESSED';
  spamScore: number;
  recommendation: string;
  slaBreachRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  modelVersion: string;
  processedAt: string;
  explanation?: AIExplanation;
}

export interface AIExplanation {
  field: string;
  explanation: string;
  contributingTerms: string[];
  modelVersion: string;
}

export interface AIOverride {
  id: string;
  caseId: string;
  field: 'CATEGORY' | 'DEPARTMENT' | 'SEVERITY' | 'DUPLICATE' | 'SPAM';
  aiSuggestion: string;
  aiConfidence: number;
  humanDecision: string;
  reason?: string;
  overriddenBy: string;
  overriddenAt: string;
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export interface AuditEvent {
  id: string;
  type: string;
  actor: string;
  actorType: 'SYSTEM' | 'ADMIN' | 'AI' | 'REPORTER';
  timestamp: string;
  detail: string;
  hash: string;
  previousState?: string;
  newState?: string;
}

export interface ChangeEvent {
  id: string;
  caseId: string;
  field: string;
  previousValue: string;
  newValue: string;
  changedBy: string;
  changedAt: string;
  reason?: string;
}

// ─── Evidence ─────────────────────────────────────────────────────────────────

export interface Evidence {
  id: string;
  type: 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'LINK';
  name: string;
  size?: string;
  uploadedAt: string;
  verified: boolean;
  uploadedBy?: string;
  fileHash?: string;
  accessHistory?: EvidenceAccess[];
  previewAvailable?: boolean;
}

export interface EvidenceAccess {
  accessedBy: string;
  by: string;
  accessedAt: string;
  at: string;
  action: 'VIEWED' | 'DOWNLOADED';
}

// ─── Communication (anonymous two-way) ────────────────────────────────────────

export type MessageType = 'MESSAGE' | 'INFORMATION_REQUEST' | 'EVIDENCE_REQUEST' | 'SYSTEM_UPDATE';
export type SenderType = 'REPORTER' | 'INVESTIGATION_TEAM' | 'SYSTEM';

export interface Message {
  id: string;
  caseId: string;
  senderType: SenderType;
  content: string;
  createdAt: string;
  readAt?: string;
  attachments?: string[];
  messageType: MessageType;
  requestDeadline?: string;
}

// ─── Internal Notes ───────────────────────────────────────────────────────────

export interface InternalNote {
  id: string;
  caseId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  mentions?: string[];
}

// ─── Assignment ───────────────────────────────────────────────────────────────

export interface Assignment {
  id: string;
  caseId: string;
  departmentId: string;
  departmentName: string;
  teamName?: string;
  primaryInvestigatorId?: string;
  primaryInvestigatorName?: string;
  secondaryInvestigatorId?: string;
  secondaryInvestigatorName?: string;
  observers?: string[];
  assignedAt: string;
  assignedBy: string;
  history: AssignmentHistoryEntry[];
}

export interface AssignmentHistoryEntry {
  from: string;
  to: string;
  changedBy: string;
  changedAt: string;
  reason?: string;
}

// ─── Resolution ───────────────────────────────────────────────────────────────

export type ResolutionCategory =
  | 'CORRECTIVE_ACTION'
  | 'POLICY_CHANGE'
  | 'INVESTIGATION_COMPLETED'
  | 'NO_VIOLATION_FOUND'
  | 'REFERRED'
  | 'OTHER';

export interface Resolution {
  id: string;
  caseId: string;
  category: ResolutionCategory;
  summary: string;
  actionTaken: string;
  evidence?: string[];
  resolvedAt: string;
  resolvedBy: string;
  notifyReporter: boolean;
  publicVisibility: 'PRIVATE' | 'ANONYMIZED';
}

export interface ResolutionFeedback {
  id: string;
  caseId: string;
  rating: 'VERY_SATISFIED' | 'SATISFIED' | 'NEUTRAL' | 'DISSATISFIED' | 'VERY_DISSATISFIED';
  comment?: string;
  submittedAt: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'NEW_REPORT'
  | 'NEW_MESSAGE'
  | 'NEW_EVIDENCE'
  | 'ASSIGNMENT'
  | 'SLA_WARNING'
  | 'SLA_BREACH'
  | 'ESCALATION'
  | 'DUPLICATE_DETECTED'
  | 'RESOLUTION_SUBMITTED'
  | 'CASE_UPDATED'
  | 'INFO_REQUESTED'
  | 'CASE_RESOLVED';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  caseId?: string;
  createdAt: string;
  readAt?: string;
  recipientType: 'INVESTIGATOR' | 'REPORTER';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

// ─── Saved Views ──────────────────────────────────────────────────────────────

export interface SavedView {
  id: string;
  name: string;
  description?: string;
  filters: {
    status?: ReportStatus[];
    priority?: Priority[];
    department?: string[];
    assignedTo?: string;
    slaStatus?: 'AT_RISK' | 'BREACHED' | 'OK';
    isEscalated?: boolean;
  };
  sortBy?: SortOption;
  isPredefined?: boolean;
  createdAt: string;
  createdBy: string;
}

// ─── Moderation ───────────────────────────────────────────────────────────────

export type ModerationIssueType = 'POTENTIAL_SPAM' | 'PROFANITY' | 'POSSIBLE_ABUSE' | 'POSSIBLE_DUPLICATE' | 'NEEDS_REVIEW';

export interface ModerationItem {
  id: string;
  caseId: string;
  caseTitle: string;
  title: string;
  excerpt: string;
  flagType: string;
  type: ModerationIssueType;
  aiConfidence: number;
  aiDecision: 'ACCEPT' | 'REJECT' | 'ESCALATE' | 'HOLD';
  aiRecommendation: 'ACCEPT' | 'REJECT' | 'FLAG';
  humanDecision?: 'ACCEPT' | 'REJECT' | 'OVERRIDE';
  flaggedAt: string;
  detectedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
  aiReason?: string;
}

// ─── Issue Clusters ───────────────────────────────────────────────────────────

export interface IssueCluster {
  id: string;
  name: string;
  description: string;
  reportIds: string[];
  category: string;
  departments: string[];
  reportCount: number;
  trendPercent: number;
  period: string;
  detectedAt: string;
}

export interface RelatedCase {
  caseId: string;
  title: string;
  status: ReportStatus;
  similarity: number;
  relationship: 'DUPLICATE' | 'RELATED' | 'PARENT' | 'CHILD' | 'FOLLOWUP';
}

// ─── Workflow ─────────────────────────────────────────────────────────────────

export interface WorkflowStage {
  id: string;
  name: string;
  label: string;
  type: 'START' | 'STANDARD' | 'REVIEW' | 'END';
  order: number;
  allowedTransitions: string[];
  transitions?: string[];
  requiredFields?: string[];
  slaHours?: number;
  canTransitionRoles: MemberRole[];
  isTerminal?: boolean;
  color?: string;
  description?: string;
}

export interface Workflow {
  id: string;
  orgId: string;
  name: string;
  stages: WorkflowStage[];
  isDefault: boolean;
}

// ─── SLA ──────────────────────────────────────────────────────────────────────

export interface SLARule {
  id: string;
  orgId: string;
  name: string;
  priority?: Priority;
  categoryId?: string;
  categoryName?: string;
  departmentId?: string;
  departmentName?: string;
  firstResponseHours: number;
  resolutionHours: number;
  escalationHours?: number;
  businessHoursOnly: boolean;
  warningThresholdPercent: number;
  breachAction: 'NOTIFY' | 'ESCALATE' | 'NOTIFY_AND_ESCALATE';
}

// ─── Escalation ───────────────────────────────────────────────────────────────

export interface EscalationRule {
  id: string;
  orgId: string;
  name: string;
  condition: string;
  conditionDetail: string;
  action: string;
  targetRole: string;
  isActive: boolean;
}

// ─── Permissions ──────────────────────────────────────────────────────────────

export type Permission =
  | 'REPORT_VIEW'
  | 'REPORT_ASSIGN'
  | 'REPORT_INVESTIGATE'
  | 'REPORT_RESOLVE'
  | 'REPORT_REJECT'
  | 'REPORT_ESCALATE'
  | 'EVIDENCE_VIEW'
  | 'EVIDENCE_DOWNLOAD'
  | 'MESSAGE_SEND'
  | 'INTERNAL_NOTE_CREATE'
  | 'ANALYTICS_VIEW'
  | 'AUDIT_VIEW'
  | 'WORKFLOW_EDIT'
  | 'SLA_EDIT'
  | 'MEMBER_MANAGE';

export interface RolePermissions {
  role: MemberRole;
  permissions: Permission[];
}

// ─── Platform Admin ───────────────────────────────────────────────────────────

export interface PlatformMetrics {
  totalOrgs: number;
  activeOrgs: number;
  pendingOrgs: number;
  suspendedOrgs: number;
  totalReports: number;
  totalUsers: number;
  platformUptimePercent: string;
  lastAuditAt: string;
  securityIncidents: number;
  avgResolutionHours: number;
  reporterSatisfaction: number;
  activeInvestigators: number;
  aiOverrideRate: number;
  slaComplianceRate: number;
}

export interface SecurityStatus {
  id: string;
  category: string;
  label: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPERATIONAL' | 'DEGRADED' | 'INCIDENT' | 'MAINTENANCE';
  lastChecked: string;
  detail: string;
  actionRequired?: boolean;
}

export type OrgPlan = 'FREE' | 'STANDARD' | 'PROFESSIONAL' | 'ENTERPRISE';

export interface PlatformOrg {
  id: string;
  name: string;
  domain: string;
  type: string;
  plan: OrgPlan;
  memberCount: number;
  caseCount: number;
  reportCount: number;
  verificationStatus: OrgVerificationStatus;
  createdAt: string;
  lastActivity: string;
}

// ─── Report (core) ────────────────────────────────────────────────────────────

export interface Report {
  id: string;
  anonymousId: string;
  title: string;
  description: string;
  category: string;
  categoryCode: string;
  department: string;
  departmentCode: string;
  status: ReportStatus;
  priority: Priority;
  voteCount: number;
  createdAt: string;
  updatedAt: string;
  slaDeadline: string;
  slaBreached: boolean;
  assignedTo?: string;
  location?: string;
  isEscalated: boolean;
  isHidden: boolean;
  aiAnalysis?: AIAnalysis | null;
  auditEvents: AuditEvent[];
  evidence: Evidence[];
  viewCount: number;
  internalNote?: string;
  messages?: Message[];
  internalNotes?: InternalNote[];
  assignment?: Assignment;
  resolution?: Resolution;
  changeHistory?: ChangeEvent[];
  relatedCases?: RelatedCase[];
  aiOverrides?: AIOverride[];
  moderationStatus?: 'CLEAR' | 'FLAGGED' | 'REVIEWED';
  trackingCode?: string;
}

export interface TrackedReport {
  reportId: string;
  trackingCode: string;
  title: string;
  status: ReportStatus;
  submittedAt: string;
  lastUpdate: string;
  hasNewUpdate: boolean;
  unreadMessages?: number;
}

// Backward compat
export interface Signal {
  id: string;
  title: string;
  description: string;
  voteCount: number;
  status: ReportStatus;
  createdAt: string;
  trending: boolean;
  hot: boolean;
  reporterHash: string;
}
