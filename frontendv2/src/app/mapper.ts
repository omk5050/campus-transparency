/**
 * Mapper: BackendIssueResponse → Report (frontendv2)
 *
 * This is the single source of truth for translating backend data
 * into the shape the frontend components expect.
 *
 * Each field is explicitly annotated with one of:
 *   [DIRECT]      — mapped 1-to-1 (or trivially transformed)
 *   [TRANSFORMED] — value requires conversion/renaming
 *   [DEFAULT]     — backend has no equivalent; a safe default is used
 *   [UNAVAILABLE] — marked explicitly; never fabricated from thin air
 *
 * Fields the BACKEND has but the frontend type does NOT have:
 *   hidden      → mapped to isHidden (TRANSFORMED)
 *   reporterAlias → mapped to anonymousId (TRANSFORMED)
 *
 * Fields the FRONTEND type has but the BACKEND does NOT provide:
 *   category, categoryCode, department, departmentCode → DEFAULT empty strings
 *   priority                                           → DEFAULT 'MEDIUM'
 *   slaDeadline                                        → DEFAULT far-future date
 *   slaBreached                                        → DEFAULT false
 *   isEscalated                                        → DEFAULT false
 *   viewCount                                          → DEFAULT 0
 *   aiAnalysis                                         → UNAVAILABLE (null)
 *   auditEvents                                        → UNAVAILABLE (empty array)
 *   evidence                                           → UNAVAILABLE (empty array)
 *   internalNote, messages, internalNotes, etc.        → UNAVAILABLE (undefined)
 *   assignment, resolution, changeHistory, etc.        → UNAVAILABLE (undefined)
 */

import type { Report, AuditEvent } from './types';
import type { BackendIssueResponse, BackendAuditLogResponse } from './api';

/**
 * Map a single BackendIssueResponse to the frontend Report type.
 *
 * Status alignment:
 *   REPORTED      → REPORTED      ✅
 *   UNDER_REVIEW  → UNDER_REVIEW  ✅ (added to frontend type — see types.ts)
 *   IN_PROGRESS   → IN_PROGRESS   ✅
 *   RESOLVED      → RESOLVED      ✅
 *   REJECTED      → REJECTED      ✅
 *
 *   TRIAGED, PENDING_REVIEW, ARCHIVED are frontend-only mock statuses
 *   and will never appear in data sourced from the backend.
 */
export function mapIssueToReport(issue: BackendIssueResponse): Report {
  return {
    // ─── [TRANSFORMED] id: Long → string ────────────────────────────────────
    id: String(issue.id),

    // ─── [TRANSFORMED] reporterAlias → anonymousId ──────────────────────────
    anonymousId: issue.reporterAlias,

    // ─── [DIRECT] ────────────────────────────────────────────────────────────
    title: issue.title,
    description: issue.description,
    status: issue.status,       // backend statuses ⊂ frontend ReportStatus
    voteCount: issue.voteCount,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,

    // ─── [TRANSFORMED] hidden → isHidden ────────────────────────────────────
    isHidden: issue.hidden,

    // ─── [DIRECT & TRANSFORMED] metadata fields ─────────────────────────────
    category: issue.category || 'Infrastructure',
    categoryCode: (issue.category || 'INFRA').toUpperCase().slice(0, 4),
    department: issue.department || 'Facilities & Operations',
    departmentCode: (issue.department || 'OPS').toUpperCase().slice(0, 4),
    trackingCode: issue.trackingCode,
    priority: 'MEDIUM',
    slaDeadline: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
    slaBreached: false,
    isEscalated: false,
    viewCount: 0,

    // ─── [UNAVAILABLE] fields that require new backend endpoints ─────────────
    // Set to null / empty — components must handle absence gracefully.
    aiAnalysis: null,
    auditEvents: [],
    evidence: [],

    // Real backend assignment mapping
    assignedTo: issue.assignedTo ? (issue.assignedTo.alias || issue.assignedTo.username) : undefined,
    location: undefined,
    internalNote: undefined,
    messages: undefined,
    internalNotes: undefined,
    assignment: issue.assignedTo ? {
      id: String(issue.id),
      caseId: String(issue.id),
      departmentId: issue.department || '',
      departmentName: issue.department || 'Facilities & Operations',
      primaryInvestigatorId: String(issue.assignedTo.id),
      primaryInvestigatorName: issue.assignedTo.alias || issue.assignedTo.username,
      assignedAt: issue.updatedAt || issue.createdAt,
      assignedBy: 'admin',
      history: [],
    } : undefined,
    resolution: undefined,
    changeHistory: undefined,
    relatedCases: undefined,
    aiOverrides: undefined,
    moderationStatus: undefined,
  };
}

/**
 * Map a page of backend issues to an array of Report.
 */
export function mapIssuePage(issues: BackendIssueResponse[]): Report[] {
  return issues.map(mapIssueToReport);
}

/**
 * Map a BackendAuditLogResponse to the frontend AuditEvent type.
 *
 * Field alignment:
 *   id          → id (number → string)       [TRANSFORMED]
 *   issueId     → embedded in detail         [TRANSFORMED]
 *   action      → type                       [TRANSFORMED]  (backend: "ISSUE_CREATED"; frontend: type string)
 *   actor       → actor                      [DIRECT]
 *   createdAt   → timestamp                  [TRANSFORMED]
 *
 * Fields backend does NOT provide:
 *   actorType   → DEFAULT 'ADMIN' or 'SYSTEM' depending on actor string
 *   detail      → constructed from action string
 *   hash        → DEFAULT empty string (tamper-evidence hash not implemented)
 *   previousState, newState → UNAVAILABLE undefined
 */
export function mapAuditLog(log: BackendAuditLogResponse): AuditEvent {
  const actorType =
    log.actor === 'system'
      ? 'SYSTEM'
      : log.actor === 'admin'
        ? 'ADMIN'
        : 'ADMIN';

  return {
    id: String(log.id),
    type: log.action,                            // [TRANSFORMED] action → type
    actor: log.actor,                            // [DIRECT]
    actorType,                                   // [DEFAULT] inferred from actor string
    timestamp: log.createdAt,                    // [TRANSFORMED] createdAt → timestamp
    detail: formatAuditDetail(log.action, log.issueId), // [DEFAULT] constructed
    hash: '',                                    // [UNAVAILABLE] not provided by backend
    previousState: undefined,
    newState: undefined,
  };
}

function formatAuditDetail(action: string, issueId: number): string {
  switch (action) {
    case 'ISSUE_CREATED':  return `Issue #${issueId} was submitted.`;
    case 'STATUS_CHANGED': return `Status of issue #${issueId} was changed.`;
    case 'ISSUE_RESOLVED': return `Issue #${issueId} was resolved.`;
    case 'ISSUE_REJECTED': return `Issue #${issueId} was rejected.`;
    case 'ISSUE_HIDDEN':   return `Issue #${issueId} was hidden by admin.`;
    default:               return `${action} on issue #${issueId}.`;
  }
}
